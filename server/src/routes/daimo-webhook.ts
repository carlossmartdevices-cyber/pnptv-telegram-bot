import { Router } from 'express';
import { firestore } from '../services/firestore';
import { log } from '../services/logger';

const router = Router();

// Daimo sends JSON; verify Authorization: Basic <token>
router.post('/api/daimo/webhook', (req, res, next) => {
  // ensure JSON parsing
  if (!req.is('application/json')) return res.status(415).send('Unsupported Media Type');
  next();
}, require('express').json(), async (req, res) => {
  try {
    const auth = req.get('Authorization') || '';
    const expected = `Basic ${process.env.DAIMO_WEBHOOK_TOKEN}`;
    if (!process.env.DAIMO_WEBHOOK_TOKEN || auth !== expected) {
      return res.status(401).send('Unauthorized');
    }

    const event = req.body; // { type, payment }
    const { type, payment } = event || {};

    // Idempotency (optional): use Idempotency-Key or payment.id
    // const idem = req.get('Idempotency-Key') || payment?.id;

    log.info('Daimo event:', type, payment?.id);

    if (type === 'payment_completed') {
      const userId = payment?.metadata?.userId;
      const planId = payment?.metadata?.planId;
      if (userId && planId) {
        await firestore.collection('users').doc(userId).set({
          tier: planId,
          subscriptionActive: true,
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lastPaymentId: payment.id,
          lastPaymentAt: new Date(),
        }, { merge: true });

        await firestore.collection('payments').doc(payment.id).set({
          status: payment.status,
          type,
          userId,
          planId,
          raw: payment,
          createdAt: new Date(),
        }, { merge: true });

        log.info(`Activated subscription for user ${userId} plan ${planId}`);
      } else {
        log.warn('Missing metadata in payment', payment?.id);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    log.error('Webhook error', err);
    // ACK anyway to avoid retries storm; alert asynchronously
    res.status(200).send('OK');
  }
});

export default router;
