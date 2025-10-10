const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id.toString();
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    // Check if user already completed onboarding
    if (doc.exists && doc.data().onboardingComplete) {
      logger.info(`Returning user ${userId} started bot`);
      const lang = ctx.session.language || "en";
      return ctx.reply(t("welcome", lang), {
        reply_markup: {
          keyboard: [
            ["/profile", "/map"],
            ["/help", "/subscribe"],
          ],
          resize_keyboard: true,
        },
        parse_mode: "Markdown",
      });
    }

    // Start onboarding for new users
    logger.info(`New user ${userId} started bot`);
    ctx.session.onboardingStep = "language";

    await ctx.reply("Welcome to PNPtv! 🎉\n\nPlease choose your language:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "English 🇺🇸", callback_data: "language_en" },
            { text: "Español 🇪🇸", callback_data: "language_es" },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Error in start handler:", error);
    await ctx.reply("An error occurred. Please try again.");
  }
};
