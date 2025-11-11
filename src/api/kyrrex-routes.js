const express = require('express');
const router = express.Router();
const kyrrexService = require('../services/kyrrexService');
const planService = require('../services/planService');
const logger = require('../utils/logger');
const { db } = require('../config/firebase');
const { escapeMdV2 } = require('../utils/telegramEscapes');

/**
 * Kyrrex API Routes
 * Handles webhooks, payment confirmations, and admin endpoints
 */

/**
 * Webhook endpoint for Kyrrex payment notifications
 * POST /kyrrex/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    logger.info('[Kyrrex Webhook] Received event:', {
      type: event.type,
      address: event.address,
      amount: event.amount,
      currency: event.currency,
      txHash: event.txHash,
      confirmations: event.confirmations,
    });

    // Verify webhook signature if available
    const signature = req.headers['x-kyrrex-signature'];
    if (signature) {
      // TODO: Implement signature verification when Kyrrex provides webhook signing
      // const isValid = kyrrexService.verifyWebhookSignature(req.body, signature);
      // if (!isValid) {
      //   logger.warn('[Kyrrex Webhook] Invalid signature');
      //   return res.status(401).json({ error: 'Invalid signature' });
      // }
    }

    // Process the webhook event
    const result = await kyrrexService.processWebhook(event);
    
    if (result.success && result.status === 'completed') {
      // Activate user subscription
      await activateSubscription(result.userId, result.planId, result.paymentId);
      
      // Send notification to user
      await notifyPaymentSuccess(result.userId, result);
    }

    logger.info('[Kyrrex Webhook] Event processed successfully:', {
      paymentId: result.paymentId,
      status: result.status,
      userId: result.userId,
    });

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('[Kyrrex Webhook] Processing error:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });

    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
});

/**
 * Manual payment status check endpoint
 * GET /kyrrex/payment/:paymentId/status
 */
router.get('/payment/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    logger.info('[Kyrrex API] Manual status check:', { paymentId });

    const paymentStatus = await kyrrexService.checkPaymentStatus(paymentId);
    
    // If payment was just confirmed, activate subscription
    if (paymentStatus.status === 'completed' && !paymentStatus.subscriptionActivated) {
      await activateSubscription(paymentStatus.userId, paymentStatus.planId, paymentId);
      
      // Mark as activated to prevent duplicate activations
      await db.collection('kyrrex_payments').doc(paymentId).update({
        subscriptionActivated: true,
        updatedAt: new Date(),
      });

      paymentStatus.subscriptionActivated = true;
    }

    res.json({
      success: true,
      payment: paymentStatus,
    });
  } catch (error) {
    logger.error('[Kyrrex API] Status check error:', {
      error: error.message,
      paymentId: req.params.paymentId,
    });

    res.status(500).json({
      error: 'Status check failed',
      message: error.message,
    });
  }
});

/**
 * Get exchange rates endpoint
 * GET /kyrrex/rates
 */
router.get('/rates', async (req, res) => {
  try {
    const baseCurrency = req.query.base || 'USD';
    const rates = await kyrrexService.getExchangeRates(baseCurrency);
    
    res.json({
      success: true,
      base: baseCurrency,
      rates: rates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Kyrrex API] Rates error:', error);
    
    res.status(500).json({
      error: 'Failed to get exchange rates',
      message: error.message,
    });
  }
});

/**
 * Create payment endpoint (for testing)
 * POST /kyrrex/payment/create
 */
router.post('/payment/create', async (req, res) => {
  try {
    const { planId, userId, cryptocurrency = 'USDT', network } = req.body;
    
    if (!planId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['planId', 'userId'],
      });
    }

    // Get plan details
    const plan = await planService.getPlanById(planId);
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        planId,
      });
    }

    // Create payment
    const paymentResult = await kyrrexService.createPayment({
      planName: plan.name,
      amount: plan.price || plan.priceInUSD,
      userId: userId.toString(),
      planId: planId,
      userName: 'API User',
      cryptocurrency,
      network,
    });

    logger.info('[Kyrrex API] Payment created via API:', {
      paymentId: paymentResult.paymentId,
      userId,
      planId,
      cryptocurrency,
    });

    res.json({
      success: true,
      payment: paymentResult,
    });
  } catch (error) {
    logger.error('[Kyrrex API] Payment creation error:', {
      error: error.message,
      body: req.body,
    });

    res.status(500).json({
      error: 'Payment creation failed',
      message: error.message,
    });
  }
});

/**
 * Admin endpoint to list all Kyrrex payments
 * GET /kyrrex/admin/payments
 */
router.get('/admin/payments', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = db.collection('kyrrex_payments')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const payments = [];

    snapshot.forEach(doc => {
      payments.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        expiresAt: doc.data().expiresAt?.toDate?.() || doc.data().expiresAt,
      });
    });

    res.json({
      success: true,
      payments,
      count: payments.length,
      offset: parseInt(offset),
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error('[Kyrrex Admin] List payments error:', error);
    
    res.status(500).json({
      error: 'Failed to list payments',
      message: error.message,
    });
  }
});

/**
 * Admin endpoint to manually confirm a payment
 * POST /kyrrex/admin/payments/:paymentId/confirm
 */
router.post('/admin/payments/:paymentId/confirm', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { txHash, amount, adminUserId } = req.body;
    
    logger.info('[Kyrrex Admin] Manual payment confirmation:', {
      paymentId,
      txHash,
      amount,
      adminUserId,
    });

    // Get payment details
    const paymentDoc = await db.collection('kyrrex_payments').doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({
        error: 'Payment not found',
        paymentId,
      });
    }

    const paymentData = paymentDoc.data();

    // Update payment status
    const updateData = {
      status: 'completed',
      txHash: txHash || 'manual_confirmation',
      confirmedAmount: amount || paymentData.cryptoAmount,
      confirmations: 999, // Manual confirmation
      completedAt: new Date(),
      updatedAt: new Date(),
      manualConfirmation: true,
      confirmedBy: adminUserId,
    };

    await paymentDoc.ref.update(updateData);

    // Activate subscription
    await activateSubscription(paymentData.userId, paymentData.planId, paymentId);

    // Send notification to user
    await notifyPaymentSuccess(paymentData.userId, {
      ...paymentData,
      ...updateData,
      paymentId,
    });

    logger.info('[Kyrrex Admin] Payment manually confirmed:', {
      paymentId,
      userId: paymentData.userId,
      planId: paymentData.planId,
      adminUserId,
    });

    res.json({
      success: true,
      message: 'Payment confirmed manually',
      payment: { ...paymentData, ...updateData },
    });
  } catch (error) {
    logger.error('[Kyrrex Admin] Manual confirmation error:', {
      error: error.message,
      paymentId: req.params.paymentId,
    });

    res.status(500).json({
      error: 'Manual confirmation failed',
      message: error.message,
    });
  }
});

/**
 * Activate user subscription after successful payment
 * @param {string} userId - Telegram user ID
 * @param {string} planId - Plan identifier
 * @param {string} paymentId - Payment reference
 */
async function activateSubscription(userId, planId, paymentId) {
  try {
    // Get plan details
    const plan = await planService.getPlanById(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (plan.durationDays || 30) * 24 * 60 * 60 * 1000);

    // Update user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      logger.warn(`[Kyrrex] User not found during activation: ${userId}`);
      // Create basic user record
      await userRef.set({
        userId: userId,
        tier: plan.tier || 'Premium',
        membershipExpiresAt: expiresAt,
        activatedAt: now,
        paymentMethod: 'kyrrex',
        lastPaymentId: paymentId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Update existing user
      await userRef.update({
        tier: plan.tier || 'Premium',
        membershipExpiresAt: expiresAt,
        activatedAt: now,
        paymentMethod: 'kyrrex',
        lastPaymentId: paymentId,
        updatedAt: now,
      });
    }

    // Log activation
    await db.collection('subscription_activations').add({
      userId: userId,
      planId: planId,
      planName: plan.name,
      paymentId: paymentId,
      paymentMethod: 'kyrrex',
      amount: plan.price || plan.priceInUSD,
      tier: plan.tier || 'Premium',
      durationDays: plan.durationDays || 30,
      activatedAt: now,
      expiresAt: expiresAt,
      createdAt: now,
    });

    logger.info('[Kyrrex] Subscription activated:', {
      userId,
      planId,
      planName: plan.name,
      tier: plan.tier,
      expiresAt: expiresAt.toISOString(),
      paymentId,
    });

  } catch (error) {
    logger.error('[Kyrrex] Subscription activation error:', {
      error: error.message,
      userId,
      planId,
      paymentId,
    });
    throw error;
  }
}

/**
 * Send payment success notification to user
 * @param {string} userId - Telegram user ID
 * @param {Object} paymentData - Payment details
 */
async function notifyPaymentSuccess(userId, paymentData) {
  try {
    // Get bot instance (you'll need to import this or pass it as parameter)
    const { getBot } = require('../bot/index');
    const bot = getBot();

    if (!bot) {
      logger.warn('[Kyrrex] Bot instance not available for notification');
      return;
    }

    // Get user language preference
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const lang = userData.language || 'en';

    const safePlanName = escapeMdV2(String(paymentData.planName || ''));
    const safeAmount = escapeMdV2(String(paymentData.confirmedAmount || paymentData.cryptoAmount || ''));
    const safeCrypto = escapeMdV2(String(paymentData.cryptocurrency || ''));
    const safeTx = escapeMdV2(String(paymentData.txHash || ''));

    const successMsg = lang === 'es'
      ? `🎉 *¡Pago Confirmado!*\n\n` +
        `Tu suscripción ha sido activada exitosamente.\n\n` +
        `📦 *Plan:* ${safePlanName}\n` +
        `💰 *Pagado:* ${safeAmount} ${safeCrypto}\n` +
  `🔗 *TX Hash:* \`${safeTx}\`\n` +
        `✅ *Estado:* Confirmado\n\n` +
        `¡Bienvenido a PNPtv PRIME! 🎉\n\n` +
        `Ahora tienes acceso completo a todo el contenido premium.`
      : `🎉 *Payment Confirmed!*\n\n` +
        `Your subscription has been activated successfully.\n\n` +
        `📦 *Plan:* ${safePlanName}\n` +
        `💰 *Paid:* ${safeAmount} ${safeCrypto}\n` +
  `🔗 *TX Hash:* \`${safeTx}\`\n` +
        `✅ *Status:* Confirmed\n\n` +
        `Welcome to PNPtv PRIME! 🎉\n\n` +
        `You now have full access to all premium content.`;

    await bot.telegram.sendMessage(userId, successMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{
            text: lang === 'es' ? '🎬 Ir al Canal Premium' : '🎬 Go to Premium Channel',
            url: 'https://t.me/pnptvpremium', // Replace with your actual channel
          }],
          [{
            text: lang === 'es' ? '👤 Mi Perfil' : '👤 My Profile',
            callback_data: 'view_profile',
          }],
        ],
      },
    });

    logger.info('[Kyrrex] Payment success notification sent:', {
      userId,
      paymentId: paymentData.paymentId,
      planName: paymentData.planName,
    });

  } catch (error) {
    logger.error('[Kyrrex] Notification error:', {
      error: error.message,
      userId,
      paymentId: paymentData.paymentId,
    });
    // Don't throw - notification failure shouldn't break payment processing
  }
}

module.exports = router;