/**
 * Daimo Pay Server-Side Payment Service
 * Creates payment links via Daimo Pay REST API
 */

const axios = require('axios');
const logger = require('../utils/logger');

const DAIMO_API_URL = process.env.DAIMO_API_URL || 'https://pay.daimo.com/api';
const DAIMO_API_KEY = process.env.DAIMO_API_KEY;

/**
 * Create a payment link via Daimo Pay API
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
  destinationAddress,
  refundAddress,
  metadata = {}
}) {
  if (!DAIMO_API_KEY) {
    throw new Error('DAIMO_API_KEY not configured in environment variables');
  }

  const treasuryAddress = destinationAddress || process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  const refundAddr = refundAddress || process.env.NEXT_PUBLIC_REFUND_ADDRESS || treasuryAddress;

  // Prepare payment data according to Daimo Pay API spec
  // Reference: https://paydocs.daimo.com
  const paymentData = {
    display: {
      intent: 'Subscribe',
      preferredChains: [8453, 10], // Base and Optimism
      preferredTokens: [
        { chain: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }, // Base USDC
        { chain: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' }    // Optimism USDC
      ],
      paymentOptions: ['AllExchanges', 'AllPaymentApps'], // Show all available payment methods
      redirectUri: `${process.env.NEXT_PUBLIC_BOT_URL || 'https://pnptv.app'}/payment/success?user=${userId}&plan=${planId}`
    },
    destination: {
      destinationAddress: treasuryAddress,
      chainId: 8453, // Base (primary chain)
      tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      amountUnits: amount.toFixed(2)
    },
    refundAddress: refundAddr,
    metadata: {
      userId: userId.toString(),
      planId: planId.toString(),
      ...metadata
    }
  };

  try {
    logger.info('[Daimo] Creating payment link:', {
      userId,
      planId,
      amount: paymentData.destination.amountUnits
    });

    const response = await axios.post(
      `${DAIMO_API_URL}/payment`,
      paymentData,
      {
        headers: {
          'API-Key': DAIMO_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    logger.info('[Daimo] Payment link created:', {
      paymentId: response.data.id,
      paymentUrl: response.data.url
    });

    return {
      success: true,
      paymentId: response.data.id,
      paymentUrl: response.data.url,
      qrCode: response.data.qrCode,
      expiresAt: response.data.expiresAt,
      ...response.data
    };
  } catch (error) {
    logger.error('[Daimo] Failed to create payment link:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    throw new Error(`Failed to create payment link: ${error.response?.data?.message || error.message}`);
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
