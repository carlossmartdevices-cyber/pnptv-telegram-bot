/**
 * ePayco Payment Gateway Configuration
 * Colombian payment processor integration
 */

require("dotenv").config();
const crypto = require("crypto");
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
    if (!process.env.EPAYCO_P_CUST_ID || !process.env.EPAYCO_P_KEY) {
      throw new Error("ePayco credentials (P_CUST_ID, P_KEY) not configured");
    }

    // Generate unique invoice ID
    const invoiceId = `${plan}_${userId}_${Date.now()}`;

    // Response and confirmation URLs
    const responseUrl = process.env.EPAYCO_RESPONSE_URL || `${process.env.BOT_URL}/epayco/response`;
    const confirmationUrl = process.env.EPAYCO_CONFIRMATION_URL || `${process.env.BOT_URL}/epayco/confirmation`;

    const testMode = process.env.EPAYCO_TEST_MODE === "true";

    // Calculate tax breakdown (assuming 0% tax for now)
    const taxAmount = "0";
    const amountBase = amount.toString();

    // Generate signature according to ePayco documentation
    // Format: p_cust_id_cliente^p_key^p_id_invoice^p_amount^p_currency_code
    const signatureString = `${process.env.EPAYCO_P_CUST_ID}^${process.env.EPAYCO_P_KEY}^${invoiceId}^${amount}^${currency}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    logger.info("Creating ePayco payment with Standard Checkout:", {
      invoice: invoiceId,
      amount: amount,
      currency: currency,
      email: userEmail,
      test: testMode,
      method: "standard_checkout_form",
    });

    // Build payment URL using ePayco's official Standard Checkout endpoint
    // POST to: https://secure.payco.co/checkout.php
    const baseUrl = "https://secure.payco.co/checkout.php";

    const paymentParams = new URLSearchParams({
      // Required merchant credentials
      p_cust_id_cliente: process.env.EPAYCO_P_CUST_ID,
      p_key: process.env.EPAYCO_P_KEY,

      // Required transaction info
      p_id_invoice: invoiceId,
      p_description: description,
      p_amount: amount.toString(),
      p_amount_base: amountBase,
      p_tax: taxAmount,
      p_currency_code: currency,

      // Required customer info
      p_email: userEmail,

      // Required security signature
      p_signature: signature,

      // Required test mode flag
      p_test_request: testMode ? "TRUE" : "FALSE",

      // Optional but recommended: confirmation URLs
      p_url_response: responseUrl,
      p_url_confirmation: confirmationUrl,
      p_confirm_method: "GET",

      // Optional: extra data for tracking
      p_extra1: userId,
      p_extra2: plan,
      p_extra3: Date.now().toString(),

      // Optional: additional billing info
      p_name_billing: userName,
      p_billing_address: "N/A",
      p_billing_country: "CO",
      p_billing_phone: "3000000000",
    });

    const paymentUrl = `${baseUrl}?${paymentParams.toString()}`;

    logger.info(`ePayco payment link created successfully: ${paymentUrl.substring(0, 80)}...`);

    return {
      success: true,
      paymentUrl: paymentUrl,
      reference: invoiceId,
      invoiceId: invoiceId,
      signature: signature,
      data: {
        url: paymentUrl,
        urlbanco: paymentUrl,
        ref_payco: invoiceId,
        invoice: invoiceId,
      },
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
