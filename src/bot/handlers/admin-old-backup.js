const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { getMenu } = require("../../config/menus");

/**
 * Admin panel main handler
 */
async function adminPanel(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const message = t("adminPanel", lang);

    await ctx.reply(message, {
      reply_markup: getMenu("admin"),
      parse_mode: "Markdown",
    });

    logger.info(`Admin ${ctx.from.id} accessed admin panel`);
  } catch (error) {
    logger.error("Error in admin panel:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show user statistics
 */
async function showStats(ctx) {
  try {
    const lang = ctx.session.language || "en";

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    const totalUsers = usersSnapshot.size;

    // Count by tier
    let freeTier = 0;
    let silverTier = 0;
    let goldenTier = 0;
    let activeToday = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();

      // Count tiers
      const tier = userData.tier || "Free";
      if (tier === "Free") freeTier++;
      else if (tier === "Silver") silverTier++;
      else if (tier === "Golden") goldenTier++;

      // Count active today
      if (userData.lastActive && userData.lastActive.toDate() >= today) {
        activeToday++;
      }
    });

    const message = t("userStats", lang, {
      totalUsers,
      activeToday,
      freeTier,
      silverTier,
      goldenTier,
    });

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} viewed statistics`);
  } catch (error) {
    logger.error("Error showing stats:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Broadcast message to all users
 */
async function broadcastMessage(ctx) {
  try {
    const lang = ctx.session.language || "en";

    // Set state to wait for broadcast message
    ctx.session.waitingFor = "broadcast_message";

    await ctx.reply(t("broadcastPrompt", lang), {
      parse_mode: "Markdown",
    });

    logger.info(`Admin ${ctx.from.id} initiated broadcast`);
  } catch (error) {
    logger.error("Error in broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Send broadcast message to all users
 */
async function sendBroadcast(ctx, message) {
  try {
    const lang = ctx.session.language || "en";

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    let sentCount = 0;

    // Send message to each user
    for (const doc of usersSnapshot.docs) {
      try {
        const userId = doc.id;
        await ctx.telegram.sendMessage(userId, message, {
          parse_mode: "Markdown",
        });
        sentCount++;
      } catch (error) {
        logger.warn(`Failed to send broadcast to user ${doc.id}:`, error.message);
      }
    }

    await ctx.reply(t("broadcastSent", lang, { count: sentCount }));

    logger.info(`Admin ${ctx.from.id} sent broadcast to ${sentCount} users`);

    // Clear waiting state
    ctx.session.waitingFor = null;
  } catch (error) {
    logger.error("Error sending broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle admin callback queries
 */
async function handleAdminCallback(ctx) {
  const action = ctx.callbackQuery.data;

  try {
    switch (action) {
      case "admin_stats":
        await showStats(ctx);
        break;

      case "admin_broadcast":
        await broadcastMessage(ctx);
        break;

      case "admin_users":
        await ctx.answerCbQuery("User management coming soon!");
        break;

      case "admin_plans":
        await ctx.answerCbQuery("Plan management coming soon!");
        break;

      case "admin_menus":
        await ctx.answerCbQuery("Menu configuration coming soon!");
        break;

      default:
        await ctx.answerCbQuery();
    }
  } catch (error) {
    logger.error("Error handling admin callback:", error);
    await ctx.answerCbQuery("Error occurred");
  }
}

module.exports = {
  adminPanel,
  showStats,
  broadcastMessage,
  sendBroadcast,
  handleAdminCallback,
};
