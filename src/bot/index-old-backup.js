require("dotenv").config();
const { Telegraf } = require("telegraf");
const { db } = require("../config/firebase");
const { t } = require("../utils/i18n");
const logger = require("../utils/logger");
const bold = require("../config/bold");
const plans = require("../config/plans");
const { ensureOnboarding } = require("../utils/guards");

const ONBOARDING_REWARD_XP = 100;
const ONBOARDING_BADGE = "Trailblazer";
const MAIN_MENU_KEYBOARD = [
  ["/profile", "/map"],
  ["/live", "/subscribe"],
  ["/help"],
];

// Middleware
const session = require("./middleware/session");
const rateLimitMiddleware = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

// Handlers
const startHandler = require("./handlers/start");
const helpHandler = require("./handlers/help");
const mapHandler = require("./handlers/map");
const liveHandler = require("./handlers/live");
const { viewProfile } = require("./handlers/profile");
const subscribeHandler = require("./handlers/subscribe");

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Apply middleware
bot.use(session.middleware());
bot.use(rateLimitMiddleware());

// Error handling
bot.catch(errorHandler);

// Commands
bot.start(startHandler);
bot.command("help", helpHandler);
bot.command("map", mapHandler);
bot.command("live", liveHandler);
bot.command("profile", viewProfile);
bot.command("subscribe", subscribeHandler);

// Callback query handlers for onboarding
bot.action(/language_(.+)/, async (ctx) => {
  try {
    const langCandidate = ctx.match[1];
    const lang = langCandidate === "es" ? "es" : "en";

    ctx.session.language = lang;
    ctx.session.onboardingStep = "ageVerification";
    ctx.session.ageVerified = false;
    ctx.session.termsAccepted = false;
    ctx.session.privacyAccepted = false;

    logger.info(`User ${ctx.from.id} selected language: ${lang}`);

    await ctx.editMessageText(t("ageVerification", lang), {
      reply_markup: {
        inline_keyboard: [[{ text: t("confirmAge", lang), callback_data: "confirm_age" }]],
      },
    });
  } catch (error) {
    logger.error("Error in language selection:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

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
    });
  } catch (error) {
    logger.error("Error in age confirmation:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

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

bot.action("accept_privacy", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    const userId = ctx.from.id.toString();

    ctx.session.privacyAccepted = true;
    ctx.session.onboardingComplete = true;

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
        updatedAt: new Date(),
        xp: ONBOARDING_REWARD_XP,
        badges: [ONBOARDING_BADGE],
        tier: "Free",
      },
      { merge: true }
    );

    ctx.session.xp = ONBOARDING_REWARD_XP;
    ctx.session.badges = [ONBOARDING_BADGE];

    logger.info(`User ${userId} completed onboarding`);

    await ctx.editMessageText(t("profileCreated", lang), {
      parse_mode: "Markdown",
    });

    await ctx.reply(t("onboardingReward", lang, { xp: ONBOARDING_REWARD_XP, badge: ONBOARDING_BADGE }));

    await ctx.reply(t("mainMenuIntro", lang), {
      reply_markup: {
        keyboard: MAIN_MENU_KEYBOARD,
        resize_keyboard: true,
      },
    });

    await ctx.reply(t("welcome", lang), {
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
      customerEmail: ctx.from.username ? `${ctx.from.username}@telegram.user` : undefined,
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

    const featuresKey = planKey === "golden" ? "goldenFeatures" : "silverFeatures";
    const planLabel = plan.displayName || plan.name;
    const priceDisplay = `$${(plan.price / 100).toFixed(2)} ${plan.currency}`;

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      lang === "es"
        ? `*Plan ${planLabel}*\n\n${t(featuresKey, lang)}\n\nPrecio: ${priceDisplay}\n\nHaz clic en el bot?n para completar el pago:`
        : `*${planLabel} Plan*\n\n${t(featuresKey, lang)}\n\nPrice: ${priceDisplay}\n\nClick the button to complete payment:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "Pagar ahora" : "Pay now",
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

// Subscribe button handlers
bot.action("subscribe_silver", (ctx) => handleSubscription(ctx, "silver"));
bot.action("subscribe_golden", (ctx) => handleSubscription(ctx, "golden"));
bot.action("subscribe_prime", (ctx) => handleSubscription(ctx, "golden"));

bot.action("profile_view_map", async (ctx) => {
  try {
    if (!ensureOnboarding(ctx)) {
      return;
    }

    await ctx.answerCbQuery();
    await mapHandler(ctx);
  } catch (error) {
    logger.error("Error opening map from profile:", error);
    const lang = ctx.session.language || "en";
    await ctx.reply(t("error", lang));
  }
});

bot.action("live_start", async (ctx) => {
  try {
    if (!ensureOnboarding(ctx)) {
      return;
    }

    const lang = ctx.session.language || "en";
    await ctx.answerCbQuery(t("liveComingSoon", lang), { show_alert: true });
  } catch (error) {
    logger.error("Error starting live placeholder:", error);
    const lang = ctx.session.language || "en";
    await ctx.reply(t("error", lang));
  }
});

bot.action("live_view", async (ctx) => {
  try {
    if (!ensureOnboarding(ctx)) {
      return;
    }

    const lang = ctx.session.language || "en";
    await ctx.answerCbQuery(t("liveComingSoon", lang), { show_alert: true });
  } catch (error) {
    logger.error("Error viewing lives placeholder:", error);
    const lang = ctx.session.language || "en";
    await ctx.reply(t("error", lang));
  }
});

// Edit profile handlers
bot.action("edit_bio", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.editingField = "bio";

    await ctx.answerCbQuery();
    await ctx.reply(
      lang === "es"
        ? "Escribe tu nueva biografía (máximo 500 caracteres):"
        : "Enter your new bio (max 500 characters):"
    );

    logger.info(`User ${ctx.from.id} started editing bio`);
  } catch (error) {
    logger.error("Error in edit bio:", error);
  }
});

bot.action("edit_location", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.editingField = "location";

    await ctx.answerCbQuery();
    await ctx.reply(
      lang === "es"
        ? "Escribe tu ubicación (máximo 100 caracteres):"
        : "Enter your location (max 100 characters):"
    );

    logger.info(`User ${ctx.from.id} started editing location`);
  } catch (error) {
    logger.error("Error in edit location:", error);
  }
});

// Handle text messages for profile editing
bot.on("text", async (ctx) => {
  try {
    if (!ctx.session?.onboardingComplete) {
      const lang = ctx.session?.language || "en";
      await ctx.reply(t("pleaseCompleteOnboarding", lang));
      return;
    }

    const userId = ctx.from.id.toString();
    const lang = ctx.session.language || "en";
    const { sanitizeInput, isValidBio, isValidLocation } = require("../utils/validation");

    if (ctx.session.editingField === "bio") {
      const bio = sanitizeInput(ctx.message.text);

      if (!isValidBio(bio)) {
        await ctx.reply(
          lang === "es"
            ? "La biografía debe tener entre 1 y 500 caracteres."
            : "Bio must be between 1 and 500 characters."
        );
        return;
      }

      const userRef = db.collection("users").doc(userId);
      await userRef.update({ bio });

      ctx.session.editingField = null;
      await ctx.reply(
        lang === "es" ? "✅ Biografía actualizada correctamente." : "✅ Bio updated successfully."
      );

      logger.info(`User ${userId} updated bio`);
    } else if (ctx.session.editingField === "location") {
      const location = sanitizeInput(ctx.message.text);

      if (!isValidLocation(location)) {
        await ctx.reply(
          lang === "es"
            ? "La ubicación debe tener entre 1 y 100 caracteres."
            : "Location must be between 1 and 100 characters."
        );
        return;
      }

      const userRef = db.collection("users").doc(userId);
      await userRef.update({ location });

      ctx.session.editingField = null;
      await ctx.reply(
        lang === "es" ? "✅ Ubicación actualizada correctamente." : "✅ Location updated successfully."
      );

      logger.info(`User ${userId} updated location`);
    }
  } catch (error) {
    logger.error("Error handling text message:", error);
    const lang = ctx.session.language || "en";
    await ctx.reply(t("error", lang));
  }
});

// Launch bot
bot.launch()
  .then(() => {
    logger.info("Bot started successfully");
    console.log("PNPtv Bot is running...");
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
