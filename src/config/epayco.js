/**
 * ePayco Payment Gateway Configuration
 * Colombian payment processor integration
 */

require("dotenv").config();
const epaycoSdk = require("epayco-sdk-node");
const logger = require("../utils/logger");

// Initialize ePayco client
const epayco = epaycoSdk({
  apiKey: process.env.EPAYCO_PUBLIC_KEY,
  privateKey: process.env.EPAYCO_PRIVATE_KEY,
  lang: "ES", // ES for Spanish, EN for English
  test: process.env.EPAYCO_TEST_MODE === "true", // true for sandbox, false for production
});

/**
 * Create a payment link for subscription using ePayco Payment Link API
 * @param {Object} params - Payment parameters
 * @param {string} params.name - Product name
 * @param {string} params.description - Product description
 * @param {number} params.amount - Amount in COP (Colombian Pesos)
 * @param {string} params.currency - Currency code (COP, USD)
 * @param {string} params.userId - User ID
 * @param {string} params.userEmail - User email
 * @param {string} params.userName - User name
 * @param {string} params.plan - Plan type (silver, golden)
 * @returns {Promise<Object>} Payment link data
 */
async function createPaymentLink({
  name,
  description,
  amount,
  currency = "COP",
  userId,
  userEmail,
  userName,
  plan,
}) {
  try {
    logger.info(`Creating ePayco payment link for user ${userId}, plan: ${plan}`);

    // Validate credentials
    if (!process.env.EPAYCO_PUBLIC_KEY || !process.env.EPAYCO_PRIVATE_KEY) {
      throw new Error("ePayco credentials not configured");
    }

    // Generate unique invoice ID
    const invoiceId = `${plan}_${userId}_${Date.now()}`;

    // Response and confirmation URLs
    const responseUrl = process.env.EPAYCO_RESPONSE_URL || `${process.env.BOT_URL}/epayco/response`;
    const confirmationUrl = process.env.EPAYCO_CONFIRMATION_URL || `${process.env.BOT_URL}/epayco/confirmation`;

    const testMode = process.env.EPAYCO_TEST_MODE === "true";

    // Create payment using ePayco's Standard Checkout
    // Build payment URL manually as the SDK doesn't support hosted checkout properly
    const baseUrl = testMode
      ? "https://checkout.epayco.co/checkout.php"
      : "https://checkout.epayco.co/checkout.php";

    const paymentParams = new URLSearchParams({
      // Authentication
      public_key: process.env.EPAYCO_PUBLIC_KEY,
      p_cust_id_cliente: process.env.EPAYCO_P_CUST_ID,
      p_key: process.env.EPAYCO_P_KEY,

      // Transaction info
      name: name,
      description: description,
      invoice: invoiceId,
      amount: amount.toString(),
      tax_base: "0",
      tax: "0",
      currency: currency,
      country: "CO",
      lang: "ES",

      // Test mode
      test: testMode ? "true" : "false",

      // Customer info
      name_billing: userName,
      address_billing: "N/A",
      type_doc_billing: "CC",
      number_doc_billing: userId.substring(0, 10).padStart(10, '0'),
      email_billing: userEmail,
      mobilephone_billing: "3000000000",

      // URLs
      response: responseUrl,
      confirmation: confirmationUrl,
      url_response: responseUrl,
      url_confirmation: confirmationUrl,
      method_confirmation: "POST",

      // Extra data
      extra1: userId,
      extra2: plan,
      extra3: Date.now().toString(),

      // Enable credit cards and debit cards
      methodsDisable: "",
    });

    const paymentUrl = `${baseUrl}?${paymentParams.toString()}`;

    logger.info("Creating ePayco payment with Standard Checkout:", {
      invoice: invoiceId,
      amount: amount,
      email: userEmail,
      test: testMode,
      method: "standard_checkout",
      urlLength: paymentUrl.length
    });

    // Return response in expected format
    const response = {
      success: true,
      data: {
        urlbanco: paymentUrl,
        url: paymentUrl,
        ref_payco: invoiceId,
      }
    };

    logger.info("ePayco SDK response:", {
      success: response?.success,
      hasData: !!response?.data,
      hasUrl: !!(response?.data?.urlbanco || response?.data?.url)
    });

    if (!response || !response.success) {
      const errorMsg = response?.data?.errors || response?.data?.description || response?.message || "Unknown error";
      logger.error("ePayco payment creation failed:", errorMsg);
      throw new Error(`ePayco error: ${JSON.stringify(errorMsg)}`);
    }

    // Get payment URL from response
    const paymentUrl = response.data?.urlbanco || response.data?.url;

    if (!paymentUrl) {
      logger.error("No payment URL in response:", JSON.stringify(response.data));
      throw new Error("Payment URL not found in ePayco response");
    }

    logger.info(`ePayco payment link created successfully: ${paymentUrl.substring(0, 50)}...`);

    return {
      success: true,
      paymentUrl: paymentUrl,
      reference: response.data?.ref_payco || invoiceId,
      invoiceId: invoiceId,
      data: response.data,
    };
  } catch (error) {
    logger.error("Error creating ePayco payment link:", error);
    logger.error("Error details:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a subscription plan (for recurring payments)
 * @param {Object} params - Plan parameters
 * @returns {Promise<Object>} Plan data
 */
async function createSubscriptionPlan({
  planId,
  name,
  description,
  amount,
  currency = "COP",
  interval = "month",
  intervalCount = 1,
  trialDays = 0,
}) {
  try {
    logger.info(`Creating ePayco subscription plan: ${planId}`);

    const planData = {
      id_plan: planId,
      name: name,
      description: description,
      amount: amount.toString(),
      currency: currency,
      interval: interval,
      interval_count: intervalCount.toString(),
      trial_days: trialDays.toString(),
    };

    const response = await epayco.plan.create(planData);

    if (!response.success) {
      throw new Error(response.data || "Failed to create subscription plan");
    }

    logger.info(`ePayco subscription plan created: ${planId}`);

    return {
      success: true,
      planId: response.data.id_plan,
      data: response.data,
    };
  } catch (error) {
    logger.error("Error creating ePayco subscription plan:", error);
    throw error;
  }
}

/**
 * Subscribe a customer to a plan
 * @param {Object} params - Subscription parameters
 * @returns {Promise<Object>} Subscription data
 */
async function createSubscription({
  customerId,
  planId,
  tokenCard,
  docType,
  docNumber,
}) {
  try {
    logger.info(`Creating ePayco subscription for customer: ${customerId}`);

    const subscriptionData = {
      id_plan: planId,
      customer: customerId,
      token_card: tokenCard,
      doc_type: docType,
      doc_number: docNumber,
    };

    const response = await epayco.subscriptions.create(subscriptionData);

    if (!response.success) {
      throw new Error(response.data || "Failed to create subscription");
    }

    logger.info(`ePayco subscription created: ${response.data.id}`);

    return {
      success: true,
      subscriptionId: response.data.id,
      data: response.data,
    };
  } catch (error) {
    logger.error("Error creating ePayco subscription:", error);
    throw error;
  }
}

/**
 * Verify transaction status
 * @param {string} refPayco - ePayco reference ID
 * @returns {Promise<Object>} Transaction data
 */
async function verifyTransaction(refPayco) {
  try {
    logger.info(`Verifying ePayco transaction: ${refPayco}`);

    const response = await epayco.charge.get(refPayco);

    if (!response || !response.success) {
      throw new Error(response?.data || "Failed to verify transaction");
    }

    const transaction = response.data;

    return {
      success: true,
      status: transaction.x_transaction_state || transaction.estado,
      approved: transaction.x_cod_response === 1 || transaction.x_cod_response === "1",
      amount: transaction.x_amount,
      currency: transaction.x_currency_code,
      reference: transaction.x_ref_payco || transaction.ref_payco,
      extra1: transaction.x_extra1, // userId
      extra2: transaction.x_extra2, // plan
      data: transaction,
    };
  } catch (error) {
    logger.error("Error verifying ePayco transaction:", error);
    throw error;
  }
}

/**
 * Cancel a subscription
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Cancellation result
 */
async function cancelSubscription(subscriptionId) {
  try {
    logger.info(`Cancelling ePayco subscription: ${subscriptionId}`);

    const response = await epayco.subscriptions.cancel(subscriptionId);

    if (!response.success) {
      throw new Error(response.data || "Failed to cancel subscription");
    }

    logger.info(`ePayco subscription cancelled: ${subscriptionId}`);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    logger.error("Error cancelling ePayco subscription:", error);
    throw error;
  }
}

module.exports = {
  epayco,
  createPaymentLink,
  createSubscriptionPlan,
  createSubscription,
  verifyTransaction,
  cancelSubscription,
};
