const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { getLocationDisplay } = require("../../services/profileService");
const personalityService = require("../../services/personalityService");

/**
 * Get personality badge display text
 */
async function getPersonalityBadgeDisplay(userData, lang) {
  try {
    // Check if user has personality choice from SantinoBot system
    if (userData.personalityChoice && userData.personalityChoice.emoji && userData.personalityChoice.name) {
      const choice = userData.personalityChoice;
      const badgeText = lang === "es" ? "🎭 Personalidad:" : "🎭 Personality:";
      return `${badgeText} ${choice.emoji} ${choice.name}\n`;
    }
    
    // Check legacy badge field
    if (userData.badge && typeof userData.badge === "string" && userData.badge.trim().length > 0) {
      const badgeText = lang === "es" ? "🏆 Insignia:" : "🏆 Badge:";
      return `${badgeText} ${userData.badge.trim()}\n`;
    }
    
    return ""; // No personality/badge to display
  } catch (error) {
    logger.error("Error getting personality badge display:", error);
    return "";
  }
}

/**
 * View user profile with photo support
 */
async function viewProfile(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  // Check onboarding (bypass for admin users)
  const { isAdmin } = require("../../config/admin");
  if (!ctx.session?.onboardingComplete && !isAdmin(userId)) {
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
        badge: null,
        personality: null,
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

    // Get personality badge if available
    const personalityBadge = await getPersonalityBadgeDisplay(userData, lang);
    
    // Debug logging for admin user
    if (isAdmin(userId)) {
      logger.info(`Admin profile debug for ${userId}:`, {
        hasPersonalityChoice: !!userData.personalityChoice,
        personalityBadge: personalityBadge,
        userData: JSON.stringify(userData.personalityChoice || userData.badge || 'none')
      });
    }

    // Build profile text
    const profileText = t("profileInfo", lang, {
      userId: userData.userId,
      username: usernameDisplay,
      tier: userData.tier || "Free",
      membershipInfo: "", // Add empty membershipInfo to avoid template errors
      personalityBadge: personalityBadge,
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
    const currentLanguage = userData.language || lang || "en";
    const languageDisplay = currentLanguage === "es" ? "🇪🇸 Español" : "🇺🇸 English";

    // Check personality status
    const hasPersonality = await personalityService.hasPersonality(userId);
    const personalityBadge = hasPersonality ? await personalityService.getPersonalityBadge(userId) : null;
    
    const personalityDisplay = hasPersonality
      ? (lang === "es" ? `🎭 Personalidad: ${personalityBadge}` : `🎭 Personality: ${personalityBadge}`)
      : (lang === "es" ? "🎭 Personalidad: No seleccionada" : "🎭 Personality: Not selected");

    const message = lang === "es"
      ? `⚙️ **Configuración**\n\n🌐 Idioma: ${languageDisplay}\n\n${personalityDisplay}\n\n📢 Mensajes publicitarios: ${adsOptOut ? "❌ Desactivados" : "✅ Activados"}\n\n${adsOptOut ? "No recibirás mensajes de difusión del administrador." : "Recibirás mensajes de difusión del administrador."}`
      : `⚙️ **Settings**\n\n🌐 Language: ${languageDisplay}\n\n${personalityDisplay}\n\n📢 Advertisement messages: ${adsOptOut ? "❌ Disabled" : "✅ Enabled"}\n\n${adsOptOut ? "You will not receive broadcast messages from admins." : "You will receive broadcast messages from admins."}`;

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🌐 Cambiar idioma" : "🌐 Change language",
              callback_data: "settings_change_language",
            },
          ],
          [
            {
              text: hasPersonality
                ? (lang === "es" ? "🎭 Cambiar personalidad" : "🎭 Change personality")
                : (lang === "es" ? "🎭 Elegir personalidad" : "🎭 Choose personality"),
              callback_data: "settings_choose_personality",
            },
          ],
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

/**
 * Show language selection menu
 */
async function showLanguageSelection(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const message = lang === "es"
      ? "🌐 **Cambiar Idioma**\n\nSelecciona tu idioma preferido:"
      : "🌐 **Change Language**\n\nSelect your preferred language:";

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🇺🇸 English",
              callback_data: "settings_set_lang_en",
            },
            {
              text: "🇪🇸 Español",
              callback_data: "settings_set_lang_es",
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "profile_settings",
            },
          ],
        ],
      },
    });

    logger.info(`User ${userId} opened language selection`);
  } catch (error) {
    logger.error("Error showing language selection:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Set user language
 */
async function setLanguage(ctx, newLang) {
  const userId = ctx.from.id.toString();

  try {
    // Update in database
    await db.collection("users").doc(userId).update({
      language: newLang,
    });

    // Update session
    ctx.session.language = newLang;

    const message = newLang === "es"
      ? "✅ Idioma cambiado a Español"
      : "✅ Language changed to English";

    await ctx.answerCbQuery(message);

    // Refresh settings view with new language
    await showSettings(ctx);

    logger.info(`User ${userId} changed language to ${newLang}`);
  } catch (error) {
    logger.error("Error setting language:", error);
    await ctx.answerCbQuery("Error changing language");
  }
}

/**
 * Show personality selection menu
 */
async function showPersonalitySelection(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const hasPersonality = await personalityService.hasPersonality(userId);
    const currentPersonality = hasPersonality ? await personalityService.getPersonalityBadge(userId) : null;
    
    const choices = personalityService.getPersonalityChoices(userId); // Pass userId for admin check
    
    const message = lang === "es"
      ? `🎭 **Elegir Personalidad**\n\n${hasPersonality ? `Personalidad actual: ${currentPersonality}\n\n` : ''}Selecciona tu personalidad en la comunidad PNPtv:\n\n${choices.map(c => `${c.emoji} **${c.name}** - ${c.description}`).join('\n')}`
      : `🎭 **Choose Personality**\n\n${hasPersonality ? `Current personality: ${currentPersonality}\n\n` : ''}Select your personality in the PNPtv community:\n\n${choices.map(c => `${c.emoji} **${c.name}** - ${c.description}`).join('\n')}`;

    // Build personality selection keyboard - dynamic layout based on number of choices
    let keyboard;
    if (choices.length === 5) {
      // Admin user gets 2x2 + 1 layout
      keyboard = [
        [
          { text: `${choices[0].emoji} ${choices[0].name}`, callback_data: `personality_select_${choices[0].name.replace(/\s+/g, '_')}` },
          { text: `${choices[1].emoji} ${choices[1].name}`, callback_data: `personality_select_${choices[1].name.replace(/\s+/g, '_')}` }
        ],
        [
          { text: `${choices[2].emoji} ${choices[2].name}`, callback_data: `personality_select_${choices[2].name.replace(/\s+/g, '_')}` },
          { text: `${choices[3].emoji} ${choices[3].name}`, callback_data: `personality_select_${choices[3].name.replace(/\s+/g, '_')}` }
        ],
        [
          { text: `${choices[4].emoji} ${choices[4].name}`, callback_data: `personality_select_${choices[4].name.replace(/\s+/g, '_')}` }
        ],
        [
          {
            text: lang === "es" ? "« Volver" : "« Back",
            callback_data: "profile_settings",
          },
        ]
      ];
    } else {
      // Regular user gets 2x2 layout
      keyboard = [
        [
          { text: `${choices[0].emoji} ${choices[0].name}`, callback_data: `personality_select_${choices[0].name.replace(/\s+/g, '_')}` },
          { text: `${choices[1].emoji} ${choices[1].name}`, callback_data: `personality_select_${choices[1].name.replace(/\s+/g, '_')}` }
        ],
        [
          { text: `${choices[2].emoji} ${choices[2].name}`, callback_data: `personality_select_${choices[2].name.replace(/\s+/g, '_')}` },
          { text: `${choices[3].emoji} ${choices[3].name}`, callback_data: `personality_select_${choices[3].name.replace(/\s+/g, '_')}` }
        ],
        [
          {
            text: lang === "es" ? "« Volver" : "« Back",
            callback_data: "profile_settings",
          },
        ]
      ];
    }

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard
      },
    });

    logger.info(`User ${userId} opened personality selection`);
  } catch (error) {
    logger.error("Error showing personality selection:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Handle personality selection
 */
async function handlePersonalitySelection(ctx, personalityName) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";

  try {
    const choices = personalityService.getPersonalityChoices(userId); // Pass userId for admin check
    const selectedChoice = choices.find(c => c.name.replace(/\s+/g, '_') === personalityName);
    
    if (!selectedChoice) {
      await ctx.answerCbQuery(
        lang === "es" ? "❌ Opción inválida" : "❌ Invalid choice",
        { show_alert: true }
      );
      return;
    }

    // Additional check for admin-only personalities
    if (selectedChoice.isAdminOnly && !personalityService.isAdmin(userId)) {
      await ctx.answerCbQuery(
        lang === "es" ? "❌ Personalidad exclusiva de administrador" : "❌ Admin-only personality",
        { show_alert: true }
      );
      return;
    }

    // Save the personality choice
    const success = await personalityService.setUserPersonality(userId, selectedChoice);
    
    if (success) {
      await ctx.answerCbQuery(
        lang === "es" 
          ? `✅ ¡Ahora eres ${selectedChoice.emoji} ${selectedChoice.name}!`
          : `✅ You are now ${selectedChoice.emoji} ${selectedChoice.name}!`
      );

      // Refresh settings view to show the new personality
      await showSettings(ctx);
      
      logger.info(`User ${userId} selected personality: ${selectedChoice.name} ${selectedChoice.emoji}`);
    } else {
      await ctx.answerCbQuery(
        lang === "es" ? "❌ Error guardando elección" : "❌ Error saving choice",
        { show_alert: true }
      );
    }
  } catch (error) {
    logger.error("Error handling personality selection:", error);
    await ctx.answerCbQuery(
      lang === "es" ? "❌ Error procesando elección" : "❌ Error processing choice",
      { show_alert: true }
    );
  }
}

module.exports = {
  viewProfile,
  handleEditPhoto,
  handlePhotoMessage,
  deletePhoto,
  showSettings,
  toggleAdsOptOut,
  showLanguageSelection,
  setLanguage,
  getPersonalityBadgeDisplay,
  showPersonalitySelection,
  handlePersonalitySelection,
};
