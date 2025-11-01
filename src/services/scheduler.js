const cron = require("node-cron");
const { checkAndExpireMemberships } = require("../utils/membershipManager");
const { initializeScheduledBroadcastExecutor } = require("./scheduledBroadcastService");
const logger = require("../utils/logger");

/**
 * Initialize scheduled tasks
 */
function initializeScheduler(bot) {
  logger.info("Initializing scheduled tasks...");

  // Initialize scheduled broadcast executor
  initializeScheduledBroadcastExecutor(bot);

  // Run membership expiration check daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    logger.info("Running scheduled membership expiration check...");
    try {
      const results = await checkAndExpireMemberships();
      logger.info(`Scheduled expiration check completed: ${JSON.stringify(results)}`);

      // Notify expired users
      if (results.expired > 0) {
        await notifyExpiredUsers(bot);
      }
    } catch (error) {
      logger.error("Error in scheduled membership expiration check:", error);
    }
  });

  // Run membership expiration check every 6 hours as backup
  cron.schedule("0 */6 * * *", async () => {
    logger.info("Running backup membership expiration check...");
    try {
      await checkAndExpireMemberships();
    } catch (error) {
      logger.error("Error in backup expiration check:", error);
    }
  });

  logger.info("Scheduled tasks initialized successfully");
  logger.info("- Daily expiration check: 2:00 AM");
  logger.info("- Backup expiration check: Every 6 hours");
}

/**
 * Notify users whose memberships have expired
 * @param {Object} bot - Telegraf bot instance
 */
async function notifyExpiredUsers(bot) {
  try {
    const { db } = require("../config/firebase");
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Get users who just got expired (within last 5 minutes)
    const recentlyExpiredSnapshot = await db
      .collection("users")
      .where("membershipExpiredAt", ">=", fiveMinutesAgo)
      .where("membershipExpiredAt", "<=", now)
      .get();

    for (const doc of recentlyExpiredSnapshot.docs) {
      try {
        const userId = doc.id;
        const userData = doc.data();
        const lang = userData.language || "en";

        const message = lang === "es"
          ? `⏰ **Tu membresía ha expirado**\n\nTu membresía ${userData.previousTier} ha expirado y has sido cambiado al plan Free.\n\n¿Quieres renovar? Usa /subscribe`
          : `⏰ **Your membership has expired**\n\nYour ${userData.previousTier} membership has expired and you've been moved to the Free plan.\n\nWant to renew? Use /subscribe`;

        await bot.telegram.sendMessage(userId, message, {
          parse_mode: "Markdown",
        });

        logger.info(`Notified user ${userId} about membership expiration`);
      } catch (error) {
        logger.warn(`Failed to notify user ${doc.id} about expiration:`, error.message);
      }
    }
  } catch (error) {
    logger.error("Error notifying expired users:", error);
  }
}

/**
 * Run manual membership expiration check
 * @returns {Promise<Object>} Results of the check
 */
async function runManualExpirationCheck() {
  logger.info("Running manual membership expiration check...");
  try {
    const results = await checkAndExpireMemberships();
    logger.info(`Manual expiration check completed: ${JSON.stringify(results)}`);
    return results;
  } catch (error) {
    logger.error("Error in manual expiration check:", error);
    throw error;
  }
}

module.exports = {
  initializeScheduler,
  runManualExpirationCheck,
};
