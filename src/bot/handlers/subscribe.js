const { formatMessage } = require("../../utils/formatters");
const { t } = require("../../utils/i18n");
const { ensureOnboarding } = require("../../utils/guards");
const plans = require("../../config/plans");

module.exports = async (ctx) => {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  const language = ctx.session.language || "en";

  const intro =
    language === "es" ? "Selecciona un plan para continuar.\n\n" : "Select a plan to continue.\n\n";

  const message = formatMessage(
    "Subscribe",
    `${intro}${t("silverFeatures", language)}\n\n${t("goldenFeatures", language)}`,
    language
  );

  const silverPrice = `$${(plans.silver.price / 100).toFixed(2)} ${plans.silver.currency}`;
  const goldenPrice = `$${(plans.golden.price / 100).toFixed(2)} ${plans.golden.currency}`;

  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: language === "es" ? `Silver · ${silverPrice}` : `Silver · ${silverPrice}`,
            callback_data: "subscribe_silver",
          },
          {
            text:
              language === "es"
                ? `Golden · ${goldenPrice} + 5 USDT`
                : `Golden · ${goldenPrice} + 5 USDT`,
            callback_data: "subscribe_golden",
          },
        ],
      ],
    },
  });
};
