const { t } = require("./i18n");
const { isAdmin } = require("../config/admin");

/**
 * Ensures the user completed onboarding before allowing access.
 * Sends a friendly reminder when onboarding is incomplete.
 * 
 * ADMIN EXCEPTION: Admins always start fresh onboarding to ensure they experience
 * the complete user flow and can test all onboarding steps.
 *
 * @param {import("telegraf").Context} ctx
 * @returns {boolean} true when onboarding is complete
 */
function ensureOnboarding(ctx) {
  const userId = ctx.from?.id;
  
  // Admin exception: Always force admins to start fresh onboarding
  if (userId && isAdmin(userId)) {
    // Clear admin's onboarding session to force fresh start
    if (ctx.session) {
      ctx.session.onboardingComplete = false;
      ctx.session.onboardingStep = null;
      ctx.session.language = null;
      ctx.session.ageVerified = false;
      ctx.session.termsAccepted = false;
      ctx.session.privacyAccepted = false;
      ctx.session.email = null;
    }
    
    // Admins must always restart onboarding
    const lang = ctx.session?.language || "en";
    const message = t("pleaseCompleteOnboarding", lang) + "\n\n⚠️ *Admin Mode*: You must complete onboarding to test the user experience.";

    if (ctx.updateType === "callback_query") {
      ctx.answerCbQuery(message, { show_alert: true }).catch(() => {});
    }

    if (typeof ctx.reply === "function") {
      ctx.reply(message, { parse_mode: "Markdown" }).catch(() => {});
    }

    return false;
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
