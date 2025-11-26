const { db } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * COP Card Payment Service
 * Handles manual Credit/Debit card payments in Colombian Pesos
 */

/**
 * Generate unique payment reference
 * Format: COP<userId><timestamp>
 */
function generateReference(userId) {
  const timestamp = Date.now().toString().slice(-8);
  return `COP${userId}${timestamp}`;
}

/**
 * Create payment intent for COP card payment
 * @param {Object} params - Payment parameters
 * @param {string} params.userId - Telegram user ID
 * @param {string} params.planId - Plan identifier
 * @param {string} params.planName - Plan display name
 * @param {number} params.amountCOP - Amount in Colombian Pesos
 * @param {number} params.durationDays - Subscription duration
 * @param {string} params.tier - Membership tier
 * @param {string} params.paymentLink - Wompi payment link
 * @returns {Promise<Object>} Payment intent object
 */
async function createPaymentIntent({
  userId,
  planId,
  planName,
  amountCOP,
  durationDays,
  tier,
  paymentLink
}) {
  try {
    const reference = generateReference(userId);
    const paymentId = `cop_card_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Use provided payment link or fallback
    const finalPaymentLink = paymentLink || process.env.COP_CARD_PAYMENT_LINK || 'https://pnptv.app/cop-card/instructions';

    const paymentIntent = {
      paymentId,
      userId,
      planId,
      planName,
      amount: amountCOP,
      currency: 'COP',
      durationDays,
      tier,
      paymentMethod: 'cop_card',
      status: 'pending_payment',
      reference,
      paymentLink: finalPaymentLink,
      checkoutUrl: null, // Not applicable for manual payments
      userNotified: false,
      adminNotified: false,
      metadata: {
        userId,
        planId,
        planName,
        reference,
        botName: 'PNPtv',
        tier,
        durationDays
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
      completedAt: null
    };

    // Store in Firestore
    await db.collection('payment_intents').doc(paymentId).set(paymentIntent);

    logger.info(`COP card payment intent created: ${paymentId} for user ${userId}`);

    return paymentIntent;
  } catch (error) {
    logger.error('Error creating COP card payment intent:', error);
    throw error;
  }
}

/**
 * Get payment intent by reference
 */
async function getPaymentByReference(reference) {
  try {
    const snapshot = await db.collection('payment_intents')
      .where('reference', '==', reference)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error getting payment by reference:', error);
    throw error;
  }
}

/**
 * Get payment intent by payment ID
 */
async function getPaymentById(paymentId) {
  try {
    const doc = await db.collection('payment_intents').doc(paymentId).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error getting payment by ID:', error);
    throw error;
  }
}

/**
 * Update payment status
 */
async function updatePaymentStatus(paymentId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      updatedAt: new Date(),
      ...additionalData
    };

    await db.collection('payment_intents').doc(paymentId).update(updateData);

    logger.info(`Payment ${paymentId} status updated to: ${status}`);

    return true;
  } catch (error) {
    logger.error('Error updating payment status:', error);
    throw error;
  }
}

/**
 * Mark payment as awaiting verification (user clicked "I've paid")
 */
async function markAsAwaitingVerification(paymentId, userId) {
  try {
    await updatePaymentStatus(paymentId, 'awaiting_verification', {
      userNotified: true,
      userConfirmedAt: new Date()
    });

    logger.info(`Payment ${paymentId} marked as awaiting verification by user ${userId}`);

    return true;
  } catch (error) {
    logger.error('Error marking payment as awaiting verification:', error);
    throw error;
  }
}

/**
 * Verify payment (admin action)
 */
async function verifyPayment(paymentId, adminId) {
  try {
    await updatePaymentStatus(paymentId, 'verified', {
      verifiedAt: new Date(),
      verifiedBy: adminId,
      adminNotified: true
    });

    logger.info(`Payment ${paymentId} verified by admin ${adminId}`);

    return true;
  } catch (error) {
    logger.error('Error verifying payment:', error);
    throw error;
  }
}

/**
 * Mark payment as completed (after membership activation)
 */
async function markAsCompleted(paymentId) {
  try {
    await updatePaymentStatus(paymentId, 'completed', {
      completedAt: new Date()
    });

    logger.info(`Payment ${paymentId} marked as completed`);

    return true;
  } catch (error) {
    logger.error('Error marking payment as completed:', error);
    throw error;
  }
}

/**
 * Send admin notification about pending verification
 */
async function notifyAdmin(bot, paymentIntent) {
  try {
    const adminChatId = process.env.COP_CARD_ADMIN_NOTIFICATION_CHAT_ID;

    if (!adminChatId) {
      logger.warn('COP_CARD_ADMIN_NOTIFICATION_CHAT_ID not configured');
      return false;
    }

    const verificationUrl = `${process.env.WEBHOOK_URL || 'https://pnptv.app'}/cop-card/payment/${paymentIntent.reference}`;

    const message = `🔔 *Nuevo Pago Pendiente - Tarjeta COP*\n\n` +
      `👤 Usuario: ${paymentIntent.userId}\n` +
      `💎 Plan: ${paymentIntent.planName}\n` +
      `💰 Monto: $${paymentIntent.amount.toLocaleString('es-CO')} COP\n` +
      `🔖 Referencia: \`${paymentIntent.reference}\`\n` +
      `📅 Fecha: ${paymentIntent.createdAt.toLocaleString('es-CO')}\n\n` +
      `🔗 [Verificar y Activar](${verificationUrl})`;

    await bot.telegram.sendMessage(adminChatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✅ Verificar Pago',
              url: verificationUrl
            }
          ]
        ]
      }
    });

    logger.info(`Admin notified about payment ${paymentIntent.paymentId}`);

    return true;
  } catch (error) {
    logger.error('Error notifying admin:', error);
    return false;
  }
}

/**
 * Get user's recent payments
 */
async function getUserPayments(userId, limit = 10) {
  try {
    const snapshot = await db.collection('payment_intents')
      .where('userId', '==', userId)
      .where('paymentMethod', '==', 'cop_card')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting user payments:', error);
    throw error;
  }
}

/**
 * Get all pending verification payments
 */
async function getPendingVerificationPayments() {
  try {
    const snapshot = await db.collection('payment_intents')
      .where('paymentMethod', '==', 'cop_card')
      .where('status', '==', 'awaiting_verification')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting pending verification payments:', error);
    throw error;
  }
}

module.exports = {
  generateReference,
  createPaymentIntent,
  getPaymentByReference,
  getPaymentById,
  updatePaymentStatus,
  markAsAwaitingVerification,
  verifyPayment,
  markAsCompleted,
  notifyAdmin,
  getUserPayments,
  getPendingVerificationPayments
};
