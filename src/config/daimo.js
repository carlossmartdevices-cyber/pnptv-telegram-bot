/**
 * Daimo Pay Configuration
 * Fast stablecoin deposits for subscription payments
 * Documentation: https://paydocs.daimo.com/
 */

require("./env");
const logger = require("../utils/logger");

/**
 * Validate Daimo credentials are properly configured
 * @throws {Error} If any required credential is missing
 */
function validateCredentials() {
  const requiredCredentials = {
    DAIMO_API_KEY: process.env.DAIMO_API_KEY,
    DAIMO_APP_ID: process.env.DAIMO_APP_ID,
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
    "userEmail",
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
 * Daimo Pay uses a React SDK on the frontend, so this generates a link to our payment page
 *
 * @param {Object} params - Payment parameters
 * @param {number} params.amount - Amount in USD (will be converted to USDC)
 * @param {string} params.userId - User ID
 * @param {string} params.userEmail - User email
 * @param {string} params.plan - Plan ID
 * @param {string} params.userName - User name (optional)
 * @param {string} params.description - Payment description (optional)
 * @returns {Promise<Object>} Payment data including payment URL and reference
 */
async function createPaymentRequest({
  amount,
  userId,
  userEmail,
  userName,
  plan,
  description,
}) {
  try {
    logger.info(
      `Creating Daimo Pay payment link for user ${userId}, plan: ${plan}`
    );

    // Validate credentials first
    validateCredentials();

    // Validate all required parameters
    validatePaymentParams({
      amount,
      userId,
      userEmail,
      plan,
    });

    // Generate unique reference ID
    const referenceId = `${plan}_${userId}_${Date.now()}`;

    // Get the payment page URL (defaults to bot URL + /pay path)
    const paymentPageUrl = process.env.PAYMENT_PAGE_URL || `${process.env.BOT_URL}/pay`;

    // Build payment URL with query parameters
    const paymentUrl = new URL(paymentPageUrl);
    paymentUrl.searchParams.set('plan', plan);
    paymentUrl.searchParams.set('user', userId);
    paymentUrl.searchParams.set('amount', amount.toFixed(2)); // Ensure 2 decimal places for USDC

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

    // Provide more specific error messages
    if (error.message.includes("credentials")) {
      throw new Error(
        "Daimo Pay is not properly configured. Please check your environment variables."
      );
    } else if (error.message.includes("parameters")) {
      throw new Error(
        `Invalid payment parameters: ${error.message}`
      );
    } else {
      throw new Error(
        `Failed to create Daimo Pay payment link: ${error.message}`
      );
    }
  }
}

/**
 * Verify payment status
 * @param {string} reference - Payment reference ID
 * @returns {Promise<Object>} Payment status data
 */
async function verifyPayment(reference) {
  try {
    logger.info(`Verifying Daimo Pay payment: ${reference}`);

    validateCredentials();

    // In production, you would make an API call to Daimo to verify the payment
    // For now, we return a placeholder response

    return {
      success: true,
      status: "pending", // Can be: pending, completed, failed, expired
      reference: reference,
      data: {
        reference: reference,
        status: "pending",
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    logger.error("Error verifying Daimo Pay payment:", error);
    throw error;
  }
}

/**
 * Process webhook notification from Daimo Pay
 * @param {Object} webhookData - Webhook payload from Daimo
 * @returns {Promise<Object>} Processed webhook data
 */
async function processWebhook(webhookData) {
  try {
    logger.info("Processing Daimo Pay webhook:", {
      reference: webhookData.reference,
      status: webhookData.status,
    });

    // Validate webhook signature (implement based on Daimo's documentation)
    // const isValid = validateWebhookSignature(webhookData);
    // if (!isValid) {
    //   throw new Error("Invalid webhook signature");
    // }

    const { reference, status, amount, metadata } = webhookData;

    return {
      success: true,
      reference: reference,
      status: status, // completed, failed, etc.
      amount: amount,
      userId: metadata?.userId,
      plan: metadata?.plan,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error("Error processing Daimo Pay webhook:", error);
    throw error;
  }
}

/**
 * Get Daimo Pay configuration
 * @returns {Object} Configuration object
 */
function getConfig() {
  return {
    apiKey: process.env.DAIMO_API_KEY,
    appId: process.env.DAIMO_APP_ID,
    apiUrl: process.env.DAIMO_API_URL || "https://api.daimo.com/v1",
    webhookUrl: process.env.DAIMO_WEBHOOK_URL || `${process.env.BOT_URL}/daimo/webhook`,
    returnUrl: process.env.DAIMO_RETURN_URL || `${process.env.BOT_URL}/payment/success`,
    enabled: !!process.env.DAIMO_API_KEY && !!process.env.DAIMO_APP_ID,
  };
}

module.exports = {
  createPaymentRequest,
  verifyPayment,
  processWebhook,
  validateCredentials,
  validatePaymentParams,
  getConfig,
};
