/**
 * Payment Webhook Test Script
 * Tests webhook endpoints for ePayco and Daimo
 */

require("./src/config/env");
const crypto = require("crypto");
const logger = require("./src/utils/logger");

// Test colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

/**
 * Generate test ePayco webhook signature
 */
function generateEpaycoSignature(data) {
  const {
    x_cust_id_cliente,
    x_ref_payco,
    x_transaction_id,
    x_amount,
    x_currency_code,
  } = data;

  const signatureString = `${x_cust_id_cliente}^${process.env.EPAYCO_P_KEY}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;

  return crypto.createHash("sha256").update(signatureString).digest("hex");
}

/**
 * Create test ePayco webhook payload
 */
function createTestEpaycoWebhook(userId = "123456789", planId = "test-plan") {
  const invoiceId = `${planId}_${userId}_${Date.now()}`;
  const amount = "50000";
  const currency = "COP";
  const transactionId = `TEST_${Date.now()}`;
  const refPayco = `REF_${Date.now()}`;

  const webhookData = {
    x_cust_id_cliente: process.env.EPAYCO_P_CUST_ID,
    x_ref_payco: refPayco,
    x_transaction_id: transactionId,
    x_amount: amount,
    x_currency_code: currency,
    x_id_invoice: invoiceId,
    x_transaction_state: "Aceptada",
    x_cod_response: 1,
    x_approval_code: "000000",
    x_response_reason_text: "Transaccion aprobada",
    x_extra1: userId,
    x_extra2: planId,
  };

  // Generate signature
  webhookData.x_signature = generateEpaycoSignature(webhookData);

  return webhookData;
}

/**
 * Create test Daimo webhook payload
 */
function createTestDaimoWebhook(userId = "123456789", planId = "test-plan") {
  const reference = `${planId}_${userId}_${Date.now()}`;

  return {
    type: "payment_completed",
    reference: reference,
    amount: "10.00",
    currency: "USDC",
    metadata: {
      userId: userId,
      plan: planId,
    },
    timestamp: Date.now(),
  };
}

async function runTests() {
  console.log("\n" + "=".repeat(60));
  console.log("Payment Webhook Test Suite");
  console.log("=".repeat(60) + "\n");

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Check webhook URLs
  console.log("Test 1: Checking webhook URL configuration...");
  const botUrl = process.env.BOT_URL;

  if (!botUrl || botUrl === "https://your-app.herokuapp.com") {
    logError("BOT_URL is not configured properly");
    logWarning("Webhook tests will be skipped");
    testsFailed++;
  } else {
    logSuccess(`Bot URL: ${botUrl}`);
    logInfo(`ePayco Response URL: ${botUrl}/epayco/response`);
    logInfo(`ePayco Confirmation URL: ${botUrl}/epayco/confirmation`);
    logInfo(`Daimo Webhook URL: ${botUrl}/daimo/webhook`);
    testsPassed++;
  }

  console.log("");

  // Test 2: Generate test ePayco webhook
  console.log("Test 2: Generating test ePayco webhook payload...");
  try {
    const epaycoWebhook = createTestEpaycoWebhook("123456789", "test-plan");
    logSuccess("ePayco webhook payload generated");
    logInfo(`Invoice ID: ${epaycoWebhook.x_id_invoice}`);
    logInfo(`Reference: ${epaycoWebhook.x_ref_payco}`);
    logInfo(`Amount: ${epaycoWebhook.x_amount} ${epaycoWebhook.x_currency_code}`);
    logInfo(`Signature: ${epaycoWebhook.x_signature.substring(0, 20)}...`);
    testsPassed++;
  } catch (error) {
    logError(`Failed to generate ePayco webhook: ${error.message}`);
    testsFailed++;
  }

  console.log("");

  // Test 3: Generate test Daimo webhook
  console.log("Test 3: Generating test Daimo webhook payload...");
  try {
    const daimoWebhook = createTestDaimoWebhook("123456789", "test-plan");
    logSuccess("Daimo webhook payload generated");
    logInfo(`Type: ${daimoWebhook.type}`);
    logInfo(`Reference: ${daimoWebhook.reference}`);
    logInfo(`Amount: ${daimoWebhook.amount} ${daimoWebhook.currency}`);
    testsPassed++;
  } catch (error) {
    logError(`Failed to generate Daimo webhook: ${error.message}`);
    testsFailed++;
  }

  console.log("");

  // Test 4: Verify signature generation
  console.log("Test 4: Verifying ePayco signature generation...");
  try {
    const testData = {
      x_cust_id_cliente: process.env.EPAYCO_P_CUST_ID,
      x_ref_payco: "test_ref",
      x_transaction_id: "test_tx",
      x_amount: "50000",
      x_currency_code: "COP",
    };

    const signature1 = generateEpaycoSignature(testData);
    const signature2 = generateEpaycoSignature(testData);

    if (signature1 === signature2) {
      logSuccess("Signature generation is consistent");
      logInfo(`Signature: ${signature1.substring(0, 20)}...`);
      testsPassed++;
    } else {
      logError("Signature generation is inconsistent");
      testsFailed++;
    }
  } catch (error) {
    logError(`Signature generation failed: ${error.message}`);
    testsFailed++;
  }

  console.log("");

  // Test 5: Check security settings
  console.log("Test 5: Checking security settings...");
  const allowUnsigned = process.env.EPAYCO_ALLOW_UNSIGNED_WEBHOOKS === "true";
  const daimoWebhookToken = process.env.DAIMO_WEBHOOK_TOKEN;

  if (allowUnsigned) {
    logWarning("EPAYCO_ALLOW_UNSIGNED_WEBHOOKS is enabled");
    logWarning("This should be disabled in production!");
    testsFailed++;
  } else {
    logSuccess("ePayco signature verification is enabled");
    testsPassed++;
  }

  if (daimoWebhookToken) {
    logSuccess("Daimo webhook token is configured");
    testsPassed++;
  } else {
    logWarning("DAIMO_WEBHOOK_TOKEN is not configured");
    logWarning("Daimo webhooks will not be authenticated");
    testsFailed++;
  }

  console.log("");

  // Test 6: Display test instructions
  console.log("Test 6: Manual webhook testing instructions");
  logInfo("To test webhooks manually, you can use curl or Postman:");
  console.log("");

  console.log("  ePayco Webhook Test:");
  console.log("  -------------------");
  const epaycoTestPayload = createTestEpaycoWebhook("YOUR_USER_ID", "YOUR_PLAN_ID");
  console.log(`  curl -X POST ${botUrl}/epayco/confirmation \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '${JSON.stringify(epaycoTestPayload, null, 2)}'`);
  console.log("");

  console.log("  Daimo Webhook Test:");
  console.log("  ------------------");
  const daimoTestPayload = createTestDaimoWebhook("YOUR_USER_ID", "YOUR_PLAN_ID");
  console.log(`  curl -X POST ${botUrl}/daimo/webhook \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "Authorization: Basic ${process.env.DAIMO_WEBHOOK_TOKEN}" \\`);
  console.log(`    -d '${JSON.stringify(daimoTestPayload, null, 2)}'`);
  console.log("");

  logInfo("Note: Replace YOUR_USER_ID and YOUR_PLAN_ID with actual values");
  logInfo("Make sure the user and plan exist in your database before testing");
  testsPassed++;

  console.log("");

  // Test 7: Environment validation
  console.log("Test 7: Validating deployment environment...");
  const nodeEnv = process.env.NODE_ENV;
  const testMode = process.env.EPAYCO_TEST_MODE === "true";

  if (nodeEnv === "production" && testMode) {
    logWarning("Running in production mode with EPAYCO_TEST_MODE enabled");
    logWarning("This may cause issues with real payments");
    testsFailed++;
  } else if (nodeEnv === "production" && !testMode) {
    logSuccess("Production environment configured correctly");
    logWarning("Real payments will be processed!");
    testsPassed++;
  } else {
    logSuccess(`Development environment (NODE_ENV: ${nodeEnv || "not set"})`);
    logSuccess(`Test mode enabled: ${testMode}`);
    testsPassed++;
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));
  logSuccess(`Tests Passed: ${testsPassed}`);
  if (testsFailed > 0) {
    logError(`Tests Failed: ${testsFailed}`);
  } else {
    logSuccess("All tests passed!");
  }
  console.log("=".repeat(60) + "\n");

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
