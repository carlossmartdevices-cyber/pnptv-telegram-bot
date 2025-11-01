/**
 * Daimo Pay webhook handler
 * Handles payment notifications from Daimo Pay
 */
const logger = require('../../utils/logger');
const { verifyWebhookAuth } = require('../../config/daimo');
const { activateMembership } = require('../../utils/membershipManager');
const { db } = require('../../config/firebase');

const { verifyWebhookSignature } = require('@daimo/pay-common');
const { rateLimit } = require('express-rate-limit');
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

/**
 * Handle Daimo webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} bot - Telegram bot instance
 */
async function handleDaimoWebhook(req, res, bot) {
  try {
    // Apply rate limiting
    await new Promise((resolve, reject) => {
      webhookLimiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Verify Daimo webhook signature
    const signature = req.headers['x-daimo-signature'];
    const timestamp = req.headers['x-daimo-timestamp'];
    const webhookSecret = process.env.DAIMO_WEBHOOK_TOKEN;

    const isValid = verifyWebhookSignature({
      payload: req.body,
      signature,
      timestamp,
      secret: webhookSecret
    });

    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        signature,
        timestamp,
        ip: req.ip
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const { type, reference, amount } = event;

    logger.info('Received Daimo webhook event:', {
      type,
      reference,
      amount,
      timestamp: new Date().toISOString()
    });

    switch (type) {
      case 'payment_started':
        // Log payment initiation
        logger.info('Payment started:', { reference, amount });
        break;

      case 'payment_completed':
        try {
          // Validate payment data
          if (!reference || !event.payment) {
            throw new Error('Invalid payment data');
          }

          // Retrieve and validate payment intent
          const paymentIntentRef = db.collection('payment_intents').doc(reference);
          const paymentIntent = await paymentIntentRef.get();
          
          if (!paymentIntent.exists) {
            throw new Error('Payment intent not found');
          }

          const { userId, planId, amount } = paymentIntent.data();
          
          // Validate amount matches
          if (event.payment.amount !== amount) {
            throw new Error('Amount mismatch');
          }

          // Get plan details
          const plan = PLANS.find(p => p.id === planId);
          if (!plan) {
            throw new Error('Invalid plan');
          }

          // Activate membership with retry logic
          let result;
          for (let i = 0; i < 3; i++) {
            try {
              result = await activateMembership(
                userId, 
                planId, 
                'daimo_webhook',
                event.payment.id,
                bot
              );
              break;
            } catch (err) {
              if (i === 2) throw err;
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
          }

          // Send confirmation with rich details
          await bot.telegram.sendMessage(
            userId,
            `✅ *Payment Confirmed!*\n\n` +
            `Your *${plan.name}* subscription is now active.\n\n` +
            `� *Duration:* ${plan.periodLabel}\n` +
            `💰 *Amount paid:* $${amount} USDC\n` +
            `🎉 *Features unlocked:*\n${plan.features.map(f => `• ${f}`).join('\n')}\n\n` +
            `🔗 *Join channel:* ${result.inviteLink}\n\n` +
            `Need help? Use /support to contact us.`,
            {
              parse_mode: 'Markdown',
              disable_web_page_preview: true
            }
          );

          // Log successful activation
          logger.info('Subscription activated:', {
            userId,
            planId,
            paymentId: event.payment.id,
            amount
          });

          // Send admin notification for high-value subscriptions
          if (Number(amount) >= 50) {
            notifyAdmins(
              `🎉 New ${plan.name} subscription!\n` +
              `User: ${userId}\n` +
              `Amount: $${amount} USDC`
            );
          }
        } catch (error) {
          logger.error('Error processing payment completion:', error);
          // Save failed activation for manual review
          await db.collection('failed_activations').add({
            paymentId: reference,
            error: error.message,
            timestamp: new Date(),
            data: event
          });
          throw error;
        }

        // Update payment intent status
        await paymentIntentRef.update({
          status: 'completed',
          completedAt: new Date().toISOString(),
          subscription: {
            activatedAt: new Date().toISOString(),
            inviteLink: result.inviteLink
          }
        });

        break;

      case 'payment_bounced':
        logger.warn('Payment bounced:', {
          reference,
          reason: event.reason
        });
        
        // Notify user of failed payment
        const bouncedPaymentIntent = await db.collection('payment_intents')
          .doc(reference)
          .get();
        
        if (bouncedPaymentIntent.exists) {
          const { userId } = bouncedPaymentIntent.data();
          await bot.telegram.sendMessage(
            userId,
            `⚠️ Tu pago no pudo ser procesado. Por favor intenta nuevamente.\n\n` +
            `Your payment could not be processed. Please try again.`
          );
        }
        break;

      case 'payment_refunded':
        logger.info('Payment refunded:', { reference, amount });
        break;

      default:
        logger.warn('Unknown webhook event type:', type);
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('Error processing Daimo webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { handleDaimoWebhook };