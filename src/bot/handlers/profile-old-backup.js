const { db } = require("../../config/firebase");
const { formatMessage } = require("../../utils/formatters");
const { t } = require("../../utils/i18n");
const { ensureOnboarding } = require("../../utils/guards");
const logger = require("../../utils/logger");

async function viewProfile(ctx) {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Create new profile
      await userRef.set({
        userId,
        username: ctx.from.username || "Anonymous",
        createdAt: new Date(),
        xp: 0,
        badges: [],
        tier: "Free",
      });

      logger.info(`Created new profile for user ${userId}`);
      await ctx.reply(t("profileCreated", lang));
      return;
    }

    // Display existing profile
    const userData = doc.data();
    const fallbackUsername =
      userData.username || ctx.from.username || (lang === "es" ? "No disponible" : "Not set");
    const fallbackBadges =
      userData.badges && userData.badges.length > 0
        ? userData.badges.join(", ")
        : lang === "es"
        ? "Ninguna"
        : "None";
    const fallbackLocation = userData.location || (lang === "es" ? "No establecida" : "Not set");
    const fallbackBio = userData.bio || (lang === "es" ? "No definida" : "Not set");

    const profileText = t("profileInfo", lang, {
      userId: userData.userId,
      username: fallbackUsername,
      xp: userData.xp || 0,
      badges: fallbackBadges,
      tier: userData.tier || "Free",
      location: fallbackLocation,
      bio: fallbackBio,
    });

    await ctx.reply(formatMessage("Profile", profileText, lang), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: t("editBio", lang), callback_data: "edit_bio" },
            { text: t("editLocation", lang), callback_data: "edit_location" },
          ],
          [
            { text: t("upgradeTier", lang), callback_data: "subscribe_prime" },
            { text: t("viewMap", lang), callback_data: "profile_view_map" },
          ],
        ],
      },
    });

    logger.info(`User ${userId} viewed profile`);
  } catch (error) {
    logger.error(`Error viewing profile for user ${userId}:`, error);
    await ctx.reply(t("error", lang));
  }
}

module.exports = { viewProfile };
