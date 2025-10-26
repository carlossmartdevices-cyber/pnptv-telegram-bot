/**
 * Daimo Pay Configuration
 * Fast stablecoin deposits for subscription payments
 * Official Documentation: https://paydocs.daimo.com/
 *
 * IMPORTANT: Daimo Pay uses a React SDK (@daimo/pay) on the frontend.
 * This config only handles webhook validation and configuration checks.
 * Payment flow is handled entirely by DaimoPayButton component in payment-app.
 */

require("./env");
const logger = require("../utils/logger");

/**
 * Validate Daimo credentials are properly configured
 * @throws {Error} If any required credential is missing
 */
function validateCredentials() {
  const requiredCredentials = {
    DAIMO_APP_ID: process.env.DAIMO_APP_ID,
    DAIMO_WEBHOOK_TOKEN: process.env.DAIMO_WEBHOOK_TOKEN,
  };

  const missingCredentials = [];
  for (const [key, value] of Object.entries(requiredCredentials)) {
    if (!value || value.trim() === "") {
      missingCredentials.push(key);
    }
  }

  if (missingCredentials.length > 0) {
    const errorMessage = `Missing Daimo Pay credentials: ${missingCredentials.join(", ")}. Please configure these in your .env file.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  logger.info("Daimo Pay credentials validated successfully");
}

/**
 * Validate payment parameters
 * @param {Object} params - Payment parameters
 * @throws {Error} If any required parameter is missing or invalid
 */
function validatePaymentParams(params) {
  const requiredParams = [
    "amount",
    "userId",
    "plan",
  ];

  const missingParams = [];
  for (const param of requiredParams) {
    if (!params[param]) {
      missingParams.push(param);
    }
  }

  if (missingParams.length > 0) {
    const errorMessage = `Missing required parameters: ${missingParams.join(", ")}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate amount is a positive number
  if (typeof params.amount !== "number" || params.amount <= 0) {
    throw new Error(`Invalid amount: ${params.amount}. Must be a positive number.`);
  }

  logger.info("Payment parameters validated successfully");
}

/**
 * Create a payment link for Daimo Pay
 * Generates a link to the React payment page which uses DaimoPayButton
 *
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount in USD (will be sent as USDC)
 * @param {string} params.userId - User ID
 * @param {string} params.plan - Plan ID
 * @returns {Promise<Object>} Payment data including payment URL
 */
async function createPaymentRequest({ amount, userId, plan }) {
  try {
    logger.info(
      `Creating Daimo Pay payment link for user ${userId}, plan: ${plan}`
    );

    // Validate required parameters
    validatePaymentParams({ amount, userId, plan });

    // Generate unique reference ID (format: planId_userId_timestamp)
    const referenceId = `${plan}_${userId}_${Date.now()}`;

    // Build payment page URL with query parameters
    const paymentPageUrl = process.env.NODE_ENV === 'development'
      ? (process.env.PAYMENT_PAGE_URL || process.env.BOT_URL || 'https://example.com/pay')
      : `${process.env.BOT_URL}/pay`;

    const paymentUrl = new URL(paymentPageUrl);
    paymentUrl.searchParams.set('plan', plan);
    paymentUrl.searchParams.set('user', userId);
    paymentUrl.searchParams.set('amount', amount.toFixed(2));

    logger.info("Daimo Pay payment link created:", {
      reference: referenceId,
      amount: amount,
      currency: "USDC",
      userId: userId,
      plan: plan,
      paymentUrl: paymentUrl.toString(),
    });

    return {
      success: true,
      paymentUrl: paymentUrl.toString(),
      reference: referenceId,
      data: {
        url: paymentUrl.toString(),
        reference: referenceId,
        amount: amount,
        currency: "USDC",
        status: "pending",
      },
    };
  } catch (error) {
    logger.error("Error creating Daimo Pay payment link:", {
      errorMessage: error.message,
      errorStack: error.stack,
      userId,
      plan,
      amount,
    });
    throw error;
  }
}

/**
 * Verify webhook authentication
 * According to Daimo docs: webhooks use Basic auth with the webhook token
 * @param {string} authHeader - Authorization header from webhook request
 * @returns {boolean} True if authentication is valid
 */
function verifyWebhookAuth(authHeader) {
  if (!process.env.DAIMO_WEBHOOK_TOKEN) {
    logger.warn('DAIMO_WEBHOOK_TOKEN not configured - skipping authentication');
    return true; // Allow in development
  }

  const expectedAuth = `Basic ${process.env.DAIMO_WEBHOOK_TOKEN}`;
  return authHeader === expectedAuth;
}

/**
 * Get Daimo Pay configuration
 * @returns {Object} Configuration object
 */
function getConfig() {
  return {
    appId: process.env.DAIMO_APP_ID,
    webhookToken: process.env.DAIMO_WEBHOOK_TOKEN,
    webhookUrl: `${process.env.BOT_URL}/daimo/webhook`,
    enabled: !!process.env.DAIMO_APP_ID && !!process.env.DAIMO_WEBHOOK_TOKEN,
  };
}

module.exports = {
  createPaymentRequest,
  verifyWebhookAuth,
  validateCredentials,
  validatePaymentParams,
  getConfig,
};
