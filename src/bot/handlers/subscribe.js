const { formatMessage } = require("../../utils/formatters");

module.exports = async (ctx) => {
  const language = ctx.session.language || "en";
  const message = formatMessage(
    "Subscribe",
    language === "es"
      ? "Elige un plan para suscribirte..."
      : "Choose a subscription plan...",
    language
  );
  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Subscribe to PRIME", callback_data: "subscribe_prime" }],
      ],
    },
  });
};
