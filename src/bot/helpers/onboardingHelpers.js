/**
 * Onboarding Flow Helpers
 * Extracted from bot/index.js for better organization
 */

const { db } = require('../../config/firebase');
const { t } = require('../../utils/i18n');
const logger = require('../../utils/logger');
const { getMenu } = require('../../config/menus');

const AGE_VERIFICATION_INTERVAL_HOURS = 168; // 7 days
const AGE_VERIFICATION_INTERVAL_MS = AGE_VERIFICATION_INTERVAL_HOURS * 60 * 60 * 1000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Handle email collection
 */
async function handleEmailSubmission(ctx) {
  try {
    console.log("=== EMAIL SUBMISSION HANDLER ===");
    console.log("Session before email:", ctx.session);
    
    const lang = ctx.session.language || "en";
    const email = ctx.message?.text?.trim().toLowerCase();
    
    if (!email || !EMAIL_REGEX.test(email)) {
      await ctx.reply(t("emailInvalid", lang));
      return;
    }

    const userId = ctx.from.id.toString();
    console.log("Processing email for user:", userId);
    
    // Save email to user's document
    await db.collection("users").doc(userId).update({
      email: email,
      emailVerified: false, // Could implement verification later
      lastActive: new Date()
    });

    // Generate one-time use invite link for free channel
    let inviteLink = null;
    try {
      const freeChannelId = "-1003159260496";
      const invite = await ctx.telegram.createChatInviteLink(freeChannelId, {
        member_limit: 1,
        name: `Free - User ${userId}`,
      });
      inviteLink = invite.invite_link;
    } catch (error) {
      logger.error(`Failed to generate invite link for user ${userId}:`, error);
    }

    // Confirm email collection and send channel invite
    await ctx.reply(t("emailConfirmed", lang), {
      parse_mode: "Markdown"
    });

    if (inviteLink) {
      await ctx.reply(
        `🎉 *Welcome to PNPtv Community!*\n\nHere's your exclusive invite to our free channel. This link can only be used once:\n\n${inviteLink}`,
        { parse_mode: "Markdown" }
      );
    }

    // Move to privacy policy step
    await ctx.reply(t("privacy", lang), {
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

    // Update session - mark onboarding as complete after email submission
    ctx.session.awaitingEmail = false;
    ctx.session.onboardingStep = "privacy";
    ctx.session.email = email;
    ctx.session.onboardingComplete = true; // Mark as complete after email collection
    
    console.log("Session after email update:", ctx.session);
    console.log("=== EMAIL SUBMISSION COMPLETED ===");

  } catch (error) {
    console.error("=== ERROR IN EMAIL SUBMISSION ===", error);
    logger.error("Error in email submission:", error);
    await ctx.reply("An error occurred. Please try again.");
  }
}

/**
 * Handle language selection
 */
async function handleLanguageSelection(ctx) {
  try {
    console.log("=== LANGUAGE SELECTION HANDLER CALLED ===");
    console.log("ctx.match:", ctx.match);
    console.log("ctx.from.id:", ctx.from.id);
    console.log("ctx.session:", ctx.session);
    
    // Answer callback query first
    await ctx.answerCbQuery();
    
    const langCandidate = ctx.match[1];
    const lang = langCandidate === "es" ? "es" : "en";
    
    console.log("Selected language:", lang);

    ctx.session.language = lang;
    ctx.session.onboardingStep = "ageVerification";
    ctx.session.ageVerified = false;

    logger.info(`User ${ctx.from.id} selected language: ${lang}`);
    console.log("Session after language selection:", ctx.session);

    await ctx.editMessageText(t("ageVerification", lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: t("confirmAge", lang), callback_data: "confirm_age" }],
        ],
      },
      parse_mode: "Markdown",
    });
    
    console.log("=== LANGUAGE SELECTION COMPLETED ===");
  } catch (error) {
    console.error("=== ERROR IN LANGUAGE SELECTION ===", error);
    logger.error("Error in language selection:", error);
    try {
      await ctx.answerCbQuery("An error occurred");
    } catch (cbError) {
      console.error("Error answering callback query:", cbError);
    }
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
    ctx.session.onboardingStep = "email";

    logger.info(`User ${ctx.from.id} accepted terms`);

    // Show email collection prompt
    await ctx.editMessageText(t("emailPrompt", lang), {
      parse_mode: "Markdown",
    });

    // Register message handler for email collection
    ctx.session.awaitingEmail = true;

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

    // Ensure session is properly updated
    ctx.session.onboardingComplete = true;
    ctx.session.ageVerified = true;
    ctx.session.ageVerifiedAt = ageVerifiedAt;
    ctx.session.ageVerificationExpiresAt = ageVerificationExpiresAt;
    ctx.session.privacyAccepted = true;
    ctx.session.termsAccepted = true;
    ctx.session.language = lang;

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

    // Show main menu with modern inline buttons
    await ctx.reply(t("mainMenuIntro", lang), {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "💎 Suscríbete al Canal PRIME" : "💎 Subscribe to PRIME Channel",
              callback_data: "show_subscription_plans",
            },
          ],
          [
            {
              text: lang === "es" ? "👤 Mi Perfil" : "👤 My Profile",
              callback_data: "show_my_profile",
            },
          ],
          [
            {
              text: lang === "es" ? "🌍 ¿Quién está cerca?" : "🌍 Who is nearby?",
              callback_data: "show_nearby",
            },
          ],
          [
            {
              text: lang === "es" ? "🤖 PNPtv! Soporte" : "🤖 PNPtv! Support",
              callback_data: "show_help",
            },
          ],
        ],
      },
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
  AGE_VERIFICATION_INTERVAL_HOURS,
  handleEmailSubmission,
  handleLanguageSelection,
  handleAgeConfirmation,
  handleTermsAcceptance,
  handleTermsDecline,
  handlePrivacyAcceptance,
  handlePrivacyDecline,
};
