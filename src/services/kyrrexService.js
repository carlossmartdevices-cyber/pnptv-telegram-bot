const { db } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Minimal Kyrrex service shim
 * - Provides lightweight implementations so routes can require the module
 * - Safe defaults, no external network calls
 * - Replace with full integration when ready
 */

function generateId(prefix = 'kyrrex') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

async function verifyWebhookSignature(body, signature) {
  // Kyrrex webhook signing not yet implemented — return true for now
  return true;
}

async function processWebhook(event = {}) {
  try {
    // Basic normalization so callers (routes) can proceed
    const result = {
      success: false,
      status: event.status || event.type || 'unknown',
      paymentId: event.id || generateId('payment'),
      userId: event.userId || event.metadata?.userId || null,
      planId: event.planId || event.metadata?.planId || null,
      raw: event,
    };

    // If no userId, consider this a non-actionable webhook
    if (!result.userId) {
      result.success = false;
      result.message = 'No userId in event';
      return result;
    }

    // Try to persist a lightweight payment record to Firestore (non-blocking if db not configured)
    try {
      const docRef = db && db.collection ? db.collection('kyrrex_payments').doc(result.paymentId) : null;
      if (docRef) {
        await docRef.set({
          paymentId: result.paymentId,
          userId: result.userId,
          planId: result.planId,
          status: result.status,
          eventAt: new Date(),
          raw: result.raw,
        }, { merge: true });
      }
    } catch (e) {
      logger.warn('[kyrrexService] Failed to persist webhook record:', e.message || e);
    }

    // If event indicates completion, report success
    if (result.status === 'completed' || result.status === 'payment_completed' || result.status === 'confirmed') {
      result.success = true;
      result.status = 'completed';
    } else {
      // Not completed yet, still return successful parsing
      result.success = true;
    }

    return result;
  } catch (error) {
    logger.error('[kyrrexService] processWebhook error:', error);
    return { success: false, message: error.message };
  }
}

async function checkPaymentStatus(paymentId) {
  try {
    if (!paymentId) return { status: 'unknown', paymentId };

    if (db && db.collection) {
      const doc = await db.collection('kyrrex_payments').doc(paymentId).get();
      if (doc.exists) {
        const data = doc.data();
        return {
          success: true,
          paymentId,
          status: data.status || 'pending',
          userId: data.userId,
          planId: data.planId,
          cryptoAmount: data.confirmedAmount || data.cryptoAmount,
          txHash: data.txHash,
          subscriptionActivated: !!data.subscriptionActivated,
          raw: data,
        };
      }
    }

    // Default fallback
    return { success: true, paymentId, status: 'pending' };
  } catch (error) {
    logger.error('[kyrrexService] checkPaymentStatus error:', error);
    return { success: false, message: error.message };
  }
}

async function createPayment({ planName, amount, userId, planId, userName, cryptocurrency = 'USDT', network } = {}) {
  try {
    const paymentId = generateId('kyrrex');
    const depositAddress = `0x${Math.random().toString(16).slice(2, 18)}`;
    const now = new Date();

    const record = {
      paymentId,
      planName: planName || null,
      amount: amount || null,
      userId: userId || null,
      planId: planId || null,
      userName: userName || null,
      cryptocurrency,
      network: network || null,
      depositAddress,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    if (db && db.collection) {
      await db.collection('kyrrex_payments').doc(paymentId).set(record);
    }

    return { success: true, paymentId, depositAddress, record };
  } catch (error) {
    logger.error('[kyrrexService] createPayment error:', error);
    return { success: false, message: error.message };
  }
}

async function getExchangeRates(base = 'USD') {
  // Minimal static rates — replace with real API integration later
  const rates = {
    USD: 1,
    USDT: 1,
    BTC: 0.00003,
    ETH: 0.0005,
  };
  return { success: true, base, rates, fetchedAt: new Date().toISOString() };
}

module.exports = {
  verifyWebhookSignature,
  processWebhook,
  checkPaymentStatus,
  createPayment,
  getExchangeRates,
};
