const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const daimoPayService = require('../services/daimoPayService');
const membershipManager = require('../utils/membershipManager');
const planService = require('../services/planService');
const { db } = require('../config/firebase');
const { escapeMdV2 } = require('../utils/telegramEscapes');



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

    // Debug logging
    logger.info('[DaimoPay Webhook] Debug info', {
      hasAuthHeader: !!authHeader,
      authHeaderStart: authHeader ? authHeader.substring(0, 20) + '...' : 'null',
      hasExpectedToken: !!expectedToken,
      expectedTokenLength: expectedToken ? expectedToken.length : 0,
      expectedTokenStart: expectedToken ? expectedToken.substring(0, 10) + '...' : 'null',
    });

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
    const providedToken = authHeader.replace('Basic ', '');
    const expectedBase64Token = Buffer.from(expectedToken).toString('base64');

    if (providedToken !== expectedBase64Token) {
      logger.warn('[DaimoPay Webhook] Invalid webhook token', {
        ip: req.ip,
        providedToken: providedToken.substring(0, 10) + '...',
        expectedToken: expectedBase64Token.substring(0, 10) + '...',
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const event = req.body;
    const { id, status, isTestEvent } = event;

    // Check for idempotency to prevent duplicate processing
    const idempotencyKey = req.headers['idempotency-key'];
    if (idempotencyKey) {
      const processedEvent = await db.collection('webhook_events').doc(idempotencyKey).get();
      if (processedEvent.exists) {
        logger.info('[DaimoPay Webhook] Duplicate event detected, skipping', {
          idempotencyKey,
          paymentId: id,
          status,
        });
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Event already processed',
        });
      }
    }

    // Filter test events to avoid activating memberships during testing
    if (isTestEvent) {
      logger.info('[DaimoPay Webhook] Test event received, skipping activation', {
        paymentId: id,
        status,
      });

      // Store test event for tracking but don't activate membership
      if (idempotencyKey) {
        await db.collection('webhook_events').doc(idempotencyKey).set({
          paymentId: id,
          status,
          isTestEvent: true,
          processedAt: new Date(),
        });
      }

      return res.status(200).json({
        success: true,
        test: true,
        message: 'Test event received',
      });
    }

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
        await handlePaymentStarted(event, userId, req);
        break;

      case 'payment_completed':
        await handlePaymentCompleted(event, userId, planId, amount, txHash, req);
        break;

      case 'payment_bounced':
        await handlePaymentBounced(event, userId, req);
        break;

      case 'payment_refunded':
        await handlePaymentRefunded(event, userId, req);
        break;

      default:
        logger.warn('[DaimoPay Webhook] Unknown event status', { status, paymentId: id });
    }

    // Store idempotency key after successful processing
    if (idempotencyKey) {
      await db.collection('webhook_events').doc(idempotencyKey).set({
        paymentId: id,
        status,
        isTestEvent: false,
        processedAt: new Date(),
        userId: userId || null,
        planId: planId || null,
      });
      logger.info('[DaimoPay Webhook] Idempotency key stored', { idempotencyKey, paymentId: id });
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
async function handlePaymentStarted(event, userId, req) {
  const { id, source } = event;
  
  logger.info('[DaimoPay Webhook] Payment started', {
    paymentId: id,
    userId,
    payerAddress: source?.payerAddress,
    sourceTxHash: source?.txHash,
  });

  // Send notification to user
  try {
    const bot = req?.app?.get?.('bot');
      if (bot && userId) {
      const safeTx = escapeMdV2(String(source?.txHash?.substring(0, 16) || ''));
  await bot.telegram.sendMessage(
    userId,
    `⏳ *Pago Detectado*\n\n` +
    `Tu pago ha sido detectado y está siendo procesado.\n\n` +
  `🔗 Hash: \`${safeTx}...\`\n\n` +
    `Te notificaremos cuando esté completo.`,
    { parse_mode: 'MarkdownV2' }
  );
    }
  } catch (notifError) {
    logger.warn('[DaimoPay Webhook] Failed to send payment_started notification:', notifError.message);
  }
}

/**
 * Handle payment_completed event
 */
async function handlePaymentCompleted(event, userId, planId, amount, txHash, req) {
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

  // Check if this chain is prone to reorgs and apply delay if needed
  const chainId = destination?.chainId;
  const reorgProneChains = [137]; // Polygon is prone to reorgs
  const isReorgProne = reorgProneChains.includes(chainId);

  if (isReorgProne) {
    const delaySeconds = 30; // Wait 30 seconds for reorg-prone chains
    logger.info('[DaimoPay Webhook] Chain prone to reorgs, delaying activation', {
      chainId,
      delaySeconds,
      paymentId: id,
    });

    // Schedule delayed activation instead of immediate activation
    setTimeout(async () => {
      await activateMembershipAfterReorgCheck(id, userId, plan, destination, txHash, req);
    }, delaySeconds * 1000);

    logger.info('[DaimoPay Webhook] Delayed activation scheduled', {
      paymentId: id,
      chainId,
      delaySeconds,
    });

    return;
  }

  // For non-reorg-prone chains (like Base), activate immediately
  logger.info('[DaimoPay Webhook] Activating membership immediately', {
    userId,
    planId,
    tier: plan.tier,
    duration: plan.durationDays,
    chainId,
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
    const bot = req?.app?.get?.('bot');
    
    if (bot && userId) {
      const safePlan = escapeMdV2(String(plan.name || ''));
      const safeAmount = escapeMdV2(String(amount || ''));
      const safeTx = escapeMdV2(String(txHash?.substring(0, 20) || ''));
      const safeToken = escapeMdV2(String(destination?.tokenSymbol || ''));
      const safeChain = escapeMdV2(String(getChainName(destination?.chainId) || ''));

      const confirmMsg = 
        `🎉 *¡Pago Confirmado!*\n\n` +
        `✅ Tu suscripción *${safePlan}* ha sido activada\n\n` +
        `💰 *Monto:* $${safeAmount} USDC\n` +
        `⏱️ *Duración:* ${plan.durationDays} días\n` +
  `🔗 *Transacción:* \`${safeTx}...\`\n` +
        `🌐 *Red:* ${safeToken} en ${safeChain}\n\n`;

      let finalMsg = confirmMsg;

      // Add invite link if available
      if (activationResult.inviteLink) {
        finalMsg += `🔗 *Enlace de Acceso:*\n${activationResult.inviteLink}\n\n`;
      }

      finalMsg += `¡Gracias por tu suscripción! 🚀`;

      await bot.telegram.sendMessage(userId, finalMsg, {
        parse_mode: 'MarkdownV2',
      });

      logger.info('[DaimoPay Webhook] Confirmation sent to user', { userId, paymentId: id });
    }
  } catch (msgError) {
    logger.warn('[DaimoPay Webhook] Failed to send confirmation message:', msgError.message);
  }
}

/**
 * Activate membership after reorg safety delay
 * Verifies payment status before activation
 */
async function activateMembershipAfterReorgCheck(paymentId, userId, plan, destination, txHash, req) {
  try {
    logger.info('[DaimoPay Webhook] Reorg check delay completed, verifying payment', {
      paymentId,
      userId,
    });

    // Verify payment still exists in Firestore and hasn't been reverted
    const paymentDoc = await db.collection('payment_intents').doc(paymentId).get();

    if (!paymentDoc.exists) {
      logger.error('[DaimoPay Webhook] Payment not found after reorg delay', { paymentId });
      return;
    }

    const paymentData = paymentDoc.data();

    // Check if payment status is still completed
    if (paymentData.status !== 'payment_completed') {
      logger.warn('[DaimoPay Webhook] Payment status changed during reorg delay', {
        paymentId,
        oldStatus: 'payment_completed',
        newStatus: paymentData.status,
      });
      return;
    }

    // Activate membership
    logger.info('[DaimoPay Webhook] Activating membership after reorg check', {
      userId,
      planId: plan.id,
      tier: plan.tier,
    });

    const activationResult = await membershipManager.activateMembership(userId, plan);

    if (!activationResult.success) {
      logger.error('[DaimoPay Webhook] Failed to activate membership after reorg check', {
        userId,
        planId: plan.id,
        error: activationResult.error,
      });
      return;
    }

    // Send confirmation message
    const bot = req?.app?.get?.('bot');
    if (bot && userId) {
      const safePlan = escapeMdV2(String(plan.name || ''));
      const safeAmount = escapeMdV2(String(paymentData.amount || ''));
      const safeTx = escapeMdV2(String(txHash?.substring(0, 20) || ''));
      const safeToken = escapeMdV2(String(destination?.tokenSymbol || ''));
      const safeChain = escapeMdV2(String(getChainName(destination?.chainId) || ''));

      const confirmMsg =
        `🎉 *¡Pago Confirmado!*\n\n` +
        `✅ Tu suscripción *${safePlan}* ha sido activada\n\n` +
        `💰 *Monto:* $${safeAmount} USDC\n` +
        `⏱️ *Duración:* ${plan.durationDays} días\n` +
        `🔗 *Transacción:* \`${safeTx}...\`\n` +
        `🌐 *Red:* ${safeToken} en ${safeChain}\n\n`;

      let finalMsg = confirmMsg;

      if (activationResult.inviteLink) {
        finalMsg += `🔗 *Enlace de Acceso:*\n${activationResult.inviteLink}\n\n`;
      }

      finalMsg += `¡Gracias por tu suscripción! 🚀`;

      await bot.telegram.sendMessage(userId, finalMsg, {
        parse_mode: 'MarkdownV2',
      });

      logger.info('[DaimoPay Webhook] Confirmation sent after reorg check', { userId, paymentId });
    }
  } catch (error) {
    logger.error('[DaimoPay Webhook] Error in reorg check activation:', {
      error: error.message,
      paymentId,
      userId,
    });
  }
}

/**
 * Handle payment_bounced event (payment failed/reverted)
 */
async function handlePaymentBounced(event, userId, req) {
  const { id, metadata } = event;

  logger.warn('[DaimoPay Webhook] Payment bounced', {
    paymentId: id,
    userId,
    metadata,
  });

  // Notify user
  try {
    const bot = req?.app?.get?.('bot');
    if (bot && userId) {
      await bot.telegram.sendMessage(
        userId,
        `⚠️ *Pago Fallido*\n\n` +
        `Tu pago no pudo ser completado.\n\n` +
        `Los fondos han sido devueltos automáticamente a tu dirección de origen.\n\n` +
        `Por favor intenta de nuevo o contacta al soporte si el problema persiste.`,
        { parse_mode: 'MarkdownV2' }
      );
    }
  } catch (notifError) {
    logger.warn('[DaimoPay Webhook] Failed to send bounce notification:', notifError.message);
  }
}

/**
 * Handle payment_refunded event
 */
async function handlePaymentRefunded(event, userId, req) {
  const { id, metadata } = event;

  logger.info('[DaimoPay Webhook] Payment refunded', {
    paymentId: id,
    userId,
    metadata,
  });

  // Notify user
  try {
    const bot = req?.app?.get?.('bot');
    if (bot && userId) {
      await bot.telegram.sendMessage(
        userId,
        `💸 *Reembolso Procesado*\n\n` +
        `Tu pago ha sido reembolsado.\n\n` +
        `Los fondos han sido devueltos a tu dirección de origen.\n\n` +
        `Si tienes preguntas, contacta al soporte.`,
        { parse_mode: 'MarkdownV2' }
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
 * GET /daimo/debug
 * Debug webhook token (for testing only)
 */
router.get('/debug', (req, res) => {
  const webhookToken = process.env.DAIMO_WEBHOOK_TOKEN;
  const providedTestToken = "0x676371f88a7dfe837c563ba8b0fb2f66341cc96a34f9614a1b0a30804c5dd1a729c77020b732fe128f53961fcec9dce2b5f8215eacdf171d7fd3e9c875feaee11b";
  const base64Token = webhookToken ? Buffer.from(webhookToken).toString('base64') : null;
  const testBase64Token = Buffer.from(providedTestToken).toString('base64');
  
  return res.json({
    hasToken: !!webhookToken,
    tokenLength: webhookToken ? webhookToken.length : 0,
    tokenMatches: webhookToken === providedTestToken,
    storedTokenStart: webhookToken ? webhookToken.substring(0, 20) + '...' : null,
    base64TokenStart: base64Token ? base64Token.substring(0, 20) + '...' : null,
    testBase64Start: testBase64Token.substring(0, 20) + '...',
    tokensEqual: base64Token === testBase64Token,
  });
});

/**
 * POST /daimo/test-webhook
 * Test webhook without authentication (for debugging only)
 */
router.post('/test-webhook', async (req, res) => {
  try {
    const webhookToken = process.env.DAIMO_WEBHOOK_TOKEN;
    const authHeader = req.headers['authorization'];
    
    logger.info('[DaimoPay Test] Test webhook called', {
      hasToken: !!webhookToken,
      tokenLength: webhookToken ? webhookToken.length : 0,
      hasAuthHeader: !!authHeader,
      body: req.body,
    });

    return res.json({
      success: true,
      message: 'Test webhook received',
      debug: {
        hasToken: !!webhookToken,
        tokenLength: webhookToken ? webhookToken.length : 0,
        hasAuthHeader: !!authHeader,
        bodyReceived: !!req.body,
      },
    });
  } catch (error) {
    logger.error('[DaimoPay Test] Test webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
