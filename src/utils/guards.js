const { t } = require("./i18n");

/**
 * Ensures the user completed onboarding before allowing access.
 * Sends a friendly reminder when onboarding is incomplete.
 *
 * @param {import("telegraf").Context} ctx
 * @returns {boolean} true when onboarding is complete
 */
function ensureOnboarding(ctx) {
  if (ctx.session?.onboardingComplete) {
    return true;
  }

  const lang = ctx.session?.language || "en";
  const message = t("pleaseCompleteOnboarding", lang);

  if (ctx.updateType === "callback_query") {
    ctx.answerCbQuery(message, { show_alert: true }).catch(() => {});
  }

  if (typeof ctx.reply === "function") {
    ctx.reply(message).catch(() => {});
  }

  return false;
}

module.exports = {
  ensureOnboarding,
};
