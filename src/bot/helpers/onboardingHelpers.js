/**
 * Onboarding Flow Helpers
 * Extracted from bot/index.js for better organization
 */

const { db } = require('../../config/firebase');
const { t } = require('../../utils/i18n');
const logger = require('../../utils/logger');
const { getMenu } = require('../../config/menus');

const ONBOARDING_REWARD_XP = 100;
const ONBOARDING_BADGE = "Trailblazer";

/**
 * Handle language selection
 */
async function handleLanguageSelection(ctx) {
  try {
    const langCandidate = ctx.match[1];
    const lang = langCandidate === "es" ? "es" : "en";

    ctx.session.language = lang;
    ctx.session.onboardingStep = "ageVerification";

    logger.info(`User ${ctx.from.id} selected language: ${lang}`);

    await ctx.editMessageText(t("ageVerification", lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t("confirmAge", lang), callback_data: "confirm_age" }],
        ],
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in language selection:", error);
    await ctx.answerCbQuery("An error occurred");
  }
}

/**
 * Handle age confirmation
 */
async function handleAgeConfirmation(ctx) {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.ageVerified = true;
    ctx.session.onboardingStep = "terms";

    logger.info(`User ${ctx.from.id} confirmed age`);

    await ctx.editMessageText(t("terms", lang), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("accept", lang), callback_data: "accept_terms" },
            { text: t("decline", lang), callback_data: "decline_terms" },
          ],
        ],
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in age confirmation:", error);
    await ctx.answerCbQuery("An error occurred");
  }
}

/**
 * Handle terms acceptance
 */
async function handleTermsAcceptance(ctx) {
  try {
    const lang = ctx.session.language || "en";
    ctx.session.termsAccepted = true;
    ctx.session.onboardingStep = "privacy";

    logger.info(`User ${ctx.from.id} accepted terms`);

    await ctx.editMessageText(t("privacy", lang), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("accept", lang), callback_data: "accept_privacy" },
            { text: t("decline", lang), callback_data: "decline_privacy" },
          ],
        ],
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in terms acceptance:", error);
    await ctx.answerCbQuery("An error occurred");
  }
}

/**
 * Handle terms decline
 */
async function handleTermsDecline(ctx) {
  try {
    const lang = ctx.session.language || "en";
    logger.info(`User ${ctx.from.id} declined terms`);
    await ctx.answerCbQuery(t("termsDeclined", lang), { show_alert: true });
  } catch (error) {
    logger.error("Error declining terms:", error);
    await ctx.answerCbQuery("An error occurred");
  }
}

/**
 * Handle privacy policy acceptance
 */
async function handlePrivacyAcceptance(ctx) {
  try {
    const lang = ctx.session.language || "en";
    const userId = ctx.from.id.toString();

    ctx.session.privacyAccepted = true;
    ctx.session.onboardingComplete = true;
    ctx.session.xp = ONBOARDING_REWARD_XP;
    ctx.session.badges = [ONBOARDING_BADGE];
    ctx.session.tier = "Free";

    // Create user profile in database
    const userRef = db.collection("users").doc(userId);
    await userRef.set(
      {
        userId,
        username: ctx.from.username || "Anonymous",
        language: lang,
        ageVerified: true,
        termsAccepted: true,
        privacyAccepted: true,
        onboardingComplete: true,
        createdAt: new Date(),
        lastActive: new Date(),
        xp: ONBOARDING_REWARD_XP,
        badges: [ONBOARDING_BADGE],
        tier: "Free",
      },
      { merge: true }
    );

    logger.info(`User ${userId} completed onboarding`);

    await ctx.editMessageText(t("profileCreated", lang), {
      parse_mode: "Markdown",
    });

    await ctx.reply(
      t("onboardingReward", lang, {
        xp: ONBOARDING_REWARD_XP,
        badge: ONBOARDING_BADGE,
      }),
      { parse_mode: "Markdown" }
    );

    // Show main menu
    const mainMenu = getMenu("main", lang);
    await ctx.reply(t("mainMenuIntro", lang), {
      reply_markup: mainMenu,
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error completing onboarding:", error);
    await ctx.answerCbQuery("An error occurred");
  }
}

/**
 * Handle privacy policy decline
 */
async function handlePrivacyDecline(ctx) {
  try {
    const lang = ctx.session.language || "en";
    logger.info(`User ${ctx.from.id} declined privacy policy`);
    await ctx.answerCbQuery(t("privacyDeclined", lang), { show_alert: true });
  } catch (error) {
    logger.error("Error declining privacy:", error);
    await ctx.answerCbQuery("An error occurred");
  }
}

module.exports = {
  ONBOARDING_REWARD_XP,
  ONBOARDING_BADGE,
  handleLanguageSelection,
  handleAgeConfirmation,
  handleTermsAcceptance,
  handleTermsDecline,
  handlePrivacyAcceptance,
  handlePrivacyDecline,
};
