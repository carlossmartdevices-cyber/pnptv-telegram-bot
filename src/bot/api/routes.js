/**
 * API Routes for Payment Page Integration
 * Handles communication between React payment page and Telegram bot backend
 */

const express = require('express');
const router = express.Router();
const planService = require('../../services/planService');
const logger = require('../../utils/logger');
const { db } = require('../../config/firebase');

/**
 * GET /api/plans/:planId
 * Fetch plan details for payment page
 */
router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;

    logger.info(`API: Fetching plan details for ${planId}`);

    const plan = await planService.getPlanById(planId);

    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        message: `No plan found with ID: ${planId}`,
      });
    }

    // Return plan data in format expected by payment page
    res.json({
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName || plan.name,
      price: plan.price,
      priceInCOP: plan.priceInCOP,
      currency: plan.currency || 'USD',
      duration: plan.duration || plan.durationDays || 30,
      durationDays: plan.durationDays || plan.duration || 30,
      features: plan.features || [],
      icon: plan.icon || '💎',
      description: plan.description,
    });
  } catch (error) {
    logger.error('API: Error fetching plan:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch plan details',
    });
  }
});

/**
 * POST /api/payments/started
 * Called when user initiates payment in Daimo Pay modal
 */
router.post('/payments/started', async (req, res) => {
  try {
    const { userId, planId, amount, reference } = req.body;

    logger.info(`API: Payment started - User: ${userId}, Plan: ${planId}, Ref: ${reference}`);

    // Store payment intent in database (optional, for tracking)
    try {
      await db.collection('payment_intents').doc(reference).set({
        userId,
        planId,
        amount: parseFloat(amount),
        reference,
        status: 'started',
        createdAt: Date.now(),
      });
    } catch (dbError) {
      logger.warn('Failed to store payment intent:', dbError);
      // Don't fail the request if DB write fails
    }

    res.json({ success: true, reference });
  } catch (error) {
    logger.error('API: Error handling payment start:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process payment start notification',
    });
  }
});

/**
 * POST /api/payments/completed
 * Called when payment completes in Daimo Pay modal
 * This is the client-side callback - webhook will provide authoritative confirmation
 */
router.post('/payments/completed', async (req, res) => {
  try {
    const { userId, planId, amount, reference } = req.body;

    logger.info(`API: Payment completed (client callback) - User: ${userId}, Plan: ${planId}, Ref: ${reference}`);

    // Update payment intent status
    try {
      await db.collection('payment_intents').doc(reference).update({
        status: 'completed_client',
        completedAt: Date.now(),
      });
    } catch (dbError) {
      logger.warn('Failed to update payment intent:', dbError);
    }

    // Note: Don't activate subscription here - wait for webhook confirmation
    // This is just a client-side event that can be spoofed

    res.json({
      success: true,
      message: 'Payment notification received. Waiting for webhook confirmation.',
    });
  } catch (error) {
    logger.error('API: Error handling payment completion:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process payment completion notification',
    });
  }
});

/**
 * POST /api/payment/completed
 * Called by daimo-payment-app when payment is confirmed
 * This endpoint actually activates the subscription
 */
router.post('/payment/completed', async (req, res) => {
  try {
    const { amount, planId, userId, reference, paymentMethod = 'daimo' } = req.body;

    logger.info('Payment completion notification received from payment app:', {
      userId,
      planId,
      amount,
      reference,
      paymentMethod
    });

    if (!userId || !planId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, planId'
      });
    }

    // Get plan details
    const plan = await planService.getPlanById(planId);
    if (!plan) {
      logger.error('Plan not found for payment completion:', { planId, userId });
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Check if user exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      logger.error('User not found for payment completion:', { userId, planId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Use membership manager to activate subscription
    const { activateMembership } = require('../../utils/membershipManager');
    const durationDays = plan.duration || plan.durationDays || 30;
    
    // Get bot instance
    const bot = require('../index');
    
    const result = await activateMembership(userId, plan.tier, `${paymentMethod}_app`, durationDays, bot);

    // Store payment metadata
    const now = new Date();
    await userRef.update({
      membershipPlanId: plan.id,
      membershipPlanName: plan.displayName || plan.name,
      paymentMethod: paymentMethod,
      paymentReference: reference,
      paymentAmount: parseFloat(amount || '0'),
      paymentCurrency: paymentMethod === 'daimo' ? 'USDC' : 'COP',
      paymentDate: now,
      lastPaymentStatus: 'completed',
      updatedAt: now,
    });

    logger.info('Subscription activated from payment app:', {
      userId,
      planId,
      tier: plan.tier,
      expiresAt: result.expiresAt?.toISOString(),
      inviteLink: result.inviteLink ? 'generated' : 'none',
    });

    // Send confirmation message to user using standardized format
    try {
      const userData = userDoc.data();
      const userName = userData.username || userData.firstName || 'User';
      const userLanguage = userData.language || 'en';

      const { generateConfirmationMessage } = require('../../utils/membershipManager');
      
      const confirmationMessage = generateConfirmationMessage({
        userName,
        planName: plan.displayName || plan.name,
        durationDays,
        expiresAt: result.expiresAt,
        paymentAmount: amount,
        paymentCurrency: paymentMethod === 'daimo' ? 'USDC' : 'COP',
        paymentMethod,
        reference,
        inviteLink: result.inviteLink,
        language: userLanguage
      });

      await bot.telegram.sendMessage(userId, confirmationMessage, { parse_mode: "Markdown" });
      logger.info('Confirmation message sent to user from payment app');
    } catch (msgError) {
      logger.warn('Failed to send confirmation message from payment app:', msgError.message);
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      subscription: {
        planId: plan.id,
        tier: plan.tier,
        expiresAt: result.expiresAt?.toISOString(),
        inviteLink: result.inviteLink ? 'provided' : 'none'
      }
    });

  } catch (error) {
    logger.error('Error processing payment completion from payment app:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/daimo/payment-completed
 * Called from payment page when Daimo payment completes
 */
router.post('/daimo/payment-completed', async (req, res) => {
  try {
    const { plan, user, amount, txHash } = req.body;

    logger.info(`API: Daimo payment completed - User: ${user}, Plan: ${plan}, TxHash: ${txHash}`);

    // Store payment info (webhook will confirm and activate)
    try {
      const reference = `${plan}_${user}_${Date.now()}`;
      await db.collection('payment_intents').doc(reference).set({
        userId: user,
        planId: plan,
        amount: parseFloat(amount),
        txHash: txHash,
        reference,
        status: 'completed_client',
        provider: 'daimo',
        createdAt: Date.now(),
        completedAt: Date.now(),
      });
    } catch (dbError) {
      logger.warn('Failed to store payment completion:', dbError);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('API: Error handling Daimo payment completion:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process payment',
    });
  }
});

/**
 * GET /api/payments/status
 * Check payment status (for polling from payment page)
 */
router.get('/payments/status', async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({
        error: 'Missing reference',
        message: 'Payment reference is required',
      });
    }

    logger.info(`API: Checking payment status for ${reference}`);

    // Check payment intent in database
    const paymentIntent = await db.collection('payment_intents').doc(reference).get();

    if (!paymentIntent.exists) {
      return res.json({
        status: 'not_found',
        message: 'Payment intent not found',
      });
    }

    const data = paymentIntent.data();

    res.json({
      status: data.status || 'pending',
      reference: reference,
      amount: data.amount,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
    });
  } catch (error) {
    logger.error('API: Error checking payment status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check payment status',
    });
  }
});

module.exports = router;
