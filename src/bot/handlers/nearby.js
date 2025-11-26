const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { checkSearchLimit, WEEKLY_SEARCH_LIMIT } = require("../../utils/searchLimits");

/**
 * Nearby Mini App Handler
 * Opens the dedicated "Who's Getting Spun Near Me?" mini app
 * Implements search limits for free users
 */
module.exports = async (ctx) => {
  try {
    const lang = ctx.session.language || "en";

    // Check if user completed onboarding
    if (!ctx.session.onboardingComplete) {
      await ctx.reply(t("pleaseCompleteOnboarding", lang));
      return;
    }

    // Check search limits for free users
    const canSearch = await checkSearchLimit(ctx.from.id.toString());
    if (!canSearch) {
      await ctx.reply(
        lang === "es"
          ? `❌ Has alcanzado el límite de ${WEEKLY_SEARCH_LIMIT} búsquedas semanales para usuarios gratuitos.\n\n💎 Suscríbete para tener búsquedas ilimitadas.`
          : `❌ You've reached the limit of ${WEEKLY_SEARCH_LIMIT} weekly searches for free users.\n\n💎 Subscribe to get unlimited searches.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "💎 Suscribirme" : "💎 Subscribe",
                  callback_data: "show_subscription_plans",
                },
              ],
            ],
          },
        }
      );
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
          "✨ Plan Gratuito:\n" +
          "• Ver solo los 3 miembros más cercanos\n" +
          "• 3 búsquedas por semana\n\n" +
          "� Plan Premium:\n" +
          "• Ver todos los miembros cercanos\n" +
          "• Búsquedas ilimitadas\n" +
          "• Chats sin restricciones"
        : "🌍 *Who's Getting Spun Near Me?*\n\n" +
          "Discover nearby users and connect with them.\n\n" +
          "✨ Free Plan:\n" +
          "• See only top 3 closest members\n" +
          "• 3 searches per week\n\n" +
          "� Premium Plan:\n" +
          "• See all nearby members\n" +
          "• Unlimited searches\n" +
          "• Unrestricted chats";

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
        // If edit fails, delete old and send new message
        try {
          await ctx.deleteMessage();
        } catch (deleteError) {
          // Ignore delete errors
        }
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
