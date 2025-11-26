const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const {
  calculateDistance,
  formatDistance,
  findUsersWithinRadius,
  isValidLocation,
  getBoundingBox,
} = require("../../utils/geolocation");
const { prepareLocationUpdate } = require("../../services/profileService");
const geoService = require("../../services/geoService");

/**
 * Map handler - shows nearby users with REAL distance calculation
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

    // Add radius selection buttons
    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("shareLocation", lang),
              callback_data: "share_location",
            },
          ],
          [
            {
              text: "🔍 5km",
              callback_data: "search_nearby_5",
            },
            {
              text: "🔍 10km",
              callback_data: "search_nearby_10",
            },
          ],
          [
            {
              text: "🔍 25km",
              callback_data: "search_nearby_25",
            },
            {
              text: "🔍 50km",
              callback_data: "search_nearby_50",
            },
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
        await ctx.answerCbQuery();
        await ctx.reply("📍 " + t("shareLocation", lang), {
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

      case "search_nearby_5":
        await ctx.answerCbQuery();
        await searchNearbyUsers(ctx, 5);
        break;

      case "search_nearby_10":
        await ctx.answerCbQuery();
        await searchNearbyUsers(ctx, 10);
        break;

      case "search_nearby_25":
        await ctx.answerCbQuery();
        await searchNearbyUsers(ctx, 25);
        break;

      case "search_nearby_50":
        await ctx.answerCbQuery();
        await searchNearbyUsers(ctx, 50);
        break;

      case "search_nearby":
        await ctx.answerCbQuery();
        await searchNearbyUsers(ctx, 25);
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
 * Search for nearby users with REAL distance calculation
 */
async function searchNearbyUsers(ctx, radiusKm = 25) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists || !doc.data().location) {
      const message =
        lang === "es"
          ? "📍 Necesitas compartir tu ubicación primero."
          : "📍 You need to share your location first.";

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: t("shareLocation", lang),
                callback_data: "share_location",
              },
            ],
          ],
        },
      });
      return;
    }

    const userData = doc.data();
    const userLocation = userData.location;

    if (!isValidLocation(userLocation)) {
      await ctx.reply(
        lang === "es"
          ? "❌ Tu ubicación no es válida."
          : "❌ Your location is invalid."
      );
      return;
    }

    const loadingMsg = await ctx.reply(
      lang === "es"
        ? `🔍 Buscando usuarios dentro de ${radiusKm}km...`
        : `🔍 Searching within ${radiusKm}km...`
    );

    const usersSnapshot = await db
      .collection("users")
      .where("location", "!=", null)
      .limit(100)
      .get();

    let allUsers = [];
    usersSnapshot.forEach((doc) => {
      if (doc.id !== userId) {
        const data = doc.data();
        allUsers.push({
          userId: doc.id,
          username: data.username || "Anonymous",
          tier: data.tier || "Free",
          location: data.location,
          bio: data.bio || null,
          xp: data.xp || 0,
        });
      }
    });

    const nearbyUsers = findUsersWithinRadius(userLocation, allUsers, radiusKm);

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    if (nearbyUsers.length === 0) {
      const message =
        lang === "es"
          ? `🗺️ No usuarios dentro de ${radiusKm}km.`
          : `🗺️ No users within ${radiusKm}km.`;

      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "🔍 50km" : "🔍 50km",
                callback_data: "search_nearby_50",
              },
            ],
          ],
        },
      });
      return;
    }

    let message =
      lang === "es"
        ? `🗺️ **Usuarios Cercanos** (${nearbyUsers.length})\n\n`
        : `🗺️ **Nearby Users** (${nearbyUsers.length})\n\n`;

    const categories = {
      veryClose: [],
      close: [],
      nearby: [],
      area: [],
      region: [],
    };

    nearbyUsers.forEach((user) => {
      if (user.distance < 1) categories.veryClose.push(user);
      else if (user.distance < 5) categories.close.push(user);
      else if (user.distance < 10) categories.nearby.push(user);
      else if (user.distance < 25) categories.area.push(user);
      else categories.region.push(user);
    });

    const displayUsers = (users, emoji) => {
      users.slice(0, 5).forEach((user) => {
        const tierIcon = (() => {
          const t = (user.tier || '').toString().toLowerCase();
          if (t === 'diamond-member') return '🥇';
          if (t === 'crystal-member') return '🥈';
          if (t === 'pnp-member') return '💎';
          if (t === 'trial-week') return '🟢';
          return '⚪';
        })();
        const bioText = user.bio ? user.bio.slice(0, 30) + "..." : "";

        message += `${emoji} @${user.username} ${tierIcon}\n`;
        message += `   📍 ${user.distanceFormatted}${
          bioText ? " - " + bioText : ""
        }\n\n`;
      });
    };

    if (categories.veryClose.length > 0) {
      message += lang === "es" ? "🔥 **Muy cerca:**\n" : "🔥 **Very Close:**\n";
      displayUsers(categories.veryClose, "🔥");
    }

    if (categories.close.length > 0) {
      message += lang === "es" ? "✨ **Cerca:**\n" : "✨ **Close:**\n";
      displayUsers(categories.close, "✨");
    }

    if (categories.nearby.length > 0) {
      message += lang === "es" ? "📍 **Cercano:**\n" : "📍 **Nearby:**\n";
      displayUsers(categories.nearby, "📍");
    }

    if (categories.area.length > 0) {
      message +=
        lang === "es" ? "🗺️ **En tu área:**\n" : "🗺️ **In Your Area:**\n";
      displayUsers(categories.area, "🗺️");
    }

    if (categories.region.length > 0) {
      message +=
        lang === "es" ? "🌍 **En tu región:**\n" : "🌍 **In Your Region:**\n";
      displayUsers(categories.region, "🌍");
    }

    const closestUser = nearbyUsers[0];
    message +=
      "\n" +
      (lang === "es"
        ? `👤 Más cercano: @${closestUser.username} (${closestUser.distanceFormatted})`
        : `👤 Closest: @${closestUser.username} (${closestUser.distanceFormatted})`);

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔄 Buscar de nuevo" : "🔄 Search Again",
              callback_data: `search_nearby_${radiusKm}`,
            },
          ],
          [
            {
              text: lang === "es" ? "📏 Cambiar radio" : "📏 Change Radius",
              callback_data: "profile_view_map",
            },
          ],
        ],
      },
      parse_mode: "Markdown",
    });

    logger.info(
      `User ${userId} found ${nearbyUsers.length} users within ${radiusKm}km`
    );
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

    if (!isValidLocation(location)) {
      await ctx.reply(
        lang === "es" ? "❌ Ubicación inválida." : "❌ Invalid location."
      );
      return;
    }

    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    let distanceMoved = null;
    if (doc.exists && doc.data().location) {
      const oldLocation = doc.data().location;
      if (isValidLocation(oldLocation)) {
        distanceMoved = calculateDistance(
          oldLocation.latitude,
          oldLocation.longitude,
          location.latitude,
          location.longitude
        );
      }
    }

    const locationUpdate = prepareLocationUpdate({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    await userRef.update({
      ...locationUpdate,
      lastActive: new Date(),
    });

    let confirmMessage =
      lang === "es"
        ? "✅ Ubicación actualizada!\n\n"
        : "✅ Location updated!\n\n";

    confirmMessage += `📍 ${location.latitude.toFixed(
      4
    )}, ${location.longitude.toFixed(4)}`;

    if (locationUpdate.locationName) {
      confirmMessage += `\n🗺️ ${locationUpdate.locationName}`;
    }

    if (distanceMoved !== null && distanceMoved > 0.1) {
      confirmMessage +=
        "\n" +
        (lang === "es"
          ? `📏 Te moviste ${formatDistance(distanceMoved, lang)}`
          : `📏 You moved ${formatDistance(distanceMoved, lang)}`);
    }

    await ctx.reply(confirmMessage, { parse_mode: "Markdown" });

    ctx.session.waitingFor = null;

    await ctx.reply(
      lang === "es"
        ? "🔍 ¿Buscar usuarios cercanos?"
        : "🔍 Search for nearby users?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔍 5km", callback_data: "search_nearby_5" },
              { text: "🔍 10km", callback_data: "search_nearby_10" },
            ],
            [
              { text: "🔍 25km", callback_data: "search_nearby_25" },
              { text: "🔍 50km", callback_data: "search_nearby_50" },
            ],
          ],
        },
      }
    );

    logger.info(`User ${userId} updated location`);
  } catch (error) {
    logger.error("Error handling location:", error);
    await ctx.reply(t("error", lang));
  }
}

module.exports.handleMapCallback = handleMapCallback;
module.exports.handleLocation = handleLocation;
module.exports.searchNearbyUsers = searchNearbyUsers;

/**
 * Handle nearby users request
 */
async function handleNearbyUsers(ctx) {
  const location = ctx.message.location;
  const coordinates = { lat: location.latitude, lng: location.longitude };

  const nearbyUsers = await geoService.getNearbyUsers(coordinates);

  const message =
    nearbyUsers.length > 0
      ? nearbyUsers
          .map(
            (user) =>
              `👤 @${user.username} - ${user.distance.toFixed(1)}km away`
          )
          .join("\n")
      : "No users found nearby";

  await ctx.reply(message);
}

module.exports.handleNearbyUsers = handleNearbyUsers;
