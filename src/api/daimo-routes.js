// Daimo Pay API Routes
const express = require('express');
const crypto = require('crypto');
const { db } = require('../config/firebase');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { activateMembership } = require('../utils/membershipManager');

// Get bot instance (will be set when mounting routes)
let bot = null;

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

// Middleware to inject bot instance
router.use((req, res, next) => {
  if (!bot) {
    bot = require('../bot/index');
  }
  next();
});

// Apply rate limiting to all routes
router.use(apiLimiter);

// ============================================
// Helper Functions
// ============================================

/**
 * Verify Daimo webhook request signature using HMAC-SHA256
 */
function verifyRequestSignature(body, signature, timestamp) {
  const secret = process.env.DAIMO_WEBHOOK_TOKEN;
  if (!secret) {
    logger.warn('[Daimo] Webhook token not configured');
    return false;
  }

  // Reconstruct the signed message: timestamp + body
  const message = `${timestamp}.${JSON.stringify(body)}`;
  
  // Create HMAC-SHA256 signature
  const hash = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  // Compare signatures (constant-time comparison to prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}

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

router.post('/api/daimo/webhook', webhookLimiter, express.json(), async (req, res) => {
  try {
    // Verify authorization via Authorization header
    const auth = req.get('Authorization') || '';
    const expectedToken = process.env.DAIMO_WEBHOOK_TOKEN;
    const expected = `Basic ${expectedToken}`;

    if (!expectedToken || auth !== expected) {
      logger.warn('[Daimo] Webhook unauthorized - invalid auth header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify request signature if validation enabled
    if (process.env.DAIMO_WEBHOOK_VALIDATION === 'true') {
      const signature = req.get('X-Daimo-Signature') || '';
      const timestamp = req.get('X-Daimo-Timestamp') || '';
      
      if (!verifyRequestSignature(req.body, signature, timestamp)) {
        logger.warn('[Daimo] Webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    const { type, payment } = event || {};

    logger.info('[Daimo] Webhook event received:', {
      type,
      paymentId: payment?.id,
      userId: payment?.metadata?.userId
    });

    if (type === 'payment_completed') {
      const userId = payment?.metadata?.userId;
      const planId = payment?.metadata?.planId;

      if (!userId || !planId) {
        logger.warn('[Daimo] Missing payment metadata:', { userId, planId });
        return res.status(200).json({ status: 'ok', warning: 'Missing metadata' });
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

      try {
        // Use membership manager to activate subscription and generate invite link
        const result = await activateMembership(
          userId.toString(), 
          planId, 
          'daimo_webhook',
          payment.id,
          bot
        );

        // Store additional payment metadata
        const now = new Date();
        await db.collection('users').doc(userId.toString()).update({
          tier: planId,
          subscriptionActive: true,
          subscriptionEndsAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
          lastPaymentId: payment.id,
          lastPaymentAt: now,
          paymentMethod: 'daimo',
          updatedAt: now
        });

        // Store payment record
        await db.collection('payments').doc(payment.id).set({
          status: payment.status,
          type,
          userId,
          planId,
          amount: payment.amount,
          currency: payment.currency,
          raw: payment,
          createdAt: now
        }, { merge: true });

        logger.info('[Daimo] ✅ Activated subscription:', {
          userId,
          planId,
          durationDays,
          paymentId: payment.id,
          amount: payment.amount,
          inviteLink: result.inviteLink ? 'generated' : 'none'
        });
      } catch (activationError) {
        logger.error('[Daimo] Error activating membership:', activationError);
        // Still acknowledge to prevent retry
        return res.status(200).json({ status: 'ok', warning: 'Activation error' });
      }
    } else {
      logger.warn('[Daimo] Unhandled event type:', { type, paymentId: payment?.id });
    }

    // Always return 200 OK to acknowledge receipt and prevent retries
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error('[Daimo] Webhook processing error:', {
      error: err.message,
      stack: err.stack,
      paymentId: req.body?.payment?.id
    });
    // ACK anyway to prevent retry storms
    return res.status(200).json({ status: 'ok', error: 'Processing error' });
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
