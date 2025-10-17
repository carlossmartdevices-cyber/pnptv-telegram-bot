/**
 * ePayco Integration Test Script
 * Tests credential validation and payment link creation
 */

require("./src/config/env");
const {
  validateCredentials,
  validatePaymentParams,
  createPaymentLink,
} = require("./src/config/epayco");
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

async function runTests() {
  console.log("\n" + "=".repeat(60));
  console.log("ePayco Integration Test Suite");
  console.log("=".repeat(60) + "\n");

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Check environment variables
  console.log("Test 1: Checking environment variables...");
  const requiredEnvVars = [
    "EPAYCO_PUBLIC_KEY",
    "EPAYCO_PRIVATE_KEY",
    "EPAYCO_P_CUST_ID",
    "EPAYCO_P_KEY",
    "EPAYCO_TEST_MODE",
    "BOT_URL",
  ];

  let envVarsConfigured = true;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logError(`Missing environment variable: ${envVar}`);
      envVarsConfigured = false;
      testsFailed++;
    } else {
      logSuccess(`${envVar}: Configured`);
    }
  }

  if (envVarsConfigured) {
    logSuccess("All required environment variables are configured");
    testsPassed++;
  } else {
    logError("Some environment variables are missing");
  }

  console.log("");

  // Test 2: Validate credentials
  console.log("Test 2: Validating ePayco credentials...");
  try {
    validateCredentials();
    logSuccess("Credentials validation passed");
    testsPassed++;
  } catch (error) {
    logError(`Credentials validation failed: ${error.message}`);
    testsFailed++;
    return; // Cannot continue without valid credentials
  }

  console.log("");

  // Test 3: Validate payment parameters (positive test)
  console.log("Test 3: Validating payment parameters (valid params)...");
  const validParams = {
    name: "Test Plan",
    description: "Test subscription plan",
    amount: 50000,
    currency: "COP",
    userId: "123456789",
    userEmail: "test@telegram.user",
    userName: "Test User",
    plan: "test-plan",
  };

  try {
    validatePaymentParams(validParams);
    logSuccess("Payment parameters validation passed");
    testsPassed++;
  } catch (error) {
    logError(`Payment parameters validation failed: ${error.message}`);
    testsFailed++;
  }

  console.log("");

  // Test 4: Validate payment parameters (negative test - missing params)
  console.log("Test 4: Validating payment parameters (missing params)...");
  const invalidParams = {
    name: "Test Plan",
    amount: 50000,
    // Missing required parameters
  };

  try {
    validatePaymentParams(invalidParams);
    logError("Should have thrown error for missing parameters");
    testsFailed++;
  } catch (error) {
    logSuccess(`Correctly rejected invalid params: ${error.message}`);
    testsPassed++;
  }

  console.log("");

  // Test 5: Validate payment parameters (negative test - invalid amount)
  console.log("Test 5: Validating payment parameters (invalid amount)...");
  const invalidAmountParams = {
    ...validParams,
    amount: -100, // Invalid negative amount
  };

  try {
    validatePaymentParams(invalidAmountParams);
    logError("Should have thrown error for invalid amount");
    testsFailed++;
  } catch (error) {
    logSuccess(`Correctly rejected invalid amount: ${error.message}`);
    testsPassed++;
  }

  console.log("");

  // Test 6: Create payment link (integration test)
  console.log("Test 6: Creating payment link (integration test)...");
  logInfo("This test will attempt to create an actual payment link with ePayco...");

  try {
    const paymentData = await createPaymentLink({
      name: "Test Plan - Integration Test",
      description: "Test subscription - 30 days",
      amount: 50000,
      currency: "COP",
      userId: "test_user_123",
      userEmail: "test@telegram.user",
      userName: "Test User",
      plan: "test-plan",
    });

    if (paymentData.success && paymentData.paymentUrl) {
      logSuccess("Payment link created successfully");
      logInfo(`Payment URL: ${paymentData.paymentUrl.substring(0, 80)}...`);
      logInfo(`Reference: ${paymentData.reference}`);
      logInfo(`Invoice ID: ${paymentData.invoiceId}`);
      testsPassed++;
    } else {
      logError("Payment link creation failed: Invalid response");
      testsFailed++;
    }
  } catch (error) {
    logError(`Payment link creation failed: ${error.message}`);
    testsFailed++;
  }

  console.log("");

  // Test 7: Check webhook URLs
  console.log("Test 7: Checking webhook URLs configuration...");
  const botUrl = process.env.BOT_URL;
  const responseUrl = process.env.EPAYCO_RESPONSE_URL || `${botUrl}/epayco/response`;
  const confirmationUrl = process.env.EPAYCO_CONFIRMATION_URL || `${botUrl}/epayco/confirmation`;

  if (!botUrl || botUrl === "https://your-app.herokuapp.com") {
    logWarning("BOT_URL is not configured or using default value");
    logWarning("Webhook URLs will not work until BOT_URL is set correctly");
    testsFailed++;
  } else {
    logSuccess(`Response URL: ${responseUrl}`);
    logSuccess(`Confirmation URL: ${confirmationUrl}`);
    testsPassed++;
  }

  console.log("");

  // Test 8: Check test mode
  console.log("Test 8: Checking test mode configuration...");
  const testMode = process.env.EPAYCO_TEST_MODE === "true";
  if (testMode) {
    logSuccess("Test mode is ENABLED - Safe for testing");
    testsPassed++;
  } else {
    logWarning("Test mode is DISABLED - Using production mode");
    logWarning("Be careful: Real transactions will be processed!");
    testsFailed++;
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
