require("../config/env");
const { Telegraf } = require("telegraf");
const { db } = require("../config/firebase");
const { t } = require("../utils/i18n");
const logger = require("../utils/logger");
const epayco = require("../config/epayco");
const plans = require("../config/plans");
const { ensureOnboarding } = require("../utils/guards");
const { isAdmin, adminMiddleware } = require("../config/admin");
const { getMenu } = require("../config/menus");

// Middleware
const session = require("./middleware/session");
const rateLimitMiddleware = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

// Helpers
const onboardingHelpers = require("./helpers/onboardingHelpers");
const subscriptionHelpers = require("./helpers/subscriptionHelpers");

// Handlers
const startHandler = require("./handlers/start");
const helpHandler = require("./handlers/help");
const mapHandler = require("./handlers/map");
const liveHandler = require("./handlers/live");
const { viewProfile, handleEditPhoto, handlePhotoMessage } = require("./handlers/profile");
const subscribeHandler = require("./handlers/subscribe");
const {
  adminPanel,
  handleAdminCallback,
  sendBroadcast,
  executeSearch,
  executeGiveXP,
  executeSendMessage,
  processActivationUserId,
  processUpdateMemberUserId,
  processExtendUserId,
  executeCustomExtension,
  executeModifyExpiration,
  executePlanEdit
} = require("./handlers/admin");
const { handleMapCallback, handleLocation } = require("./handlers/map");
const { handleLiveCallback } = require("./handlers/live");

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Apply middleware
bot.use(session.middleware());
bot.use(rateLimitMiddleware());

// Error handling
bot.catch(errorHandler);

// ===== COMMANDS =====
bot.start(startHandler);
bot.command("help", helpHandler);
bot.command("map", mapHandler);
bot.command("live", liveHandler);
bot.command("profile", viewProfile);
bot.command("subscribe", subscribeHandler);
bot.command("admin", adminMiddleware(), adminPanel);

// ===== ONBOARDING FLOW =====
bot.action(/language_(.+)/, onboardingHelpers.handleLanguageSelection);
bot.action("confirm_age", onboardingHelpers.handleAgeConfirmation);
bot.action("accept_terms", onboardingHelpers.handleTermsAcceptance);
bot.action("decline_terms", onboardingHelpers.handleTermsDecline);
bot.action("accept_privacy", onboardingHelpers.handlePrivacyAcceptance);
bot.action("decline_privacy", onboardingHelpers.handlePrivacyDecline);

// ===== SUBSCRIPTION HANDLERS =====
bot.action("subscribe_silver", (ctx) => subscriptionHelpers.handleSubscription(ctx, "silver"));
bot.action("subscribe_golden", (ctx) => subscriptionHelpers.handleSubscription(ctx, "golden"));
bot.action("subscribe_prime", (ctx) => subscriptionHelpers.handleSubscription(ctx, "golden"));
bot.action("upgrade_tier", (ctx) => subscribeHandler(ctx));

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

// ===== ADMIN CALLBACKS =====

bot.action(/^admin_/, handleAdminCallback);

// ===== MAP CALLBACKS =====

bot.action(/^(share_location|search_nearby(_[0-9]+)?|profile_view_map)$/, handleMapCallback);

// ===== LIVE CALLBACKS =====

bot.action(/^(start_live|view_lives)$/, handleLiveCallback);

// ===== BACK NAVIGATION =====

bot.action("back_to_main", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    const mainMenu = getMenu("main", lang);

    await ctx.answerCbQuery();
    await ctx.editMessageText(t("mainMenuIntro", lang), {
      reply_markup: mainMenu,
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in back navigation:", error);
  }
});

// ===== TEXT MESSAGE HANDLERS =====

// ===== PHOTO MESSAGE HANDLER =====bot.on("photo", handlePhotoMessage);
bot.on("text", async (ctx) => {
  try {
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

      await db.collection("users").doc(userId).update({ location });
      ctx.session.waitingFor = null;

      await ctx.reply(t("locationUpdated", lang), { parse_mode: "Markdown" });

      // Show main menu
      const mainMenu = getMenu("main", lang);
      await ctx.reply(t("mainMenuIntro", lang), {
        reply_markup: mainMenu,
      });

      logger.info(`User ${userId} updated location (text)`);
    } else if (ctx.session.waitingFor === "broadcast_message") {
      // Admin broadcast message
      if (isAdmin(ctx.from.id)) {
        await sendBroadcast(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor === "admin_search") {
      // Admin user search
      if (isAdmin(ctx.from.id)) {
        await executeSearch(ctx, ctx.message.text);
      }
    } else if (ctx.session.waitingFor && ctx.session.waitingFor.startsWith("admin_give_xp_")) {
      // Admin give XP
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace("admin_give_xp_", "");
        await executeGiveXP(ctx, userId, ctx.message.text);
      }
    } else if (ctx.session.waitingFor && ctx.session.waitingFor.startsWith("admin_message_")) {
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
    } else if (ctx.session.waitingFor && ctx.session.waitingFor.startsWith("admin_extend_custom_days_")) {
      // Admin custom extension - days input
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace("admin_extend_custom_days_", "");
        await executeCustomExtension(ctx, userId, ctx.message.text);
      }
    } else if (ctx.session.waitingFor && ctx.session.waitingFor.startsWith("admin_modify_expiration_")) {
      // Admin modify expiration - date input
      if (isAdmin(ctx.from.id)) {
        const userId = ctx.session.waitingFor.replace("admin_modify_expiration_", "");
        await executeModifyExpiration(ctx, userId, ctx.message.text);
      }
    } else if (ctx.session.waitingFor && ctx.session.waitingFor.startsWith("admin_plan_edit_")) {
      // Admin plan edit - field input
      if (isAdmin(ctx.from.id)) {
        // Extract field and plan name from waitingFor
        // Format: admin_plan_edit_<field>_<planName>
        const parts = ctx.session.waitingFor.replace("admin_plan_edit_", "").split("_");
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
      } else if (text.includes("live") || text.includes("vivo")) {
        await liveHandler(ctx);
      } else if (text.includes("subscribe") || text.includes("suscri")) {
        await subscribeHandler(ctx);
      } else if (text.includes("help") || text.includes("ayuda")) {
        await helpHandler(ctx);
      } else if (text.includes("mini app") || text.includes("abrir mini")) {
        // Handle Mini App keyboard button
        const lang = ctx.session?.language || "en";
        const webAppUrl = process.env.WEB_APP_URL;

        if (webAppUrl && webAppUrl.startsWith("https://")) {
          // HTTPS configured - show Mini App button
          await ctx.reply(
            lang === "es"
              ? "🌐 Toca el botón para abrir la Mini App"
              : "🌐 Tap the button to open the Mini App",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: lang === "es" ? "🚀 Abrir Mini App" : "🚀 Open Mini App",
                      web_app: { url: webAppUrl },
                    },
                  ],
                ],
              },
            }
          );
        } else {
          // No HTTPS - show demo link
          await ctx.reply(
            lang === "es"
              ? "💡 *Mini App Demo*\n\nAbre en tu navegador:\n`http://localhost:3000/demo.html`\n\n📱 Para usar en Telegram, necesitas configurar HTTPS con ngrok"
              : "💡 *Mini App Demo*\n\nOpen in your browser:\n`http://localhost:3000/demo.html`\n\n📱 To use in Telegram, you need HTTPS with ngrok",
            { parse_mode: "Markdown" }
          );
        }
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

module.exports = bot;

