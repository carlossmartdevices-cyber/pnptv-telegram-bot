/**
 * Production Bot Launcher for Railway/Heroku
 * Uses webhook mode with Express server
 */

// IMPORTANT: Import instrument.js at the very top for Sentry error tracking
require("./instrument.js");

require("./src/config/env");
const logger = require("./src/utils/logger");

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

/**
 * Launch bot in webhook mode for production
 */
async function launchProductionBot(retryCount = 0) {
  try {
    console.log("Starting PNPtv Bot in PRODUCTION mode (webhook)...\n");

    // Check required environment variables
    if (!process.env.BOT_URL) {
      throw new Error("BOT_URL environment variable is required for production deployment");
    }

    if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_TOKEN is required");
    }

    const PORT = process.env.PORT || 3000;
    const BOT_URL = process.env.BOT_URL;

    logger.info("Production configuration:", {
      port: PORT,
      botUrl: BOT_URL,
      nodeEnv: process.env.NODE_ENV || "production",
    });

    // Load webhook server instead of polling bot
    delete require.cache[require.resolve("./src/bot/webhook.js")];
    const webhookServer = require("./src/bot/webhook.js");

    logger.info("Bot started successfully in webhook mode");
    console.log("PNPtv Bot is running in WEBHOOK mode!");
    console.log("Bot username: @PNPtvbot");
    console.log(`Listening on port: ${PORT}`);
    console.log(`Webhook URL: ${BOT_URL}/telegram/webhook`);
    console.log(`Health check: ${BOT_URL}/health`);
    console.log(`Payment page: ${BOT_URL}/pay`);
    console.log("\nBot is ready to receive updates!\n");

  } catch (error) {
    const errorMessage = error.message || String(error);

    // Check if it's a network error
    if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("EADDRINUSE")
    ) {
      if (retryCount < MAX_RETRIES) {
        const nextRetry = retryCount + 1;
        console.error(`Connection failed: ${errorMessage}`);
        console.log(
          `Retrying in ${RETRY_DELAY / 1000} seconds... (Attempt ${nextRetry}/${MAX_RETRIES})\n`
        );

        logger.warn(`Connection failed, retrying (${nextRetry}/${MAX_RETRIES}):`, errorMessage);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));

        // Retry
        return launchProductionBot(nextRetry);
      } else {
        console.error(`\nFailed to connect after ${MAX_RETRIES} attempts.\n`);
        console.log("Troubleshooting steps:");
        console.log("   1. Check your internet connection");
        console.log("   2. Verify BOT_URL environment variable");
        console.log("   3. Check if PORT is available");
        console.log("   4. Verify bot token in environment\n");

        logger.error(`Failed to start bot after ${MAX_RETRIES} retries:`, error);
        process.exit(1);
      }
    } else {
      // Non-network error
      console.error("Error starting bot:", errorMessage);
      console.error("Stack:", error.stack);
      logger.error("Failed to start bot:", error);
      process.exit(1);
    }
  }
}

// Start the bot
launchProductionBot().catch((error) => {
  console.error("Unexpected error:", error);
  logger.error("Unexpected error during bot launch:", error);
  process.exit(1);
});
