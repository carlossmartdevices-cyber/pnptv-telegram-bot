const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");

/**
 * Live streams handler
 * Shows available live streams or allows users to start their own
 */
module.exports = async (ctx) => {
  try {
    const lang = ctx.session.language || "en";

    // Check if user completed onboarding
    if (!ctx.session.onboardingComplete) {
      await ctx.reply(t("pleaseCompleteOnboarding", lang));
      return;
    }

    const message = t("liveInfo", lang);

    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("startLive", lang), callback_data: "start_live" },
            { text: t("viewLives", lang), callback_data: "view_lives" },
          ],
        ],
      },
      parse_mode: "Markdown",
    });

    logger.info(`User ${ctx.from.id} accessed live streams`);
  } catch (error) {
    logger.error("Error in live handler:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
};

/**
 * Handle live stream callbacks
 */
async function handleLiveCallback(ctx) {
  const action = ctx.callbackQuery.data;
  const lang = ctx.session.language || "en";

  try {
    switch (action) {
      case "start_live":
      case "view_lives":
        await ctx.answerCbQuery();
        await ctx.reply(t("liveComingSoon", lang), {
          parse_mode: "Markdown",
        });
        break;

      default:
        await ctx.answerCbQuery();
    }
  } catch (error) {
    logger.error("Error handling live callback:", error);
    await ctx.answerCbQuery("Error occurred");
  }
}

module.exports.handleLiveCallback = handleLiveCallback;
