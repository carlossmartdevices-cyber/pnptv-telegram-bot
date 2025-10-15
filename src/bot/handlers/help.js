const { formatMessage } = require("../../utils/formatters");
const { ensureOnboarding } = require("../../utils/guards");

module.exports = async (ctx) => {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  const language = ctx.session.language || "en";
  const message = formatMessage(
    "Help",
    language === "es"
      ? "Comandos disponibles:\n\n/profile - Ver tu perfil\n/subscribe - Suscribirte\n/map - Ver mapa\n/help - Ayuda"
      : "Available commands:\n\n/profile - View your profile\n/subscribe - Subscribe\n/map - View map\n/help - Help",
    language
  );

  await ctx.reply(message, { parse_mode: "Markdown" });
};
