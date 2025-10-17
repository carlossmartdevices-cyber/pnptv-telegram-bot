/**
 * Bot Launcher with Retry Logic
 * Handles network connectivity issues gracefully
 */

require("./src/config/env");
const logger = require("./src/utils/logger");

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

/**
 * Launch bot with retry logic
 */
async function launchBotWithRetry(retryCount = 0) {
  try {
    console.log("Starting PNPtv Bot...\n");

    // Dynamically require the bot to avoid caching issues
    delete require.cache[require.resolve("./src/bot/index.js")];
    const bot = require("./src/bot/index.js");

    // Attempt to launch bot
    await bot.launch();

    logger.info("Bot started successfully");
    console.log("PNPtv Bot is running!");
    console.log("Bot username: @PNPtvbot");
    console.log("Start chatting: https://t.me/PNPtvbot\n");

    // Initialize web server
    try {
      const { startServer } = require("./src/web/server");
      await startServer();
      logger.info("Web server started successfully");
    } catch (error) {
      logger.warn("Failed to start web server:", error.message);
      console.log("Web server could not start. Mini app will not be available.");
    }

    // Initialize scheduler for membership expiration
    try {
      const { initializeScheduler } = require("./src/services/scheduler");
      initializeScheduler(bot);
      logger.info("Scheduler initialized successfully");
      console.log("Membership expiration scheduler started");
    } catch (error) {
      logger.warn("Failed to initialize scheduler:", error.message);
      console.log("Scheduler could not start. Manual expiration checks required.");
    }

    console.log("\nPress Ctrl+C to stop the bot.\n");

    // Setup graceful shutdown
    const shutdown = (signal) => {
      logger.info(`Received ${signal}, stopping bot...`);
      console.log("\nStopping bot...\n");
      bot.stop(signal);
      process.exit(0);
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));

    return bot;
  } catch (error) {
    const errorMessage = error.message || String(error);

    // Check if it's a network error
    if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("fetch failed")
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
        return launchBotWithRetry(nextRetry);
      } else {
        console.error(`\nFailed to connect after ${MAX_RETRIES} attempts.\n`);
        console.log("Troubleshooting steps:");
        console.log("   1. Check your internet connection");
        console.log("   2. Verify firewall settings");
        console.log("   3. Check if Telegram is accessible in your region");
        console.log("   4. Try using a VPN");
        console.log("   5. Verify bot token in .env file\n");

        logger.error(`Failed to start bot after ${MAX_RETRIES} retries:`, error);
        process.exit(1);
      }
    } else {
      // Non-network error
      console.error("Error starting bot:", errorMessage);
      logger.error("Failed to start bot:", error);
      process.exit(1);
    }
  }
}

// Start the bot
launchBotWithRetry().catch((error) => {
  console.error("Unexpected error:", error);
  logger.error("Unexpected error during bot launch:", error);
  process.exit(1);
});
