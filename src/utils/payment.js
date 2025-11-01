const crypto = require('crypto');
const logger = require('./logger');

/**
 * Generate signature for payment parameters
 */
function generatePaymentSignature(userId, planId, timestamp) {
  try {
    const secret = process.env.PAYMENT_SIGNATURE_SECRET;
    if (!secret) {
      throw new Error('Payment signature secret not configured');
    }

    const data = `${userId}:${planId}:${timestamp}`;
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  } catch (error) {
    logger.error('Error generating payment signature:', error);
    throw error;
  }
}

/**
 * Verify payment signature
 */
function verifyPaymentSignature(userId, planId, timestamp, signature) {
  try {
    const expectedSignature = generatePaymentSignature(userId, planId, timestamp);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Format amount for display
 */
function formatAmount(amount, currency = 'USDC') {
  try {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    return `${num.toFixed(2)} ${currency}`;
  } catch (error) {
    logger.error('Error formatting amount:', error);
    return '0.00 USDC';
  }
}

/**
 * Validate payment amount
 */
function validateAmount(amount, planPrice) {
  try {
    const paymentAmount = parseFloat(amount);
    const expectedAmount = parseFloat(planPrice);
    
    if (isNaN(paymentAmount) || isNaN(expectedAmount)) {
      return false;
    }

    // Allow 0.01 USDC tolerance for rounding
    return Math.abs(paymentAmount - expectedAmount) <= 0.01;
  } catch (error) {
    logger.error('Error validating amount:', error);
    return false;
  }
}

/**
 * Generate order ID
 */
function generateOrderId() {
  return `ord_${crypto.randomBytes(16).toString('hex')}`;
}

/**
 * Handle failed payment activation
 */
async function handleFailedActivation(userId, planId, error, bot) {
  try {
    // Log error
    logger.error('Failed payment activation:', {
      userId,
      planId,
      error: error.message
    });

    // Save to failed activations collection
    await firestore.collection('failed_activations').add({
      userId,
      planId,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Notify user
    await bot.telegram.sendMessage(
      userId,
      '❌ There was an error activating your subscription.\n\n' +
      'Our team has been notified and will resolve this issue.\n' +
      'Please contact support if you need immediate assistance.'
    );

    // Notify admin
    await notifyAdmins(
      `⚠️ Failed payment activation\n` +
      `User: ${userId}\n` +
      `Plan: ${planId}\n` +
      `Error: ${error.message}`
    );
  } catch (error) {
    logger.error('Error handling failed activation:', error);
  }
}

module.exports = {
  generatePaymentSignature,
  verifyPaymentSignature,
  formatAmount,
  validateAmount,
  generateOrderId,
  handleFailedActivation
};