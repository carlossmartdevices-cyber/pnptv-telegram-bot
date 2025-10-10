const { db } = require("../../config/firebase");
const { formatMessage } = require("../../utils/formatters");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");

async function viewProfile(ctx) {
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
    const profileText = t("profileInfo", lang, {
      userId: userData.userId,
      username: userData.username || ctx.from.username || "Not set",
      xp: userData.xp || 0,
      badges: userData.badges?.join(", ") || "None",
      tier: userData.tier || "Free",
      location: userData.location || "Not set",
      bio: userData.bio || "Not set",
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
            {
              text: t("subscribePrime", lang),
              callback_data: "subscribe_prime",
            },
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
