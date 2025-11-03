const { t } = require("./i18n");
const { isAdmin } = require("../config/admin");

/**
 * Ensures the user completed onboarding before allowing access.
 * Sends a friendly reminder when onboarding is incomplete.
 * 
 * ADMIN BYPASS: Admins can skip onboarding to quickly test features.
 *
 * @param {import("telegraf").Context} ctx
 * @returns {boolean} true when onboarding is complete or user is admin
 */
function ensureOnboarding(ctx) {
  const userId = ctx.from?.id;
  
  // Admin bypass: Admins can skip onboarding
  if (userId && isAdmin(userId)) {
    return true;
  }

  // Regular users: Check if onboarding is complete
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
