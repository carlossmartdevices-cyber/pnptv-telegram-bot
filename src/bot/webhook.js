/**
 * Webhook mode configuration for production deployment
 * Optimized for Railway deployment with health checks and graceful shutdown
 */

require("../config/env");
const express = require("express");
const { Telegraf } = require("telegraf");
const logger = require("../utils/logger");
const daimo = require("../config/daimo");
const { db } = require("../config/firebase");

// Initialize bot
const bot = require("./index");

// Express app for webhook
const app = express();

// Trust Railway proxy
app.set("trust proxy", 1);

// JSON body parser with size limits
app.use(express.json({ limit: "10mb" }));

// Serve static files from public directory (for payment page)
const path = require("path");

// Request logging middleware (production optimized)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/health") {
      logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "PNPtv Telegram Bot",
    status: "running",
    version: process.env.npm_package_version || "2.0.0",
    environment: process.env.NODE_ENV || "production",
  });
});

// Enhanced health check endpoint for Railway
app.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || "production",
  };
  res.json(health);
});

// Readiness check (checks if bot is connected)
app.get("/ready", async (req, res) => {
  try {
    const botInfo = await bot.telegram.getMe();
    res.json({
      ready: true,
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
      },
    });
  } catch (error) {
    logger.error("Readiness check failed:", error);
    res.status(503).json({
      ready: false,
      error: error.message,
    });
  }
});

// API routes for payment page
const apiRoutes = require('./api/routes');
app.use('/api', apiRoutes);

// Serve static assets for payment page
app.use("/assets", express.static(path.join(__dirname, "../../public/payment/assets")));

// Payment page endpoint for Daimo Pay - serves standalone HTML page with Daimo SDK
app.get("/pay", async (req, res) => {
  try {
    const { plan, user, amount } = req.query;

    if (!plan || !user || !amount) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Payment Link</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⚠️</div>
            <h1>Invalid Payment Link</h1>
            <p>This payment link is missing required information. Please return to the bot and try again.</p>
          </div>
        </body>
        </html>
      `);
    }

    logger.info("Payment page accessed:", { plan, user, amount });

    // Serve the simple working Daimo payment page
    const paymentPagePath = path.join(__dirname, "../../public/payment-simple.html");
    res.sendFile(paymentPagePath);
  } catch (error) {
    logger.error("Error serving payment page:", error);
    res.status(500).send("Internal server error");
  }
});

// Legal pages - Terms of Service, Privacy Policy, Refund Policy
app.get("/terms-en", (req, res) => {
  const termsPath = path.join(__dirname, "../../public/legal/terms-en.html");
  res.sendFile(termsPath);
});

app.get("/terms-es", (req, res) => {
  const termsPath = path.join(__dirname, "../../public/legal/terms-es.html");
  res.sendFile(termsPath);
});

app.get("/privacy-en", (req, res) => {
  // Privacy policy is included in terms page, redirect to #privacy section
  res.redirect("/terms-en#privacy");
});

app.get("/privacy-es", (req, res) => {
  // Privacy policy is included in terms page, redirect to #privacidad section
  res.redirect("/terms-es#privacidad");
});

app.get("/refunds-en", (req, res) => {
  // Refund policy is included in terms page, redirect to #refund section
  res.redirect("/terms-en#refund");
});

app.get("/refunds-es", (req, res) => {
  // Refund policy is included in terms page, redirect to #reembolsos section
  res.redirect("/terms-es#reembolsos");
});

// Webhook endpoint for Telegram
app.post(`/bot${process.env.TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    // Respond immediately to avoid timeout
    res.sendStatus(200);

    // Process update asynchronously
    await bot.handleUpdate(req.body);
  } catch (error) {
    logger.error('Webhook error:', error);
  }
});

// ePayco payment response endpoint (user redirect after payment)
app.get("/epayco/response", async (req, res) => {
  try {
    const { ref_payco, x_transaction_state, x_id_invoice, x_approval_code } = req.query;

    logger.info("ePayco payment response (user redirect):", {
      reference: ref_payco,
      state: x_transaction_state,
      invoice: x_id_invoice,
    });

    // Show user-friendly success page
    if (x_transaction_state === "Aceptada") {
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pago Exitoso</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #764ba2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>¡Pago Exitoso!</h1>
            <p>Tu suscripción se activará en breve. Recibirás una confirmación en el bot.</p>
            <p>Gracias por tu compra!</p>
            <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Volver al Bot</a>
          </div>
        </body>
        </html>
      `);
    } else if (x_transaction_state === "Rechazada") {
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pago Rechazado</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 30px;
              background: #f5576c;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #f093fb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">❌</div>
            <h1>Pago Rechazado</h1>
            <p>Tu pago no pudo ser procesado. Por favor intenta nuevamente o contacta a soporte.</p>
            <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Volver al Bot</a>
          </div>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Procesando Pago</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
              max-width: 400px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 30px;
              background: #fcb69f;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #ffecd2;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">⏳</div>
            <h1>Procesando Pago</h1>
            <p>Tu pago está siendo procesado. Recibirás una confirmación en el bot pronto.</p>
            <p>Estado: ${x_transaction_state}</p>
            <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Volver al Bot</a>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    logger.error("Error processing ePayco response:", error);
    res.status(500).send("Error processing payment response");
  }
});

// ePayco confirmation webhook (server-to-server)
app.post("/epayco/confirmation", async (req, res) => {
  try {
    const webhookData = req.body;

    logger.info("ePayco confirmation webhook received:", {
      reference: webhookData.x_ref_payco,
      state: webhookData.x_transaction_state,
      invoice: webhookData.x_id_invoice,
      amount: webhookData.x_amount,
      currency: webhookData.x_currency_code,
    });

    // Verify webhook signature
    const crypto = require("crypto");
    const {
      x_cust_id_cliente,
      x_ref_payco,
      x_transaction_id,
      x_amount,
      x_currency_code,
      x_signature,
    } = webhookData;

    // ePayco signature format: x_cust_id_cliente^x_ref_payco^x_transaction_id^x_amount^x_currency_code
    const signatureString = `${x_cust_id_cliente}^${process.env.EPAYCO_P_KEY}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;
    const expectedSignature = crypto
      .createHash("sha256")
      .update(signatureString)
      .digest("hex");

    // Verify signature (strict mode can be disabled for testing)
    const strictMode = process.env.EPAYCO_ALLOW_UNSIGNED_WEBHOOKS !== "true";
    if (strictMode && x_signature !== expectedSignature) {
      logger.warn("ePayco webhook signature verification failed:", {
        received: x_signature,
        expected: expectedSignature,
      });
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Extract metadata from invoice ID (format: plan_userId_timestamp)
    const invoice = webhookData.x_id_invoice;
    const invoiceParts = invoice.split("_");
    const planId = invoiceParts[0];
    const userId = invoiceParts[1];

    logger.info("Processing ePayco payment confirmation:", {
      planId,
      userId,
      amount: webhookData.x_amount,
      state: webhookData.x_transaction_state,
    });

    // Only process successful payments
    if (
      webhookData.x_transaction_state === "Aceptada" &&
      (webhookData.x_cod_response === 1 || webhookData.x_cod_response === "1")
    ) {
      try {
        // Get plan details
        const planService = require("../services/planService");
        const plan = await planService.getPlanById(planId);

        if (!plan) {
          logger.error("Plan not found for ePayco payment:", { planId, userId });
          return res.status(404).json({ error: "Plan not found" });
        }

        // Get user from database
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          logger.error("User not found for ePayco payment:", { userId, planId });
          return res.status(404).json({ error: "User not found" });
        }

        // Use membership manager to activate subscription and generate invite link
        const { activateMembership } = require("../utils/membershipManager");
        const durationDays = plan.duration || plan.durationDays || 30;
        const result = await activateMembership(userId, plan.tier, "epayco_webhook", durationDays, bot);

        // Store additional payment metadata
        const now = new Date();
        await userRef.update({
          membershipPlanId: plan.id,
          membershipPlanName: plan.displayName || plan.name,
          paymentMethod: "epayco",
          paymentReference: webhookData.x_ref_payco,
          paymentTransactionId: webhookData.x_transaction_id,
          paymentAmount: parseFloat(webhookData.x_amount),
          paymentCurrency: webhookData.x_currency_code,
          paymentDate: now,
          updatedAt: now,
        });

        logger.info("Subscription activated via ePayco webhook:", {
          userId,
          planId,
          tier: plan.tier,
          expiresAt: result.expiresAt?.toISOString(),
          amount: webhookData.x_amount,
          reference: webhookData.x_ref_payco,
          inviteLink: result.inviteLink ? "generated" : "none",
        });

        // Send confirmation message to user via Telegram using standardized format
        try {
          const userData = userDoc.data();
          const userName = userData.username || userData.firstName || "Usuario";
          const userLanguage = userData.language || 'es'; // Default to Spanish for ePayco

          const { generateConfirmationMessage } = require('../utils/membershipManager');
          
          const confirmationMessage = generateConfirmationMessage({
            userName,
            planName: plan.displayName || plan.name,
            durationDays,
            expiresAt: result.expiresAt,
            paymentAmount: webhookData.x_amount,
            paymentCurrency: webhookData.x_currency_code,
            paymentMethod: 'epayco',
            reference: webhookData.x_ref_payco,
            inviteLink: result.inviteLink,
            language: userLanguage
          });

          await bot.telegram.sendMessage(userId, confirmationMessage, { parse_mode: "Markdown" });
        } catch (msgError) {
          logger.warn("Failed to send ePayco confirmation message to user:", {
            userId,
            error: msgError.message,
          });
        }

        // Respond to ePayco
        return res.status(200).send("OK");
      } catch (activationError) {
        logger.error("Error activating subscription from ePayco webhook:", activationError);
        return res.status(500).json({ error: "Failed to activate subscription" });
      }
    } else if (webhookData.x_transaction_state === "Rechazada") {
      // Payment was rejected
      logger.warn("ePayco payment rejected:", {
        userId,
        planId,
        reason: webhookData.x_response_reason_text,
      });

      try {
        await bot.telegram.sendMessage(
          userId,
          `❌ *Pago Rechazado*\n\n` +
          `Tu pago no pudo ser procesado.\n\n` +
          `Razón: ${webhookData.x_response_reason_text || "No especificada"}\n` +
          `Referencia: ${webhookData.x_ref_payco}\n\n` +
          `Por favor intenta nuevamente o contacta a soporte.`,
          { parse_mode: "Markdown" }
        );
      } catch (msgError) {
        logger.warn("Failed to send rejection message:", msgError);
      }

      return res.status(200).send("OK");
    } else {
      // Other states (Pendiente, etc.)
      logger.info("ePayco payment in non-final state:", {
        state: webhookData.x_transaction_state,
        userId,
        planId,
      });
      return res.status(200).send("OK");
    }
  } catch (error) {
    logger.error("Error processing ePayco confirmation webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Daimo Pay webhook endpoint (official webhook from Daimo dashboard)
// DEPRECATED: legacy Daimo webhook handler.
// This file implements the older express-based webhook endpoint at `/daimo/webhook`.
// The canonical production webhook has moved to the Vercel Next.js app at:
// https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app/api/webhook
//
// Keep this handler only for compatibility with older deployments. New integrations
// should use the Vercel App Router handler `pnptv-payment/src/app/api/webhook/route.ts`.
// Consider removing this file from main after confirming all webhooks have been migrated.

app.post("/daimo/webhook", async (req, res) => {
  try {
    logger.info("Received Daimo Pay webhook", {
      event: req.body.type,
      reference: req.body.reference,
    });

    // Verify webhook authentication
    const authHeader = req.headers.authorization;
    const isValidAuth = daimo.verifyWebhookAuth(authHeader);

    if (!isValidAuth) {
      logger.warn('Invalid Daimo webhook authentication', {
        received: authHeader ? 'present' : 'missing',
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify payment origin
    const origin = req.get('origin');
    if (!daimo.verifyPaymentOrigin(origin)) {
      logger.warn('Invalid payment origin', { origin });
      return res.status(403).json({ error: 'Invalid origin' });
    }

    const event = req.body;

    // Handle payment_completed event
    if (event.type === 'payment_completed') {
      const { reference, metadata, amount } = event;
      const userId = metadata?.userId;
      const planId = metadata?.plan;

      logger.info('Daimo payment completed', {
        userId,
        planId,
        amount,
        reference,
      });

      if (userId && planId) {
        try {
          // Update payment intent in database
          await db.collection('payment_intents').doc(reference).update({
            status: 'completed_webhook',
            webhookReceivedAt: Date.now(),
          });

          // Get plan details
          const planService = require('../services/planService');
          const plan = await planService.getPlanById(planId);

          if (!plan) {
            logger.error('Plan not found for payment', { planId, userId });
            return res.status(404).json({ error: 'Plan not found' });
          }

          // Check if user exists
          const userRef = db.collection('users').doc(userId);
          const userDoc = await userRef.get();

          if (!userDoc.exists) {
            logger.error('User not found for payment', { userId, planId });
            return res.status(404).json({ error: 'User not found' });
          }

          // Use membership manager to activate subscription and generate invite link
          const { activateMembership } = require('../utils/membershipManager');
          const durationDays = plan.duration || plan.durationDays || 30;
          const result = await activateMembership(userId, plan.tier, 'daimo_webhook', durationDays, bot);

          // Store additional payment metadata
          const now = new Date();
          await userRef.update({
            membershipPlanId: plan.id,
            membershipPlanName: plan.displayName || plan.name,
            paymentMethod: 'daimo',
            paymentReference: reference,
            paymentAmount: parseFloat(amount),
            paymentCurrency: 'USDC',
            paymentNetwork: 'optimism',
            paymentDate: now,
            lastPaymentStatus: 'completed',
            paymentMetadata: {
              chainId: daimo.SUPPORTED_NETWORKS.OPTIMISM.chainId,
              tokenAddress: daimo.SUPPORTED_NETWORKS.OPTIMISM.token,
              processingTime: Date.now() - event.timestamp,
              webhookReceived: now.toISOString()
            },
            updatedAt: now
          });

          logger.info('Subscription activated via Daimo webhook', {
            userId,
            planId,
            tier: plan.tier,
            expiresAt: result.expiresAt?.toISOString(),
            inviteLink: result.inviteLink ? 'generated' : 'none',
          });

          // Notify user in Telegram with standardized confirmation message
          try {
            const userData = userDoc.data();
            const userName = userData.username || userData.firstName || "User";
            const userLanguage = userData.language || 'en'; // Default to English for Daimo

            const { generateConfirmationMessage } = require('../utils/membershipManager');
            
            const confirmationMessage = generateConfirmationMessage({
              userName,
              planName: plan.displayName || plan.name,
              durationDays,
              expiresAt: result.expiresAt,
              paymentAmount: amount,
              paymentCurrency: 'USDC',
              paymentMethod: 'daimo',
              reference,
              inviteLink: result.inviteLink,
              language: userLanguage
            });

            await bot.telegram.sendMessage(userId, confirmationMessage, { parse_mode: "Markdown" });
          } catch (notifyError) {
            logger.warn('Failed to notify user', { userId, error: notifyError.message });
          }
        } catch (activationError) {
          logger.error('Error activating subscription', activationError);
          return res.status(500).json({ error: 'Failed to activate subscription' });
        }
      }
    }

    // Handle other event types
    else if (event.type === 'payment_started') {
      logger.info('Payment started webhook received', event);
    } else if (event.type === 'payment_bounced') {
      logger.warn('Payment bounced', event);
    } else if (event.type === 'payment_refunded') {
      logger.info('Payment refunded', event);
    } else {
      logger.info('Unknown Daimo webhook event type', { type: event.type });
    }

    // All events have been processed
    return res.json({ success: true, message: "Webhook received" });
  } catch (error) {
    logger.error("Error processing Daimo webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Daimo payment success redirect
app.get("/payment/success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 400px;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 30px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.3s;
        }
        .button:hover {
          background: #764ba2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Payment Successful!</h1>
        <p>Your subscription has been activated. You'll receive a confirmation in the bot shortly.</p>
        <p>Thank you for using Daimo Pay!</p>
        <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Return to Bot</a>
      </div>
    </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Express error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Set webhook with BOT_URL configuration
async function setupWebhook() {
  // Use WEBHOOK_URL (preferred) or BOT_URL from environment
  const webhookUrl =
    process.env.WEBHOOK_URL ||
    process.env.BOT_URL ||
    "https://yourdomain.com";

  const path = `/bot${process.env.TELEGRAM_TOKEN}`;

  try {
    await bot.telegram.setWebhook(`${webhookUrl}${path}`);
    logger.info(`Webhook configured: ${webhookUrl}${path}`);
    console.log(`✅ Webhook set to: ${webhookUrl}${path}`);
  } catch (error) {
    logger.error("Failed to set webhook:", error);
    throw error;
  }
}

// Graceful shutdown handler
function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    console.log(`\n${signal} received, shutting down gracefully...`);

    // Stop accepting new requests
    server.close(() => {
      logger.info("HTTP server closed");
      console.log("HTTP server closed");
    });

    // Stop the bot
    try {
      await bot.stop(signal);
      logger.info("Bot stopped");
      console.log("Bot stopped");
    } catch (error) {
      logger.error("Error stopping bot:", error);
    }

    // Give active requests time to finish
    setTimeout(() => {
      logger.info("Forcing shutdown");
      process.exit(0);
    }, 10000); // 10 second grace period
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

// Start server
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // Required for Railway

if (require.main === module) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // In development mode, start Express server without webhook (use polling mode from bot)
  if (isDevelopment) {
    logger.info("Starting in development mode (polling) - webhook disabled");
    console.log("\n⚙️  Development Mode: Starting server without webhook");
    console.log("   Bot will use polling mode from index.js");
    console.log("   Express server available for payment endpoints\n");

    // Start Express server only (bot runs separately via index.js in polling mode)
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Development server running on ${HOST}:${PORT}`);
      console.log(`\n🚀 PNPtv Development Server Started`);
      console.log(`   - Environment: development`);
      console.log(`   - Host: ${HOST}`);
      console.log(`   - Port: ${PORT}`);
      console.log(`   - Health Check: http://localhost:${PORT}/health`);
      console.log(`   - Payment Page: http://localhost:${PORT}/pay`);
      console.log(`   - Run 'npm start' in another terminal for bot polling mode\n`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);
  } else {
    // Production mode: use webhook
    setupWebhook()
      .then(() => {
        const server = app.listen(PORT, HOST, () => {
          logger.info(`Webhook server running on ${HOST}:${PORT}`);
          console.log(`\n🚀 PNPtv Bot Server Started`);
          console.log(`   - Environment: ${process.env.NODE_ENV || "production"}`);
          console.log(`   - Host: ${HOST}`);
          console.log(`   - Port: ${PORT}`);
          console.log(`   - Health Check: http://localhost:${PORT}/health`);
          console.log(`   - Bot Username: @${bot.botInfo?.username || "PNPtvbot"}\n`);
        });

        // Setup graceful shutdown
        setupGracefulShutdown(server);
      })
      .catch((error) => {
        logger.error("Failed to start webhook server:", error);
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
      });
  }
}

module.exports = { app, setupWebhook };
