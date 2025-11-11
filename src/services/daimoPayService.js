const axios = require('axios');
const logger = require('../utils/logger');
const { db } = require('../config/firebase');

/**
 * Daimo Pay Integration Service (Updated API - Nov 2025)
 * Documentation: https://paydocs.daimo.com/
 * Handles USDC/stablecoin payments with cross-chain settlement
 */

const DAIMO_API_URL = 'https://pay.daimo.com/api/payment';
const DAIMO_API_KEY = process.env.DAIMO_API_KEY;
const DESTINATION_ADDRESS = process.env.DAIMO_DESTINATION_ADDRESS;
const REFUND_ADDRESS = process.env.DAIMO_REFUND_ADDRESS;
const BOT_URL = process.env.BOT_URL;

// Recommended settlement chains (low fees, fast finality)
const SUPPORTED_CHAINS = {
  BASE: 8453,        // Recommended: Low fees, Coinbase L2
  OPTIMISM: 10,      // Low fees, fast
  ARBITRUM: 42161,   // Low fees
  POLYGON: 137,      // Very low fees
};

// Common USDC token addresses
const USDC_TOKENS = {
  [SUPPORTED_CHAINS.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [SUPPORTED_CHAINS.OPTIMISM]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  [SUPPORTED_CHAINS.ARBITRUM]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [SUPPORTED_CHAINS.POLYGON]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
};

/**
 * Get Daimo configuration status
 * @returns {Object} Configuration object
 */
function getConfig() {
  return {
    enabled: !!(DAIMO_API_KEY && DESTINATION_ADDRESS && REFUND_ADDRESS),
    apiKey: DAIMO_API_KEY ? '***' + DAIMO_API_KEY.slice(-4) : null,
    destinationAddress: DESTINATION_ADDRESS,
    refundAddress: REFUND_ADDRESS,
    webhookUrl: BOT_URL ? `${BOT_URL}/daimo/webhook` : null,
  };
}

/**
 * Create a payment request via Daimo Pay API
 * @param {Object} options - Payment options
 * @param {string} options.planName - Name of the subscription plan
 * @param {number} options.amount - Amount in USD (will be converted to USDC)
 * @param {string} options.userId - Telegram user ID
 * @param {string} options.planId - Plan identifier
 * @param {string} options.userName - User's display name
 * @param {number} [options.chainId] - Destination chain (default: Base)
 * @returns {Promise<Object>} Payment data with checkout URL
 */
async function createPayment(options) {
  const { 
    planName, 
    amount, 
    userId, 
    planId, 
    userName = 'User',
    chainId = SUPPORTED_CHAINS.BASE 
  } = options;

  if (!DAIMO_API_KEY) {
    throw new Error('DAIMO_API_KEY not configured');
  }

  if (!DESTINATION_ADDRESS) {
    throw new Error('DAIMO_DESTINATION_ADDRESS not configured');
  }

  if (!REFUND_ADDRESS) {
    throw new Error('DAIMO_REFUND_ADDRESS not configured');
  }

  // Validate amount
  if (!amount || amount < 1) {
    throw new Error(`Invalid amount: ${amount}. Minimum is $1.00 USD`);
  }

  // Generate unique reference for tracking
  const reference = `${planId}_${userId}_${Date.now()}`;
  
  // Get USDC token address for selected chain
  const tokenAddress = USDC_TOKENS[chainId];
  if (!tokenAddress) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  // Format amount as precise decimal string (required by API)
  const amountUnits = amount.toFixed(2);

  // Prepare payment data according to Daimo API spec
  const paymentData = {
    display: {
      intent: `Subscription: ${planName}`,
      preferredChains: [SUPPORTED_CHAINS.BASE],  // Force Base network only
      preferredTokens: [
        { chain: SUPPORTED_CHAINS.BASE, address: USDC_TOKENS[SUPPORTED_CHAINS.BASE] },
      ],
      // Payment options removed - let Daimo determine available methods
      redirectUri: BOT_URL ? `${BOT_URL}/payment/success` : undefined,
    },
    destination: {
      destinationAddress: DESTINATION_ADDRESS,
      chainId: SUPPORTED_CHAINS.BASE,  // Force Base network
      tokenAddress: USDC_TOKENS[SUPPORTED_CHAINS.BASE],  // Force Base USDC token
      amountUnits: amountUnits,
    },
    refundAddress: REFUND_ADDRESS,
    metadata: {
      userId: userId.toString(),
      planId: planId,
      planName: planName,
      userName: userName,
      reference: reference,
      botName: 'PNPtv Bot',
    },
  };

  try {
    logger.info('[DaimoPay] Creating payment request', {
      planId,
      amount: amountUnits,
      userId,
      chainId,
    });

    // Call Daimo Pay API
    const response = await axios.post(DAIMO_API_URL, paymentData, {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': DAIMO_API_KEY,
      },
    });

    const { id, url, payment } = response.data;

    // Store payment intent in Firestore
    await db.collection('payment_intents').doc(id).set({
      paymentId: id,
      userId: userId,
      planId: planId,
      planName: planName,
      amount: parseFloat(amountUnits),
      currency: 'USDC',
      status: payment.status || 'payment_unpaid',
      reference: reference,
      checkoutUrl: url,
      chainId: chainId,
      tokenAddress: tokenAddress,
      destinationAddress: DESTINATION_ADDRESS,
      metadata: paymentData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('[DaimoPay] Payment created successfully', {
      paymentId: id,
      checkoutUrl: url,
      userId,
    });

    return {
      success: true,
      paymentId: id,
      checkoutUrl: url,
      reference: reference,
      status: payment.status,
      amount: amountUnits,
      chainId: chainId,
    };
  } catch (error) {
    logger.error('[DaimoPay] Payment creation error:', {
      error: error.message,
      response: error.response?.data,
      planId,
      userId,
    });

    throw new Error(`Failed to create payment: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get payment status from Daimo API
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} Payment details
 */
async function getPaymentStatus(paymentId) {
  if (!DAIMO_API_KEY) {
    throw new Error('DAIMO_API_KEY not configured');
  }

  try {
    const response = await axios.get(`${DAIMO_API_URL}/${paymentId}`, {
      headers: {
        'Api-Key': DAIMO_API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    logger.error('[DaimoPay] Get payment status error:', {
      error: error.message,
      paymentId,
    });
    throw error;
  }
}

/**
 * Process webhook event from Daimo
 * @param {Object} event - Webhook event data
 * @returns {Promise<Object>} Processed payment data
 */
async function processWebhook(event) {
  const { id, status, metadata, destination, source } = event;

  logger.info('[DaimoPay Webhook] Processing event', {
    paymentId: id,
    status,
    metadata,
  });

  // Update payment intent in Firestore
  try {
    const paymentRef = db.collection('payment_intents').doc(id);
    const updateData = {
      status: status,
      updatedAt: new Date(),
    };

    if (source) {
      updateData.source = {
        payerAddress: source.payerAddress,
        txHash: source.txHash,
        chainId: source.chainId,
        amountUnits: source.amountUnits,
        tokenSymbol: source.tokenSymbol,
        tokenAddress: source.tokenAddress,
      };
    }

    if (destination) {
      updateData.destination = {
        txHash: destination.txHash,
        chainId: destination.chainId,
        amountUnits: destination.amountUnits,
        tokenSymbol: destination.tokenSymbol,
        tokenAddress: destination.tokenAddress,
      };
    }

    if (status === 'payment_completed') {
      updateData.completedAt = new Date();
    }

    await paymentRef.update(updateData);

    return {
      success: true,
      paymentId: id,
      status,
      userId: metadata?.userId,
      planId: metadata?.planId,
      reference: metadata?.reference,
      amount: destination?.amountUnits || source?.amountUnits,
      txHash: destination?.txHash,
    };
  } catch (error) {
    logger.error('[DaimoPay Webhook] Error updating payment:', {
      error: error.message,
      paymentId: id,
    });
    throw error;
  }
}

module.exports = {
  getConfig,
  createPayment,
  getPaymentStatus,
  processWebhook,
  SUPPORTED_CHAINS,
  USDC_TOKENS,
};
