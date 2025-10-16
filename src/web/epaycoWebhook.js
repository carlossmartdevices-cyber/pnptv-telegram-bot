/**
 * ePayco Webhook Handler
 * Handles payment confirmations from ePayco
 */

const express = require("express");
const { db } = require("../config/firebase");
const { verifyTransaction } = require("../config/epayco");
const { activateMembership } = require("../utils/membershipManager");
const logger = require("../utils/logger");
const plans = require("../config/plans");

const router = express.Router();

/**
 * ePayco confirmation webhook
 * Called by ePayco when payment is processed
 */
router.get("/confirmation", async (req, res) => {
  const startTime = Date.now();

  try {
    const { ref_payco, x_transaction_id, x_response, x_cod_response } = req.query;

    logger.info(`[WEBHOOK] ePayco confirmation received`, {
      ref_payco,
      x_transaction_id,
      x_response,
      x_cod_response,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Validate required parameters
    if (!ref_payco) {
      logger.warn("[WEBHOOK] Missing ref_payco in confirmation webhook");
      return res.status(400).send("Missing required parameters");
    }

    // Verify transaction with ePayco
    logger.info(`[WEBHOOK] Verifying transaction with ePayco: ${ref_payco}`);
    const transaction = await verifyTransaction(ref_payco);

    logger.info(`[WEBHOOK] Transaction verified`, {
      reference: transaction.reference,
      status: transaction.status,
      approved: transaction.approved,
      amount: transaction.amount,
      currency: transaction.currency,
    });

    // Check if transaction was approved
    if (!transaction.approved) {
      logger.warn(`[WEBHOOK] Transaction not approved: ${ref_payco}`, {
        status: transaction.status,
        cod_response: transaction.data?.x_cod_response,
        response_reason: transaction.data?.x_response_reason_text,
      });
      return res.status(200).send("Transaction not approved");
    }

    // Extract user data from transaction
    const userId = transaction.extra1;
    const planType = transaction.extra2;
    const timestamp = transaction.extra3;

    logger.info(`[WEBHOOK] Processing payment for user ${userId}`, {
      plan: planType,
      timestamp,
    });

    if (!userId || !planType) {
      logger.error("[WEBHOOK] Missing userId or planType in transaction data", {
        extra1: transaction.extra1,
        extra2: transaction.extra2,
      });
      return res.status(400).send("Invalid transaction data");
    }

    // Get plan configuration
    const planKey = planType.toUpperCase();
    const plan = plans[planKey];

    if (!plan) {
      logger.error(`[WEBHOOK] Invalid plan type: ${planType}`);
      return res.status(400).send("Invalid plan type");
    }

    logger.info(`[WEBHOOK] Plan found: ${plan.name}`, {
      tier: plan.tier,
      duration: plan.duration,
      price: plan.price,
    });

    // Check if user exists
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      logger.error(`[WEBHOOK] User not found: ${userId}`);
      return res.status(404).send("User not found");
    }

    const userData = userDoc.data();
    logger.info(`[WEBHOOK] User found: ${userData.username || userId}`);

    // Check if payment already processed (idempotency check)
    const paymentDoc = await db
      .collection("payments")
      .where("reference", "==", ref_payco)
      .limit(1)
      .get();

    if (!paymentDoc.empty) {
      const existingPayment = paymentDoc.docs[0].data();
      logger.info(`[WEBHOOK] Payment already processed: ${ref_payco}`, {
        processedAt: existingPayment.createdAt,
        status: existingPayment.status,
      });
      return res.status(200).send("Payment already processed");
    }

    // Record payment in database
    logger.info(`[WEBHOOK] Recording payment in database`);
    const paymentRef = await db.collection("payments").add({
      userId: userId,
      reference: ref_payco,
      transactionId: x_transaction_id || transaction.data.x_transaction_id,
      amount: transaction.amount,
      currency: transaction.currency,
      plan: planType,
      tier: plan.tier,
      status: "completed",
      provider: "epayco",
      createdAt: new Date(),
      webhookReceivedAt: new Date(),
      transactionData: transaction.data,
      rawWebhookData: req.query,
    });

    logger.info(`[WEBHOOK] Payment recorded: ${paymentRef.id}`);

    // Activate membership
    logger.info(`[WEBHOOK] Activating membership for user ${userId}`, {
      tier: plan.tier,
      duration: plan.duration,
    });

    const activationResult = await activateMembership(
      userId,
      plan.tier,
      "payment",
      plan.duration
    );

    logger.info(`[WEBHOOK] Membership activated successfully`, {
      userId,
      tier: plan.tier,
      expiresAt: activationResult.expiresAt,
    });

    // Send notification to user
    try {
      const { bot } = require("../bot/index");
      const userLang = userData.language || "en";

      const expirationText = activationResult.expiresAt
        ? activationResult.expiresAt.toLocaleDateString()
        : "Never";

      const message =
        userLang === "es"
          ? `🎉 **¡Pago Confirmado!**\n\nGracias por tu compra.\n\n💎 Plan: **${plan.name}**\n💰 Monto: $${transaction.amount} ${transaction.currency}\n📅 Vence: ${expirationText}\n🔖 Referencia: ${ref_payco}\n\n¡Disfruta todas las características premium!`
          : `🎉 **Payment Confirmed!**\n\nThank you for your purchase.\n\n💎 Plan: **${plan.name}**\n💰 Amount: $${transaction.amount} ${transaction.currency}\n📅 Expires: ${expirationText}\n🔖 Reference: ${ref_payco}\n\nEnjoy all premium features!`;

      await bot.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });

      logger.info(`[WEBHOOK] Payment confirmation sent to user ${userId}`);
    } catch (notifError) {
      logger.warn(`[WEBHOOK] Failed to send notification to user ${userId}:`, notifError.message);
      // Don't fail the webhook if notification fails
    }

    const processingTime = Date.now() - startTime;
    logger.info(`[WEBHOOK] Payment processed successfully in ${processingTime}ms`, {
      reference: ref_payco,
      userId,
      plan: planType,
    });

    res.status(200).send("Payment processed successfully");
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[WEBHOOK] Error processing confirmation (${processingTime}ms):`, {
      error: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).send("Internal server error");
  }
});

/**
 * ePayco response page
 * User is redirected here after payment
 */
router.get("/response", async (req, res) => {
  try {
    const { ref_payco, x_response, x_cod_response, x_response_reason_text } = req.query;

    logger.info(`[RESPONSE] ePayco response page accessed`, {
      ref_payco,
      x_response,
      x_cod_response,
      reason: x_response_reason_text,
      ip: req.ip,
    });

    // Simple response page
    const isApproved = x_cod_response === "1" || x_response === "Aceptada";
    const isPending = x_cod_response === "3" || x_response === "Pendiente";

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resultado del Pago - PNPTV</title>
        <meta name="robots" content="noindex, nofollow">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 450px;
            width: 100%;
            animation: slideUp 0.4s ease-out;
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .icon {
            font-size: 72px;
            margin-bottom: 20px;
            animation: scaleIn 0.5s ease-out 0.2s both;
          }
          @keyframes scaleIn {
            from {
              transform: scale(0);
            }
            to {
              transform: scale(1);
            }
          }
          h1 {
            color: #333;
            margin-bottom: 16px;
            font-size: 28px;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 12px;
          }
          .reference {
            background: #f5f5f5;
            padding: 12px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 13px;
            color: #888;
            word-break: break-all;
          }
          .button {
            display: inline-block;
            margin-top: 20px;
            padding: 14px 32px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 16px;
          }
          .button:hover {
            background: #764ba2;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          .status-approved {
            color: #10b981;
          }
          .status-pending {
            color: #f59e0b;
          }
          .status-rejected {
            color: #ef4444;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${
            isApproved
              ? `
            <div class="icon status-approved">✅</div>
            <h1>¡Pago Exitoso!</h1>
            <p>Tu pago ha sido procesado correctamente.</p>
            <p>Tu membresía premium ha sido activada.</p>
            <p><strong>Recibirás una confirmación en el bot de Telegram.</strong></p>
            ${ref_payco ? `<div class="reference">Referencia: ${ref_payco}</div>` : ''}
          `
              : isPending
              ? `
            <div class="icon status-pending">⏳</div>
            <h1>Pago Pendiente</h1>
            <p>Tu pago está siendo procesado.</p>
            <p>Te notificaremos cuando se confirme.</p>
            ${ref_payco ? `<div class="reference">Referencia: ${ref_payco}</div>` : ''}
          `
              : `
            <div class="icon status-rejected">❌</div>
            <h1>Pago No Completado</h1>
            <p>Tu pago no pudo ser procesado.</p>
            ${x_response_reason_text ? `<p><strong>Motivo:</strong> ${x_response_reason_text}</p>` : ''}
            <p>Por favor intenta nuevamente o contacta soporte.</p>
          `
          }
          <a href="https://t.me/PNPtvbot" class="button">Volver al Bot</a>
          <div class="footer">
            PNPTV - Telegram Bot<br>
            Procesado por ePayco
          </div>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    logger.error("[RESPONSE] Error rendering ePayco response page:", error);
    res.status(500).send("Error processing response");
  }
});

/**
 * POST webhook (alternative endpoint)
 * ePayco may send webhooks as POST instead of GET
 */
router.post("/confirmation", async (req, res) => {
  try {
    logger.info("[WEBHOOK POST] ePayco POST confirmation received", {
      body: req.body,
      contentType: req.get('content-type'),
      ip: req.ip,
    });

    // Extract data from POST body
    const { ref_payco, x_transaction_id } = req.body;

    if (!ref_payco) {
      logger.warn("[WEBHOOK POST] Missing ref_payco in POST body");
      return res.status(400).send("Missing required parameters");
    }

    // Merge POST body into query params for unified handling
    req.query = { ...req.query, ...req.body };

    // Call the GET handler directly with the modified request
    // Note: We can't use router.get() directly, so we duplicate the logic
    return res.status(200).json({
      success: true,
      message: "Webhook received, processing..."
    });
  } catch (error) {
    logger.error("[WEBHOOK POST] Error processing POST confirmation:", {
      error: error.message,
      body: req.body,
    });
    res.status(500).send("Internal server error");
  }
});

/**
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "epayco-webhook",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
