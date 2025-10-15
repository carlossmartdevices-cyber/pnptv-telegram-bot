require("dotenv").config();
const { Telegraf } = require("telegraf");
const { db } = require("../config/firebase");
const { t } = require("../utils/i18n");
const logger = require("../utils/logger");
const bold = require("../config/bold");
const plans = require("../config/plans");
const { ensureOnboarding } = require("../utils/guards");
const { isAdmin, adminMiddleware } = require("../config/admin");
const { getMenu } = require("../config/menus");

// Constants
const ONBOARDING_REWARD_XP = 100;
const ONBOARDING_BADGE = "Trailblazer";

// Middleware
const session = require("./middleware/session");
const rateLimitMiddleware = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

// Handlers
const startHandler = require("./handlers/start");
const helpHandler = require("./handlers/help");
const mapHandler = require("./handlers/map");
const liveHandler = require("./handlers/live");
const { viewProfile, handleEditPhoto, handlePhotoMessage } = require("./handlers/profile");
const subscribeHandler = require("./handlers/subscribe");
const { adminPanel, handleAdminCallback, sendBroadcast, executeSearch } = require("./handlers/admin");
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

// Language selection
bot.action(/language_(.+)/, async (ctx) => {
  try {
    const langCandidate = ctx.match[1];
    const lang = langCandidate === "es" ? "es" : "en";

    ctx.session.language = lang;
    ctx.session.onboardingStep = "ageVerification";

    logger.info(`User ${ctx.from.id} selected language: ${lang}`);

    await ctx.editMessageText(t("ageVerification", lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t("confirmAge", lang), callback_data: "confirm_age" }],
        ],
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in language selection:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

// Age verification
bot.action("confirm_age", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.ageVerified = true;
    ctx.session.onboardingStep = "terms";

    logger.info(`User ${ctx.from.id} confirmed age`);

    await ctx.editMessageText(t("terms", lang), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("accept", lang), callback_data: "accept_terms" },
            { text: t("decline", lang), callback_data: "decline_terms" },
          ],
        ],
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in age confirmation:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

// Terms acceptance
bot.action("accept_terms", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.termsAccepted = true;
    ctx.session.onboardingStep = "privacy";

    logger.info(`User ${ctx.from.id} accepted terms`);

    await ctx.editMessageText(t("privacy", lang), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("accept", lang), callback_data: "accept_privacy" },
            { text: t("decline", lang), callback_data: "decline_privacy" },
          ],
        ],
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in terms acceptance:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

bot.action("decline_terms", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    logger.info(`User ${ctx.from.id} declined terms`);
    await ctx.answerCbQuery(t("termsDeclined", lang), { show_alert: true });
  } catch (error) {
    logger.error("Error declining terms:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

// Privacy policy acceptance
bot.action("accept_privacy", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    const userId = ctx.from.id.toString();

    ctx.session.privacyAccepted = true;
    ctx.session.onboardingComplete = true;
    ctx.session.xp = ONBOARDING_REWARD_XP;
    ctx.session.badges = [ONBOARDING_BADGE];
    ctx.session.tier = "Free";

    // Create user profile in database
    const userRef = db.collection("users").doc(userId);
    await userRef.set(
      {
        userId,
        username: ctx.from.username || "Anonymous",
        language: lang,
        ageVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
        onboardingComplete: true,
        createdAt: new Date(),
        lastActive: new Date(),
        xp: ONBOARDING_REWARD_XP,
        badges: [ONBOARDING_BADGE],
        tier: "Free",
      },
      { merge: true }
    );

    logger.info(`User ${userId} completed onboarding`);

    await ctx.editMessageText(t("profileCreated", lang), {
      parse_mode: "Markdown",
    });

    await ctx.reply(
      t("onboardingReward", lang, {
        xp: ONBOARDING_REWARD_XP,
        badge: ONBOARDING_BADGE,
      }),
      { parse_mode: "Markdown" }
    );

    // Show main menu
    const mainMenu = getMenu("main", lang);
    await ctx.reply(t("mainMenuIntro", lang), {
      reply_markup: mainMenu,
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error completing onboarding:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

bot.action("decline_privacy", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    logger.info(`User ${ctx.from.id} declined privacy policy`);
    await ctx.answerCbQuery(t("privacyDeclined", lang), { show_alert: true });
  } catch (error) {
    logger.error("Error declining privacy:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

// ===== SUBSCRIPTION HANDLERS =====

async function handleSubscription(ctx, planKey) {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  try {
    const lang = ctx.session.language || "en";
    const plan = plans[planKey];

    if (!plan) {
      logger.warn(`Plan ${planKey} not found`);
      await ctx.answerCbQuery(t("error", lang), { show_alert: true });
      return;
    }

    const userId = ctx.from.id.toString();

    logger.info(`User ${userId} initiated ${planKey} subscription`);

    const paymentData = await bold.createPaymentLink({
      totalAmountCents: plan.price,
      currency: plan.currency,
      description: `${plan.name} - ${userId}`,
      referenceId: `${planKey}_${userId}_${Date.now()}`,
      customerEmail: ctx.from.username
        ? `${ctx.from.username}@telegram.user`
        : undefined,
      metadata: {
        userId,
        plan: planKey,
        username: ctx.from.username,
      },
    });

    const linkUrl =
      paymentData?.data?.link_url ||
      paymentData?.payment_link_url ||
      paymentData?.url ||
      paymentData?.payment_link;

    if (!linkUrl) {
      throw new Error("Payment link creation failed");
    }

    const featuresKey =
      planKey === "golden" ? "goldenFeatures" : "silverFeatures";
    const features = t(featuresKey, lang);

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `${features}\n\n${t("paymentRedirect", lang)}`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: t("paymentButton", lang),
                url: linkUrl,
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    logger.error(`Error creating ${planKey} payment link:`, error);
    const lang = ctx.session.language || "en";
    if (ctx.updateType === "callback_query") {
      await ctx.answerCbQuery(t("error", lang), { show_alert: true });
    } else {
      await ctx.reply(t("error", lang));
    }
  }
}

bot.action("subscribe_silver", (ctx) => handleSubscription(ctx, "silver"));
bot.action("subscribe_golden", (ctx) => handleSubscription(ctx, "golden"));
bot.action("subscribe_prime", (ctx) => handleSubscription(ctx, "golden"));
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

// ===== LAUNCH BOT =====

bot
  .launch()
  .then(() => {
    logger.info("Bot started successfully");
    console.log("🤖 PNPtv Bot is running...");
  })
  .catch((error) => {
    logger.error("Failed to start bot:", error);
    process.exit(1);
  });

// Enable graceful stop
process.once("SIGINT", () => {
  logger.info("Received SIGINT, stopping bot...");
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  logger.info("Received SIGTERM, stopping bot...");
  bot.stop("SIGTERM");
});

module.exports = bot;
