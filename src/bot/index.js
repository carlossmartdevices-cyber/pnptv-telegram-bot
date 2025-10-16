require("dotenv").config();
const { Telegraf } = require("telegraf");
const { db } = require("../config/firebase");
const { t } = require("../utils/i18n");
const logger = require("../utils/logger");
const bold = require("../config/bold");
const epayco = require("../config/epayco");
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
    const planLookup = planKey.toUpperCase();
    const plan = plans[planLookup] || plans[planKey];

    if (!plan) {
      logger.warn(`Plan ${planKey} not found in plans config`);
      await ctx.answerCbQuery(t("error", lang), { show_alert: true });
      return;
    }

    const userId = ctx.from.id.toString();

    logger.info(`User ${userId} initiated ${planKey} subscription - Plan: ${plan.name}, Price: ${plan.priceInCOP} COP`);

    // Validate required environment variables
    if (!process.env.EPAYCO_PUBLIC_KEY) {
      logger.error("EPAYCO_PUBLIC_KEY not configured");
      throw new Error("Payment gateway not configured");
    }

    // Use ePayco for payment processing
    const paymentData = await epayco.createPaymentLink({
      name: plan.name,
      description: plan.description || `${plan.name} subscription - ${plan.duration} days`,
      amount: plan.priceInCOP, // ePayco works with Colombian Pesos
      currency: "COP",
      userId: userId,
      userEmail: ctx.from.username
        ? `${ctx.from.username}@telegram.user`
        : `user${userId}@telegram.bot`,
      userName: ctx.from.first_name || ctx.from.username || "User",
      plan: planKey,
    });

    if (!paymentData.success || !paymentData.paymentUrl) {
      logger.error("Payment link creation failed:", paymentData);
      throw new Error("Payment link creation failed");
    }

    const linkUrl = paymentData.paymentUrl;

    logger.info(`Payment link created successfully for user ${userId}: ${linkUrl.substring(0, 50)}...`);

    const featuresKey =
      planKey === "golden" ? "goldenFeatures" : "silverFeatures";
    const features = t(featuresKey, lang);

    const message = lang === "es"
      ? `${features}\n\n💳 **Detalles del Pago:**\n• Plan: ${plan.displayName || plan.name}\n• Precio: $${plan.price} USD / ${plan.priceInCOP.toLocaleString()} COP\n• Duración: ${plan.duration} días\n\nHaz clic en el botón para continuar con el pago:`
      : `${features}\n\n💳 **Payment Details:**\n• Plan: ${plan.displayName || plan.name}\n• Price: $${plan.price} USD / ${plan.priceInCOP.toLocaleString()} COP\n• Duration: ${plan.duration} days\n\nClick the button to proceed with payment:`;

    await ctx.answerCbQuery();
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "💳 Ir a Pagar" : "💳 Go to Payment",
              url: linkUrl,
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "back_to_main",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error(`Error creating ${planKey} payment link:`, error);
    logger.error("Error stack:", error.stack);

    const lang = ctx.session.language || "en";
    const errorMessage = lang === "es"
      ? `❌ Error al crear el link de pago.\n\nPor favor intenta de nuevo o contacta a soporte.\n\nError: ${error.message}`
      : `❌ Error creating payment link.\n\nPlease try again or contact support.\n\nError: ${error.message}`;

    if (ctx.updateType === "callback_query") {
      await ctx.answerCbQuery();
      try {
        await ctx.editMessageText(errorMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "🔄 Reintentar" : "🔄 Retry",
                  callback_data: `subscribe_${planKey}`,
                },
              ],
              [
                {
                  text: lang === "es" ? "« Volver" : "« Back",
                  callback_data: "back_to_main",
                },
              ],
            ],
          },
        });
      } catch (editError) {
        await ctx.reply(errorMessage, { parse_mode: "Markdown" });
      }
    } else {
      await ctx.reply(errorMessage, { parse_mode: "Markdown" });
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
