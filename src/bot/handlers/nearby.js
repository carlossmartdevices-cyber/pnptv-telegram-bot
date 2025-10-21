const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");

/**
 * Nearby Mini App Handler
 * Opens the dedicated "Who's Getting Spun Near Me?" mini app
 */
module.exports = async (ctx) => {
  try {
    const lang = ctx.session.language || "en";

    // Check if user completed onboarding
    if (!ctx.session.onboardingComplete) {
      await ctx.reply(t("pleaseCompleteOnboarding", lang));
      return;
    }

    const webAppUrl = process.env.WEB_APP_URL;

    if (!webAppUrl) {
      await ctx.reply(
        lang === "es"
          ? "❌ La Mini App no está configurada. Contacta al administrador."
          : "❌ Mini App not configured. Contact admin."
      );
      return;
    }

    // Construct the nearby users mini app URL
    const nearbyAppUrl = webAppUrl.endsWith("/")
      ? `${webAppUrl}nearby`
      : `${webAppUrl}/nearby`;

    const message =
      lang === "es"
        ? "🌍 *¿Quién está cerca de mí?*\n\n" +
          "Descubre usuarios cercanos y conecta con ellos.\n\n" +
          "✨ Chatea gratis con los primeros 3 usuarios\n" +
          "🔓 Suscríbete para desbloquear chats ilimitados"
        : "🌍 *Who's Getting Spun Near Me?*\n\n" +
          "Discover nearby users and connect with them.\n\n" +
          "✨ Chat free with your first 3 users\n" +
          "🔓 Subscribe to unlock unlimited chats";

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "📍 Ver Mapa" : "📍 View Map",
            callback_data: "profile_view_map",
          },
        ],
        [
          {
            text: lang === "es" ? "🔙 Volver al Menú" : "🔙 Back to Menu",
            callback_data: "back_to_main",
          },
        ],
      ],
    };

    const finalMessage = message;

    // If from callback query, edit the message
    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery();
        await ctx.editMessageText(finalMessage, {
          reply_markup: keyboard,
          parse_mode: "Markdown",
        });
      } catch (editError) {
        // If edit fails, send new message
        await ctx.reply(finalMessage, {
          reply_markup: keyboard,
          parse_mode: "Markdown",
        });
      }
    } else {
      await ctx.reply(finalMessage, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    }

    logger.info(`User ${ctx.from.id} opened nearby users mini app`);
  } catch (error) {
    logger.error("Error in nearby handler:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
};

/**
 * Handle nearby-related callbacks
 */
async function handleNearbyCallback(ctx) {
  const action = ctx.callbackQuery.data;
  const lang = ctx.session.language || "en";

  try {
    switch (action) {
      case "open_nearby_app":
        await ctx.answerCbQuery();
        await module.exports(ctx);
        break;

      default:
        await ctx.answerCbQuery();
    }
  } catch (error) {
    logger.error("Error handling nearby callback:", error);
    await ctx.answerCbQuery("Error occurred");
  }
}

module.exports.handleNearbyCallback = handleNearbyCallback;
