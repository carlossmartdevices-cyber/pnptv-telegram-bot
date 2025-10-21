const { formatMessage } = require("../../utils/formatters");
const { ensureOnboarding } = require("../../utils/guards");

module.exports = async (ctx) => {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  const language = ctx.session.language || "en";
  const message =
    language === "es"
      ? "❓ *Ayuda*\n\n*Comandos disponibles:*\n\n/start - Menu principal\n/profile - Ver tu perfil\n/subscribe - Suscribirte\n/nearby - Ver usuarios cercanos\n/help - Ayuda\n\n*¿Necesitas más ayuda?*\nContáctanos en nuestro canal."
      : "❓ *Help*\n\n*Available commands:*\n\n/start - Main menu\n/profile - View your profile\n/subscribe - Subscribe\n/nearby - View nearby users\n/help - Help\n\n*Need more help?*\nContact us on our channel.";

  const keyboard = {
    inline_keyboard: [
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
      // If edit fails, send new message
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
