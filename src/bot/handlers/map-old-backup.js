const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");

/**
 * Map handler - shows nearby users
 */
module.exports = async (ctx) => {
  try {
    const lang = ctx.session.language || "en";

    // Check if user completed onboarding
    if (!ctx.session.onboardingComplete) {
      await ctx.reply(t("pleaseCompleteOnboarding", lang));
      return;
    }

    const message = t("mapInfo", lang);

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("shareLocation", lang),
              callback_data: "share_location",
            },
            { text: t("searchNearby", lang), callback_data: "search_nearby" },
          ],
        ],
      },
      parse_mode: "Markdown",
    });

    logger.info(`User ${ctx.from.id} viewed map`);
  } catch (error) {
    logger.error("Error in map handler:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
};

/**
 * Handle map-related callbacks
 */
async function handleMapCallback(ctx) {
  const action = ctx.callbackQuery.data;
  const lang = ctx.session.language || "en";

  try {
    switch (action) {
      case "share_location":
        // Request location from user
        await ctx.answerCbQuery();
        await ctx.reply("📍 Please share your location:", {
          reply_markup: {
            keyboard: [
              [
                {
                  text: t("shareLocation", lang),
                  request_location: true,
                },
              ],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
          },
        });
        ctx.session.waitingFor = "location";
        break;

      case "search_nearby":
        await ctx.answerCbQuery();
        await searchNearbyUsers(ctx);
        break;

      case "profile_view_map":
        await ctx.answerCbQuery();
        await module.exports(ctx);
        break;

      default:
        await ctx.answerCbQuery();
    }
  } catch (error) {
    logger.error("Error handling map callback:", error);
    await ctx.answerCbQuery("Error occurred");
  }
}

/**
 * Search for nearby users
 */
async function searchNearbyUsers(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists || !doc.data().location) {
      await ctx.reply(
        "📍 You need to share your location first to search nearby users.",
        {
          parse_mode: "Markdown",
        }
      );
      return;
    }

    const userData = doc.data();
    const userLocation = userData.location;

    // Get users with locations (simplified - in production use geohashing)
    const usersSnapshot = await db
      .collection("users")
      .where("location", "!=", null)
      .limit(20)
      .get();

    let nearbyUsers = [];

    usersSnapshot.forEach((doc) => {
      if (doc.id !== userId) {
        const data = doc.data();
        nearbyUsers.push({
          username: data.username || "Anonymous",
          tier: data.tier || "Free",
          distance: "~" + Math.floor(Math.random() * 10) + "km", // Placeholder
        });
      }
    });

    if (nearbyUsers.length === 0) {
      await ctx.reply("🗺️ No users found nearby yet. Check back later!", {
        parse_mode: "Markdown",
      });
      return;
    }

    let message = "🗺️ **Nearby Users**\n\n";
    nearbyUsers.slice(0, 10).forEach((user, index) => {
      message += `${index + 1}. @${user.username} (${user.tier}) - ${user.distance}\n`;
    });

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`User ${userId} searched nearby users`);
  } catch (error) {
    logger.error("Error searching nearby users:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Handle location message
 */
async function handleLocation(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const location = ctx.message.location;

    // Save location to database
    await db.collection("users").doc(userId).update({
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        updatedAt: new Date(),
      },
    });

    await ctx.reply(t("locationUpdated", lang), {
      parse_mode: "Markdown",
    });

    // Clear waiting state
    ctx.session.waitingFor = null;

    // Show main menu again
    const { getMenu } = require("../../config/menus");
    const mainMenu = getMenu("main", lang);

    await ctx.reply(t("mainMenuIntro", lang), {
      reply_markup: mainMenu,
    });

    logger.info(`User ${userId} updated location`);
  } catch (error) {
    logger.error("Error handling location:", error);
    await ctx.reply(t("error", lang));
  }
}

module.exports.handleMapCallback = handleMapCallback;
module.exports.handleLocation = handleLocation;
module.exports.searchNearbyUsers = searchNearbyUsers;
