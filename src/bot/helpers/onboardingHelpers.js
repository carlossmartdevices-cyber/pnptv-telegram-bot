/**
 * Onboarding Flow Helpers
 * Extracted from bot/index.js for better organization
 */

const { db } = require('../../config/firebase');
const { t } = require('../../utils/i18n');
const logger = require('../../utils/logger');
const { getMenu } = require('../../config/menus');

const AGE_VERIFICATION_INTERVAL_HOURS = 72;
const AGE_VERIFICATION_INTERVAL_MS = AGE_VERIFICATION_INTERVAL_HOURS * 60 * 60 * 1000;

/**
 * Handle language selection
 */
async function handleLanguageSelection(ctx) {
  try {
    const langCandidate = ctx.match[1];
    const lang = langCandidate === "es" ? "es" : "en";

    ctx.session.language = lang;
    ctx.session.onboardingStep = "ageVerification";
    ctx.session.ageVerified = false;

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

    // Answer callback query first to avoid timeout
    try {
      await ctx.answerCbQuery();
    } catch (err) {
      // Ignore if query already answered or expired
      logger.warn(`Could not answer callback query: ${err.message}`);
    }

    ctx.session.ageVerified = true;
    ctx.session.onboardingStep = "terms";
    ctx.session.ageVerifiedAt = new Date();
    ctx.session.ageVerificationExpiresAt = new Date(
      ctx.session.ageVerifiedAt.getTime() + AGE_VERIFICATION_INTERVAL_MS
    );

    logger.info(`User ${ctx.from.id} confirmed age`);

    try {
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
    } catch (editError) {
      // If message is the same or can't be edited, send new message
      if (editError.description?.includes('message is not modified') ||
          editError.description?.includes('message to edit not found')) {
        await ctx.reply(t("terms", lang), {
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
      } else {
        throw editError;
      }
    }
  } catch (error) {
    logger.error("Error in age confirmation:", error);
    // Try to send error message to user
    try {
      await ctx.reply("An error occurred. Please try /start again.");
    } catch (replyError) {
      // Can't do anything else
      logger.error("Could not send error message:", replyError);
    }
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
    const now = new Date();

    ctx.session.privacyAccepted = true;

    const userRef = db.collection("users").doc(userId);
    const existingSnapshot = await userRef.get();
    const existingData = existingSnapshot.exists ? existingSnapshot.data() : null;
    const isNewUser = !existingData || !existingData.onboardingComplete;

    const ageVerifiedAt = ctx.session.ageVerifiedAt || now;
    const ageVerificationExpiresAt =
      ctx.session.ageVerificationExpiresAt ||
      new Date(ageVerifiedAt.getTime() + AGE_VERIFICATION_INTERVAL_MS);

    const baseUpdate = {
      userId,
      username: ctx.from.username || existingData?.username || "Anonymous",
      firstName: ctx.from.first_name || existingData?.firstName || null,
      lastName: ctx.from.last_name || existingData?.lastName || null,
      language: lang,
      ageVerified: true,
      ageVerifiedAt,
      ageVerificationExpiresAt,
      termsAccepted: true,
      privacyAccepted: true,
      onboardingComplete: true,
      lastActive: now,
      ageVerificationIntervalHours: AGE_VERIFICATION_INTERVAL_HOURS,
    };

    if (!existingData?.createdAt) {
      baseUpdate.createdAt = now;
    }

    if (isNewUser) {
      baseUpdate.tier = existingData?.tier || "Free";
    }

    await userRef.set(baseUpdate, { merge: true });

    ctx.session.onboardingComplete = true;
    ctx.session.ageVerified = true;
    ctx.session.ageVerifiedAt = ageVerifiedAt;
    ctx.session.ageVerificationExpiresAt = ageVerificationExpiresAt;

    if (isNewUser) {
      ctx.session.tier = baseUpdate.tier;
    }

    logger.info(`User ${userId} completed onboarding`);

    if (isNewUser) {
      await ctx.editMessageText(t("profileCreated", lang), {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.editMessageText(t("ageVerificationSuccess", lang), {
        parse_mode: "Markdown",
      });
    }

    // Show main menu with channel button
    const mainMenu = getMenu("main", lang);
    await ctx.reply(t("mainMenuIntro", lang), {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "¡Únete a nuestro canal gratis!" : "Join our free channel!",
              url: "https://t.me/pnptvfree",
            },
          ],
        ],
      },
      parse_mode: "Markdown",
    });

    // Show the keyboard menu
    await ctx.reply("👇", {
      reply_markup: mainMenu,
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
  AGE_VERIFICATION_INTERVAL_HOURS,
  handleLanguageSelection,
  handleAgeConfirmation,
  handleTermsAcceptance,
  handleTermsDecline,
  handlePrivacyAcceptance,
  handlePrivacyDecline,
};
