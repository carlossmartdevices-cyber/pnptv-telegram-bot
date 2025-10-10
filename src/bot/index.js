require("dotenv").config();
const { Telegraf } = require("telegraf");
const { db } = require("../config/firebase");
const { t } = require("../utils/i18n");
const logger = require("../utils/logger");

// Middleware
const session = require("./middleware/session");
const rateLimitMiddleware = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

// Handlers
const startHandler = require("./handlers/start");
const helpHandler = require("./handlers/help");
const mapHandler = require("./handlers/map");
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
bot.command("profile", viewProfile);
bot.command("subscribe", subscribeHandler);

// Callback query handlers for onboarding
bot.action(/language_(.+)/, async (ctx) => {
  try {
    const lang = ctx.match[1];
    ctx.session.language = lang;
    ctx.session.onboardingStep = "ageVerification";

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
        inline_keyboard: [[{ text: t("accept", lang), callback_data: "accept_terms" }]],
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
        inline_keyboard: [[{ text: t("accept", lang), callback_data: "accept_privacy" }]],
      },
    });
  } catch (error) {
    logger.error("Error in terms acceptance:", error);
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
    await userRef.set({
      userId,
      username: ctx.from.username || "Anonymous",
      language: lang,
      ageVerified: true,
      termsAccepted: true,
      privacyAccepted: true,
      onboardingComplete: true,
      createdAt: new Date(),
      xp: 0,
      badges: [],
      tier: "Free",
    });

    logger.info(`User ${userId} completed onboarding`);

    await ctx.editMessageText(t("profileCreated", lang), {
      parse_mode: "Markdown",
    });

    // Show main menu
    await ctx.reply(t("welcome", lang), {
      reply_markup: {
        keyboard: [
          ["/profile", "/map"],
          ["/help", "/subscribe"],
        ],
        resize_keyboard: true,
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error completing onboarding:", error);
    await ctx.answerCbQuery("An error occurred");
  }
});

// Subscribe button handlers
bot.action("subscribe_prime", async (ctx) => {
  try {
    const lang = ctx.session.language || "en";
    const userId = ctx.from.id.toString();
    const bold = require("../config/bold");
    const plans = require("../config/plans");

    logger.info(`User ${userId} initiated PRIME subscription`);

    // Create payment link
    const paymentData = await bold.createPaymentLink({
      totalAmountCents: plans.prime.price,
      currency: plans.prime.currency,
      description: `${plans.prime.name} - ${userId}`,
      referenceId: `prime_${userId}_${Date.now()}`,
      customerEmail: ctx.from.username ? `${ctx.from.username}@telegram.user` : undefined,
      metadata: {
        userId,
        plan: "prime",
        username: ctx.from.username,
      },
    });

    if (paymentData?.data?.link_url) {
      await ctx.editMessageText(
        lang === "es"
          ? `💎 *Plan PRIME*\n\n${t("goldenFeatures", lang)}\n\n*Precio:* $${
              plans.prime.price / 100
            } ${plans.prime.currency}\n\nHaz clic en el botón para completar el pago:`
          : `💎 *PRIME Plan*\n\n${t("goldenFeatures", lang)}\n\n*Price:* $${
              plans.prime.price / 100
            } ${plans.prime.currency}\n\nClick the button to complete payment:`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === "es" ? "💳 Pagar Ahora" : "💳 Pay Now", url: paymentData.data.link_url }],
            ],
          },
        }
      );
    } else {
      throw new Error("Payment link creation failed");
    }
  } catch (error) {
    logger.error("Error creating payment link:", error);
    const lang = ctx.session.language || "en";
    await ctx.answerCbQuery(t("error", lang));
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
