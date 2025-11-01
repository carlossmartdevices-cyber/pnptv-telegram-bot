/**
 * Daimo Pay Configuration
 * Fast stablecoin deposits for subscription payments
 * Official Documentation: https://paydocs.daimo.com/
 *
 * IMPORTANT: Daimo Pay uses a React SDK (@daimo/pay) on the frontend.
 * This config only handles webhook validation and configuration checks.
 * Payment flow is handled entirely by DaimoPayButton component in payment-app.
 *
 * Environment Variables Required:
 * - DAIMO_APP_ID: Your Daimo application ID
 * - DAIMO_WEBHOOK_TOKEN: Webhook authentication token
 * - BOT_URL: Public HTTPS URL for webhooks
 * - NEXT_PUBLIC_WEBAPP_URL: Public HTTPS URL for React payment page
 *
 * Security Features:
 * - Origin verification for payment requests
 * - Webhook authentication
 * - HTTPS enforcement
 * - Parameter validation
 * - Rate limiting (configure in api/routes)
 */

// Payment configuration
const PAYMENT_CONFIG = {
  minAmount: 0.01,           // Minimum payment amount in USD
  maxAmount: 10000,          // Maximum payment amount in USD
  currency: 'USDC',          // Default currency
  retryAttempts: 3,         // Number of retry attempts for failed requests
  timeoutMs: 30000          // Request timeout in milliseconds
};

// Supported networks configuration
const SUPPORTED_NETWORKS = {
  OPTIMISM: {
    chainId: 10,
    name: 'Optimism',
    token: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC on Optimism
    explorer: 'https://optimistic.etherscan.io'
  }
};

// Allowed payment origins for security
const ALLOWED_PAYMENT_ORIGINS = [
  'pay.daimo.com',
  'checkout.daimo.com',
  'api.daimo.com'
];

/**
 * Verify payment origin is from Daimo
 * @param {string} origin - Request origin header
 * @returns {boolean} True if origin is valid
 */
function verifyPaymentOrigin(origin) {
  if (!origin) return false;
  try {
    return ALLOWED_PAYMENT_ORIGINS.includes(new URL(origin).hostname);
  } catch (error) {
    return false;
  }
}

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

  // Validate amount
  if (typeof params.amount !== "number") {
    throw new Error(`Invalid amount type: ${typeof params.amount}. Must be a number.`);
  }
  if (params.amount < PAYMENT_CONFIG.minAmount) {
    throw new Error(`Amount ${params.amount} is below minimum of ${PAYMENT_CONFIG.minAmount}`);
  }
  if (params.amount > PAYMENT_CONFIG.maxAmount) {
    throw new Error(`Amount ${params.amount} exceeds maximum of ${PAYMENT_CONFIG.maxAmount}`);
  }

  // Validate userId format (can customize based on your user ID format)
  if (!/^[a-zA-Z0-9_-]+$/.test(params.userId)) {
    throw new Error(`Invalid userId format: ${params.userId}`);
  }

  // Validate plan format (can customize based on your plan ID format)
  if (!/^[a-zA-Z0-9_-]+$/.test(params.plan)) {
    throw new Error(`Invalid plan format: ${params.plan}`);
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
    // In development, if BOT_URL is http://, we need to use a placeholder or disable
    let paymentPageUrl = process.env.BOT_URL || 'https://example.com';

    // Ensure HTTPS for Telegram compatibility (Telegram requires HTTPS for inline buttons)
    if (paymentPageUrl.startsWith('http://localhost') || paymentPageUrl.startsWith('http://127.0.0.1')) {
      // For local development, Daimo payments won't work in Telegram due to HTTPS requirement
      // Use production URL or throw error
      if (process.env.NEXT_PUBLIC_WEBAPP_URL && process.env.NEXT_PUBLIC_WEBAPP_URL.startsWith('https://')) {
        paymentPageUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
      } else {
        throw new Error('Daimo payments require HTTPS. Please use production URL or ngrok for local testing.');
      }
    }

    paymentPageUrl = `${paymentPageUrl}/pay`;

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
  verifyPaymentOrigin,
  SUPPORTED_NETWORKS,
  ALLOWED_PAYMENT_ORIGINS,
  PAYMENT_CONFIG
};
