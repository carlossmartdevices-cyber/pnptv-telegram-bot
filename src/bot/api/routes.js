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
      duration: plan.duration || plan.durationDays,
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
