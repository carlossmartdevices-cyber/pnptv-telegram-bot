require("../config/env");
const { Telegraf } = require('telegraf');
const { db } = require("../config/firebase");
const { t } = require("../utils/i18n");
const logger = require("../utils/logger");
const epayco = require("../config/epayco");
const { ensureOnboarding } = require("../utils/guards");
const { isAdmin, adminMiddleware } = require("../config/admin");
const { getMenu } = require("../config/menus");
const { prepareTextLocationUpdate } = require("../services/profileService");
const { captureException, setUser } = require("../config/sentry");

// Note: Sentry is initialized in instrument.js at the application entry point

const {
  showPlanDashboard,
  handlePlanCallback,
  handlePlanTextResponse,
} = require('./handlers/admin/planManager');
// Middleware
// MIGRATED TO FIRESTORE: Using scalable Firestore sessions instead of local JSON
const { createFirestoreSession } = require("./middleware/firestoreSession");
const session = createFirestoreSession({
  collectionName: "bot_sessions",
  ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
});
const rateLimitMiddleware = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

// Start session cleanup service
const { sessionCleanup } = require("../utils/sessionCleanup");
sessionCleanup.start();

// Helpers
const onboardingHelpers = require("./helpers/onboardingHelpers");
const subscriptionHelpers = require("./helpers/subscriptionHelpers");

// Handlers
const startHandler = require("./handlers/start");
const helpHandler = require("./handlers/help");
const mapHandler = require("./handlers/map");
const nearbyHandler = require("./handlers/nearby");
const liveHandler = require("./handlers/live");
const appHandler = require("./handlers/app");
const {
  viewProfile,
  handleEditPhoto,
  handlePhotoMessage,
  showSettings,
  toggleAdsOptOut,
} = require("./handlers/profile");
const subscribeHandler = require("./handlers/subscribe");
const {
  adminPanel,
  handleAdminCallback,
  sendBroadcast,
  executeSearch,
  executeSendMessage,
  processActivationUserId,
  processUpdateMemberUserId,
  processExtendUserId,
  executeCustomExtension,
  executeModifyExpiration,
  executePlanEdit,
} = require("./handlers/admin");
const { handleMapCallback, handleLocation } = require("./handlers/map");
const { handleNearbyCallback } = require("./handlers/nearby");
const { handleLiveCallback } = require("./handlers/live");

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Add session middleware
bot.use(session); // Firestore session middleware

// Apply middleware
bot.use(rateLimitMiddleware());

// Middleware to set Sentry user context
bot.use(async (ctx, next) => {
  if (ctx.from) {
    setUser({
      id: ctx.from.id,
      username: ctx.from.username,
    });
  }
  return next();
});

// Error handling with Sentry integration
bot.catch((error, ctx) => {
  // Capture error in Sentry with context
  captureException(error, {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    chatId: ctx.chat?.id,
    updateType: ctx.updateType,
    command: ctx.message?.text || ctx.callbackQuery?.data,
  });

  // Call original error handler
  return errorHandler(error, ctx);
});

// ===== COMMANDS =====
bot.start(startHandler);
bot.command("help", helpHandler);
bot.command("map", mapHandler);
bot.command("nearby", nearbyHandler);
bot.command("live", liveHandler);
bot.command("app", appHandler);
bot.command("profile", viewProfile);
bot.command("subscribe", subscribeHandler);
bot.command("admin", adminMiddleware(), adminPanel);
bot.command("plans", adminMiddleware(), async (ctx) => {
  await showPlanDashboard(ctx);
});

// ===== ONBOARDING FLOW =====
bot.action(/language_(.+)/, onboardingHelpers.handleLanguageSelection);
bot.action("confirm_age", onboardingHelpers.handleAgeConfirmation);
bot.action("accept_terms", onboardingHelpers.handleTermsAcceptance);
bot.action("decline_terms", onboardingHelpers.handleTermsDecline);
bot.action("accept_privacy", onboardingHelpers.handlePrivacyAcceptance);
bot.action("decline_privacy", onboardingHelpers.handlePrivacyDecline);

// ===== SUBSCRIPTION HANDLERS =====
bot.action(/^plan_select_(.+)$/, async (ctx) => {
  const planId = ctx.match[1];
  await subscriptionHelpers.handleSubscription(ctx, planId);
});

// Back to subscription plans handler
bot.action("show_subscription_plans", async (ctx) => {
  await subscribeHandler(ctx);
});

// Main menu item handlers
bot.action("show_my_profile", async (ctx) => {
  await viewProfile(ctx);
});

bot.action("show_nearby", async (ctx) => {
  await nearbyHandler(ctx);
});

bot.action("show_help", async (ctx) => {
  await helpHandler(ctx);
});

// Payment method selection handlers
bot.action(/^pay_epayco_(.+)$/, async (ctx) => {
  const planId = ctx.match[1];
  await subscriptionHelpers.handleSubscription(ctx, planId, "epayco");
});

bot.action(/^pay_daimo_(.+)$/, async (ctx) => {
  const planId = ctx.match[1];
  await subscriptionHelpers.handleSubscription(ctx, planId, "daimo");
});

bot.action("upgrade_tier", (ctx) => subscribeHandler(ctx));
bot.action("subscribe_prime", (ctx) => subscribeHandler(ctx));

// ===== PROFILE EDIT HANDLERS =====

bot.action("edit_bio", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.waitingFor = "bio";

    await ctx.answerCbQuery();
    await ctx.reply(t("enterBio", lang), { parse_mode: "Markdown" });

    logger.info(`User ${ctx.from.id} started editing bio`);
  } catch (error) {
    logger.error("Error in edit bio:", error);
  }
});

bot.action("edit_location", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.waitingFor = "location_text";

    await ctx.answerCbQuery();
    await ctx.reply(t("enterLocation", lang), {
      parse_mode: "Markdown",
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

    logger.info(`User ${ctx.from.id} started editing location`);
  } catch (error) {
    logger.error("Error in edit location:", error);
  }
});

// Edit photo
bot.action("edit_photo", handleEditPhoto);

// Profile settings
bot.action("profile_settings", showSettings);
bot.action("settings_toggle_ads", toggleAdsOptOut);
bot.action("settings_back", viewProfile);

// ===== ADMIN CALLBACKS =====

bot.action(/^plan:/, handlePlanCallback);
bot.action(/^admin_/, handleAdminCallback);

// ===== MAP CALLBACKS =====

bot.action(
  /^(share_location|search_nearby(_[0-9]+)?|profile_view_map)$/,
  handleMapCallback
);

// ===== NEARBY CALLBACKS =====

bot.action(/^open_nearby_app$/, handleNearbyCallback);

// ===== LIVE CALLBACKS =====

bot.action(/^(start_live|view_lives)$/, handleLiveCallback);

// ===== BACK NAVIGATION =====

bot.action("back_to_main", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";

    await ctx.answerCbQuery();

    // Edit the message to show main menu with inline keyboard
    try {
      await ctx.editMessageText(t("mainMenuIntro", lang), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "¡Únete a nuestro canal gratis!" : "Join our free channel!",
                url: "https://t.me/pnptvfree",
              },
            ],
            [
              {
                text: lang === "es" ? "¡Suscríbete al canal PRIME!" : "Subscribe to PRIME channel!",
                callback_data: "show_subscription_plans",
              },
            ],
            [
              {
                text: lang === "es" ? "👤 Mi Perfil" : "👤 My Profile",
                callback_data: "show_my_profile",
              },
            ],
            [
              {
                text: lang === "es" ? "🌍 ¿Quién está cerca?" : "🌍 Who is nearby?",
                callback_data: "show_nearby",
              },
            ],
            [
              {
                text: lang === "es" ? "❓ Ayuda" : "❓ Help",
                callback_data: "show_help",
              },
            ],
          ],
        },
        parse_mode: "Markdown",
      });
    } catch (editError) {
      // If edit fails, send new message
      await ctx.reply(t("mainMenuIntro", lang), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "¡Únete a nuestro canal gratis!" : "Join our free channel!",
                url: "https://t.me/pnptvfree",
              },
            ],
            [
              {
                text: lang === "es" ? "¡Suscríbete al canal PRIME!" : "Subscribe to PRIME channel!",
                callback_data: "show_subscription_plans",
              },
            ],
            [
              {
                text: lang === "es" ? "👤 Mi Perfil" : "👤 My Profile",
                callback_data: "show_my_profile",
              },
            ],
            [
              {
                text: lang === "es" ? "🌍 ¿Quién está cerca?" : "🌍 Who is nearby?",
                callback_data: "show_nearby",
              },
            ],
            [
              {
                text: lang === "es" ? "❓ Ayuda" : "❓ Help",
                callback_data: "show_help",
              },
            ],
          ],
        },
        parse_mode: "Markdown",
      });
    }
  } catch (error) {
    logger.error("Error in back navigation:", error);
  }
});

// ===== TEXT MESSAGE HANDLERS =====

// ===== MEDIA MESSAGE HANDLERS =====
bot.on("photo", async (ctx, next) => {
  // Check if admin is uploading broadcast media
  if (ctx.session.waitingFor === "broadcast_media" && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "photo");
  } else {
    await handlePhotoMessage(ctx);
  }
});

bot.on("video", async (ctx) => {
  // Check if admin is uploading broadcast media
  if (ctx.session.waitingFor === "broadcast_media" && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "video");
  }
});

bot.on("document", async (ctx) => {
  // Check if admin is uploading broadcast media
  if (ctx.session.waitingFor === "broadcast_media" && isAdmin(ctx.from.id)) {
    const { handleBroadcastMedia } = require("./handlers/admin");
    await handleBroadcastMedia(ctx, "document");
  }
});
bot.on("text", async (ctx) => {
  try {
    if (await handlePlanTextResponse(ctx)) {
      return;
    }
    // Check onboarding
    if (!ctx.session?.onboardingComplete) {
      const lang = ctx.session?.language || "en";
      await ctx.reply(t("pleaseCompleteOnboarding", lang));
      return;
    }

    const userId = ctx.from.id.toString();
    const lang = ctx.session.language || "en";
    const {
      sanitizeInput,
      isValidBio,
      isValidLocation,
    } = require("../utils/validation");

    // Handle different waiting states
    if (ctx.session.waitingFor === "bio") {
      const bio = sanitizeInput(ctx.message.text);

      if (!isValidBio(bio)) {
        await ctx.reply(t("invalidInput", lang));
        return;
      }

      await db.collection("users").doc(userId).update({ bio });
      ctx.session.waitingFor = null;

      await ctx.reply(t("bioUpdated", lang), { parse_mode: "Markdown" });

      // Show main menu
      const mainMenu = getMenu("main", lang);
      await ctx.reply(t("mainMenuIntro", lang), {
        reply_markup: mainMenu,
      });

      logger.info(`User ${userId} updated bio`);
    } else if (ctx.session.waitingFor === "location_text") {
      const location = sanitizeInput(ctx.message.text);

      if (!isValidLocation(location)) {
        await ctx.reply(t("invalidInput", lang));
        return;
      }

      const locationUpdate = prepareTextLocationUpdate(location);

      await db
        .collection("users")
        .doc(userId)
        .update({
          ...locationUpdate,
          lastActive: new Date(),
        });
      ctx.session.waitingFor = null;

      await ctx.reply(t("locationUpdated", lang), { parse_mode: "Markdown" });

      // Show main menu
      const mainMenu = getMenu("main", lang);
      await ctx.reply(t("mainMenuIntro", lang), {
        reply_markup: mainMenu,
      });

      logger.info(`User ${userId} updated location (text)`);
    } else if (ctx.session.waitingFor === "broadcast_message") {
      // Admin broadcast message - step 4 text
      if (isAdmin(ctx.from.id)) {
        await sendBroadcast(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "broadcast_text") {
      // Admin broadcast message - step 4 text (new wizard)
      if (isAdmin(ctx.from.id)) {
        await sendBroadcast(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "broadcast_buttons") {
      // Admin broadcast buttons - step 5
      if (isAdmin(ctx.from.id)) {
        const { handleBroadcastButtons } = require("./handlers/admin");
        await handleBroadcastButtons(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_search") {
      // Admin user search
      if (isAdmin(ctx.from.id)) {
        await executeSearch(ctx, ctx.message.text);
      }
    } else if (
      ctx.session.waitingFor &&
      ctx.session.waitingFor.startsWith("admin_message_")
    ) {
      // Admin send message to user
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace("admin_message_", "");
        await executeSendMessage(ctx, userId, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_activate_userid") {
      // Admin manual membership activation - user ID input
      if (isAdmin(ctx.from.id)) {
        await processActivationUserId(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_update_member_userid") {
      // Admin update member - user ID input
      if (isAdmin(ctx.from.id)) {
        await processUpdateMemberUserId(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_extend_userid") {
      // Admin extend membership - user ID input
      if (isAdmin(ctx.from.id)) {
        await processExtendUserId(ctx, ctx.message.text);
      }
    } else if (
      ctx.session.waitingFor &&
      ctx.session.waitingFor.startsWith("admin_extend_custom_days_")
    ) {
      // Admin custom extension - days input
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace(
          "admin_extend_custom_days_",
          ""
        );
        await executeCustomExtension(ctx, userId, ctx.message.text);
      }
    } else if (
      ctx.session.waitingFor &&
      ctx.session.waitingFor.startsWith("admin_modify_expiration_")
    ) {
      // Admin modify expiration - date input
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace(
          "admin_modify_expiration_",
          ""
        );
        await executeModifyExpiration(ctx, userId, ctx.message.text);
      }
    } else if (
      ctx.session.waitingFor &&
      ctx.session.waitingFor.startsWith("admin_plan_edit_")
    ) {
      // Admin plan edit - field input
      if (isAdmin(ctx.from.id)) {
        // Extract field and plan name from waitingFor
        // Format: admin_plan_edit_<field>_<planName>
        const parts = ctx.session.waitingFor
          .replace("admin_plan_edit_", "")
          .split("_");
        const field = parts[0];
        const planName = parts[1];
        await executePlanEdit(ctx, planName, field, ctx.message.text);
      }
    } else {
      // Handle keyboard button texts
      const text = ctx.message.text.toLowerCase();

      if (text.includes("profile") || text.includes("perfil")) {
        await viewProfile(ctx);
      } else if (text.includes("map") || text.includes("mapa")) {
        await mapHandler(ctx);
      } else if (text.includes("nearby") || text.includes("cercano") || text.includes("cerca") || text.includes("miembro")) {
        await nearbyHandler(ctx);
      } else if (text.includes("live") || text.includes("vivo")) {
        await liveHandler(ctx);
      } else if (text.includes("subscri") || text.includes("suscri") || text.includes("plan")) {
        await subscribeHandler(ctx);
      } else if (text.includes("help") || text.includes("ayuda")) {
        await helpHandler(ctx);
      } else if (text.includes("pnptv app") || text.includes("app pnptv") || text.includes("mini app") || text.includes("abrir mini")) {
        // Handle PNPTv App / Mini App keyboard button
        await appHandler(ctx);
      }
    }
  } catch (error) {
    logger.error("Error handling text message:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
});

// ===== LOCATION MESSAGE HANDLER =====

bot.on("location", handleLocation);

// Add action handlers
bot.action("cancel_delete", (ctx) =>
  ctx.editMessageText("Operation cancelled")
);

// Find the problematic area around line 334 and fix closing brackets
bot.action("show_map", async (ctx) => {
  try {
    await ctx.reply("Select your preferred distance:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "5km", callback_data: "map_distance_5" },
            { text: "10km", callback_data: "map_distance_10" },
            { text: "25km", callback_data: "map_distance_25" },
          ],
          [{ text: "🔙 Back", callback_data: "back_to_main" }],
        ],
      }, // Fix: Add missing closing brace
    }); // Fix: Add missing closing parenthesis
  } catch (error) {
    console.error("Error showing map:", error);
    await ctx.reply("Error showing map options. Please try again.");
  }
}); // Fix: Add missing closing parenthesis

module.exports = bot;
