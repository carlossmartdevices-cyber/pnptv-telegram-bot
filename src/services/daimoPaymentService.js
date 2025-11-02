/**
 * Daimo Pay Server-Side Payment Service
 * Creates payment links via Daimo Pay REST API
 */

const axios = require('axios');
const logger = require('../utils/logger');

const DAIMO_API_URL = process.env.DAIMO_API_URL || 'https://pay.daimo.com/api';
const DAIMO_API_KEY = process.env.DAIMO_API_KEY;

/**
 * Create a payment link via Daimo Pay REST API
 * @param {Object} params Payment parameters
 * @param {string} params.userId - Telegram user ID
 * @param {string} params.planId - Subscription plan ID
 * @param {number} params.amount - Payment amount in USD
 * @param {string} params.destinationAddress - Treasury wallet address
 * @param {string} params.refundAddress - Refund wallet address
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Payment link details
 */
async function createPaymentLink({
  userId,
  planId,
  amount,
  paymentMethod = null,
  destinationAddress,
  refundAddress,
  metadata = {}
}) {
  if (!DAIMO_API_KEY) {
    throw new Error('DAIMO_API_KEY not configured in environment variables');
  }

  const treasuryAddress = destinationAddress || process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  const refundAddr = refundAddress || process.env.NEXT_PUBLIC_REFUND_ADDRESS;
  
  if (!treasuryAddress) {
    throw new Error('NEXT_PUBLIC_TREASURY_ADDRESS not configured');
  }

  if (!refundAddr) {
    throw new Error('NEXT_PUBLIC_REFUND_ADDRESS not configured');
  }

  // Generate unique payment ID
  const timestamp = Date.now();
  const paymentId = `pay_${userId}_${planId}_${timestamp}`;

  try {
    logger.info('[Daimo] Creating payment via API:', {
      userId,
      planId,
      amount,
      paymentMethod: paymentMethod || 'all',
      paymentId
    });

    // Build payment options array based on preference
    let paymentOptions = ['AllExchanges', 'AllPaymentApps']; // Default: show all
    
    if (paymentMethod) {
      // Map specific payment methods
      const methodMap = {
        'coinbase': 'Coinbase',
        'binance': 'Binance',
        'cashapp': 'CashApp',
        'venmo': 'Venmo',
        'mercadopago': 'MercadoPago',
        'wallet': 'AllExchanges'
      };
      
      if (methodMap[paymentMethod]) {
        paymentOptions = [methodMap[paymentMethod]];
      }
    }

    // Create payment request via Daimo API
    const requestBody = {
      display: {
        intent: 'Subscribe to PNPtv Premium',
        preferredChains: [8453, 10], // Base and Optimism
        preferredTokens: [
          {
            chain: 8453,
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC
          },
          {
            chain: 10,
            address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' // Optimism USDC
          }
        ],
        paymentOptions: paymentOptions
      },
      destination: {
        destinationAddress: treasuryAddress,
        chainId: 8453, // Base (primary)
        tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
        amountUnits: amount.toFixed(2)
      },
      refundAddress: refundAddr,
      metadata: {
        userId: userId.toString(),
        planId: planId,
        timestamp: timestamp.toString(),
        ...metadata
      }
    };

    logger.info('[Daimo] API Request:', {
      url: `${DAIMO_API_URL}/payment`,
      body: JSON.stringify(requestBody, null, 2)
    });

    const response = await axios.post(
      `${DAIMO_API_URL}/payment`,
      requestBody,
      {
        headers: {
          'API-Key': DAIMO_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    logger.info('[Daimo] Payment created successfully:', {
      paymentId: response.data.id || paymentId,
      url: response.data.url
    });

    return {
      success: true,
      paymentId: response.data.id || paymentId,
      paymentUrl: response.data.url,
      qrCode: response.data.qrCode || null,
      expiresAt: response.data.expiresAt || new Date(timestamp + 24 * 60 * 60 * 1000).toISOString()
    };
  } catch (error) {
    logger.error('[Daimo] Failed to create payment:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });

    throw new Error(`Failed to create payment link: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Get payment status
 * @param {string} paymentId - Daimo payment ID
 * @returns {Promise<Object>} Payment status
 */
async function getPaymentStatus(paymentId) {
  if (!DAIMO_API_KEY) {
    throw new Error('DAIMO_API_KEY not configured');
  }

  try {
    const response = await axios.get(
      `${DAIMO_API_URL}/payment/${paymentId}`,
      {
        headers: {
          'API-Key': DAIMO_API_KEY
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    logger.error('[Daimo] Failed to get payment status:', {
      paymentId,
      error: error.message
    });

    throw new Error(`Failed to get payment status: ${error.message}`);
  }
}

/**
 * Cancel a payment
 * @param {string} paymentId - Daimo payment ID
 * @returns {Promise<Object>} Cancellation result
 */
async function cancelPayment(paymentId) {
  if (!DAIMO_API_KEY) {
    throw new Error('DAIMO_API_KEY not configured');
  }

  try {
    const response = await axios.delete(
      `${DAIMO_API_URL}/payment/${paymentId}`,
      {
        headers: {
          'API-Key': DAIMO_API_KEY
        },
        timeout: 10000
      }
    );

    logger.info('[Daimo] Payment cancelled:', { paymentId });
    return response.data;
  } catch (error) {
    logger.error('[Daimo] Failed to cancel payment:', {
      paymentId,
      error: error.message
    });

    throw new Error(`Failed to cancel payment: ${error.message}`);
  }
}

module.exports = {
  createPaymentLink,
  getPaymentStatus,
  cancelPayment
};
