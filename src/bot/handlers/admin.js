const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { getMenu } = require("../../config/menus");
const { showPlanDashboard } = require('./admin/planManager');
const { activateMembership, getExpiringMemberships } = require("../../utils/membershipManager");
const { runManualExpirationCheck } = require("../../services/scheduler");
const {
  canScheduleBroadcast,
  getScheduledBroadcastCount,
  getScheduledBroadcasts,
  createScheduledBroadcast,
  cancelScheduledBroadcast,
  updateScheduledBroadcast,
  MAX_SCHEDULED_BROADCASTS,
} = require("../../services/scheduledBroadcastService");

/**
 * Admin panel main handler
 */
async function adminPanel(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const message = lang === "es"
      ? "⚙️ **Panel de Administración**\n\nSelecciona una opción:"
      : "⚙️ **Admin Panel**\n\nSelect an option:";

    await ctx.reply(message, {
      reply_markup: getMenu("admin"),
      parse_mode: "Markdown",
    });

    logger.info(`Admin ${ctx.from.id} accessed admin panel`);
  } catch (error) {
    logger.error("Error in admin panel:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Enhanced statistics dashboard
 */
async function showStats(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const loadingMsg = await ctx.reply(
      lang === "es" ? "📊 Cargando estadísticas..." : "📊 Loading statistics..."
    );

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    const totalUsers = usersSnapshot.size;

    // Initialize counters
    let freeTier = 0;
    let premiumTier = 0;
    let activeToday = 0;
    let activeThisWeek = 0;
    let withPhotos = 0;
    let withLocations = 0;
    let onboardingComplete = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();

      // Count tiers
      const tier = userData.tier || "Free";
      if (tier === "Free") freeTier++;
      else premiumTier++;

      // Count active users
      if (userData.lastActive) {
        const lastActive = userData.lastActive.toDate();
        if (lastActive >= today) activeToday++;
        if (lastActive >= weekAgo) activeThisWeek++;
      }

      // Count features
      if (userData.photoFileId) withPhotos++;
      if (userData.location) withLocations++;
      if (userData.onboardingComplete) onboardingComplete++;
    });

    // Calculate percentages
    const photoPercentage = totalUsers > 0 ? Math.round((withPhotos / totalUsers) * 100) : 0;
    const locationPercentage = totalUsers > 0 ? Math.round((withLocations / totalUsers) * 100) : 0;
    const onboardingPercentage = totalUsers > 0 ? Math.round((onboardingComplete / totalUsers) * 100) : 0;

    // Calculate revenue estimates from active subscriptions
    let monthlyRevenue = 0;
    // Revenue calculation now based on actual subscription plans

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    let message = lang === "es"
      ? "📊 **Estadísticas del Bot**\n\n"
      : "📊 **Bot Statistics**\n\n";

    message += lang === "es"
      ? `👥 **Usuarios**\n`
      : `👥 **Users**\n`;
    message += `• Total: ${totalUsers}\n`;
    message += `• Activos hoy: ${activeToday}\n`;
    message += `• Activos (7 días): ${activeThisWeek}\n`;
    message += `• Onboarding: ${onboardingComplete} (${onboardingPercentage}%)\n\n`;

    message += lang === "es"
      ? `💎 **Niveles**\n`
      : `💎 **Tiers**\n`;
    message += `• Free: ${freeTier} (${totalUsers > 0 ? Math.round((freeTier / totalUsers) * 100) : 0}%)\n`;
    message += `• Premium: ${premiumTier} (${totalUsers > 0 ? Math.round((premiumTier / totalUsers) * 100) : 0}%)\n\n`;

    message += lang === "es"
      ? `✨ **Características**\n`
      : `✨ **Features**\n`;
    message += `• Con foto: ${withPhotos} (${photoPercentage}%)\n`;
    message += `• Con ubicación: ${withLocations} (${locationPercentage}%)\n\n`;

    message += lang === "es"
      ? `💰 **Ingresos Estimados**\n`
      : `💰 **Estimated Revenue**\n`;
    message += `• Mensual: $${monthlyRevenue}\n`;
    message += `• Anual: $${annualRevenue}\n`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
              callback_data: "admin_stats",
            },
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed statistics`);
  } catch (error) {
    logger.error("Error showing stats:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * User management - List users
 */
async function listUsers(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const message = lang === "es"
      ? "👥 **Gestión de Usuarios**\n\nSelecciona una opción:"
      : "👥 **User Management**\n\nSelect an option:";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "📋 Listar Todos" : "📋 List All",
              callback_data: "admin_list_all",
            },
          ],
          [
            {
              text: lang === "es" ? "🔍 Buscar Usuario" : "🔍 Search User",
              callback_data: "admin_search_user",
            },
          ],
          [
            {
              text: lang === "es" ? "🥇 Usuarios Premium" : "🥇 Premium Users",
              callback_data: "admin_list_premium",
            },
          ],
          [
            {
              text: lang === "es" ? "📅 Nuevos (7 días)" : "📅 New (7 days)",
              callback_data: "admin_list_new",
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} accessed user management`);
  } catch (error) {
    logger.error("Error in user management:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * List all users (paginated)
 */
async function listAllUsers(ctx, page = 1) {
  try {
    const lang = ctx.session.language || "en";
    const pageSize = 10;

    const usersSnapshot = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(pageSize * page)
      .get();

    const allUsers = [];
    usersSnapshot.forEach((doc) => {
      allUsers.push({ id: doc.id, ...doc.data() });
    });

    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    const users = allUsers.slice(startIndex, endIndex);

    if (users.length === 0) {
      await ctx.reply(
        lang === "es" ? "No hay usuarios." : "No users found."
      );
      return;
    }

    let message = lang === "es"
      ? `👥 **Lista de Usuarios** (Página ${page})\n\n`
      : `👥 **User List** (Page ${page})\n\n`;

    users.forEach((user, index) => {
      const num = startIndex + index + 1;
      const tierIcon = user.tier && user.tier !== "Free" ? "💎" : "⚪";
      const photoIcon = user.photoFileId ? "📸" : "";
      const locationIcon = user.location ? "📍" : "";

      message += `${num}. ${tierIcon} @${user.username || "Anonymous"} ${photoIcon}${locationIcon}\n`;
      message += `   ID: \`${user.id}\` | XP: ${user.xp || 0}\n\n`;
    });

    const hasMore = allUsers.length > endIndex;

    const buttons = [];
    if (page > 1) {
      buttons.push({
        text: lang === "es" ? "« Anterior" : "« Previous",
        callback_data: `admin_list_page_${page - 1}`,
      });
    }
    if (hasMore) {
      buttons.push({
        text: lang === "es" ? "Siguiente »" : "Next »",
        callback_data: `admin_list_page_${page + 1}`,
      });
    }

    const keyboard = [buttons];
    keyboard.push([
      {
        text: lang === "es" ? "« Volver" : "« Back",
        callback_data: "admin_users",
      },
    ]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });

    logger.info(`Admin ${ctx.from.id} listed users (page ${page})`);
  } catch (error) {
    logger.error("Error listing users:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Search for user by username or ID
 */
async function searchUser(ctx) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = "admin_search";

    const message = lang === "es"
      ? "🔍 **Buscar Usuario**\n\nEnvía el nombre de usuario (sin @) o ID de usuario:"
      : "🔍 **Search User**\n\nSend username (without @) or user ID:";

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} initiated user search`);
  } catch (error) {
    logger.error("Error in search user:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute user search
 */
async function executeSearch(ctx, query) {
  try {
    const lang = ctx.session.language || "en";

    // Search by ID
    let userDoc = await db.collection("users").doc(query).get();

    if (!userDoc.exists) {
      // Search by username
      const usersSnapshot = await db
        .collection("users")
        .where("username", "==", query)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        await ctx.reply(
          lang === "es"
            ? `❌ No se encontró usuario: ${query}`
            : `❌ User not found: ${query}`
        );
        return;
      }

      userDoc = usersSnapshot.docs[0];
    }

    const userData = userDoc.data();
    await showUserDetails(ctx, userDoc.id, userData);

    ctx.session.waitingFor = null;
  } catch (error) {
    logger.error("Error executing search:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show detailed user information
 */
async function showUserDetails(ctx, userId, userData) {
  try {
    const lang = ctx.session.language || "en";

    let message = lang === "es"
      ? "👤 **Detalles del Usuario**\n\n"
      : "👤 **User Details**\n\n";

    message += `🆔 ID: \`${userId}\`\n`;
    message += `👤 Username: @${userData.username || "Anonymous"}\n`;
    message += `💎 Tier: ${userData.tier || "Free"}\n`;

    // Show membership expiration info
    if (userData.membershipExpiresAt) {
      const expiresAt = userData.membershipExpiresAt.toDate();
      const now = new Date();
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining > 0) {
        message += `⏰ Expires: ${expiresAt.toLocaleDateString()} (${daysRemaining} days)\n`;
      } else {
        message += `⚠️ Expired: ${expiresAt.toLocaleDateString()}\n`;
      }
    } else if (userData.tier !== "Free") {
      message += `⏰ Expires: Never (Lifetime)\n`;
    }

    message += `📸 Photo: ${userData.photoFileId ? "Yes" : "No"}\n`;
    message += `📍 Location: ${userData.location ? "Yes" : "No"}\n`;
    message += `📝 Bio: ${userData.bio || "Not set"}\n\n`;

    const createdAt = userData.createdAt?.toDate();
    const lastActive = userData.lastActive?.toDate();

    message += `📅 Created: ${createdAt ? createdAt.toLocaleDateString() : "Unknown"}\n`;
    message += `🕐 Last Active: ${lastActive ? lastActive.toLocaleString() : "Unknown"}\n`;

    // Show ban status
    if (userData.banned) {
      message += `\n🚫 **Status: BANNED**\n`;
    }

    const keyboard = [
      [
        {
          text: lang === "es" ? "✏️ Editar Tier" : "✏️ Edit Tier",
          callback_data: `admin_edit_tier_${userId}`,
        },
        {
          text: lang === "es" ? "💬 Mensaje" : "💬 Message",
          callback_data: `admin_message_${userId}`,
        },
      ],
      [
        userData.banned
          ? {
              text: lang === "es" ? "✅ Desbanear" : "✅ Unban",
              callback_data: `admin_unban_${userId}`,
            }
          : {
              text: lang === "es" ? "🚫 Banear" : "🚫 Ban",
              callback_data: `admin_ban_${userId}`,
            },
      ],
      [
        {
          text: lang === "es" ? "« Volver" : "« Back",
          callback_data: "admin_users",
        },
      ],
    ];

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed user details: ${userId}`);
  } catch (error) {
    logger.error("Error showing user details:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Edit user tier
 */
async function editUserTier(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    const message = lang === "es"
      ? `✏️ **Cambiar Tier**\n\nUsuario: \`${userId}\`\n\nSelecciona el nuevo tier:`
      : `✏️ **Edit Tier**\n\nUser: \`${userId}\`\n\nSelect new tier:`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "⚪ Free",
              callback_data: `admin_set_tier_${userId}_Free_0`,
            },
          ],
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: `admin_user_${userId}`,
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} editing tier for user: ${userId}`);
  } catch (error) {
    logger.error("Error editing user tier:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Set user tier with expiration
 */
async function setUserTier(ctx, userId, tier, durationDays = 30) {
  try {
    const lang = ctx.session.language || "en";

    // Use membership manager to activate with expiration
    const result = await activateMembership(userId, tier, "admin", durationDays);

    // Get user data for notification
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const userLang = userData.language || "en";

    // Notify user
    try {
      let message = userLang === "es"
        ? `🎉 ¡Felicitaciones!\n\nTu tier ha sido actualizado a: **${tier}**\n\n`
        : `🎉 Congratulations!\n\nYour tier has been upgraded to: **${tier}**\n\n`;

      if (result.expiresAt) {
        const expiresDate = result.expiresAt.toLocaleDateString();
        message += userLang === "es"
          ? `⏰ Vence el: ${expiresDate} (${durationDays} días)\n\n`
          : `⏰ Expires on: ${expiresDate} (${durationDays} days)\n\n`;
      }

      message += userLang === "es"
        ? "Disfruta tus nuevas características."
        : "Enjoy your new features!";

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about tier change:`, e.message);
    }

    const confirmMsg = tier === "Free"
      ? (lang === "es" ? `✅ Usuario cambiado a Free` : `✅ User changed to Free`)
      : (lang === "es"
        ? `✅ ${tier} activado por ${durationDays} días`
        : `✅ ${tier} activated for ${durationDays} days`);

    await ctx.answerCbQuery(confirmMsg);

    // Refresh user details
    const updatedUserDoc = await db.collection("users").doc(userId).get();
    await showUserDetails(ctx, userId, updatedUserDoc.data());

    logger.info(`Admin ${ctx.from.id} set tier ${tier} for user: ${userId} (${durationDays} days)`);
  } catch (error) {
    logger.error("Error setting user tier:", error);
    await ctx.answerCbQuery(t("error", ctx.session.language || "en"));
  }
}

/**
 * Broadcast message to all users - Step 1: Choose Language
 */
async function broadcastMessage(ctx) {
  try {
    const lang = ctx.session.language || "en";

    // Initialize broadcast wizard session with enhanced features
    ctx.session.broadcastWizard = {
      step: 1,
      targetLanguage: null,
      targetStatus: null,
      targetTiers: [], // Enhanced: Support multiple tier selection
      media: null,
      text: null,
      buttons: null,
      testMode: false, // Enhanced: Test mode sends to admin only
      scheduledTime: null // Enhanced: Schedule for later
    };

    const message = lang === "es"
      ? "📢 **Asistente de Mensaje Masivo**\n\n**Paso 1 de 5:** Selecciona el idioma de los usuarios:\n\n💡 _Puedes probar mensajes antes de enviar_"
      : "📢 **Broadcast Wizard**\n\n**Step 1 of 5:** Select target user language:\n\n💡 _You can test messages before sending_";

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "🌍 Todos los idiomas" : "🌍 All Languages",
            callback_data: "bcast_lang_all"
          }
        ],
        [
          {
            text: lang === "es" ? "🇺🇸 Solo inglés" : "🇺🇸 English only",
            callback_data: "bcast_lang_en"
          },
          {
            text: lang === "es" ? "🇪🇸 Solo español" : "🇪🇸 Spanish only",
            callback_data: "bcast_lang_es"
          }
        ],
        [
          {
            text: lang === "es" ? "« Cancelar" : "« Cancel",
            callback_data: "admin_back"
          }
        ]
      ]
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });

    logger.info(`Admin ${ctx.from.id} initiated enhanced broadcast wizard`);
  } catch (error) {
    logger.error("Error in broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle broadcast wizard steps
 */
async function handleBroadcastWizard(ctx, action) {
  try {
    const lang = ctx.session.language || "en";

    if (!ctx.session.broadcastWizard) {
      ctx.session.broadcastWizard = {
        step: 1,
        targetLanguage: null,
        targetStatus: null,
        media: null,
        text: null,
        buttons: null
      };
    }

    const wizard = ctx.session.broadcastWizard;

    // Step 1: Language selection
    if (action.startsWith("bcast_lang_")) {
      const langChoice = action.replace("bcast_lang_", "");
      wizard.targetLanguage = langChoice;
      wizard.step = 2;

      const message = lang === "es"
        ? "📢 **Asistente de Mensaje Masivo**\n\n**Paso 2 de 5:** Selecciona el estado de los usuarios:"
        : "📢 **Broadcast Wizard**\n\n**Step 2 of 5:** Select target user status:";

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "👥 Todos los estados" : "👥 All Status",
              callback_data: "bcast_status_all"
            }
          ],
          [
            {
              text: lang === "es" ? "💎 Suscriptores activos" : "💎 Active Subscribers",
              callback_data: "bcast_status_subscribers"
            }
          ],
          [
            {
              text: lang === "es" ? "🆓 Solo nivel gratuito" : "🆓 Free tier only",
              callback_data: "bcast_status_free"
            }
          ],
          [
            {
              text: lang === "es" ? "⏰ Suscripciones expiradas" : "⏰ Expired subscriptions",
              callback_data: "bcast_status_churned"
            }
          ],
          [
            {
              text: lang === "es" ? "« Atrás" : "« Back",
              callback_data: "bcast_back_to_lang"
            },
            {
              text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
              callback_data: "admin_back"
            }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();
    }
    // Step 2: Status selection
    else if (action.startsWith("bcast_status_")) {
      const statusChoice = action.replace("bcast_status_", "");
      wizard.targetStatus = statusChoice;
      wizard.step = 3;

      const message = lang === "es"
        ? "📢 **Asistente de Mensaje Masivo**\n\n**Paso 3 de 5:** ¿Quieres incluir un archivo multimedia?\n\nPuedes enviar una foto, video o documento, o presiona 'Omitir' para continuar sin multimedia."
        : "📢 **Broadcast Wizard**\n\n**Step 3 of 5:** Do you want to include media?\n\nYou can send a photo, video, or document, or press 'Skip' to continue without media.";

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "⏭️ Omitir (sin multimedia)" : "⏭️ Skip (no media)",
              callback_data: "bcast_media_skip"
            }
          ],
          [
            {
              text: lang === "es" ? "« Atrás" : "« Back",
              callback_data: "bcast_back_to_status"
            },
            {
              text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
              callback_data: "admin_back"
            }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();

      // Set waiting for media upload
      ctx.session.waitingFor = "broadcast_media";
    }
    // Step 3: Skip media
    else if (action === "bcast_media_skip") {
      wizard.media = null;
      wizard.step = 4;
      ctx.session.waitingFor = "broadcast_text";

      const message = lang === "es"
        ? "📢 **Asistente de Mensaje Masivo**\n\n**Paso 4 de 5:** Escribe el mensaje de texto que quieres enviar:"
        : "📢 **Broadcast Wizard**\n\n**Step 4 of 5:** Type the text message you want to send:";

      await ctx.editMessageText(message, { parse_mode: "Markdown" });
      await ctx.answerCbQuery();
    }
    // Step 4: Skip buttons (after text)
    else if (action === "bcast_buttons_skip") {
      wizard.buttons = null;
      await showBroadcastConfirmation(ctx);
    }
    // Step 5: Confirm send
    else if (action === "bcast_confirm_send") {
      await ctx.answerCbQuery();
      await executeBroadcast(ctx);
    }
    // Step 5: Test send (to admin only)
    else if (action === "bcast_test_send") {
      await ctx.answerCbQuery();
      wizard.testMode = true;
      await executeBroadcast(ctx, true);
      wizard.testMode = false;

      // Show confirmation again after test
      const lang = ctx.session.language || "en";
      await ctx.reply(
        lang === "es"
          ? "✅ Mensaje de prueba enviado. Revisa cómo se ve arriba.\n\n¿Listo para enviar a todos los usuarios?"
          : "✅ Test message sent. Check how it looks above.\n\nReady to send to all users?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "✅ Sí, enviar a todos" : "✅ Yes, send to all",
                  callback_data: "bcast_confirm_send"
                }
              ],
              [
                {
                  text: lang === "es" ? "✏️ Editar mensaje" : "✏️ Edit message",
                  callback_data: "bcast_edit"
                },
                {
                  text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
                  callback_data: "admin_back"
                }
              ]
            ]
          }
        }
      );
    }
    // Step 5: Edit broadcast
    else if (action === "bcast_edit") {
      await ctx.answerCbQuery();
      wizard.step = 1;
      await broadcastMessage(ctx);
    }
    // Back navigation
    else if (action === "bcast_back_to_lang") {
      wizard.step = 1;
      await broadcastMessage(ctx);
      await ctx.answerCbQuery();
    }
    else if (action === "bcast_back_to_status") {
      wizard.step = 2;
      await handleBroadcastWizard(ctx, `bcast_lang_${wizard.targetLanguage}`);
    }

  } catch (error) {
    logger.error("Error handling broadcast wizard:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show broadcast confirmation with preview
 */
async function showBroadcastConfirmation(ctx) {
  try {
    const lang = ctx.session.language || "en";
    const wizard = ctx.session.broadcastWizard;

    // Count target users
    const usersSnapshot = await db.collection("users").get();
    const allUsers = usersSnapshot.docs;
    const filteredUsers = filterUsersByWizard(allUsers, wizard);

    const langLabel = {
      all: lang === "es" ? "Todos los idiomas" : "All languages",
      en: lang === "es" ? "Solo inglés" : "English only",
      es: lang === "es" ? "Solo español" : "Spanish only"
    }[wizard.targetLanguage];

    const statusLabel = {
      all: lang === "es" ? "Todos los estados" : "All status",
      subscribers: lang === "es" ? "Suscriptores activos" : "Active subscribers",
      free: lang === "es" ? "Nivel gratuito" : "Free tier",
      churned: lang === "es" ? "Suscripciones expiradas" : "Expired subscriptions"
    }[wizard.targetStatus];

    const mediaLabel = wizard.media
      ? (wizard.media.type === "photo" ? "📷 Foto" : wizard.media.type === "video" ? "🎥 Video" : "📄 Documento")
      : (lang === "es" ? "Sin multimedia" : "No media");

    const buttonsLabel = wizard.buttons && wizard.buttons.length > 0
      ? `${wizard.buttons.length} ${lang === "es" ? "botón(es)" : "button(s)"}`
      : (lang === "es" ? "Sin botones" : "No buttons");

    // Calculate estimated delivery time (assuming 10 messages per second with delays)
    const estimatedSeconds = Math.ceil(filteredUsers.length / 10);
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
    const estimatedTime = estimatedMinutes > 1
      ? `~${estimatedMinutes} ${lang === "es" ? "minutos" : "minutes"}`
      : `~${estimatedSeconds} ${lang === "es" ? "segundos" : "seconds"}`;

    const message = lang === "es"
      ? `📢 **Confirmación de Mensaje Masivo**\n\n**Configuración:**\n🌐 Idioma: ${langLabel}\n👥 Estado: ${statusLabel}\n📎 Multimedia: ${mediaLabel}\n🔘 Botones: ${buttonsLabel}\n\n**Vista previa del mensaje:**\n━━━━━━━━━━━━━━\n${wizard.text}\n━━━━━━━━━━━━━━\n\n**📊 Estadísticas:**\n👥 Usuarios objetivo: ${filteredUsers.length}\n⏱️ Tiempo estimado: ${estimatedTime}\n\n¿Listo para enviar?`
      : `📢 **Broadcast Confirmation**\n\n**Configuration:**\n🌐 Language: ${langLabel}\n👥 Status: ${statusLabel}\n📎 Media: ${mediaLabel}\n🔘 Buttons: ${buttonsLabel}\n\n**Message preview:**\n━━━━━━━━━━━━━━\n${wizard.text}\n━━━━━━━━━━━━━━\n\n**📊 Statistics:**\n👥 Target users: ${filteredUsers.length}\n⏱️ Estimated time: ${estimatedTime}\n\n Ready to send?`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "🧪 Enviar prueba (solo a mí)" : "🧪 Send test (to me only)",
            callback_data: "bcast_test_send"
          }
        ],
        [
          {
            text: lang === "es" ? "✅ Enviar a todos ahora" : "✅ Send to all now",
            callback_data: "bcast_confirm_send"
          }
        ],
        [
          {
            text: lang === "es" ? "✏️ Editar" : "✏️ Edit",
            callback_data: "bcast_edit"
          },
          {
            text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
            callback_data: "admin_back"
          }
        ]
      ]
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error("Error showing broadcast confirmation:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Filter users based on broadcast wizard settings
 */
function filterUsersByWizard(users, wizard) {
  const now = new Date();

  return users.filter(user => {
    const userData = user.data();

    // Always filter out users who opted out of ads
    if (userData.adsOptOut === true) {
      return false;
    }

    // Filter by language
    if (wizard.targetLanguage !== "all") {
      if (userData.language !== wizard.targetLanguage) {
        return false;
      }
    }

    // Filter by status
    switch (wizard.targetStatus) {
      case "all":
        // No additional filtering
        break;

      case "subscribers":
        // Active subscribers with premium tier and not expired
        if (!userData.tier || userData.tier === "Free") return false;
        if (!userData.expiresAt) return false;
        const expiresAt = userData.expiresAt.toDate();
        if (expiresAt <= now) return false;
        break;

      case "free":
        if (userData.tier && userData.tier !== "Free") return false;
        break;

      case "churned":
        // Users who had a subscription but it expired
        if (!userData.tier || userData.tier === "Free") return false;
        if (!userData.expiresAt) return false;
        const expired = userData.expiresAt.toDate();
        if (expired > now) return false;
        break;
    }

    return true;
  });
}

/**
 * Execute broadcast message to segmented users
 */
async function executeBroadcast(ctx, isTestMode = false) {
  try {
    const lang = ctx.session.language || "en";
    const wizard = ctx.session.broadcastWizard;

    // Test mode: Send only to admin
    if (isTestMode) {
      const messageOptions = {
        parse_mode: "Markdown"
      };

      // Add inline buttons if configured
      if (wizard.buttons && wizard.buttons.length > 0) {
        messageOptions.reply_markup = {
          inline_keyboard: wizard.buttons
        };
      }

      const testPrefix = lang === "es"
        ? "🧪 **[MENSAJE DE PRUEBA]**\n\n"
        : "🧪 **[TEST MESSAGE]**\n\n";

      // Send with media if available
      if (wizard.media) {
        const caption = testPrefix + (wizard.text || "");

        switch (wizard.media.type) {
          case "photo":
            await ctx.telegram.sendPhoto(ctx.from.id, wizard.media.file_id, {
              caption,
              ...messageOptions
            });
            break;
          case "video":
            await ctx.telegram.sendVideo(ctx.from.id, wizard.media.file_id, {
              caption,
              ...messageOptions
            });
            break;
          case "document":
            await ctx.telegram.sendDocument(ctx.from.id, wizard.media.file_id, {
              caption,
              ...messageOptions
            });
            break;
        }
      } else {
        // Send text only
        await ctx.telegram.sendMessage(ctx.from.id, testPrefix + wizard.text, messageOptions);
      }

      logger.info(`Admin ${ctx.from.id} sent test broadcast to themselves`);
      return;
    }

    // Production mode: Send to all users
    const statusMsg = await ctx.reply(
      lang === "es"
        ? "📤 Enviando mensaje masivo..."
        : "📤 Sending broadcast message..."
    );

    const usersSnapshot = await db.collection("users").get();
    const allUsers = usersSnapshot.docs;

    // Filter users based on wizard settings
    const filteredUsers = filterUsersByWizard(allUsers, wizard);

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = allUsers.length - filteredUsers.length;

    const messageOptions = {
      parse_mode: "Markdown"
    };

    // Add inline buttons if configured
    if (wizard.buttons && wizard.buttons.length > 0) {
      messageOptions.reply_markup = {
        inline_keyboard: wizard.buttons
      };
    }

    const totalUsers = filteredUsers.length;
    let lastUpdateTime = Date.now();

    for (const doc of filteredUsers) {
      try {
        const userId = doc.id;

        // Send with media if available
        if (wizard.media) {
          const caption = wizard.text || "";

          switch (wizard.media.type) {
            case "photo":
              await ctx.telegram.sendPhoto(userId, wizard.media.file_id, {
                caption,
                ...messageOptions
              });
              break;
            case "video":
              await ctx.telegram.sendVideo(userId, wizard.media.file_id, {
                caption,
                ...messageOptions
              });
              break;
            case "document":
              await ctx.telegram.sendDocument(userId, wizard.media.file_id, {
                caption,
                ...messageOptions
              });
              break;
          }
        } else {
          // Send text only
          await ctx.telegram.sendMessage(userId, wizard.text, messageOptions);
        }

        sentCount++;
      } catch (error) {
        failedCount++;
        logger.warn(`Failed to send broadcast to user ${doc.id}:`, error.message);
      }

      // Update progress every 25 messages or every 5 seconds
      const now = Date.now();
      if ((sentCount + failedCount) % 25 === 0 || (now - lastUpdateTime) > 5000) {
        try {
          const progress = Math.round(((sentCount + failedCount) / totalUsers) * 100);
          const progressMsg = lang === "es"
            ? `📤 Enviando... ${progress}% (${sentCount}/${totalUsers})`
            : `📤 Sending... ${progress}% (${sentCount}/${totalUsers})`;

          await ctx.telegram.editMessageText(
            ctx.from.id,
            statusMsg.message_id,
            null,
            progressMsg
          );
          lastUpdateTime = now;
        } catch (e) {
          // Ignore edit errors
        }
      }

      // Small delay to avoid rate limits
      if (sentCount % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    try {
      await ctx.deleteMessage(statusMsg.message_id);
    } catch (e) {
      // Ignore
    }

    const resultMessage = lang === "es"
      ? `✅ Mensaje enviado exitosamente.\n\n✉️ Enviados: ${sentCount}\n❌ Fallidos: ${failedCount}\n⏭️ Omitidos: ${skippedCount}`
      : `✅ Broadcast sent successfully.\n\n✉️ Sent: ${sentCount}\n❌ Failed: ${failedCount}\n⏭️ Skipped: ${skippedCount}`;

    await ctx.reply(resultMessage, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} sent broadcast to ${sentCount} users`);

    // Clear wizard session
    ctx.session.waitingFor = null;
    ctx.session.broadcastWizard = null;
  } catch (error) {
    logger.error("Error executing broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Legacy function for backward compatibility - redirects to text message handler
 */
async function sendBroadcast(ctx, message) {
  // This is called from the text handler when waitingFor === "broadcast_message"
  try {
    const lang = ctx.session.language || "en";
    const wizard = ctx.session.broadcastWizard;

    if (!wizard) {
      await ctx.reply(lang === "es" ? "Error: Sesión expirada" : "Error: Session expired");
      return;
    }

    wizard.text = message;
    wizard.step = 5;
    ctx.session.waitingFor = "broadcast_buttons";

    const msg = lang === "es"
      ? "📢 **Asistente de Mensaje Masivo**\n\n**Paso 5 de 5:** ¿Quieres agregar botones al mensaje?\n\nEnvía los botones en formato:\n```\nTexto | URL\nTexto | URL\n```\n\nEjemplo:\n```\nVisitar sitio | https://ejemplo.com\nMás info | https://ejemplo.com/info\n```\n\nO presiona 'Omitir' para continuar sin botones."
      : "📢 **Broadcast Wizard**\n\n**Step 5 of 5:** Do you want to add buttons to the message?\n\nSend buttons in format:\n```\nText | URL\nText | URL\n```\n\nExample:\n```\nVisit site | https://example.com\nMore info | https://example.com/info\n```\n\nOr press 'Skip' to continue without buttons.";

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "⏭️ Omitir (sin botones)" : "⏭️ Skip (no buttons)",
            callback_data: "bcast_buttons_skip"
          }
        ],
        [
          {
            text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
            callback_data: "admin_back"
          }
        ]
      ]
    };

    await ctx.reply(msg, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error("Error in sendBroadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show expiring memberships
 */
async function showExpiringMemberships(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const loadingMsg = await ctx.reply(
      lang === "es" ? "⏰ Cargando membresías por vencer..." : "⏰ Loading expiring memberships..."
    );

    const expiringUsers = await getExpiringMemberships(7);

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    if (expiringUsers.length === 0) {
      await ctx.reply(
        lang === "es"
          ? "✅ No hay membresías por vencer en los próximos 7 días."
          : "✅ No memberships expiring in the next 7 days.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "« Volver" : "« Back",
                  callback_data: "admin_back",
                },
              ],
            ],
          },
        }
      );
      return;
    }

    let message = lang === "es"
      ? `⏰ **Membresías por Vencer** (7 días)\n\n`
      : `⏰ **Expiring Memberships** (7 days)\n\n`;

    message += lang === "es"
      ? `Total: ${expiringUsers.length} usuarios\n\n`
      : `Total: ${expiringUsers.length} users\n\n`;

    expiringUsers.forEach((user, index) => {
      const tierIcon = "💎";
      const expiresDate = user.expiresAt.toLocaleDateString();

      message += `${index + 1}. ${tierIcon} @${user.username || "Anonymous"}\n`;
      message += `   ID: \`${user.userId}\`\n`;
      message += `   Vence: ${expiresDate} (${user.daysRemaining} días)\n\n`;
    });

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
              callback_data: "admin_expiring",
            },
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed expiring memberships`);
  } catch (error) {
    logger.error("Error showing expiring memberships:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Run manual expiration check
 */
async function runExpirationCheck(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const loadingMsg = await ctx.reply(
      lang === "es"
        ? "🔄 Ejecutando verificación de membresías expiradas..."
        : "🔄 Running membership expiration check..."
    );

    const results = await runManualExpirationCheck();

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    let message = lang === "es"
      ? "✅ **Verificación Completada**\n\n"
      : "✅ **Check Completed**\n\n";

    message += lang === "es"
      ? `📊 Verificados: ${results.checked}\n`
      : `📊 Checked: ${results.checked}\n`;
    message += lang === "es"
      ? `⏰ Expirados: ${results.expired}\n`
      : `⏰ Expired: ${results.expired}\n`;
    message += lang === "es"
      ? `❌ Errores: ${results.failed}\n`
      : `❌ Failed: ${results.failed}\n`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} ran manual expiration check: ${JSON.stringify(results)}`);
  } catch (error) {
    logger.error("Error running expiration check:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Send message to user
 */
async function messageUser(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = `admin_message_${userId}`;

    const message = lang === "es"
      ? `💬 **Enviar Mensaje**\n\nUsuario: \`${userId}\`\n\nEnvía el mensaje que quieres enviar a este usuario:`
      : `💬 **Send Message**\n\nUser: \`${userId}\`\n\nSend the message you want to send to this user:`;

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} initiated message to user: ${userId}`);
  } catch (error) {
    logger.error("Error in message user:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute send message to user
 */
async function executeSendMessage(ctx, userId, message) {
  try {
    const lang = ctx.session.language || "en";

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      await ctx.reply(
        lang === "es" ? "❌ Usuario no encontrado." : "❌ User not found."
      );
      return;
    }

    // Send message to user
    try {
      const adminMessage = `📨 **Mensaje del Administrador / Admin Message**\n\n${message}`;
      await ctx.telegram.sendMessage(userId, adminMessage, {
        parse_mode: "Markdown",
      });

      await ctx.reply(
        lang === "es"
          ? `✅ Mensaje enviado exitosamente a \`${userId}\``
          : `✅ Message sent successfully to \`${userId}\``,
        { parse_mode: "Markdown" }
      );

      logger.info(`Admin ${ctx.from.id} sent message to user: ${userId}`);
    } catch (e) {
      await ctx.reply(
        lang === "es"
          ? `❌ No se pudo enviar el mensaje. El usuario puede haber bloqueado el bot.`
          : `❌ Could not send message. User may have blocked the bot.`
      );
      logger.warn(`Failed to send admin message to user ${userId}:`, e.message);
    }

    ctx.session.waitingFor = null;
  } catch (error) {
    logger.error("Error executing send message:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Ban user
 */
async function banUser(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    const message = lang === "es"
      ? `🚫 **Banear Usuario**\n\nUsuario: \`${userId}\`\n\n¿Estás seguro de que quieres banear a este usuario?`
      : `🚫 **Ban User**\n\nUser: \`${userId}\`\n\nAre you sure you want to ban this user?`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "✅ Sí, Banear" : "✅ Yes, Ban",
              callback_data: `admin_confirm_ban_${userId}`,
            },
          ],
          [
            {
              text: lang === "es" ? "❌ Cancelar" : "❌ Cancel",
              callback_data: `admin_user_${userId}`,
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} initiated ban for user: ${userId}`);
  } catch (error) {
    logger.error("Error in ban user:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute ban user
 */
async function executeBanUser(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      await ctx.reply(
        lang === "es" ? "❌ Usuario no encontrado." : "❌ User not found."
      );
      return;
    }

    const userData = userDoc.data();

    // Check if already banned
    if (userData.banned) {
      await ctx.answerCbQuery(
        lang === "es" ? "⚠️ Usuario ya está baneado" : "⚠️ User is already banned"
      );
      return;
    }

    // Ban user
    await db.collection("users").doc(userId).update({
      banned: true,
      bannedAt: new Date(),
      bannedBy: ctx.from.id,
    });

    // Notify user
    try {
      const userLang = userData.language || "en";
      const message = userLang === "es"
        ? `🚫 **Cuenta Suspendida**\n\nTu cuenta ha sido suspendida por un administrador.\n\nSi crees que esto es un error, contacta al soporte.`
        : `🚫 **Account Suspended**\n\nYour account has been suspended by an administrator.\n\nIf you believe this is an error, contact support.`;

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about ban:`, e.message);
    }

    await ctx.answerCbQuery(
      lang === "es" ? "✅ Usuario baneado" : "✅ User banned"
    );

    await ctx.reply(
      lang === "es"
        ? `✅ Usuario \`${userId}\` ha sido baneado exitosamente.`
        : `✅ User \`${userId}\` has been banned successfully.`,
      { parse_mode: "Markdown" }
    );

    logger.info(`Admin ${ctx.from.id} banned user: ${userId}`);
  } catch (error) {
    logger.error("Error executing ban:", error);
    await ctx.answerCbQuery(t("error", ctx.session.language || "en"));
  }
}

/**
 * Unban user
 */
async function unbanUser(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    // Unban user
    await db.collection("users").doc(userId).update({
      banned: false,
      unbannedAt: new Date(),
      unbannedBy: ctx.from.id,
    });

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    // Notify user
    try {
      const userLang = userData.language || "en";
      const message = userLang === "es"
        ? `✅ **Cuenta Reactivada**\n\nTu cuenta ha sido reactivada.\n\n¡Bienvenido de vuelta!`
        : `✅ **Account Reactivated**\n\nYour account has been reactivated.\n\nWelcome back!`;

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about unban:`, e.message);
    }

    await ctx.answerCbQuery(
      lang === "es" ? "✅ Usuario desbaneado" : "✅ User unbanned"
    );

    // Refresh user details
    await showUserDetails(ctx, userId, userData);

    logger.info(`Admin ${ctx.from.id} unbanned user: ${userId}`);
  } catch (error) {
    logger.error("Error unbanning user:", error);
    await ctx.answerCbQuery(t("error", ctx.session.language || "en"));
  }
}

/**
 * List premium users
 */
async function listPremiumUsers(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const loadingMsg = await ctx.reply(
      lang === "es" ? "🥇 Cargando usuarios premium..." : "🥇 Loading premium users..."
    );

    // Get premium users (all non-Free tiers)
    const allUsersSnapshot = await db
      .collection("users")
      .orderBy("tierUpdatedAt", "desc")
      .limit(200)
      .get();

    // Filter for premium users
    const premiumUsers = [];
    allUsersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.tier && userData.tier !== "Free") {
        premiumUsers.push({ id: doc.id, ...userData });
      }
    });
    const premiumSnapshot = { empty: premiumUsers.length === 0, size: premiumUsers.length };

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    if (premiumSnapshot.empty) {
      await ctx.reply(
        lang === "es" ? "No hay usuarios premium." : "No premium users found.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "« Volver" : "« Back",
                  callback_data: "admin_users",
                },
              ],
            ],
          },
        }
      );
      return;
    }

    let message = lang === "es"
      ? `🥇 **Usuarios Premium**\n\nTotal: ${premiumSnapshot.size}\n\n`
      : `🥇 **Premium Users**\n\nTotal: ${premiumSnapshot.size}\n\n`;

    premiumUsers.forEach((user, index) => {
      const tierIcon = "💎";

      let expiryInfo = "";
      if (user.membershipExpiresAt) {
        const expiresAt = user.membershipExpiresAt.toDate();
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        expiryInfo = daysRemaining > 0 ? ` (${daysRemaining}d)` : ` (⚠️)`;
      }

      message += `${index + 1}. ${tierIcon} @${user.username || "Anonymous"}${expiryInfo}\n`;
      message += `   ID: \`${user.id}\`\n\n`;
    });

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
              callback_data: "admin_list_premium",
            },
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_users",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed premium users`);
  } catch (error) {
    logger.error("Error listing premium users:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * List new users (last 7 days)
 */
async function listNewUsers(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const loadingMsg = await ctx.reply(
      lang === "es" ? "📅 Cargando nuevos usuarios..." : "📅 Loading new users..."
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get new users
    const newUsersSnapshot = await db
      .collection("users")
      .where("createdAt", ">=", sevenDaysAgo)
      .orderBy("createdAt", "desc")
      .get();

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    if (newUsersSnapshot.empty) {
      await ctx.reply(
        lang === "es"
          ? "No hay usuarios nuevos en los últimos 7 días."
          : "No new users in the last 7 days.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "« Volver" : "« Back",
                  callback_data: "admin_users",
                },
              ],
            ],
          },
        }
      );
      return;
    }

    let message = lang === "es"
      ? `📅 **Nuevos Usuarios** (7 días)\n\nTotal: ${newUsersSnapshot.size}\n\n`
      : `📅 **New Users** (7 days)\n\nTotal: ${newUsersSnapshot.size}\n\n`;

    newUsersSnapshot.forEach((doc, index) => {
      const userData = doc.data();
      const tierIcon = userData.tier && userData.tier !== "Free" ? "💎" : "⚪";
      const createdAt = userData.createdAt?.toDate();
      const daysAgo = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));

      message += `${index + 1}. ${tierIcon} @${userData.username || "Anonymous"}\n`;
      message += `   ID: \`${doc.id}\` | ${daysAgo}d ago\n\n`;
    });

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
              callback_data: "admin_list_new",
            },
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_users",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed new users`);
  } catch (error) {
    logger.error("Error listing new users:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Manual membership activation - Start flow
 */
async function startMembershipActivation(ctx) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = "admin_activate_userid";

    const message = lang === "es"
      ? "✨ **Activación Manual de Membresía**\n\nEnvía el ID del usuario para activar su membresía.\n\nPuedes obtener el ID desde:\n• 👥 User Management → Search User\n• El perfil del usuario en Telegram"
      : "✨ **Manual Membership Activation**\n\nSend the user ID to activate their membership.\n\nYou can get the ID from:\n• 👥 User Management → Search User\n• The user's Telegram profile";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} initiated manual membership activation`);
  } catch (error) {
    logger.error("Error in start membership activation:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Manual membership activation - Process user ID
 */
async function processActivationUserId(ctx, userIdInput) {
  try {
    const lang = ctx.session.language || "en";
    const userId = userIdInput.trim();

    // Verify user exists
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      await ctx.reply(
        lang === "es"
          ? `❌ Usuario no encontrado: \`${userId}\`\n\nVerifica el ID e intenta de nuevo.`
          : `❌ User not found: \`${userId}\`\n\nPlease verify the ID and try again.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const userData = userDoc.data();

    // Store user ID in session for next step
    ctx.session.activationUserId = userId;
    ctx.session.waitingFor = null;

    // Show tier selection
    let message = lang === "es"
      ? `✨ **Activar Membresía**\n\n👤 Usuario: @${userData.username || "Anonymous"}\n🆔 ID: \`${userId}\`\n💎 Tier Actual: ${userData.tier || "Free"}\n\n¿Qué tier deseas activar?`
      : `✨ **Activate Membership**\n\n👤 User: @${userData.username || "Anonymous"}\n🆔 ID: \`${userId}\`\n💎 Current Tier: ${userData.tier || "Free"}\n\nWhich tier do you want to activate?`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "⚪ Free",
              callback_data: `admin_quick_activate_${userId}_Free_0`,
            },
          ],
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} selected user ${userId} for activation`);
  } catch (error) {
    logger.error("Error processing activation user ID:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute quick membership activation
 */
async function executeQuickActivation(ctx, userId, tier, durationDays) {
  try {
    const lang = ctx.session.language || "en";

    // Verify user still exists
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      await ctx.answerCbQuery(
        lang === "es" ? "❌ Usuario no encontrado" : "❌ User not found"
      );
      return;
    }

    // Get bot instance for invite link generation
    const bot = require('../index');
    
    // Activate membership with bot instance for invite link generation
    const result = await activateMembership(userId, tier, "admin", durationDays, bot);

    const userData = userDoc.data();
    const userLang = userData.language || "en";

    // Get plan name for display
    let planName = tier;
    try {
      const planService = require('../../services/planService');
      const plan = await planService.getPlanByTier?.(tier) || await planService.getPlanById?.(tier);
      if (plan) {
        planName = plan.displayName || plan.name || tier;
      }
    } catch (planError) {
      // Use tier as fallback if plan service fails
      logger.warn('Could not get plan details for confirmation message:', planError.message);
    }

    // Generate standardized confirmation message
    const { generateConfirmationMessage } = require('../../utils/membershipManager');
    const userName = userData.username || userData.firstName || 'User';
    
    const confirmationMessage = generateConfirmationMessage({
      userName,
      planName,
      durationDays,
      expiresAt: result.expiresAt,
      paymentMethod: userLang === 'es' ? 'Activación Manual' : 'Manual Activation',
      reference: `admin_${Date.now()}`,
      inviteLink: result.inviteLink,
      language: userLang
    });

    // Notify user with standardized message
    try {
      await ctx.telegram.sendMessage(userId, confirmationMessage, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about activation:`, e.message);
    }

    // Confirm to admin
    const isLifetime = !result.expiresAt;
    await ctx.answerCbQuery(
      isLifetime
        ? (lang === "es" ? `✅ Membresía activada: ${tier} (Vitalicia)` : `✅ Membership activated: ${tier} (Lifetime)`)
        : (lang === "es" ? `✅ Membresía activada: ${tier} (${durationDays}d)` : `✅ Membership activated: ${tier} (${durationDays}d)`)
    );

    let confirmMessage = lang === "es"
      ? `✅ **Membresía Activada**\n\n👤 Usuario: \`${userId}\`\n💎 Tier: **${tier}**\n`
      : `✅ **Membership Activated**\n\n👤 User: \`${userId}\`\n💎 Tier: **${tier}**\n`;

    if (result.expiresAt) {
      const expiresDate = result.expiresAt.toLocaleDateString();
      confirmMessage += lang === "es"
        ? `⏰ Vence: ${expiresDate}\n📅 Duración: ${durationDays} días`
        : `⏰ Expires: ${expiresDate}\n📅 Duration: ${durationDays} days`;
    } else {
      confirmMessage += lang === "es"
        ? `⏰ Expiración: **Nunca** 💎\n📅 Tipo: **Vitalicia**`
        : `⏰ Expiration: **Never** 💎\n📅 Type: **Lifetime**`;
    }

    await ctx.reply(confirmMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "✨ Activar Otra" : "✨ Activate Another",
              callback_data: "admin_activate_membership",
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver al Panel" : "« Back to Panel",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} activated ${tier} (${durationDays}d) for user: ${userId}`);

    // Clear session
    ctx.session.activationUserId = null;
  } catch (error) {
    logger.error("Error executing quick activation:", error);
    await ctx.answerCbQuery(t("error", ctx.session.language || "en"));
  }
}

/**
 * Update member - Start flow
 */
async function startUpdateMember(ctx) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = "admin_update_member_userid";

    const message = lang === "es"
      ? "📝 **Actualizar Miembro**\n\nEnvía el ID del usuario para actualizar su membresía.\n\nPuedes cambiar el tier o modificar la fecha de expiración."
      : "📝 **Update Member**\n\nSend the user ID to update their membership.\n\nYou can change the tier or modify the expiration date.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} initiated member update`);
  } catch (error) {
    logger.error("Error in start update member:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Update member - Process user ID
 */
async function processUpdateMemberUserId(ctx, userIdInput) {
  try {
    const lang = ctx.session.language || "en";
    const userId = userIdInput.trim();

    // Verify user exists
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      await ctx.reply(
        lang === "es"
          ? `❌ Usuario no encontrado: \`${userId}\`\n\nVerifica el ID e intenta de nuevo.`
          : `❌ User not found: \`${userId}\`\n\nPlease verify the ID and try again.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const userData = userDoc.data();

    // Store user ID in session for next step
    ctx.session.updateMemberUserId = userId;
    ctx.session.waitingFor = null;

    // Show current membership info and update options
    let message = lang === "es"
      ? `📝 **Actualizar Miembro**\n\n👤 Usuario: @${userData.username || "Anonymous"}\n🆔 ID: \`${userId}\`\n💎 Tier Actual: ${userData.tier || "Free"}\n`
      : `📝 **Update Member**\n\n👤 User: @${userData.username || "Anonymous"}\n🆔 ID: \`${userId}\`\n💎 Current Tier: ${userData.tier || "Free"}\n`;

    if (userData.membershipExpiresAt) {
      const expiresAt = userData.membershipExpiresAt.toDate();
      const now = new Date();
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining > 0) {
        message += lang === "es"
          ? `⏰ Expira: ${expiresAt.toLocaleDateString()} (${daysRemaining} días)\n\n`
          : `⏰ Expires: ${expiresAt.toLocaleDateString()} (${daysRemaining} days)\n\n`;
      } else {
        message += lang === "es"
          ? `⚠️ Expiró: ${expiresAt.toLocaleDateString()}\n\n`
          : `⚠️ Expired: ${expiresAt.toLocaleDateString()}\n\n`;
      }
    } else if (userData.tier !== "Free") {
      message += lang === "es" ? `⏰ Expira: Nunca (Vitalicio)\n\n` : `⏰ Expires: Never (Lifetime)\n\n`;
    } else {
      message += "\n";
    }

    message += lang === "es"
      ? "¿Qué deseas actualizar?"
      : "What do you want to update?";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "💎 Cambiar Tier" : "💎 Change Tier",
              callback_data: `admin_change_tier_${userId}`,
            },
          ],
          [
            {
              text: lang === "es" ? "📅 Modificar Expiración" : "📅 Modify Expiration",
              callback_data: `admin_modify_expiration_${userId}`,
            },
          ],
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} selected user ${userId} for update`);
  } catch (error) {
    logger.error("Error processing update member user ID:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Extend membership - Start flow
 */
async function startExtendMembership(ctx) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = "admin_extend_userid";

    const message = lang === "es"
      ? "🔄 **Extender Membresía**\n\nEnvía el ID del usuario para extender su membresía.\n\nEsto agregará días adicionales a la fecha de expiración actual."
      : "🔄 **Extend Membership**\n\nSend the user ID to extend their membership.\n\nThis will add additional days to the current expiration date.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} initiated membership extension`);
  } catch (error) {
    logger.error("Error in start extend membership:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Extend membership - Process user ID
 */
async function processExtendUserId(ctx, userIdInput) {
  try {
    const lang = ctx.session.language || "en";
    const userId = userIdInput.trim();

    // Verify user exists
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      await ctx.reply(
        lang === "es"
          ? `❌ Usuario no encontrado: \`${userId}\`\n\nVerifica el ID e intenta de nuevo.`
          : `❌ User not found: \`${userId}\`\n\nPlease verify the ID and try again.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const userData = userDoc.data();

    // Check if user has an active membership
    if (!userData.membershipExpiresAt) {
      await ctx.reply(
        lang === "es"
          ? `⚠️ El usuario no tiene una membresía activa con fecha de expiración.\n\nUsa "Activate Membership" en su lugar.`
          : `⚠️ User doesn't have an active membership with expiration date.\n\nUse "Activate Membership" instead.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Store user ID in session for next step
    ctx.session.extendUserId = userId;
    ctx.session.waitingFor = null;

    const expiresAt = userData.membershipExpiresAt.toDate();
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let message = lang === "es"
      ? `🔄 **Extender Membresía**\n\n👤 Usuario: @${userData.username || "Anonymous"}\n🆔 ID: \`${userId}\`\n💎 Tier: ${userData.tier}\n⏰ Expira: ${expiresAt.toLocaleDateString()} (${daysRemaining} días)\n\n¿Cuántos días deseas agregar?`
      : `🔄 **Extend Membership**\n\n👤 User: @${userData.username || "Anonymous"}\n🆔 ID: \`${userId}\`\n💎 Tier: ${userData.tier}\n⏰ Expires: ${expiresAt.toLocaleDateString()} (${daysRemaining} days)\n\nHow many days do you want to add?`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "+1 semana" : "+1 week",
              callback_data: `admin_extend_days_${userId}_7`,
            },
            {
              text: lang === "es" ? "+1 mes" : "+1 month",
              callback_data: `admin_extend_days_${userId}_30`,
            },
          ],
          [
            {
              text: lang === "es" ? "+4 meses" : "+4 months",
              callback_data: `admin_extend_days_${userId}_120`,
            },
            {
              text: lang === "es" ? "+1 año" : "+1 year",
              callback_data: `admin_extend_days_${userId}_365`,
            },
          ],
          [
            {
              text: lang === "es" ? "💎 Hacer Vitalicio" : "💎 Make Lifetime",
              callback_data: `admin_extend_days_${userId}_999999`,
            },
          ],
          [
            {
              text: lang === "es" ? "✏️ Personalizado" : "✏️ Custom",
              callback_data: `admin_extend_custom_${userId}`,
            },
          ],
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} selected user ${userId} for extension`);
  } catch (error) {
    logger.error("Error processing extend user ID:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute membership extension
 */
async function executeExtendMembership(ctx, userId, daysToAdd) {
  try {
    const lang = ctx.session.language || "en";

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      await ctx.answerCbQuery(
        lang === "es" ? "❌ Usuario no encontrado" : "❌ User not found"
      );
      return;
    }

    const userData = userDoc.data();

    // Check if user has a premium tier (not Free)
    if (!userData.tier || userData.tier === "Free") {
      await ctx.answerCbQuery(
        lang === "es" ? "❌ Sin membresía premium activa" : "❌ No premium membership active"
      );
      return;
    }

    let newExpiration;
    let isLifetime = false;

    // Check if extending to lifetime (999999 or >= 36500 days)
    if (daysToAdd >= 36500) {
      newExpiration = null;
      isLifetime = true;
    } else if (!userData.membershipExpiresAt) {
      // Already lifetime, extending by normal days keeps it lifetime
      newExpiration = null;
      isLifetime = true;
    } else {
      // Calculate new expiration date
      const currentExpiration = userData.membershipExpiresAt.toDate();
      newExpiration = new Date(currentExpiration);
      newExpiration.setDate(newExpiration.getDate() + daysToAdd);
    }

    // Update membership expiration
    await db.collection("users").doc(userId).update({
      membershipExpiresAt: newExpiration,
      membershipIsPremium: true,
      lastActive: new Date(),
    });

    const userLang = userData.language || "en";

    // Notify user
    try {
      let message = userLang === "es"
        ? `🎉 ¡Buenas noticias!\n\nTu membresía **${userData.tier}** ha sido extendida.\n\n`
        : `🎉 Good news!\n\nYour **${userData.tier}** membership has been extended.\n\n`;

      if (isLifetime) {
        message += userLang === "es"
          ? `💎 Tu membresía ahora es **VITALICIA** - ¡Nunca expira!`
          : `💎 Your membership is now **LIFETIME** - Never expires!`;
      } else {
        message += userLang === "es"
          ? `⏰ Nueva fecha de expiración: ${newExpiration.toLocaleDateString()}\n📅 Días agregados: ${daysToAdd}`
          : `⏰ New expiration date: ${newExpiration.toLocaleDateString()}\n📅 Days added: ${daysToAdd}`;
      }

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about extension:`, e.message);
    }

    // Confirm to admin
    await ctx.answerCbQuery(
      isLifetime
        ? (lang === "es" ? `✅ Convertida a Vitalicia` : `✅ Converted to Lifetime`)
        : (lang === "es" ? `✅ Extendida ${daysToAdd} días` : `✅ Extended ${daysToAdd} days`)
    );

    let confirmMessage;
    if (isLifetime) {
      confirmMessage = lang === "es"
        ? `✅ **Membresía Vitalicia**\n\n👤 Usuario: \`${userId}\`\n💎 Tier: **${userData.tier}**\n⏰ Expiración: **Nunca** 💎`
        : `✅ **Lifetime Membership**\n\n👤 User: \`${userId}\`\n💎 Tier: **${userData.tier}**\n⏰ Expiration: **Never** 💎`;
    } else {
      confirmMessage = lang === "es"
        ? `✅ **Membresía Extendida**\n\n👤 Usuario: \`${userId}\`\n💎 Tier: **${userData.tier}**\n📅 Días agregados: ${daysToAdd}\n⏰ Nueva expiración: ${newExpiration.toLocaleDateString()}`
        : `✅ **Membership Extended**\n\n👤 User: \`${userId}\`\n💎 Tier: **${userData.tier}**\n📅 Days added: ${daysToAdd}\n⏰ New expiration: ${newExpiration.toLocaleDateString()}`;
    }

    await ctx.reply(confirmMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔄 Extender Otra" : "🔄 Extend Another",
              callback_data: "admin_extend_membership",
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver al Panel" : "« Back to Panel",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} extended membership for user ${userId} by ${daysToAdd} days`);

    // Clear session
    ctx.session.extendUserId = null;
  } catch (error) {
    logger.error("Error executing extend membership:", error);
    await ctx.answerCbQuery(t("error", ctx.session.language || "en"));
  }
}

/**
 * Custom extension - Ask for days
 */
async function askCustomExtensionDays(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = `admin_extend_custom_days_${userId}`;

    const message = lang === "es"
      ? `✏️ **Extensión Personalizada**\n\nUsuario: \`${userId}\`\n\nEnvía el número de días a agregar (ejemplo: 45):`
      : `✏️ **Custom Extension**\n\nUser: \`${userId}\`\n\nSend the number of days to add (example: 45):`;

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} initiated custom extension for user: ${userId}`);
  } catch (error) {
    logger.error("Error in ask custom extension days:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute custom extension
 */
async function executeCustomExtension(ctx, userId, daysInput) {
  try {
    const lang = ctx.session.language || "en";

    const days = parseInt(daysInput);
    if (isNaN(days) || days <= 0) {
      await ctx.reply(
        lang === "es"
          ? "❌ Cantidad inválida. Envía un número positivo de días."
          : "❌ Invalid amount. Send a positive number of days."
      );
      return;
    }

    await executeExtendMembership(ctx, userId, days);

    ctx.session.waitingFor = null;
  } catch (error) {
    logger.error("Error executing custom extension:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Modify expiration date
 */
async function modifyExpirationDate(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = `admin_modify_expiration_${userId}`;

    const message = lang === "es"
      ? `📅 **Modificar Fecha de Expiración**\n\nUsuario: \`${userId}\`\n\nEnvía la nueva fecha de expiración en formato:\nDD/MM/YYYY\n\nEjemplo: 31/12/2025`
      : `📅 **Modify Expiration Date**\n\nUser: \`${userId}\`\n\nSend the new expiration date in format:\nDD/MM/YYYY\n\nExample: 12/31/2025`;

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} initiated expiration modification for user: ${userId}`);
  } catch (error) {
    logger.error("Error in modify expiration date:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute expiration modification
 */
async function executeModifyExpiration(ctx, userId, dateInput) {
  try {
    const lang = ctx.session.language || "en";

    // Parse date (DD/MM/YYYY)
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateInput.trim().match(dateRegex);

    if (!match) {
      await ctx.reply(
        lang === "es"
          ? "❌ Formato inválido. Usa DD/MM/YYYY (ejemplo: 31/12/2025)"
          : "❌ Invalid format. Use DD/MM/YYYY (example: 12/31/2025)"
      );
      return;
    }

    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // JS months are 0-indexed
    const year = parseInt(match[3]);

    const newExpiration = new Date(year, month, day, 23, 59, 59);

    // Validate date
    if (isNaN(newExpiration.getTime()) || newExpiration < new Date()) {
      await ctx.reply(
        lang === "es"
          ? "❌ Fecha inválida o en el pasado. Envía una fecha futura."
          : "❌ Invalid date or date in the past. Send a future date."
      );
      return;
    }

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      await ctx.reply(
        lang === "es" ? "❌ Usuario no encontrado." : "❌ User not found."
      );
      return;
    }

    const userData = userDoc.data();

    // Update membership expiration
    await db.collection("users").doc(userId).update({
      membershipExpiresAt: newExpiration,
      lastActive: new Date(),
    });

    const userLang = userData.language || "en";

    // Notify user
    try {
      let message = userLang === "es"
        ? `📅 Tu membresía **${userData.tier}** ha sido actualizada.\n\n⏰ Nueva fecha de expiración: ${newExpiration.toLocaleDateString()}`
        : `📅 Your **${userData.tier}** membership has been updated.\n\n⏰ New expiration date: ${newExpiration.toLocaleDateString()}`;

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about expiration modification:`, e.message);
    }

    await ctx.reply(
      lang === "es"
        ? `✅ **Fecha Actualizada**\n\n👤 Usuario: \`${userId}\`\n💎 Tier: **${userData.tier}**\n⏰ Nueva expiración: ${newExpiration.toLocaleDateString()}`
        : `✅ **Date Updated**\n\n👤 User: \`${userId}\`\n💎 Tier: **${userData.tier}**\n⏰ New expiration: ${newExpiration.toLocaleDateString()}`,
      { parse_mode: "Markdown" }
    );

    logger.info(`Admin ${ctx.from.id} modified expiration for user ${userId} to ${newExpiration.toLocaleDateString()}`);

    ctx.session.waitingFor = null;
    ctx.session.updateMemberUserId = null;
  } catch (error) {
    logger.error("Error executing modify expiration:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Plan management - Main menu
 */
async function managePlans(ctx) {
  try {
    await showPlanDashboard(ctx);
    logger.info(`Admin ${ctx.from.id} opened plan management`);
  } catch (error) {
    logger.error('Error in plan management:', error);
    await ctx.reply(t('error', ctx.session.language || 'en'));
  }
}


/**
 * View plan details
 */
async function viewPlanDetails(ctx, planName) {
  try {
    const lang = ctx.session.language || "en";
    const plans = require("../../config/plans");
    const plan = plans[planName.toUpperCase()];

    if (!plan) {
      await ctx.answerCbQuery(lang === "es" ? "Plan no encontrado" : "Plan not found");
      return;
    }

    const icon = (plan && plan.id)
      ? (plan.id === 'diamond-member' ? '🥇' : plan.id === 'crystal-member' ? '🥈' : plan.id === 'pnp-member' ? '💎' : '💎')
      : '💎';
    const tierName = plan.displayName || (planName.charAt(0).toUpperCase() + planName.slice(1));

    let message = lang === "es"
      ? `${icon} **Plan ${tierName}**\n\n`
      : `${icon} **${tierName} Plan**\n\n`;

    message += lang === "es" ? "📋 **Detalles:**\n\n" : "📋 **Details:**\n\n";
    message += `💵 Precio USD: $${plan.price}\n`;
    message += `💵 Precio COP: ${plan.priceInCOP.toLocaleString()}\n`;
    message += `💱 Moneda: ${plan.currency}\n`;
    message += `⏱️ Duración: ${plan.duration} días\n`;

    if (plan.cryptoBonus) {
      message += `💎 Crypto Bonus: ${plan.cryptoBonus}\n`;
    }

    message += `\n📝 **Descripción:**\n${plan.description}\n\n`;

    message += lang === "es" ? "✨ **Características:**\n" : "✨ **Features:**\n";
    plan.features.forEach((feature, index) => {
      message += `${index + 1}. ${feature}\n`;
    });

  // Get subscriber count (match stored tier value)
  const tierField = plan.tier || plan.id || planName.toLowerCase();
  const subscribersCount = await db.collection("users").where("tier", "==", tierField).get();
  message += `\n👥 **${lang === "es" ? "Suscriptores activos" : "Active subscribers"}:** ${subscribersCount.size}\n`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "✏️ Editar" : "✏️ Edit",
              callback_data: `admin_plan_edit_${planName.toLowerCase()}`,
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
              callback_data: "admin_plans",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed ${planName} plan details`);
  } catch (error) {
    logger.error("Error viewing plan details:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Edit plan menu
 */
async function editPlanMenu(ctx, planName) {
  try {
    const lang = ctx.session.language || "en";
    const icon = "💎";
    const tierName = planName.charAt(0).toUpperCase() + planName.slice(1);

    const message = lang === "es"
      ? `${icon} **Editar Plan ${tierName}**\n\n¿Qué deseas modificar?`
      : `${icon} **Edit ${tierName} Plan**\n\nWhat do you want to modify?`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "💵 Precio USD" : "💵 USD Price",
              callback_data: `admin_plan_edit_price_${planName.toLowerCase()}`,
            },
          ],
          [
            {
              text: lang === "es" ? "💵 Precio COP" : "💵 COP Price",
              callback_data: `admin_plan_edit_cop_${planName.toLowerCase()}`,
            },
          ],
          [
            {
              text: lang === "es" ? "⏱️ Duración" : "⏱️ Duration",
              callback_data: `admin_plan_edit_duration_${planName.toLowerCase()}`,
            },
          ],
          [
            {
              text: lang === "es" ? "📝 Descripción" : "📝 Description",
              callback_data: `admin_plan_edit_desc_${planName.toLowerCase()}`,
            },
          ],
          [
            {
              text: lang === "es" ? "✨ Características" : "✨ Features",
              callback_data: `admin_plan_edit_features_${planName.toLowerCase()}`,
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_plans",
            },
          ],
        ].filter(row => row.length > 0),
      },
    });

    logger.info(`Admin ${ctx.from.id} opened edit menu for ${planName}`);
  } catch (error) {
    logger.error("Error in edit plan menu:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Start plan edit flow
 */
async function startPlanEdit(ctx, planName, field) {
  try {
    const lang = ctx.session.language || "en";
    const plans = require("../../config/plans");
    const plan = plans[planName.toUpperCase()];
    const icon = "💎";
    const tierName = planName.charAt(0).toUpperCase() + planName.slice(1);

    ctx.session.waitingFor = `admin_plan_edit_${field}_${planName}`;

    let message = `${icon} **${lang === "es" ? "Editar" : "Edit"} ${tierName}**\n\n`;
    let currentValue = "";

    switch (field) {
      case "price":
        currentValue = `$${plan.price}`;
        message += lang === "es"
          ? `💵 **Precio USD Actual:** ${currentValue}\n\nEnvía el nuevo precio en USD (ejemplo: 20):`
          : `💵 **Current USD Price:** ${currentValue}\n\nSend the new price in USD (example: 20):`;
        break;
      case "cop":
        currentValue = `${plan.priceInCOP.toLocaleString()} COP`;
        message += lang === "es"
          ? `💵 **Precio COP Actual:** ${currentValue}\n\nEnvía el nuevo precio en COP (ejemplo: 80000):`
          : `💵 **Current COP Price:** ${currentValue}\n\nSend the new price in COP (example: 80000):`;
        break;
      case "duration":
        currentValue = `${plan.duration} días`;
        message += lang === "es"
          ? `⏱️ **Duración Actual:** ${currentValue}\n\nEnvía la nueva duración en días (ejemplo: 30):`
          : `⏱️ **Current Duration:** ${currentValue}\n\nSend the new duration in days (example: 30):`;
        break;
      case "crypto":
        currentValue = plan.cryptoBonus || "N/A";
        message += lang === "es"
          ? `💎 **Crypto Bonus Actual:** ${currentValue}\n\nEnvía el nuevo bonus (ejemplo: 10 USDT):`
          : `💎 **Current Crypto Bonus:** ${currentValue}\n\nSend the new bonus (example: 10 USDT):`;
        break;
      case "desc":
        currentValue = plan.description;
        message += lang === "es"
          ? `📝 **Descripción Actual:**\n${currentValue}\n\nEnvía la nueva descripción:`
          : `📝 **Current Description:**\n${currentValue}\n\nSend the new description:`;
        break;
      case "features":
        currentValue = plan.features.join("\n• ");
        message += lang === "es"
          ? `✨ **Características Actuales:**\n• ${currentValue}\n\nEnvía las nuevas características (una por línea):`
          : `✨ **Current Features:**\n• ${currentValue}\n\nSend the new features (one per line):`;
        break;
    }

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_plans",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} started editing ${field} for ${planName}`);
  } catch (error) {
    logger.error("Error starting plan edit:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute plan edit
 */
async function executePlanEdit(ctx, planName, field, newValue) {
  try {
    const lang = ctx.session.language || "en";
    const planService = require("../../services/planService");

    // Find plan by tier name
    const plan = await planService.getPlanBySlug(planName);

    if (!plan) {
      await ctx.reply(lang === "es" ? "❌ Plan no encontrado." : "❌ Plan not found.");
      return;
    }

    // Prepare update data based on field
    let updateData = {};
    let displayValue = newValue;
    let isValid = true;

    switch (field) {
      case "price":
        const price = parseFloat(newValue);
        if (isNaN(price) || price <= 0) {
          await ctx.reply(lang === "es" ? "❌ Precio inválido." : "❌ Invalid price.");
          return;
        }
        updateData.price = price;
        displayValue = `$${price}`;
        break;

      case "cop":
        const copPrice = parseInt(newValue.replace(/[^\d]/g, ""));
        if (isNaN(copPrice) || copPrice <= 0) {
          await ctx.reply(lang === "es" ? "❌ Precio inválido." : "❌ Invalid price.");
          return;
        }
        updateData.priceInCOP = copPrice;
        displayValue = `${copPrice.toLocaleString()} COP`;
        break;

      case "duration":
        const duration = parseInt(newValue);
        if (isNaN(duration) || duration <= 0) {
          await ctx.reply(lang === "es" ? "❌ Duración inválida." : "❌ Invalid duration.");
          return;
        }
        updateData.duration = duration;
        updateData.durationDays = duration;
        displayValue = `${duration} ${lang === "es" ? "días" : "days"}`;
        break;

      case "crypto":
        updateData.cryptoBonus = newValue;
        break;

      case "desc":
        updateData.description = newValue;
        break;

      case "features":
        const features = newValue.split("\n").map(f => f.trim()).filter(f => f.length > 0);
        if (features.length === 0) {
          await ctx.reply(lang === "es" ? "❌ Características inválidas." : "❌ Invalid features.");
          return;
        }
        updateData.features = features;
        displayValue = features.join(", ");
        break;

      default:
        isValid = false;
        break;
    }

    if (isValid && Object.keys(updateData).length > 0) {
      // Update plan in Firestore
      await planService.updatePlan(plan.id, updateData);

      const icon = (plan && plan.id)
        ? (plan.id === 'diamond-member' ? '🥇' : plan.id === 'crystal-member' ? '🥈' : plan.id === 'pnp-member' ? '💎' : '💎')
        : '💎';
      const tierName = plan.displayName || (planName.charAt(0).toUpperCase() + planName.slice(1));

      const fieldNames = {
        price: lang === "es" ? "Precio USD" : "USD Price",
        cop: lang === "es" ? "Precio COP" : "COP Price",
        duration: lang === "es" ? "Duración" : "Duration",
        crypto: "Crypto Bonus",
        desc: lang === "es" ? "Descripción" : "Description",
        features: lang === "es" ? "Características" : "Features"
      };

      const message = lang === "es"
        ? `✅ **Plan ${tierName} Actualizado**\n\n${icon} **${fieldNames[field]}** actualizado a:\n${displayValue}\n\n✨ Los cambios han sido guardados en Firestore.`
        : `✅ **${tierName} Plan Updated**\n\n${icon} **${fieldNames[field]}** updated to:\n${displayValue}\n\n✨ Changes have been saved to Firestore.`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "✏️ Editar Otro Campo" : "✏️ Edit Another Field",
                callback_data: `admin_plan_edit_${planName.toLowerCase()}`,
              },
            ],
            [
              {
                text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
                callback_data: "admin_plans",
              },
            ],
          ],
        },
      });

      logger.info(`Admin ${ctx.from.id} updated ${field} for ${planName} (${plan.id}) to: ${displayValue}`);
    }

    ctx.session.waitingFor = null;
  } catch (error) {
    logger.error("Error executing plan edit:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Plan statistics
 */
async function showPlanStats(ctx) {
  try {
    const lang = ctx.session.language || "en";
    const plans = require("../../config/plans");

    const loadingMsg = await ctx.reply(
      lang === "es" ? "📊 Cargando estadísticas..." : "📊 Loading statistics..."
    );

    // Get all users with tiers
    const usersSnapshot = await db.collection("users").get();

    let premiumActive = 0;
    let premiumExpired = 0;

    const now = new Date();

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const tier = userData.tier;

      if (tier && tier !== "Free") {
        const isActive = !userData.membershipExpiresAt || userData.membershipExpiresAt.toDate() > now;

        if (isActive) {
          premiumActive++;
        } else {
          premiumExpired++;
        }
      }
    });

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    let message = lang === "es"
      ? "📊 **Estadísticas de Planes**\n\n"
      : "📊 **Plan Statistics**\n\n";

    // Premium Stats
    message += "💎 **Premium Members**\n";
    message += `• ${lang === "es" ? "Activos" : "Active"}: ${premiumActive}\n`;
    message += `• ${lang === "es" ? "Expirados" : "Expired"}: ${premiumExpired}\n`;
    message += `• ${lang === "es" ? "Total histórico" : "Total historical"}: ${premiumActive + premiumExpired}\n\n`;

    // Totals
    const conversionRate = usersSnapshot.size > 0
      ? ((premiumActive / usersSnapshot.size) * 100).toFixed(2)
      : 0;

    message += lang === "es" ? "💰 **Totales**\n" : "💰 **Totals**\n";
    message += `• ${lang === "es" ? "Suscriptores activos" : "Active subscribers"}: ${premiumActive}\n`;
    message += `• ${lang === "es" ? "Tasa de conversión" : "Conversion rate"}: ${conversionRate}%\n`;
    message += `\n${lang === "es" ? "ℹ️ Para ingresos detallados, usar los reportes de Firestore o ePayco" : "ℹ️ For detailed revenue, use Firestore or ePayco reports"}`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
              callback_data: "admin_plan_stats",
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
              callback_data: "admin_plans",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed plan statistics`);
  } catch (error) {
    logger.error("Error showing plan stats:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Menu configuration - Main menu
 */
async function configureMenus(ctx) {
  try {
    const lang = ctx.session.language || "en";
    const { menus } = require("../../config/menus");

    let message = lang === "es"
      ? "📋 **Configuración de Menús**\n\n"
      : "📋 **Menu Configuration**\n\n";

    message += lang === "es"
      ? "📝 **Menús Disponibles:**\n\n"
      : "📝 **Available Menus:**\n\n";

    // Count buttons in each menu
    const mainButtonsEn = menus.main?.en?.keyboard?.flat().length || 0;
    const mainButtonsEs = menus.main?.es?.keyboard?.flat().length || 0;
    const profileButtons = menus.profile?.inline_keyboard?.flat().length || 0;
    const adminButtons = menus.admin?.inline_keyboard?.flat().length || 0;
    const subscriptionButtons = menus.subscription?.inline_keyboard?.flat().length || 0;

    message += `🏠 **Main Menu**\n`;
    message += `• EN: ${mainButtonsEn} ${lang === "es" ? "botones" : "buttons"}\n`;
    message += `• ES: ${mainButtonsEs} ${lang === "es" ? "botones" : "buttons"}\n`;
    message += `• Type: Keyboard\n\n`;

    message += `👤 **Profile Menu**\n`;
    message += `• ${profileButtons} ${lang === "es" ? "botones" : "buttons"}\n`;
    message += `• Type: Inline\n\n`;

    message += `⚙️ **Admin Menu**\n`;
    message += `• ${adminButtons} ${lang === "es" ? "botones" : "buttons"}\n`;
    message += `• Type: Inline\n\n`;

    message += `💎 **Subscription Menu**\n`;
    message += `• ${subscriptionButtons} ${lang === "es" ? "botones" : "buttons"}\n`;
    message += `• Type: Inline\n\n`;

    message += lang === "es"
      ? "Selecciona un menú para ver detalles:"
      : "Select a menu to view details:";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🏠 Ver Main" : "🏠 View Main",
              callback_data: "admin_menu_view_main",
            },
          ],
          [
            {
              text: lang === "es" ? "👤 Ver Profile" : "👤 View Profile",
              callback_data: "admin_menu_view_profile",
            },
          ],
          [
            {
              text: lang === "es" ? "⚙️ Ver Admin" : "⚙️ View Admin",
              callback_data: "admin_menu_view_admin",
            },
          ],
          [
            {
              text: lang === "es" ? "💎 Ver Subscription" : "💎 View Subscription",
              callback_data: "admin_menu_view_subscription",
            },
          ],
          [
            {
              text: lang === "es" ? "🔄 Reload Menus" : "🔄 Reload Menus",
              callback_data: "admin_menu_reload",
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed menu configuration`);
  } catch (error) {
    logger.error("Error in menu configuration:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * View menu details
 */
async function viewMenuDetails(ctx, menuName) {
  try {
    const lang = ctx.session.language || "en";

    // Clear cache and reload menus
    delete require.cache[require.resolve("../../config/menus")];
    const { menus } = require("../../config/menus");
    const menu = menus[menuName];

    if (!menu) {
      await ctx.answerCbQuery(lang === "es" ? "Menú no encontrado" : "Menu not found");
      return;
    }

    const menuIcons = {
      main: "🏠",
      profile: "👤",
      admin: "⚙️",
      subscription: "💎"
    };

    const icon = menuIcons[menuName] || "📋";
    const displayName = menuName.charAt(0).toUpperCase() + menuName.slice(1);

    let message = lang === "es"
      ? `${icon} **Menú ${displayName}**\n\n`
      : `${icon} **${displayName} Menu**\n\n`;

    // Check menu type
    const isKeyboardMenu = menu.en || menu.es;
    const isInlineMenu = menu.inline_keyboard;

    if (isKeyboardMenu) {
      // Keyboard menu (Main)
      message += lang === "es" ? "📱 **Tipo:** Teclado\n\n" : "📱 **Type:** Keyboard\n\n";

      if (menu.en) {
        message += "🇬🇧 **English:**\n";
        menu.en.keyboard.forEach((row, idx) => {
          message += `Row ${idx + 1}: ${row.join(" | ")}\n`;
        });
        message += "\n";
      }

      if (menu.es) {
        message += "🇪🇸 **Español:**\n";
        menu.es.keyboard.forEach((row, idx) => {
          message += `Fila ${idx + 1}: ${row.join(" | ")}\n`;
        });
        message += "\n";
      }
    } else if (isInlineMenu) {
      // Inline menu
      message += lang === "es" ? "⌨️ **Tipo:** Inline\n\n" : "⌨️ **Type:** Inline\n\n";
      message += lang === "es" ? "**Botones:**\n\n" : "**Buttons:**\n\n";

      menu.inline_keyboard.forEach((row, rowIdx) => {
        message += `${lang === "es" ? "Fila" : "Row"} ${rowIdx + 1}:\n`;
        row.forEach((button, btnIdx) => {
          message += `  ${btnIdx + 1}. ${button.text}\n`;
          if (button.callback_data) {
            message += `     → \`${button.callback_data}\`\n`;
          }
          if (button.url) {
            message += `     → URL: ${button.url}\n`;
          }
          if (button.web_app) {
            message += `     → WebApp: ${button.web_app.url}\n`;
          }
        });
        message += "\n";
      });
    }

    message += lang === "es"
      ? "ℹ️ Para editar, modifica `src/config/menus.js`"
      : "ℹ️ To edit, modify `src/config/menus.js`";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "📊 Analizar Estructura" : "📊 Analyze Structure",
              callback_data: `admin_menu_analyze_${menuName}`,
            },
          ],
          [
            {
              text: lang === "es" ? "🔍 Test Menu" : "🔍 Test Menu",
              callback_data: `admin_menu_test_${menuName}`,
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver a Menús" : "« Back to Menus",
              callback_data: "admin_menus",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} viewed ${menuName} menu details`);
  } catch (error) {
    logger.error("Error viewing menu details:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Analyze menu structure
 */
async function analyzeMenuStructure(ctx, menuName) {
  try {
    const lang = ctx.session.language || "en";

    delete require.cache[require.resolve("../../config/menus")];
    const { menus } = require("../../config/menus");
    const menu = menus[menuName];

    if (!menu) {
      await ctx.answerCbQuery(lang === "es" ? "Menú no encontrado" : "Menu not found");
      return;
    }

    const icon = { main: "🏠", profile: "👤", admin: "⚙️", subscription: "💎" }[menuName] || "📋";
    const displayName = menuName.charAt(0).toUpperCase() + menuName.slice(1);

    let message = lang === "es"
      ? `📊 **Análisis: ${displayName} Menu**\n\n`
      : `📊 **Analysis: ${displayName} Menu**\n\n`;

    // Analyze structure
    const isKeyboardMenu = menu.en || menu.es;
    const isInlineMenu = menu.inline_keyboard;

    if (isKeyboardMenu) {
      const enButtons = menu.en?.keyboard?.flat().length || 0;
      const esButtons = menu.es?.keyboard?.flat().length || 0;
      const enRows = menu.en?.keyboard?.length || 0;
      const esRows = menu.es?.keyboard?.length || 0;

      message += "📱 **Keyboard Menu Analysis**\n\n";

      message += "🇬🇧 **English:**\n";
      message += `• ${lang === "es" ? "Filas" : "Rows"}: ${enRows}\n`;
      message += `• ${lang === "es" ? "Botones totales" : "Total buttons"}: ${enButtons}\n`;
      message += `• ${lang === "es" ? "Botones por fila" : "Buttons per row"}: ${enRows > 0 ? (enButtons / enRows).toFixed(1) : 0}\n\n`;

      message += "🇪🇸 **Español:**\n";
      message += `• ${lang === "es" ? "Filas" : "Rows"}: ${esRows}\n`;
      message += `• ${lang === "es" ? "Botones totales" : "Total buttons"}: ${esButtons}\n`;
      message += `• ${lang === "es" ? "Botones por fila" : "Buttons per row"}: ${esRows > 0 ? (esButtons / esRows).toFixed(1) : 0}\n\n`;

      // Validation
      message += lang === "es" ? "✅ **Validación:**\n" : "✅ **Validation:**\n";
      if (enButtons === esButtons) {
        message += `• ${lang === "es" ? "Botones coinciden en ambos idiomas ✓" : "Buttons match in both languages ✓"}\n`;
      } else {
        message += `• ${lang === "es" ? "⚠️ Discrepancia de botones" : "⚠️ Button count mismatch"}\n`;
      }

      if (menu.en?.resize_keyboard && menu.es?.resize_keyboard) {
        message += `• ${lang === "es" ? "Resize habilitado ✓" : "Resize enabled ✓"}\n`;
      }

    } else if (isInlineMenu) {
      const totalButtons = menu.inline_keyboard.flat().length;
      const totalRows = menu.inline_keyboard.length;
      const callbackButtons = menu.inline_keyboard.flat().filter(b => b.callback_data).length;
      const urlButtons = menu.inline_keyboard.flat().filter(b => b.url).length;
      const webAppButtons = menu.inline_keyboard.flat().filter(b => b.web_app).length;

      message += "⌨️ **Inline Menu Analysis**\n\n";
      message += `• ${lang === "es" ? "Filas" : "Rows"}: ${totalRows}\n`;
      message += `• ${lang === "es" ? "Botones totales" : "Total buttons"}: ${totalButtons}\n`;
      message += `• ${lang === "es" ? "Botones por fila" : "Buttons per row"}: ${(totalButtons / totalRows).toFixed(1)}\n\n`;

      message += lang === "es" ? "**Tipos de Botones:**\n" : "**Button Types:**\n";
      message += `• Callback: ${callbackButtons}\n`;
      message += `• URL: ${urlButtons}\n`;
      message += `• WebApp: ${webAppButtons}\n\n`;

      // List all callback_data
      message += lang === "es" ? "**Callbacks Registrados:**\n" : "**Registered Callbacks:**\n";
      const callbacks = new Set();
      menu.inline_keyboard.flat().forEach(button => {
        if (button.callback_data) {
          callbacks.add(button.callback_data);
        }
      });
      callbacks.forEach(cb => {
        message += `• \`${cb}\`\n`;
      });
    }

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔍 Test Menu" : "🔍 Test Menu",
              callback_data: `admin_menu_test_${menuName}`,
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: `admin_menu_view_${menuName}`,
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} analyzed ${menuName} menu structure`);
  } catch (error) {
    logger.error("Error analyzing menu structure:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Test menu display
 */
async function testMenu(ctx, menuName) {
  try {
    const lang = ctx.session.language || "en";

    delete require.cache[require.resolve("../../config/menus")];
    const { getMenu } = require("../../config/menus");

    const message = lang === "es"
      ? `🔍 **Test: ${menuName.charAt(0).toUpperCase() + menuName.slice(1)} Menu**\n\nMenú de prueba mostrado abajo:`
      : `🔍 **Test: ${menuName.charAt(0).toUpperCase() + menuName.slice(1)} Menu**\n\nTest menu displayed below:`;

    const menu = getMenu(menuName, lang);

    if (!menu) {
      await ctx.answerCbQuery(lang === "es" ? "Menú no encontrado" : "Menu not found");
      return;
    }

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: menu,
    });

    await ctx.reply(
      lang === "es"
        ? "✅ Menú de prueba enviado. Verifica que todos los botones se muestren correctamente.\n\nNota: Los callbacks pueden no funcionar en modo de prueba."
        : "✅ Test menu sent. Verify that all buttons display correctly.\n\nNote: Callbacks may not work in test mode.",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Volver a Menús" : "« Back to Menus",
                callback_data: "admin_menus",
              },
            ],
          ],
        },
      }
    );

    logger.info(`Admin ${ctx.from.id} tested ${menuName} menu`);
  } catch (error) {
    logger.error("Error testing menu:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Reload menus from file
 */
async function reloadMenus(ctx) {
  try {
    const lang = ctx.session.language || "en";

    // Clear cache
    delete require.cache[require.resolve("../../config/menus")];

    // Reload
    require("../../config/menus");

    await ctx.answerCbQuery(
      lang === "es" ? "✅ Menús recargados" : "✅ Menus reloaded"
    );

    const message = lang === "es"
      ? "🔄 **Menús Recargados**\n\nLos menús han sido recargados desde el archivo de configuración.\n\nTodos los cambios realizados en `menus.js` están ahora activos."
      : "🔄 **Menus Reloaded**\n\nMenus have been reloaded from the configuration file.\n\nAll changes made to `menus.js` are now active.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Volver a Menús" : "« Back to Menus",
              callback_data: "admin_menus",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} reloaded menus`);
  } catch (error) {
    logger.error("Error reloading menus:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle broadcast media upload (Step 3)
 */
async function handleBroadcastMedia(ctx, mediaType) {
  try {
    const lang = ctx.session.language || "en";
    const wizard = ctx.session.broadcastWizard;

    if (!wizard) {
      await ctx.reply(lang === "es" ? "Error: Sesión expirada" : "Error: Session expired");
      return;
    }

    let fileId;
    switch (mediaType) {
      case "photo":
        fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        break;
      case "video":
        fileId = ctx.message.video.file_id;
        break;
      case "document":
        fileId = ctx.message.document.file_id;
        break;
    }

    wizard.media = {
      type: mediaType,
      file_id: fileId
    };
    wizard.step = 4;
    ctx.session.waitingFor = "broadcast_text";

    const message = lang === "es"
      ? "📢 **Asistente de Mensaje Masivo**\n\n**Paso 4 de 5:** Escribe el mensaje de texto que quieres enviar:\n\n(Este será el caption del archivo multimedia)"
      : "📢 **Broadcast Wizard**\n\n**Step 4 of 5:** Type the text message you want to send:\n\n(This will be the caption for the media)";

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} uploaded ${mediaType} for broadcast`);
  } catch (error) {
    logger.error("Error handling broadcast media:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle broadcast buttons text (Step 5)
 */
async function handleBroadcastButtons(ctx, buttonText) {
  try {
    const lang = ctx.session.language || "en";
    const wizard = ctx.session.broadcastWizard;

    if (!wizard) {
      await ctx.reply(lang === "es" ? "Error: Sesión expirada" : "Error: Session expired");
      return;
    }

    // Parse button text format: "Text | URL\nText | URL"
    const lines = buttonText.trim().split('\n');
    const buttons = [];

    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length === 2) {
        const [text, url] = parts;
        if (text && url && url.startsWith('http')) {
          buttons.push([{ text, url }]);
        }
      }
    }

    if (buttons.length === 0) {
      const errorMsg = lang === "es"
        ? "❌ Formato inválido. Usa:\n```\nTexto | URL\nTexto | URL\n```\n\nIntenta de nuevo o presiona 'Omitir'."
        : "❌ Invalid format. Use:\n```\nText | URL\nText | URL\n```\n\nTry again or press 'Skip'.";

      await ctx.reply(errorMsg, { parse_mode: "Markdown" });
      return;
    }

    wizard.buttons = buttons;
    ctx.session.waitingFor = null;

    await showBroadcastConfirmation(ctx);

    logger.info(`Admin ${ctx.from.id} added ${buttons.length} button(s) for broadcast`);
  } catch (error) {
    logger.error("Error handling broadcast buttons:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle admin callback queries
 */
async function handleAdminCallback(ctx) {
  const action = ctx.callbackQuery.data;
  const lang = ctx.session.language || "en";

  try {
    // Don't answer callback query yet for broadcast wizard - it handles it internally
    if (!action.startsWith("bcast_")) {
      await ctx.answerCbQuery();
    }

    if (action === "admin_stats") {
      await showStats(ctx);
    } else if (action === "admin_broadcast") {
      await broadcastMessage(ctx);
    } else if (action.startsWith("bcast_")) {
      // Handle all broadcast wizard actions
      if (action === "bcast_save_scheduled") {
        await saveScheduledBroadcast(ctx);
      } else if (action.startsWith("bcast_confirm_")) {
        await handleBroadcastWizard(ctx, action);
      } else if (ctx.session.broadcastWizard && ctx.session.broadcastWizard.scheduledForLater) {
        // For scheduled broadcasts, show scheduled confirmation instead of executing
        if (action === "bcast_confirm_send" || action === "bcast_buttons_skip") {
          await showScheduledBroadcastConfirmation(ctx);
        } else {
          await handleBroadcastWizard(ctx, action);
        }
      } else {
        // Regular broadcast
        await handleBroadcastWizard(ctx, action);
      }
    } else if (action === "admin_users") {
      await listUsers(ctx);
    } else if (action === "admin_list_all") {
      await listAllUsers(ctx, 1);
    } else if (action.startsWith("admin_list_page_")) {
      const page = parseInt(action.split("_").pop());
      await listAllUsers(ctx, page);
    } else if (action === "admin_search_user") {
      await searchUser(ctx);
    } else if (action === "admin_back") {
      await adminPanel(ctx);
    } else if (action.startsWith("admin_edit_tier_")) {
      const userId = action.replace("admin_edit_tier_", "");
      await editUserTier(ctx, userId);
    } else if (action.startsWith("admin_set_tier_")) {
      const parts = action.replace("admin_set_tier_", "").split("_");
      const userId = parts[0];
      const tier = parts[1];
      const durationDays = parseInt(parts[2]) || 30;
      await setUserTier(ctx, userId, tier, durationDays);
    } else if (action.startsWith("admin_user_")) {
      const userId = action.replace("admin_user_", "");
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        await showUserDetails(ctx, userId, userDoc.data());
      }
    } else if (action === "admin_plans") {
      await managePlans(ctx);
    } else if (action === "admin_menus") {
      await configureMenus(ctx);
    } else if (action === "admin_expiring") {
      await showExpiringMemberships(ctx);
    } else if (action === "admin_expire_check") {
      await runExpirationCheck(ctx);
    } else if (action.startsWith("admin_give_xp_")) {
      const userId = action.replace("admin_give_xp_", "");
      await giveXP(ctx, userId);
    } else if (action.startsWith("admin_message_")) {
      const userId = action.replace("admin_message_", "");
      await messageUser(ctx, userId);
    } else if (action.startsWith("admin_ban_")) {
      const userId = action.replace("admin_ban_", "");
      await banUser(ctx, userId);
    } else if (action.startsWith("admin_confirm_ban_")) {
      const userId = action.replace("admin_confirm_ban_", "");
      await executeBanUser(ctx, userId);
    } else if (action.startsWith("admin_unban_")) {
      const userId = action.replace("admin_unban_", "");
      await unbanUser(ctx, userId);
    } else if (action === "admin_list_premium") {
      await listPremiumUsers(ctx);
    } else if (action === "admin_list_new") {
      await listNewUsers(ctx);
    } else if (action === "admin_activate_membership") {
      await startMembershipActivation(ctx);
    } else if (action.startsWith("admin_quick_activate_")) {
      const parts = action.replace("admin_quick_activate_", "").split("_");
      const userId = parts[0];
      const tier = parts[1];
      const durationDays = parseInt(parts[2]) || 30;
      await executeQuickActivation(ctx, userId, tier, durationDays);
    } else if (action === "admin_update_member") {
      await startUpdateMember(ctx);
    } else if (action.startsWith("admin_change_tier_")) {
      const userId = action.replace("admin_change_tier_", "");
      await editUserTier(ctx, userId);
    } else if (action.startsWith("admin_modify_expiration_")) {
      const userId = action.replace("admin_modify_expiration_", "");
      await modifyExpirationDate(ctx, userId);
    } else if (action === "admin_extend_membership") {
      await startExtendMembership(ctx);
    } else if (action.startsWith("admin_extend_days_")) {
      const parts = action.replace("admin_extend_days_", "").split("_");
      const userId = parts[0];
      const days = parseInt(parts[1]);
      await executeExtendMembership(ctx, userId, days);
    } else if (action.startsWith("admin_extend_custom_")) {
      const userId = action.replace("admin_extend_custom_", "");
      await askCustomExtensionDays(ctx, userId);
    } else if (action.startsWith("admin_plan_view_")) {
      const planName = action.replace("admin_plan_view_", "");
      await viewPlanDetails(ctx, planName);
    } else if (action.startsWith("admin_plan_edit_price_")) {
      const planName = action.replace("admin_plan_edit_price_", "");
      await startPlanEdit(ctx, planName, "price");
    } else if (action.startsWith("admin_plan_edit_cop_")) {
      const planName = action.replace("admin_plan_edit_cop_", "");
      await startPlanEdit(ctx, planName, "cop");
    } else if (action.startsWith("admin_plan_edit_duration_")) {
      const planName = action.replace("admin_plan_edit_duration_", "");
      await startPlanEdit(ctx, planName, "duration");
    } else if (action.startsWith("admin_plan_edit_crypto_")) {
      const planName = action.replace("admin_plan_edit_crypto_", "");
      await startPlanEdit(ctx, planName, "crypto");
    } else if (action.startsWith("admin_plan_edit_desc_")) {
      const planName = action.replace("admin_plan_edit_desc_", "");
      await startPlanEdit(ctx, planName, "desc");
    } else if (action.startsWith("admin_plan_edit_features_")) {
      const planName = action.replace("admin_plan_edit_features_", "");
      await startPlanEdit(ctx, planName, "features");
    } else if (action.startsWith("admin_plan_edit_") && !action.includes("_price_") && !action.includes("_cop_") && !action.includes("_duration_") && !action.includes("_crypto_") && !action.includes("_desc_") && !action.includes("_features_")) {
      const planName = action.replace("admin_plan_edit_", "");
      await editPlanMenu(ctx, planName);
    } else if (action === "admin_plan_stats") {
      await showPlanStats(ctx);
    } else if (action.startsWith("admin_menu_view_")) {
      const menuName = action.replace("admin_menu_view_", "");
      await viewMenuDetails(ctx, menuName);
    } else if (action.startsWith("admin_menu_analyze_")) {
      const menuName = action.replace("admin_menu_analyze_", "");
      await analyzeMenuStructure(ctx, menuName);
    } else if (action.startsWith("admin_menu_test_")) {
      const menuName = action.replace("admin_menu_test_", "");
      await testMenu(ctx, menuName);
    } else if (action === "admin_menu_reload") {
      await reloadMenus(ctx);
    } else if (action === "admin_scheduled_broadcasts") {
      await showScheduledBroadcasts(ctx);
    } else if (action.startsWith("admin_schedule_broadcast_")) {
      await startScheduleBroadcast(ctx);
    } else if (action.startsWith("admin_cancel_broadcast_")) {
      const broadcastId = action.replace("admin_cancel_broadcast_", "");
      await executeCancelBroadcast(ctx, broadcastId);
    }
  } catch (error) {
    logger.error("Error handling admin callback:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Show all scheduled broadcasts
 */
async function showScheduledBroadcasts(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const loadingMsg = await ctx.reply(
      lang === "es" ? "📅 Cargando transmisiones programadas..." : "📅 Loading scheduled broadcasts..."
    );

    const broadcasts = await getScheduledBroadcasts();
    const count = broadcasts.length;

    try {
      await ctx.deleteMessage(loadingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    if (broadcasts.length === 0) {
      await ctx.reply(
        lang === "es"
          ? `📅 **Transmisiones Programadas**\n\nNo hay transmisiones programadas.\n\n✨ Puedes programar hasta ${MAX_SCHEDULED_BROADCASTS} transmisiones.`
          : `📅 **Scheduled Broadcasts**\n\nNo scheduled broadcasts.\n\n✨ You can schedule up to ${MAX_SCHEDULED_BROADCASTS} broadcasts.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "📢 Nueva transmisión programada" : "📢 Schedule Broadcast",
                  callback_data: "admin_schedule_broadcast_new"
                }
              ],
              [
                {
                  text: lang === "es" ? "« Volver" : "« Back",
                  callback_data: "admin_back"
                }
              ]
            ]
          }
        }
      );
      return;
    }

    let message = lang === "es"
      ? `📅 **Transmisiones Programadas** (${count}/${MAX_SCHEDULED_BROADCASTS})\n\n`
      : `📅 **Scheduled Broadcasts** (${count}/${MAX_SCHEDULED_BROADCASTS})\n\n`;

    broadcasts.forEach((broadcast, index) => {
      const scheduled = new Date(broadcast.scheduledTime);
      const now = new Date();
      const timeDiff = scheduled - now;
      const hoursRemaining = Math.round(timeDiff / (1000 * 60 * 60));
      const minutesRemaining = Math.round((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      const langLabel = {
        all: "🌐",
        en: "🇺🇸",
        es: "🇪🇸"
      }[broadcast.targetLanguage] || "🌍";

      const statusLabel = {
        all: "👥",
        subscribers: "💎",
        free: "🆓",
        churned: "⏰"
      }[broadcast.targetStatus] || "•";

      const timeStr = scheduled.toLocaleString();
      const timeLeftStr = hoursRemaining > 0
        ? `${hoursRemaining}h ${minutesRemaining}m`
        : `${minutesRemaining}m`;

      message += `${index + 1}. ${langLabel} ${statusLabel} \`${broadcast.id.substring(0, 8)}\`\n`;
      message += `   ${lang === "es" ? "Programada:" : "Scheduled:"} ${timeStr}\n`;
      message += `   ${lang === "es" ? "En:" : "In:"} ${timeLeftStr}\n`;
      message += `   ${broadcast.text.substring(0, 40)}${broadcast.text.length > 40 ? "..." : ""}\n\n`;
    });

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "📢 Nueva transmisión programada" : "📢 Schedule Broadcast",
            callback_data: "admin_schedule_broadcast_new"
          }
        ],
        [
          {
            text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
            callback_data: "admin_scheduled_broadcasts"
          },
          {
            text: lang === "es" ? "« Volver" : "« Back",
            callback_data: "admin_back"
          }
        ]
      ]
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });

    logger.info(`Admin ${ctx.from.id} viewed scheduled broadcasts`);
  } catch (error) {
    logger.error("Error showing scheduled broadcasts:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Start scheduled broadcast creation
 */
async function startScheduleBroadcast(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const canSchedule = await canScheduleBroadcast();
    if (!canSchedule) {
      await ctx.reply(
        lang === "es"
          ? `❌ No se puede programar más transmisiones. Límite de ${MAX_SCHEDULED_BROADCASTS} alcanzado.`
          : `❌ Cannot schedule more broadcasts. Limit of ${MAX_SCHEDULED_BROADCASTS} reached.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "« Volver" : "« Back",
                  callback_data: "admin_scheduled_broadcasts"
                }
              ]
            ]
          }
        }
      );
      return;
    }

    // Initialize broadcast wizard for scheduling
    ctx.session.broadcastWizard = {
      step: 1,
      targetLanguage: null,
      targetStatus: null,
      media: null,
      text: null,
      buttons: null,
      scheduledForLater: true,
      scheduledTime: null
    };

    ctx.session.waitingFor = "broadcast_schedule_date";

    const message = lang === "es"
      ? "📅 **Programar Transmisión**\n\n🗓️ Envía la fecha y hora de la transmisión\n\nFormato: DD/MM/YYYY HH:MM\nEjemplo: 25/12/2024 14:30\n\n💡 La hora está en tu zona horaria local."
      : "📅 **Schedule Broadcast**\n\n🗓️ Send the date and time for the broadcast\n\nFormat: DD/MM/YYYY HH:MM\nExample: 12/25/2024 14:30\n\n💡 Time is in your local timezone.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
              callback_data: "admin_scheduled_broadcasts"
            }
          ]
        ]
      }
    });
  } catch (error) {
    logger.error("Error starting schedule broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle scheduled broadcast date input
 */
async function handleScheduleBroadcastDate(ctx, dateStr) {
  try {
    const lang = ctx.session.language || "en";

    // Parse date format: DD/MM/YYYY HH:MM
    const parts = dateStr.trim().split(/[\s/:-]+/);

    if (parts.length !== 5) {
      await ctx.reply(
        lang === "es"
          ? "❌ Formato inválido. Usa: DD/MM/YYYY HH:MM"
          : "❌ Invalid format. Use: DD/MM/YYYY HH:MM"
      );
      return;
    }

    const [day, month, year, hour, minute] = parts.map(Number);

    // Validate date
    const scheduledTime = new Date(year, month - 1, day, hour, minute);

    if (isNaN(scheduledTime.getTime())) {
      await ctx.reply(
        lang === "es"
          ? "❌ Fecha inválida. Intenta nuevamente."
          : "❌ Invalid date. Try again."
      );
      return;
    }

    if (scheduledTime <= new Date()) {
      await ctx.reply(
        lang === "es"
          ? "❌ La fecha debe estar en el futuro."
          : "❌ Date must be in the future."
      );
      return;
    }

    // Store scheduled time
    ctx.session.broadcastWizard.scheduledTime = scheduledTime;
    ctx.session.broadcastWizard.step = 1;
    ctx.session.waitingFor = null;

    const formattedTime = scheduledTime.toLocaleString();
    await ctx.reply(
      lang === "es"
        ? `✅ Transmisión programada para: ${formattedTime}\n\nAhora configura el contenido de la transmisión.`
        : `✅ Broadcast scheduled for: ${formattedTime}\n\nNow configure the broadcast content.`
    );

    // Start regular broadcast wizard
    await broadcastMessage(ctx);
  } catch (error) {
    logger.error("Error handling schedule broadcast date:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Override broadcast confirmation to add schedule option
 */
async function showScheduledBroadcastConfirmation(ctx) {
  try {
    const lang = ctx.session.language || "en";
    const wizard = ctx.session.broadcastWizard;

    // Count target users
    const usersSnapshot = await db.collection("users").get();
    const allUsers = usersSnapshot.docs;
    const filteredUsers = filterUsersByWizard(allUsers, wizard);

    const langLabel = {
      all: lang === "es" ? "Todos los idiomas" : "All languages",
      en: lang === "es" ? "Solo inglés" : "English only",
      es: lang === "es" ? "Solo español" : "Spanish only"
    }[wizard.targetLanguage];

    const statusLabel = {
      all: lang === "es" ? "Todos los estados" : "All status",
      subscribers: lang === "es" ? "Suscriptores activos" : "Active subscribers",
      free: lang === "es" ? "Nivel gratuito" : "Free tier",
      churned: lang === "es" ? "Suscripciones expiradas" : "Expired subscriptions"
    }[wizard.targetStatus];

    const mediaLabel = wizard.media
      ? (wizard.media.type === "photo" ? "📷 Foto" : wizard.media.type === "video" ? "🎥 Video" : "📄 Documento")
      : (lang === "es" ? "Sin multimedia" : "No media");

    const buttonsLabel = wizard.buttons && wizard.buttons.length > 0
      ? `${wizard.buttons.length} ${lang === "es" ? "botón(es)" : "button(s)"}`
      : (lang === "es" ? "Sin botones" : "No buttons");

    const scheduledTime = wizard.scheduledTime.toLocaleString();

    const message = lang === "es"
      ? `📅 **Confirmación de Transmisión Programada**\n\n**Configuración:**\n🌐 Idioma: ${langLabel}\n👥 Estado: ${statusLabel}\n📎 Multimedia: ${mediaLabel}\n🔘 Botones: ${buttonsLabel}\n\n**Vista previa del mensaje:**\n━━━━━━━━━━━━━━\n${wizard.text}\n━━━━━━━━━━━━━━\n\n**📅 Programación:**\n🕐 Hora: ${scheduledTime}\n👥 Usuarios objetivo: ${filteredUsers.length}\n\n¿Listo para guardar la transmisión?`
      : `📅 **Scheduled Broadcast Confirmation**\n\n**Configuration:**\n🌐 Language: ${langLabel}\n👥 Status: ${statusLabel}\n📎 Media: ${mediaLabel}\n🔘 Buttons: ${buttonsLabel}\n\n**Message preview:**\n━━━━━━━━━━━━━━\n${wizard.text}\n━━━━━━━━━━━━━━\n\n**📅 Schedule:**\n🕐 Time: ${scheduledTime}\n👥 Target users: ${filteredUsers.length}\n\nReady to save the broadcast?`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "✅ Guardar transmisión" : "✅ Save broadcast",
            callback_data: "bcast_save_scheduled"
          }
        ],
        [
          {
            text: lang === "es" ? "✏️ Editar" : "✏️ Edit",
            callback_data: "bcast_edit"
          },
          {
            text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
            callback_data: "admin_scheduled_broadcasts"
          }
        ]
      ]
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error("Error showing scheduled broadcast confirmation:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Save scheduled broadcast
 */
async function saveScheduledBroadcast(ctx) {
  try {
    const lang = ctx.session.language || "en";
    const wizard = ctx.session.broadcastWizard;

    const savingMsg = await ctx.reply(
      lang === "es" ? "💾 Guardando transmisión programada..." : "💾 Saving scheduled broadcast..."
    );

    const broadcastId = await createScheduledBroadcast({
      targetLanguage: wizard.targetLanguage,
      targetStatus: wizard.targetStatus,
      text: wizard.text,
      media: wizard.media,
      buttons: wizard.buttons,
      scheduledTime: wizard.scheduledTime,
      adminId: ctx.from.id,
    });

    try {
      await ctx.deleteMessage(savingMsg.message_id);
    } catch (e) {
      // Ignore
    }

    if (broadcastId) {
      await ctx.reply(
        lang === "es"
          ? `✅ ¡Transmisión programada exitosamente!\n\n🆔 ID: \`${broadcastId.substring(0, 12)}\`\n🕐 Hora: ${wizard.scheduledTime.toLocaleString()}\n\nLa transmisión se enviará automáticamente a la hora programada.`
          : `✅ Broadcast scheduled successfully!\n\n🆔 ID: \`${broadcastId.substring(0, 12)}\`\n🕐 Time: ${wizard.scheduledTime.toLocaleString()}\n\nThe broadcast will be sent automatically at the scheduled time.`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "📅 Ver transmisiones programadas" : "📅 View Scheduled",
                  callback_data: "admin_scheduled_broadcasts"
                }
              ],
              [
                {
                  text: lang === "es" ? "« Volver" : "« Back",
                  callback_data: "admin_back"
                }
              ]
            ]
          }
        }
      );

      logger.info(`Admin ${ctx.from.id} scheduled broadcast: ${broadcastId}`);
    } else {
      await ctx.reply(
        lang === "es"
          ? "❌ Error al guardar la transmisión. Intenta nuevamente."
          : "❌ Error saving broadcast. Try again."
      );
    }

    // Clear wizard
    ctx.session.broadcastWizard = null;
    ctx.session.waitingFor = null;
  } catch (error) {
    logger.error("Error saving scheduled broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Cancel scheduled broadcast
 */
async function executeCancelBroadcast(ctx, broadcastId) {
  try {
    const lang = ctx.session.language || "en";

    const success = await cancelScheduledBroadcast(broadcastId);

    if (success) {
      await ctx.reply(
        lang === "es"
          ? "✅ Transmisión programada cancelada."
          : "✅ Scheduled broadcast cancelled.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "📅 Ver transmisiones" : "📅 View Broadcasts",
                  callback_data: "admin_scheduled_broadcasts"
                }
              ]
            ]
          }
        }
      );

      logger.info(`Admin ${ctx.from.id} cancelled scheduled broadcast: ${broadcastId}`);
    } else {
      await ctx.reply(
        lang === "es"
          ? "❌ Error al cancelar la transmisión."
          : "❌ Error cancelling broadcast."
      );
    }

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error("Error cancelling broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

module.exports = {
  adminPanel,
  showStats,
  listUsers,
  broadcastMessage,
  sendBroadcast,
  handleBroadcastMedia,
  handleBroadcastButtons,
  handleAdminCallback,
  executeSearch,
  showExpiringMemberships,
  runExpirationCheck,
  messageUser,
  executeSendMessage,
  banUser,
  executeBanUser,
  unbanUser,
  listPremiumUsers,
  listNewUsers,
  managePlans,
  configureMenus,
  startMembershipActivation,
  processActivationUserId,
  executeQuickActivation,
  startUpdateMember,
  processUpdateMemberUserId,
  startExtendMembership,
  processExtendUserId,
  executeExtendMembership,
  askCustomExtensionDays,
  executeCustomExtension,
  modifyExpirationDate,
  executeModifyExpiration,
  viewPlanDetails,
  editPlanMenu,
  startPlanEdit,
  executePlanEdit,
  showPlanStats,
  viewMenuDetails,
  analyzeMenuStructure,
  testMenu,
  reloadMenus,
  showScheduledBroadcasts,
  startScheduleBroadcast,
  handleScheduleBroadcastDate,
  showScheduledBroadcastConfirmation,
  saveScheduledBroadcast,
  executeCancelBroadcast,
};
