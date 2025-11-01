const express = require('express');
const { firestore } = require('../config/firebase');
const logger = require('../utils/logger');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();

// Rate limiting for payment intents
const paymentIntentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment intents per 15 minutes
  message: 'Too many payment attempts, please try again later'
});

router.post('/', paymentIntentLimiter, async (req, res) => {
  try {
    const { paymentId, userId, planId, amount } = req.body;

    // Validate required fields
    if (!paymentId || !userId || !planId || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Validate amount format
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount' 
      });
    }

    // Check if user already has a pending payment
    const pendingPayments = await firestore
      .collection('payment_intents')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    if (!pendingPayments.empty) {
      return res.status(409).json({
        error: 'User already has a pending payment'
      });
    }

    // Save payment intent
    await firestore.collection('payment_intents').doc(paymentId).set({
      userId,
      planId,
      amount: amount.toString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });

    // Log payment intent creation
    logger.info('Payment intent created:', {
      paymentId,
      userId,
      planId,
      amount
    });

    res.status(201).json({
      success: true,
      message: 'Payment intent created'
    });

  } catch (error) {
    logger.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Get payment intent status
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const doc = await firestore
      .collection('payment_intents')
      .doc(paymentId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        error: 'Payment intent not found'
      });
    }

    const data = doc.data();
    res.json({
      status: data.status,
      createdAt: data.createdAt
    });

  } catch (error) {
    logger.error('Error getting payment intent:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;