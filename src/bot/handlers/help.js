const { formatMessage } = require("../../utils/formatters");
const { ensureOnboarding } = require("../../utils/guards");
const i18n = require("../../utils/i18n");

module.exports = async (ctx) => {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  const language = ctx.session.language || "en";
  const message = i18n.t(language, "helpInfo");

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: language === "es" ? "💎 Ver Planes Premium" : "💎 View Premium Plans",
          callback_data: "show_subscription_plans",
        },
      ],
      [
        {
          text: language === "es" ? "💎 Hablar con Cristina Crystal" : "💎 Talk with Cristina Crystal",
          callback_data: "start_ai_chat",
        },
      ],
      [
        {
          text: language === "es" ? "🔙 Volver al Menú" : "🔙 Back to Menu",
          callback_data: "back_to_main",
        },
      ],
    ],
  };

  // If from callback query, edit the message
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery();
      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } catch (editError) {
      // If edit fails (e.g., message too old), delete old and send new
      try {
        await ctx.deleteMessage();
      } catch (deleteError) {
        // Ignore delete errors
      }
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }
  } else {
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }
};
