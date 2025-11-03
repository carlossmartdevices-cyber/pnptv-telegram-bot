const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const daimoPayService = require('../services/daimoPayService');
const membershipManager = require('../utils/membershipManager');
const planService = require('../services/planService');
const { db } = require('../config/firebase');

/**
 * Daimo Pay Webhook Routes (Updated API - Nov 2025)
 * Handles payment_started, payment_completed, payment_bounced, payment_refunded events
 * Documentation: https://paydocs.daimo.com/webhooks
 */

/**
 * POST /daimo/webhook
 * Main webhook endpoint for Daimo payment notifications
 * Authenticates via Authorization: Basic <token> header
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook authentication
    const authHeader = req.headers['authorization'];
    const expectedToken = process.env.DAIMO_WEBHOOK_TOKEN;

    if (!expectedToken) {
      logger.warn('[DaimoPay Webhook] Webhook token not configured');
      return res.status(500).json({
        success: false,
        error: 'Webhook not configured',
      });
    }

    // Check Basic auth
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      logger.warn('[DaimoPay Webhook] Missing or invalid Authorization header', {
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Extract and verify token
    const token = authHeader.replace('Basic ', '');
    if (token !== expectedToken) {
      logger.warn('[DaimoPay Webhook] Invalid webhook token', {
        ip: req.ip,
        providedToken: token.substring(0, 10) + '...',
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const event = req.body;
    const { id, status } = event;

    logger.info('[DaimoPay Webhook] Received event', {
      paymentId: id,
      status,
      event: status,
    });

    // Process the webhook event
    const result = await daimoPayService.processWebhook(event);
    
    if (!result.success) {
      logger.error('[DaimoPay Webhook] Failed to process webhook', { result });
      return res.status(200).json({
        success: false,
        error: 'Processing failed',
      });
    }

    const { userId, planId, amount, txHash } = result;

    // Handle different webhook events
    switch (status) {
      case 'payment_started':
        await handlePaymentStarted(event, userId);
        break;

      case 'payment_completed':
        await handlePaymentCompleted(event, userId, planId, amount, txHash);
        break;

      case 'payment_bounced':
        await handlePaymentBounced(event, userId);
        break;

      case 'payment_refunded':
        await handlePaymentRefunded(event, userId);
        break;

      default:
        logger.warn('[DaimoPay Webhook] Unknown event status', { status, paymentId: id });
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({
      success: true,
      paymentId: id,
      status,
    });

  } catch (error) {
    logger.error('[DaimoPay Webhook] Error processing webhook:', {
      error: error.message,
      stack: error.stack,
    });
    
    // Return 200 to prevent webhook retries for our errors
    return res.status(200).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Handle payment_started event
 */
async function handlePaymentStarted(event, userId) {
  const { id, source } = event;
  
  logger.info('[DaimoPay Webhook] Payment started', {
    paymentId: id,
    userId,
    payerAddress: source?.payerAddress,
    sourceTxHash: source?.txHash,
  });

  // Send notification to user
  try {
    const bot = req.app?.get?.('bot');
    if (bot && userId) {
      await bot.telegram.sendMessage(
        userId,
        `⏳ *Pago Detectado*\n\n` +
        `Tu pago ha sido detectado y está siendo procesado.\n\n` +
        `🔗 Hash: \`${source?.txHash?.substring(0, 16)}...\`\n\n` +
        `Te notificaremos cuando esté completo.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (notifError) {
    logger.warn('[DaimoPay Webhook] Failed to send payment_started notification:', notifError.message);
  }
}

/**
 * Handle payment_completed event
 */
async function handlePaymentCompleted(event, userId, planId, amount, txHash) {
  const { id, destination, metadata } = event;

  logger.info('[DaimoPay Webhook] Payment completed', {
    paymentId: id,
    userId,
    planId,
    amount,
    txHash,
  });

  // Get plan details
  const plan = await planService.getPlanById(planId);
  
  if (!plan) {
    logger.error('[DaimoPay Webhook] Plan not found', { planId, paymentId: id });
    return;
  }

  // Activate membership
  logger.info('[DaimoPay Webhook] Activating membership', {
    userId,
    planId,
    tier: plan.tier,
    duration: plan.durationDays,
  });

  const activationResult = await membershipManager.activateMembership(userId, plan);

  if (!activationResult.success) {
    logger.error('[DaimoPay Webhook] Failed to activate membership', {
      userId,
      planId,
      error: activationResult.error,
    });
    return;
  }

  // Send confirmation message to user
  try {
    const bot = req.app?.get?.('bot');
    
    if (bot && userId) {
      const confirmMsg = 
        `🎉 *¡Pago Confirmado!*\n\n` +
        `✅ Tu suscripción *${plan.name}* ha sido activada\n\n` +
        `💰 *Monto:* $${amount} USDC\n` +
        `⏱️ *Duración:* ${plan.durationDays} días\n` +
        `🔗 *Transacción:* \`${txHash?.substring(0, 20)}...\`\n` +
        `🌐 *Red:* ${destination?.tokenSymbol} en ${getChainName(destination?.chainId)}\n\n`;

      let finalMsg = confirmMsg;

      // Add invite link if available
      if (activationResult.inviteLink) {
        finalMsg += `🔗 *Enlace de Acceso:*\n${activationResult.inviteLink}\n\n`;
      }

      finalMsg += `¡Gracias por tu suscripción! 🚀`;

      await bot.telegram.sendMessage(userId, finalMsg, {
        parse_mode: 'Markdown',
      });

      logger.info('[DaimoPay Webhook] Confirmation sent to user', { userId, paymentId: id });
    }
  } catch (msgError) {
    logger.warn('[DaimoPay Webhook] Failed to send confirmation message:', msgError.message);
  }
}

/**
 * Handle payment_bounced event (payment failed/reverted)
 */
async function handlePaymentBounced(event, userId) {
  const { id, metadata } = event;

  logger.warn('[DaimoPay Webhook] Payment bounced', {
    paymentId: id,
    userId,
    metadata,
  });

  // Notify user
  try {
    const bot = req.app?.get?.('bot');
    if (bot && userId) {
      await bot.telegram.sendMessage(
        userId,
        `⚠️ *Pago Fallido*\n\n` +
        `Tu pago no pudo ser completado.\n\n` +
        `Los fondos han sido devueltos automáticamente a tu dirección de origen.\n\n` +
        `Por favor intenta de nuevo o contacta al soporte si el problema persiste.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (notifError) {
    logger.warn('[DaimoPay Webhook] Failed to send bounce notification:', notifError.message);
  }
}

/**
 * Handle payment_refunded event
 */
async function handlePaymentRefunded(event, userId) {
  const { id, metadata } = event;

  logger.info('[DaimoPay Webhook] Payment refunded', {
    paymentId: id,
    userId,
    metadata,
  });

  // Notify user
  try {
    const bot = req.app?.get?.('bot');
    if (bot && userId) {
      await bot.telegram.sendMessage(
        userId,
        `💸 *Reembolso Procesado*\n\n` +
        `Tu pago ha sido reembolsado.\n\n` +
        `Los fondos han sido devueltos a tu dirección de origen.\n\n` +
        `Si tienes preguntas, contacta al soporte.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (notifError) {
    logger.warn('[DaimoPay Webhook] Failed to send refund notification:', notifError.message);
  }
}

/**
 * GET /daimo/payment/:paymentId/status
 * Get payment status from Daimo API
 */
router.get('/payment/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;

    logger.info('[DaimoPay API] Fetching payment status', { paymentId });

    const status = await daimoPayService.getPaymentStatus(paymentId);

    return res.json({
      success: true,
      payment: status,
    });
  } catch (error) {
    logger.error('[DaimoPay API] Error fetching payment status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /daimo/config
 * Get Daimo configuration status (for debugging)
 */
router.get('/config', async (req, res) => {
  const config = daimoPayService.getConfig();
  return res.json(config);
});

/**
 * Helper: Get chain name from chain ID
 */
function getChainName(chainId) {
  const chains = {
    8453: 'Base',
    10: 'Optimism',
    42161: 'Arbitrum',
    137: 'Polygon',
  };
  return chains[chainId] || `Chain ${chainId}`;
}

module.exports = router;
