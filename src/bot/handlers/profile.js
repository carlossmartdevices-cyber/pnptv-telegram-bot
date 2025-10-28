const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { getLocationDisplay } = require("../../services/profileService");

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
      const now = new Date();

      await userRef.set({
        userId,
        username: ctx.from.username || "Anonymous",
        firstName: ctx.from.first_name || null,
        lastName: ctx.from.last_name || null,
        language: lang,
        createdAt: now,
        lastActive: now,
        tier: "Free",
        photoFileId: null,
        bio: null,
        location: null,
        locationName: null,
        locationGeohash: null,
      });

      logger.info(`Created new profile for user ${userId}`);
      await ctx.reply(t("profileCreated", lang));
      return;
    }

    // Get profile data
    const userData = doc.data() || {};

    const updates = {};
    const now = new Date();
    const telegramUsername = ctx.from.username || null;

    if (userData.username !== telegramUsername) {
      updates.username = telegramUsername;
    }

    if (userData.firstName !== ctx.from.first_name) {
      updates.firstName = ctx.from.first_name || null;
    }

    if (userData.lastName !== ctx.from.last_name) {
      updates.lastName = ctx.from.last_name || null;
    }

    updates.lastActive = now;

    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
      Object.assign(userData, updates);
    }

    userData.userId = userData.userId || userId;

    const usernameDisplay =
      userData.username ||
      ctx.from.username ||
      (lang === "es" ? "No disponible" : "Not set");

    const locationDisplay = getLocationDisplay(userData, lang);
    const bioDisplay =
      typeof userData.bio === "string" && userData.bio.trim().length > 0
        ? userData.bio.trim()
        : lang === "es"
        ? "No definida"
        : "Not set";

    // Build profile text
    const profileText = t("profileInfo", lang, {
      userId: userData.userId,
      username: usernameDisplay,
      tier: userData.tier || "Free",
      location: locationDisplay,
      bio: bioDisplay,
    });

    // If coming from callback query, delete the old message first
    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
      } catch (deleteError) {
        // Ignore delete errors
      }
    }

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
                {
                  text: lang === "es" ? "⚙️ Configuración" : "⚙️ Settings",
                  callback_data: "profile_settings",
                },
              ],
              [
                {
                  text: lang === "es" ? "🔙 Volver al Menú" : "🔙 Back to Menu",
                  callback_data: "back_to_main",
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
              {
                text: lang === "es" ? "⚙️ Configuración" : "⚙️ Settings",
                callback_data: "profile_settings",
              },
            ],
            [
              {
                text: lang === "es" ? "🔙 Volver al Menú" : "🔙 Back to Menu",
                callback_data: "back_to_main",
              },
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
        [
          { text: t("viewMap", lang), callback_data: "profile_view_map" },
          {
            text: lang === "es" ? "⚙️ Configuración" : "⚙️ Settings",
            callback_data: "profile_settings",
          },
        ],
        [
          {
            text: lang === "es" ? "🔙 Volver al Menú" : "🔙 Back to Menu",
            callback_data: "back_to_main",
          },
        ],
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

    const message =
      lang === "es"
        ? "✅ ¡Foto de perfil actualizada exitosamente!"
        : "✅ Profile photo updated successfully!";

    await ctx.reply(message);

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

/**
 * Show user settings
 */
async function showSettings(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      await ctx.reply(t("error", lang));
      return;
    }

    const userData = doc.data() || {};
    const adsOptOut = userData.adsOptOut || false;

    const message = lang === "es"
      ? `⚙️ **Configuración**\n\n📢 Mensajes publicitarios: ${adsOptOut ? "❌ Desactivados" : "✅ Activados"}\n\n${adsOptOut ? "No recibirás mensajes de difusión del administrador." : "Recibirás mensajes de difusión del administrador."}`
      : `⚙️ **Settings**\n\n📢 Advertisement messages: ${adsOptOut ? "❌ Disabled" : "✅ Enabled"}\n\n${adsOptOut ? "You will not receive broadcast messages from admins." : "You will receive broadcast messages from admins."}`;

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: adsOptOut
                ? (lang === "es" ? "✅ Activar mensajes" : "✅ Enable messages")
                : (lang === "es" ? "❌ Desactivar mensajes" : "❌ Disable messages"),
              callback_data: "settings_toggle_ads",
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver al perfil" : "« Back to profile",
              callback_data: "settings_back",
            },
          ],
        ],
      },
    });

    logger.info(`User ${userId} viewed settings`);
  } catch (error) {
    logger.error("Error showing settings:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Toggle ads opt-out setting
 */
async function toggleAdsOptOut(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      await ctx.answerCbQuery(t("error", lang));
      return;
    }

    const userData = doc.data() || {};
    const currentOptOut = userData.adsOptOut || false;
    const newOptOut = !currentOptOut;

    await userRef.update({
      adsOptOut: newOptOut,
    });

    await ctx.answerCbQuery(
      newOptOut
        ? (lang === "es" ? "Mensajes publicitarios desactivados" : "Advertisement messages disabled")
        : (lang === "es" ? "Mensajes publicitarios activados" : "Advertisement messages enabled")
    );

    // Refresh settings view
    await showSettings(ctx);

    logger.info(`User ${userId} toggled ads opt-out to ${newOptOut}`);
  } catch (error) {
    logger.error("Error toggling ads opt-out:", error);
    await ctx.answerCbQuery(t("error", lang));
  }
}

module.exports = {
  viewProfile,
  handleEditPhoto,
  handlePhotoMessage,
  deletePhoto,
  showSettings,
  toggleAdsOptOut,
};
