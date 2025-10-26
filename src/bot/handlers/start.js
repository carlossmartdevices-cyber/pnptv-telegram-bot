const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { getMenu } = require("../../config/menus");
const {
  AGE_VERIFICATION_INTERVAL_HOURS,
} = require("../helpers/onboardingHelpers");

function resolveDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  return null;
}

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id.toString();
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (doc.exists) {
      const userData = doc.data() || {};
      const lang = userData.language || ctx.session.language || "en";
      const now = new Date();
      const ageVerificationExpiresAt = resolveDate(
        userData.ageVerificationExpiresAt
      );

      if (
        userData.onboardingComplete &&
        (!ageVerificationExpiresAt ||
          now.getTime() > ageVerificationExpiresAt.getTime())
      ) {
        ctx.session.language = lang;
        ctx.session.onboardingStep = "ageVerification";
        ctx.session.onboardingComplete = false;
        ctx.session.ageVerified = false;
        ctx.session.ageVerifiedAt = null;
        ctx.session.ageVerificationExpiresAt = null;
        ctx.session.termsAccepted = !!userData.termsAccepted;
        ctx.session.privacyAccepted = !!userData.privacyAccepted;

        await userRef.update({
          ageVerified: false,
          ageVerificationExpiresAt: null,
          lastActive: now,
        });

        logger.info(
          `User ${userId} requires age re-verification (interval ${AGE_VERIFICATION_INTERVAL_HOURS}h)`
        );

        await ctx.reply(
          t("ageVerificationReminder", lang, {
            hours: AGE_VERIFICATION_INTERVAL_HOURS,
          }),
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: t("confirmAge", lang), callback_data: "confirm_age" }],
              ],
            },
            parse_mode: "Markdown",
          }
        );

        return;
      }

      if (userData.onboardingComplete) {
        ctx.session.language = lang;
        ctx.session.onboardingComplete = true;
        ctx.session.tier = userData.tier || "Free";

        await userRef.update({
          lastActive: now,
        });

        logger.info(`Returning user ${userId} started bot`);

        await ctx.reply(t("mainMenuIntro", lang), {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "🪩 ¡Únete a nuestro Canal Gratis!" : "🪩 Join our Free Channel!",
                  url: "https://t.me/pnptvfree",
                },
              ],
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
                  text: lang === "es" ? "❓ Ayuda" : "❓ Help",
                  callback_data: "show_help",
                },
              ],
            ],
          },
          parse_mode: "Markdown",
        });

        return;
      }
    }

    logger.info(`New user ${userId} started onboarding`);

    ctx.session.onboardingStep = "language";
    ctx.session.onboardingComplete = false;
    ctx.session.language = "en";
    ctx.session.ageVerified = false;
    ctx.session.termsAccepted = false;
    ctx.session.privacyAccepted = false;

    await ctx.reply(t("welcome", "en"), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("languageEnglish", "en"), callback_data: "language_en" },
            { text: t("languageSpanish", "es"), callback_data: "language_es" },
          ],
        ],
      },
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Error in start handler:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
};
