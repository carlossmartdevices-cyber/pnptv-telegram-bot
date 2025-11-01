// Daimo Pay API Routes
const express = require('express');
const { firestore } = require('../config/firebase');
const { rateLimit } = require('express-rate-limit');
const { verifyWebhookSignature } = require('@daimo/pay-common');
const logger = require('../utils/logger');

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

// ============================================
// Plans API - Returns subscription plan details
// ============================================

const PLANS = [
  { id: 'trial-week', name: 'Trial Week', price: '14.99', description: '7 days access', periodLabel: '1 week' },
  { id: 'pnp-member', name: 'PNP Member', price: '24.99', description: '30 days access', periodLabel: '1 month' },
  { id: 'crystal-member', name: 'PNP Crystal Member', price: '49.99', description: '120 days access', periodLabel: '4 months' },
  { id: 'diamond-member', name: 'PNP Diamond Member', price: '99.99', description: '365 days access', periodLabel: '1 year' },
];

router.get('/api/plans/:planId', (req, res) => {
  const plan = PLANS.find(p => p.id === req.params.planId);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  res.json(plan);
});

// ============================================
// Daimo Webhook - Receives payment notifications
// ============================================

router.post('/api/daimo/webhook', express.json(), async (req, res) => {
  try {
    // Verify authorization
    const auth = req.get('Authorization') || '';
    const expectedToken = process.env.DAIMO_WEBHOOK_TOKEN;
    const expected = `Basic ${expectedToken}`;

    if (!expectedToken || auth !== expected) {
      console.error('[Daimo] Webhook unauthorized:', auth);
      return res.status(401).send('Unauthorized');
    }

    const event = req.body;
    const { type, payment } = event || {};

    console.log('[Daimo] Webhook event:', type, payment?.id);

    if (type === 'payment_completed') {
      const userId = payment?.metadata?.userId;
      const planId = payment?.metadata?.planId;

      if (!userId || !planId) {
        console.warn('[Daimo] Missing metadata:', { userId, planId });
        return res.status(200).send('OK');
      }

      // Find plan to get duration
      const plan = PLANS.find(p => p.id === planId);
      let durationDays = 30; // default

      if (plan) {
        if (planId === 'trial-week') durationDays = 7;
        else if (planId === 'pnp-member') durationDays = 30;
        else if (planId === 'crystal-member') durationDays = 120;
        else if (planId === 'diamond-member') durationDays = 365;
      }

      // Update user subscription in Firestore
      await firestore.collection('users').doc(userId).set({
        tier: planId,
        subscriptionActive: true,
        subscriptionEndsAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        lastPaymentId: payment.id,
        lastPaymentAt: new Date(),
        paymentMethod: 'daimo',
        updatedAt: new Date()
      }, { merge: true });

      // Store payment record
      await firestore.collection('payments').doc(payment.id).set({
        status: payment.status,
        type,
        userId,
        planId,
        amount: payment.amount,
        currency: payment.currency,
        raw: payment,
        createdAt: new Date()
      }, { merge: true });

      console.log(`[Daimo] ✅ Activated subscription for user ${userId}, plan ${planId}, ${durationDays} days`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Daimo] Webhook error:', err);
    // ACK anyway to avoid retry storms
    res.status(200).send('OK');
  }
});

// ============================================
// Health check endpoint
// ============================================

router.get('/api/daimo/health', (req, res) => {
  res.json({
    status: 'ok',
    daimo: {
      appId: process.env.DAIMO_APP_ID,
      webhookConfigured: !!process.env.DAIMO_WEBHOOK_TOKEN,
      treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS
    }
  });
});

module.exports = router;
