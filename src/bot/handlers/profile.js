const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");

/**
 * View user profile with photo support
 */
async function viewProfile(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  // Check onboarding
  if (!ctx.session?.onboardingComplete) {
    await ctx.reply(t("pleaseCompleteOnboarding", lang));
    return;
  }

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
        photoFileId: null,
      });

      logger.info(`Created new profile for user ${userId}`);
      await ctx.reply(t("profileCreated", lang));
      return;
    }

    // Get profile data
    const userData = doc.data();
    const fallbackUsername =
      userData.username ||
      ctx.from.username ||
      (lang === "es" ? "No disponible" : "Not set");
    const fallbackBadges =
      userData.badges && userData.badges.length > 0
        ? userData.badges.join(", ")
        : lang === "es"
        ? "Ninguna"
        : "None";
    const fallbackLocation =
      userData.location || (lang === "es" ? "No establecida" : "Not set");
    const fallbackBio =
      userData.bio || (lang === "es" ? "No definida" : "Not set");

    // Build profile text
    const profileText = t("profileInfo", lang, {
      userId: userData.userId,
      username: fallbackUsername,
      xp: userData.xp || 0,
      badges: fallbackBadges,
      tier: userData.tier || "Free",
      location: fallbackLocation,
      bio: fallbackBio,
    });

    // Send photo if exists
    if (userData.photoFileId) {
      try {
        await ctx.replyWithPhoto(userData.photoFileId, {
          caption: profileText,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: t("editBio", lang), callback_data: "edit_bio" },
                {
                  text: t("editLocation", lang),
                  callback_data: "edit_location",
                },
              ],
              [
                {
                  text:
                    lang === "es" ? "📸 Cambiar Foto" : "📸 Change Photo",
                  callback_data: "edit_photo",
                },
                {
                  text: t("upgradeTier", lang),
                  callback_data: "subscribe_prime",
                },
              ],
              [
                {
                  text: t("viewMap", lang),
                  callback_data: "profile_view_map",
                },
              ],
            ],
          },
        });
      } catch (error) {
        // If photo fails, fall back to text
        logger.warn(
          `Failed to send photo for user ${userId}, falling back to text:`,
          error.message
        );
        await sendProfileWithoutPhoto(ctx, profileText, lang);
      }
    } else {
      // No photo - show option to add one
      await ctx.reply(profileText, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: t("editBio", lang), callback_data: "edit_bio" },
              { text: t("editLocation", lang), callback_data: "edit_location" },
            ],
            [
              {
                text: lang === "es" ? "📸 Agregar Foto" : "📸 Add Photo",
                callback_data: "edit_photo",
              },
              {
                text: t("upgradeTier", lang),
                callback_data: "subscribe_prime",
              },
            ],
            [
              { text: t("viewMap", lang), callback_data: "profile_view_map" },
            ],
          ],
        },
      });
    }

    logger.info(`User ${userId} viewed profile`);
  } catch (error) {
    logger.error(`Error viewing profile for user ${userId}:`, error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Send profile without photo (fallback)
 */
async function sendProfileWithoutPhoto(ctx, profileText, lang) {
  await ctx.reply(profileText, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: t("editBio", lang), callback_data: "edit_bio" },
          { text: t("editLocation", lang), callback_data: "edit_location" },
        ],
        [
          {
            text: lang === "es" ? "📸 Cambiar Foto" : "📸 Change Photo",
            callback_data: "edit_photo",
          },
          { text: t("upgradeTier", lang), callback_data: "subscribe_prime" },
        ],
        [{ text: t("viewMap", lang), callback_data: "profile_view_map" }],
      ],
    },
  });
}

/**
 * Handle edit photo callback
 */
async function handleEditPhoto(ctx) {
  const lang = ctx.session.language || "en";

  try {
    await ctx.answerCbQuery();

    ctx.session.waitingFor = "profile_photo";

    const message =
      lang === "es"
        ? "📸 **Actualizar Foto de Perfil**\n\nEnvía una foto para usar como tu foto de perfil.\n\n💡 Consejo: Usa una foto clara de tu rostro para mejores resultados."
        : "📸 **Update Profile Photo**\n\nSend a photo to use as your profile picture.\n\n💡 Tip: Use a clear photo of your face for best results.";

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`User ${ctx.from.id} started photo upload`);
  } catch (error) {
    logger.error("Error in edit photo:", error);
    await ctx.answerCbQuery(t("error", lang));
  }
}

/**
 * Handle photo message for profile
 */
async function handlePhotoMessage(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  // Check if we're waiting for a profile photo
  if (ctx.session.waitingFor !== "profile_photo") {
    return; // Ignore photo if not expected
  }

  try {
    // Get the highest resolution photo
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1]; // Largest size

    logger.info(`User ${userId} uploaded photo`, {
      fileId: photo.file_id,
      fileSize: photo.file_size,
      width: photo.width,
      height: photo.height,
    });

    // Save photo file_id to database
    await db.collection("users").doc(userId).update({
      photoFileId: photo.file_id,
      photoUpdatedAt: new Date(),
    });

    // Clear waiting state
    ctx.session.waitingFor = null;

    // Award XP for uploading photo (first time only)
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();
    const userData = doc.data();

    if (!userData.photoXpAwarded) {
      const xpReward = 25;
      await userRef.update({
        xp: (userData.xp || 0) + xpReward,
        photoXpAwarded: true,
      });

      const rewardMessage =
        lang === "es"
          ? `✅ ¡Foto de perfil actualizada!\n\n🎁 +${xpReward} XP por agregar una foto.`
          : `✅ Profile photo updated!\n\n🎁 +${xpReward} XP for adding a photo.`;

      await ctx.reply(rewardMessage, { parse_mode: "Markdown" });
    } else {
      const message =
        lang === "es"
          ? "✅ ¡Foto de perfil actualizada exitosamente!"
          : "✅ Profile photo updated successfully!";

      await ctx.reply(message);
    }

    // Show updated profile
    await viewProfile(ctx);

    logger.info(`User ${userId} updated profile photo successfully`);
  } catch (error) {
    logger.error("Error handling photo message:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Delete profile photo
 */
async function deletePhoto(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    await db.collection("users").doc(userId).update({
      photoFileId: null,
    });

    const message =
      lang === "es"
        ? "✅ Foto de perfil eliminada."
        : "✅ Profile photo removed.";

    await ctx.answerCbQuery(message);
    await viewProfile(ctx);

    logger.info(`User ${userId} deleted profile photo`);
  } catch (error) {
    logger.error("Error deleting photo:", error);
    await ctx.answerCbQuery(t("error", lang));
  }
}

module.exports = {
  viewProfile,
  handleEditPhoto,
  handlePhotoMessage,
  deletePhoto,
};
