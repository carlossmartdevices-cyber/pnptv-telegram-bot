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
const {
  getSegmentedUsers,
  getSegmentPresets,
  getSegmentStats,
  getAllSegmentStats
} = require("../../services/broadcastSegmentation");
const { 
  recordBroadcastAnalytics, 
  getBroadcastAnalytics, 
  getTopPerformingSegments 
} = require("../../services/broadcastAnalytics");
const {
  showKyrrexDashboard,
  showRecentPayments,
  showPendingPayments, 
  handlePaymentConfirmation,
  executePaymentConfirmation,
  showBalances,
} = require("./admin/kyrrexAdmin");

// Admin utilities (defines isAdmin, ADMIN_IDS, adminMiddleware)
const { isAdmin, ADMIN_IDS, adminMiddleware } = require("../../config/admin");
// Telegram escaping helpers (centralized)
const { escapeMdV2, escapeHtml, escapeArray } = require('../../utils/telegramEscapes');

/**
 * Get comprehensive formatting help text for broadcasts
 */
function getFormattingHelp(lang = "en") {
  if (lang === "es") {
    return "✨ **Opciones de formato disponibles:**\n\n" +
           "📝 **Texto básico:**\n" +
           "**negrita** *cursiva* __subrayado__ ~tachado~\n\n" +
           "💻 **Código:**\n" +
           "`código en línea`\n" +
           "```\nbloque de código\nmúltiples líneas\n```\n\n" +
           "🔗 **Enlaces:**\n" +
           "[texto del enlace](https://ejemplo.com)\n\n" +
           "🚫 **Spoilers:**\n" +
           "||texto oculto||\n\n" +
           "🎯 **Combinaciones:**\n" +
           "**_negrita y cursiva_**\n" +
           "__*subrayado y cursiva*__\n\n" +
           "💡 **Tip:** Usa emojis para hacer tu mensaje más atractivo! 🚀✨🎉";
  } else {
    return "✨ **Available formatting options:**\n\n" +
           "📝 **Basic text:**\n" +
           "**bold** *italic* __underline__ ~strikethrough~\n\n" +
           "💻 **Code:**\n" +
           "`inline code`\n" +
           "```\ncode block\nmultiple lines\n```\n\n" +
           "🔗 **Links:**\n" +
           "[link text](https://example.com)\n\n" +
           "🚫 **Spoilers:**\n" +
           "||hidden text||\n\n" +
           "🎯 **Combinations:**\n" +
           "**_bold and italic_**\n" +
           "__*underline and italic*__\n\n" +
           "💡 **Tip:** Use emojis to make your message more engaging! 🚀✨🎉";
  }
}

/**
 * Admin panel main handler
 */
async function adminPanel(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const message = lang === "es"
      ? "⚙️ **Panel de Administración**\n\nSelecciona una opción:"
      : "⚙️ **Admin Panel**\n\nSelect an option:";

    // Try to edit the message first, fall back to new message if that fails
    try {
      await ctx.editMessageText(message, {
        reply_markup: getMenu("admin"),
        parse_mode: "Markdown",
      });
    } catch (editError) {
      // If edit fails, send new message
      await ctx.reply(message, {
        reply_markup: getMenu("admin"),
        parse_mode: "Markdown",
      });
    }

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
    let annualRevenue = 0;
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
            }]],
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

    // Try to edit the message first, fall back to new message if that fails
    try {
      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "📋 Listar Todos" : "📋 List All",
                callback_data: "admin_list_all",
              }],
            [
              {
                text: lang === "es" ? "🔍 Buscar Usuario" : "🔍 Search User",
                callback_data: "admin_search_user",
              }],
            [
              {
                text: lang === "es" ? "🥇 Usuarios Premium" : "🥇 Premium Users",
                callback_data: "admin_list_premium",
              }],
            [
              {
                text: lang === "es" ? "📅 Nuevos (7 días)" : "📅 New (7 days)",
                callback_data: "admin_list_new",
              }],
            [
              {
                text: lang === "es" ? "« Volver" : "« Back",
                callback_data: "admin_back",
              }]],
        },
      });
    } catch (editError) {
      // If edit fails, send new message
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "📋 Listar Todos" : "📋 List All",
                callback_data: "admin_list_all",
              }],
            [
              {
                text: lang === "es" ? "🔍 Buscar Usuario" : "🔍 Search User",
                callback_data: "admin_search_user",
              }],
            [
              {
                text: lang === "es" ? "🥇 Usuarios Premium" : "🥇 Premium Users",
                callback_data: "admin_list_premium",
              }],
            [
              {
                text: lang === "es" ? "📅 Nuevos (7 días)" : "📅 New (7 days)",
                callback_data: "admin_list_new",
              }],
            [
              {
                text: lang === "es" ? "« Volver" : "« Back",
                callback_data: "admin_back",
              }]],
        },
      });
    }

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
      }]);

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
    // Use centralized escapeHtml helper from utils/telegramEscapes for HTML parse mode

    let message = lang === "es"
      ? "👤 <b>Detalles del Usuario</b>\n\n"
      : "👤 <b>User Details</b>\n\n";

    message += `🆔 ID: <code>${escapeHtml(userId)}</code>\n`;
    message += `👤 Username: ${escapeHtml(userData.username ? '@' + userData.username : 'Anonymous')}\n`;
    message += `💎 Tier: ${escapeHtml(userData.tier || 'Free')}\n`;

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

  message += `📸 Photo: ${userData.photoFileId ? 'Yes' : 'No'}\n`;
  message += `📍 Location: ${userData.location ? 'Yes' : 'No'}\n`;
  message += `📝 Bio: ${escapeHtml(userData.bio || 'Not set')}\n\n`;

    const createdAt = userData.createdAt?.toDate();
    const lastActive = userData.lastActive?.toDate();

  message += `📅 Created: ${createdAt ? escapeHtml(createdAt.toLocaleDateString()) : 'Unknown'}\n`;
  message += `🕐 Last Active: ${lastActive ? escapeHtml(lastActive.toLocaleString()) : 'Unknown'}\n`;

    // Show ban status
    if (userData.banned) {
      message += `\n🚫 <b>STATUS: BANNED</b>\n`;
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
        }],
      [
        userData.banned
          ? {
              text: lang === "es" ? "✅ Desbanear" : "✅ Unban",
              callback_data: `admin_unban_${userId}`,
            }
          : {
              text: lang === "es" ? "🚫 Banear" : "🚫 Ban",
              callback_data: `admin_ban_${userId}`,
            }],
      [
        {
          text: lang === "es" ? "« Volver" : "« Back",
          callback_data: "admin_users",
        }]];

    await ctx.reply(message, {
      parse_mode: 'HTML',
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
 * Edit user tier - Show all current subscription plans
 */
async function editUserTier(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    const message = lang === "es"
      ? `✏️ **Cambiar Membresía**\n\nUsuario: \`${userId}\`\n\nSelecciona la nueva membresía:`
      : `✏️ **Edit Membership**\n\nUser: \`${userId}\`\n\nSelect new membership:`;

    // Current active plans with their durations
    const plans = [
      {
        id: 'trial-week',
        name: lang === "es" ? 'Semana de Prueba' : 'Trial Week',
        icon: '⏱️',
        duration: 7,
        price: 14.99
      },
      {
        id: 'pnp-member',
        name: lang === "es" ? 'Miembro PNP' : 'PNP Member',
        icon: '⭐',
        duration: 30,
        price: 24.99
      },
      {
        id: 'crystal-member',
        name: lang === "es" ? 'Miembro Cristal' : 'PNP Crystal',
        icon: '💎',
        duration: 120,
        price: 49.99
      },
      {
        id: 'diamond-member',
        name: lang === "es" ? 'Miembro Diamante' : 'PNP Diamond',
        icon: '👑',
        duration: 365,
        price: 99.99
      }
    ];

    const keyboard = {
      inline_keyboard: [
        // Trial Week
        [
          {
            text: `⏱️ Trial Week - 7d`,
            callback_data: `admin_tier:trial-week:7:${userId}`,
          }],
        // PNP Member
        [
          {
            text: `⭐ PNP Member - 30d`,
            callback_data: `admin_tier:pnp-member:30:${userId}`,
          }],
        // Crystal Member
        [
          {
            text: `💎 PNP Crystal - 120d`,
            callback_data: `admin_tier:crystal-member:120:${userId}`,
          }],
        // Diamond Member
        [
          {
            text: `👑 PNP Diamond - 365d`,
            callback_data: `admin_tier:diamond-member:365:${userId}`,
          }],
        // Free tier
        [
          {
            text: lang === "es" ? "⚪ Gratis (sin expiración)" : "⚪ Free (no expiration)",
            callback_data: `admin_tier:free:0:${userId}`,
          }],
        // Cancel
        [
          {
            text: lang === "es" ? "« Cancelar" : "« Cancel",
            callback_data: `admin_user_${userId}`,
          }]],
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
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
async function setUserTier(ctx, userId, planIdOrTier, durationDays = 30) {
  try {
    const lang = ctx.session.language || "en";

    // Map plan IDs to tiers
    const planToTierMap = {
      'trial-week': 'Basic',
      'pnp-member': 'Basic',
      'crystal-member': 'Premium',
      'diamond-member': 'Premium',
      'free': 'Free',
      'Free': 'Free',
      'Basic': 'Basic',
      'Premium': 'Premium'
    };

    // Get the actual tier from the plan ID
    const tier = planToTierMap[planIdOrTier] || planIdOrTier;

    // Use membership manager to activate with expiration and send notification
    const result = await activateMembership(userId, tier, "admin", durationDays, ctx.telegram);

    // Note: activateMembership now automatically sends notification with invite link

    const confirmMsg = tier === "Free"
      ? (lang === "es" ? `✅ Usuario cambiado a Free` : `✅ User changed to Free`)
      : (lang === "es"
        ? `✅ ${planIdOrTier} activado por ${durationDays} días`
        : `✅ ${planIdOrTier} activated for ${durationDays} days`);

    await ctx.answerCbQuery(confirmMsg);

    // Refresh user details
    const updatedUserDoc = await db.collection("users").doc(userId).get();
    await showUserDetails(ctx, userId, updatedUserDoc.data());

    logger.info(`Admin ${ctx.from.id} set tier ${tier} (plan: ${planIdOrTier}) for user: ${userId} (${durationDays} days)`);
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

    // Initialize broadcast session
    ctx.session.broadcast = {
      media: null,
      text: null,
      textEN: null,
      textES: null,
      multiLanguage: false,
      targetSegment: 'all_users',
      step: 'audience_choice'
    };

    const message = lang === "es"
      ? "📢 **Enviar Mensaje Masivo**\n\n**Paso 1:** ¿A quién quieres enviar el mensaje?\n\n� **Audiencia Específica:** Enviar solo a un grupo específico (Free, Premium, etc.)\n🌍 **Todos los Usuarios:** Enviar a toda la base de usuarios"
      : "📢 **Send Broadcast Message**\n\n**Step 1:** Who do you want to send the message to?\n\n� **Targeted Audience:** Send only to a specific group (Free, Premium, etc.)\n🌍 **All Users:** Send to entire user base";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "� Audiencia Específica" : "� Targeted Audience",
              callback_data: "broadcast_select_segment"
            }
          ],
          [
            {
              text: lang === "es" ? "� Mensaje único" : "� Single message",
              callback_data: "broadcast_all_users"
            }
          ],
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} initiated broadcast with audience targeting options`);
  } catch (error) {
    logger.error("Error in broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show segment selection menu for targeted broadcasts
 */
async function showSegmentSelection(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    const presets = getSegmentPresets();
    const segmentKeys = Object.keys(presets);
    
    // Get stats for key segments to show user counts
    const keySegments = ['all_users', 'free_users', 'premium_users', 'new_users', 'returning_customers', 'expiring_soon'];
    
    const message = lang === "es"
      ? "🎯 **Selecciona Audiencia**\n\n**Paso 2:** Elige a qué grupo de usuarios quieres enviar el mensaje:\n\n_Cargando estadísticas..._"
      : "🎯 **Select Target Audience**\n\n**Step 2:** Choose which group of users to send the message to:\n\n_Loading statistics..._";

    const sentMessage = await ctx.editMessageText(message, { parse_mode: "Markdown" });
    
    // Get segment stats in parallel
    const segmentStats = {};
    await Promise.all(keySegments.map(async (key) => {
      try {
        const stats = await getSegmentStats(key);
        segmentStats[key] = stats.userCount;
      } catch (error) {
        logger.warn(`Failed to get stats for segment ${key}:`, error.message);
        segmentStats[key] = 0;
      }
    }));
    
    // Create keyboard with segment options
    const keyboard = [];
    
    // Row 1: All Users
    keyboard.push([{
      text: lang === "es" 
        ? `🌍 Todos los Usuarios (${segmentStats.all_users || '?'})` 
        : `🌍 All Users (${segmentStats.all_users || '?'})`,
      callback_data: "broadcast_segment_all_users"
    }]);
    
    // Row 2: Free vs Premium
    keyboard.push([
      {
        text: lang === "es" 
          ? `🆓 Usuarios Free (${segmentStats.free_users || '?'})` 
          : `🆓 Free Users (${segmentStats.free_users || '?'})`,
        callback_data: "broadcast_segment_free_users"
      },
      {
        text: lang === "es" 
          ? `💎 Usuarios Premium (${segmentStats.premium_users || '?'})` 
          : `💎 Premium Users (${segmentStats.premium_users || '?'})`,
        callback_data: "broadcast_segment_premium_users"
      }
    ]);
    
    // Row 3: New Users and Returning
    keyboard.push([
      {
        text: lang === "es" 
          ? `🆕 Nuevos Usuarios (${segmentStats.new_users || '?'})` 
          : `🆕 New Users (${segmentStats.new_users || '?'})`,
        callback_data: "broadcast_segment_new_users"
      },
      {
        text: lang === "es" 
          ? `🔄 Ex-Clientes (${segmentStats.returning_customers || '?'})` 
          : `🔄 Previous Customers (${segmentStats.returning_customers || '?'})`,
        callback_data: "broadcast_segment_returning_customers"
      }
    ]);
    
    // Row 4: Expiring Soon
    if (segmentStats.expiring_soon > 0) {
      keyboard.push([{
        text: lang === "es" 
          ? `⏰ Expiran Pronto (${segmentStats.expiring_soon})` 
          : `⏰ Expiring Soon (${segmentStats.expiring_soon})`,
        callback_data: "broadcast_segment_expiring_soon"
      }]);
    }
    
    // Row 5: More Options
    keyboard.push([{
      text: lang === "es" ? "📊 Más Opciones" : "📊 More Options",
      callback_data: "broadcast_segment_more"
    }]);
    
    // Row 6: Back and Cancel
    keyboard.push([
      {
        text: lang === "es" ? "« Atrás" : "« Back",
        callback_data: "broadcast_back_to_start"
      },
      {
        text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
        callback_data: "admin_back"
      }
    ]);

    const finalMessage = lang === "es"
      ? "🎯 **Selecciona Audiencia**\n\n**Paso 2:** Elige a qué grupo de usuarios quieres enviar el mensaje:"
      : "🎯 **Select Target Audience**\n\n**Step 2:** Choose which group of users to send the message to:";

    await ctx.editMessageText(finalMessage, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`Admin ${ctx.from.id} viewing segment selection with stats`);
  } catch (error) {
    logger.error("Error showing segment selection:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show more segment options
 */
async function showMoreSegmentOptions(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    const message = lang === "es"
      ? "📊 **Más Opciones de Audiencia**\n\n**Segmentación Avanzada:**"
      : "📊 **More Audience Options**\n\n**Advanced Segmentation:**";

    const keyboard = [
      [
        {
          text: lang === "es" ? "👀 Nunca Pagaron" : "👀 Never Paid",
          callback_data: "broadcast_segment_never_paid"
        },
        {
          text: lang === "es" ? "⚠️ Expirados" : "⚠️ Expired Users",
          callback_data: "broadcast_segment_expired_users"
        }
      ],
      [
        {
          text: lang === "es" ? "🎯 Nuevos Prospectos" : "🎯 New Prospects",
          callback_data: "broadcast_segment_new_free_users"
        },
        {
          text: lang === "es" ? "⭐ Clientes Leales" : "⭐ Loyal Customers", 
          callback_data: "broadcast_segment_loyal_customers"
        }
      ],
      [
        {
          text: lang === "es" ? "« Atrás" : "« Back",
          callback_data: "broadcast_select_segment"
        },
        {
          text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
          callback_data: "admin_back"
        }
      ]
    ];

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`Admin ${ctx.from.id} viewing advanced segment options`);
  } catch (error) {
    logger.error("Error showing more segment options:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle segment selection and proceed to language choice
 */
async function handleSegmentSelection(ctx, segmentKey) {
  try {
    const lang = ctx.session.language || "en";
    
    // Save selected segment
    ctx.session.broadcast.targetSegment = segmentKey;
    ctx.session.broadcast.step = 'language_choice';
    
    // Get segment info
    const presets = getSegmentPresets();
    const segmentInfo = presets[segmentKey];
    const stats = await getSegmentStats(segmentKey);
    
    const segmentName = lang === "es" 
      ? segmentInfo.name.replace(/🌍 All Users/, "🌍 Todos los Usuarios")
        .replace(/🆓 Free Users/, "🆓 Usuarios Free")
        .replace(/💎 Premium Users/, "💎 Usuarios Premium")
        .replace(/🆕 New Users/, "🆕 Nuevos Usuarios")
        .replace(/🔄 Previous Customers/, "🔄 Ex-Clientes")
        .replace(/⏰ Expiring Soon/, "⏰ Expiran Pronto")
        .replace(/👀 Never Paid/, "👀 Nunca Pagaron")
        .replace(/⚠️ Expired Users/, "⚠️ Usuarios Expirados")
        .replace(/🎯 New Prospects/, "🎯 Nuevos Prospectos")
        .replace(/⭐ Loyal Customers/, "⭐ Clientes Leales")
      : segmentInfo.name;
    
    const message = lang === "es"
      ? `📢 **Configurar Mensaje**\n\n**Audiencia Seleccionada:** ${segmentName}\n**Usuarios objetivo:** ${stats.userCount}\n\n**Paso 3:** ¿Cómo quieres configurar el mensaje?\n\n🌐 **Por idioma:** Diferentes mensajes para inglés y español\n📝 **Mensaje único:** Mismo mensaje para todos los usuarios`
      : `📢 **Configure Message**\n\n**Selected Audience:** ${segmentName}\n**Target users:** ${stats.userCount}\n\n**Step 3:** How do you want to configure the message?\n\n🌐 **By language:** Different messages for English and Spanish\n📝 **Single message:** Same message for all users`;

    try {
      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "🌐 Mensajes por idioma" : "🌐 Messages by language",
                callback_data: "broadcast_multi_language"
              }
            ],
            [
              {
                text: lang === "es" ? "📝 Mensaje único" : "📝 Single message",
                callback_data: "broadcast_single_message"
              }
            ],
            [
              {
                text: lang === "es" ? "« Cambiar Audiencia" : "« Change Audience",
                callback_data: "broadcast_select_segment"
              },
              {
                text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
                callback_data: "admin_back"
              }
            ]
          ]
        }
      });
    } catch (editError) {
      // Ignore "message not modified" errors
      if (!editError.description?.includes('message is not modified')) {
        throw editError;
      }
    }

    logger.info(`Admin ${ctx.from.id} selected segment ${segmentKey} with ${stats.userCount} users`);
  } catch (error) {
    logger.error("Error handling segment selection:", error);
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
      logger.info("Processing broadcast language selection:", action);
      logger.info("Current wizard state:", wizard);
      await ctx.answerCbQuery("Language selected ✅");
      
      const langChoice = action.replace("bcast_lang_", "");
      wizard.targetLanguage = langChoice;
      wizard.step = 2;
      logger.info("Updated wizard to step 2, language:", langChoice);

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
    }
    // Step 2: Status selection
    else if (action.startsWith("bcast_status_")) {
      logger.info("Processing broadcast status selection:", action);
      await ctx.answerCbQuery();
      
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

      // Set waiting for media upload
      ctx.session.waitingFor = "broadcast_media";
    }
    // Step 3: Skip media
    else if (action === "bcast_media_skip") {
      logger.info("Processing broadcast media skip");
      await ctx.answerCbQuery();
      
      wizard.media = null;
      wizard.step = 4;
      ctx.session.waitingFor = "broadcast_text";

      const message = lang === "es"
        ? "📢 **Asistente de Mensaje Masivo**\n\n**Paso 4 de 5:** Escribe el mensaje de texto que quieres enviar:"
        : "📢 **Broadcast Wizard**\n\n**Step 4 of 5:** Type the text message you want to send:";

      await ctx.editMessageText(message, { parse_mode: "Markdown" });
    }
    // Step 4: Skip buttons (after text)
    else if (action === "bcast_buttons_skip" || action === "bcast_send_no_buttons") {
      logger.info("Processing broadcast buttons skip");
      await ctx.answerCbQuery();
      
      wizard.buttons = null;
      await showBroadcastConfirmation(ctx);
    }
    // Step 5: Confirm send
    else if (action === "bcast_confirm_send") {
      logger.info("Processing broadcast confirm send");
      await ctx.answerCbQuery();
      await executeBroadcast(ctx);
    }
    // Step 5: Test send (to admin only)
    else if (action === "bcast_test_send") {
      logger.info("Processing broadcast test send");
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
      logger.info("Processing broadcast edit");
      await ctx.answerCbQuery();
      
      wizard.step = 1;
      await broadcastMessage(ctx);
    }
    // Back navigation
    else if (action === "bcast_back_to_lang") {
      logger.info("Processing broadcast back to language");
      await ctx.answerCbQuery();
      
      wizard.step = 1;
      await broadcastMessage(ctx);
    }
    else if (action === "bcast_back_to_status") {
      logger.info("Processing broadcast back to status");
      await ctx.answerCbQuery();
      
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

    if (!wizard || !wizard.text) {
      logger.error("Broadcast wizard missing data:", { wizard });
      await ctx.reply(lang === "es" ? "Error: Datos incompletos" : "Error: Incomplete data");
      return;
    }

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
      ? `📢 **Confirmación de Mensaje Masivo**\n\n**Configuración:**\n🌐 Idioma: ${langLabel}\n👥 Estado: ${statusLabel}\n📎 Multimedia: ${mediaLabel}\n🔘 Botones: ${buttonsLabel}\n\n**Vista previa del mensaje:**\n━━━━━━━━━━━━━━\n${wizard.text.substring(0, 500)}${wizard.text.length > 500 ? '...' : ''}\n━━━━━━━━━━━━━━\n\n**📊 Estadísticas:**\n👥 Usuarios objetivo: ${filteredUsers.length}\n⏱️ Tiempo estimado: ${estimatedTime}`
      : `📢 **Broadcast Confirmation**\n\n**Configuration:**\n🌐 Language: ${langLabel}\n👥 Status: ${statusLabel}\n📎 Media: ${mediaLabel}\n🔘 Buttons: ${buttonsLabel}\n\n**Message preview:**\n━━━━━━━━━━━━━━\n${wizard.text.substring(0, 500)}${wizard.text.length > 500 ? '...' : ''}\n━━━━━━━━━━━━━━\n\n**📊 Statistics:**\n👥 Target users: ${filteredUsers.length}\n⏱️ Estimated time: ${estimatedTime}`;

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

    // Always filter out users who opted out of ads or broadcasts
    if (userData.adsOptOut === true || userData.broadcastOptOut === true) {
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
        if (!userData.membershipExpiresAt) return false;
        const expiresAt = userData.membershipExpiresAt.toDate();
        if (expiresAt <= now) return false;
        break;

      case "free":
        if (userData.tier && userData.tier !== "Free") return false;
        break;

      case "churned":
        // Users who had a subscription but it expired
        if (!userData.tier || userData.tier === "Free") return false;
        if (!userData.membershipExpiresAt) return false;
        const expired = userData.membershipExpiresAt.toDate();
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

    // Add inline buttons if configured, plus opt-out button
    let keyboard = wizard.buttons ? [...wizard.buttons] : [];
    // Note: We'll add the opt-out button per user based on their language
    if (keyboard.length > 0) {
      messageOptions.reply_markup = {
        inline_keyboard: keyboard
      };
    }

    const totalUsers = filteredUsers.length;
    let lastUpdateTime = Date.now();

    for (const doc of filteredUsers) {
      try {
        const userId = doc.id;
        const userData = doc.data();
        const userLang = userData.language || "en";

        // Create user-specific message options with opt-out button
        const userMessageOptions = { ...messageOptions };
        let userKeyboard = wizard.buttons ? [...wizard.buttons] : [];
        userKeyboard = addOptOutButton(userKeyboard, userLang);
        
        if (userKeyboard.length > 0) {
          userMessageOptions.reply_markup = {
            inline_keyboard: userKeyboard
          };
        }

        // Send with media if available
        if (wizard.media) {
          const caption = wizard.text || "";

          switch (wizard.media.type) {
            case "photo":
              await ctx.telegram.sendPhoto(userId, wizard.media.file_id, {
                caption,
                ...userMessageOptions
              });
              break;
            case "video":
              await ctx.telegram.sendVideo(userId, wizard.media.file_id, {
                caption,
                ...userMessageOptions
              });
              break;
            case "document":
              await ctx.telegram.sendDocument(userId, wizard.media.file_id, {
                caption,
                ...userMessageOptions
              });
              break;
          }
        } else {
          // Send text only
          await ctx.telegram.sendMessage(userId, wizard.text, userMessageOptions);
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

    // Debug: Check what's in the session before processing
    logger.info(`sendBroadcast debug - session before processing:`, {
      hasBroadcast: !!ctx.session.broadcast,
      broadcastData: ctx.session.broadcast,
      waitingFor: ctx.session.waitingFor,
      messageText: message.substring(0, 50) + '...'
    });

    // Clear the waiting state
    ctx.session.waitingFor = null;

    // Initialize broadcast session if it doesn't exist (shouldn't happen)
    if (!ctx.session.broadcast) {
      ctx.session.broadcast = {};
    }

    // Store the text message
    ctx.session.broadcast.text = message;

    // Create confirmation message
    let confirmMsg = lang === "es" ? "📢 **Confirmar Envío**\n\n" : "📢 **Confirm Broadcast**\n\n";
    
    // Show media info if present
    if (ctx.session.broadcast.media) {
      const mediaType = ctx.session.broadcast.media.type;
      const mediaIcon = {
        photo: "📸",
        video: "🎥", 
        document: "📄",
        audio: "🎵",
        voice: "🎤",
        video_note: "📹",
        animation: "🎭",
        sticker: "🎨"
      };
      
      confirmMsg += lang === "es" 
        ? `${mediaIcon[mediaType] || "📎"} **Archivo:** ${mediaType}\n\n`
        : `${mediaIcon[mediaType] || "📎"} **Media:** ${mediaType}\n\n`;
    }

    // Show text message
    confirmMsg += lang === "es" 
      ? `**Mensaje:**\n${message}\n\n**⚠️ Esta acción no se puede deshacer**`
      : `**Message:**\n${message}\n\n**⚠️ This action cannot be undone**`;

    await ctx.reply(confirmMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "✅ Sí, enviar" : "✅ Yes, send",
              callback_data: "simple_broadcast_confirm"
            },
            {
              text: lang === "es" ? "❌ Cancelar" : "❌ Cancel",
              callback_data: "admin_back"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} prepared broadcast with ${ctx.session.broadcast.media ? 'media + ' : ''}text: ${message.substring(0, 50)}...`);
  } catch (error) {
    logger.error("Error in sendBroadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle adding media to broadcast
 */
async function handleBroadcastAddMedia(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    ctx.session.waitingFor = "broadcast_media";
    ctx.session.broadcast.step = 'waiting_media';

    const message = lang === "es"
      ? "📸 **Agregar Archivos**\n\n**Paso 2:** Envía el archivo multimedia que quieres incluir:\n\n✅ Fotos (.jpg, .png, .gif)\n✅ Videos (.mp4, .mov)\n✅ Documentos (.pdf, .doc, etc.)\n✅ Audio (.mp3, .wav, etc.)\n\n📝 Después podrás agregar texto como descripción."
      : "📸 **Add Media Files**\n\n**Step 2:** Send the media file you want to include:\n\n✅ Photos (.jpg, .png, .gif)\n✅ Videos (.mp4, .mov)\n✅ Documents (.pdf, .doc, etc.)\n✅ Audio (.mp3, .wav, etc.)\n\n📝 You can add text as description afterwards.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_broadcast"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} chose to add media to broadcast`);
  } catch (error) {
    logger.error("Error in handleBroadcastAddMedia:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle text-only broadcast
 */
async function handleBroadcastTextOnly(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    ctx.session.waitingFor = "broadcast_message";
    ctx.session.broadcast.step = 'waiting_text';

    const message = lang === "es"
      ? "💬 **Mensaje de Texto**\n\n**Paso 2:** Escribe el mensaje que quieres enviar a todos los usuarios:\n\n✨ **Opciones de formato disponibles:**\n**negrita** *cursiva* __subrayado__ ~tachado~\n`código` ```bloque de código```\n||spoiler|| [enlace](https://ejemplo.com)\n\n📝 Usa estos formatos para hacer tu mensaje más atractivo."
      : "💬 **Text Message**\n\n**Step 2:** Write the message you want to send to all users:\n\n✨ **Available formatting options:**\n**bold** *italic* __underline__ ~strikethrough~\n`code` ```code block```\n||spoiler|| [link](https://example.com)\n\n📝 Use these formats to make your message more engaging.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "📖 Guía de Formato" : "📖 Formatting Guide",
              callback_data: "broadcast_formatting_help"
            }
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_broadcast"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} chose text-only broadcast`);
  } catch (error) {
    logger.error("Error in handleBroadcastTextOnly:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle multi-language broadcast setup
 */
async function handleBroadcastMultiLanguage(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    ctx.session.broadcast.multiLanguage = true;
    ctx.session.broadcast.step = 'media_choice_multi';

    const message = lang === "es"
      ? "🌐 **Mensaje Segmentado por Idioma**\n\n**Paso 2:** ¿Quieres incluir archivos multimedia?\n\n📸 Puedes enviar: fotos, videos, documentos, audio, GIFs\n\n💡 El mismo archivo se enviará a ambos idiomas, pero podrás escribir textos diferentes."
      : "🌐 **Multi-Language Broadcast**\n\n**Step 2:** Do you want to include media files?\n\n📸 You can send: photos, videos, documents, audio, GIFs\n\n💡 The same file will be sent to both languages, but you can write different texts.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "📸 Sí, agregar archivos" : "📸 Yes, add media",
              callback_data: "broadcast_add_media"
            }
          ],
          [
            {
              text: lang === "es" ? "💬 Solo texto" : "💬 Text only",
              callback_data: "broadcast_multi_text_only"
            }
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_broadcast"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} chose multi-language broadcast`);
  } catch (error) {
    logger.error("Error in handleBroadcastMultiLanguage:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle single message broadcast setup
 */
async function handleBroadcastSingleMessage(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    ctx.session.broadcast.multiLanguage = false;
    ctx.session.broadcast.step = 'media_choice_single';

    const message = lang === "es"
      ? "📝 **Mensaje Único**\n\n**Paso 2:** ¿Quieres incluir archivos multimedia?\n\n📸 Puedes enviar: fotos, videos, documentos, audio, GIFs\n\n📤 El mismo mensaje se enviará a todos los usuarios."
      : "📝 **Single Message Broadcast**\n\n**Step 2:** Do you want to include media files?\n\n📸 You can send: photos, videos, documents, audio, GIFs\n\n📤 The same message will be sent to all users.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "📸 Sí, agregar archivos" : "📸 Yes, add media",
              callback_data: "broadcast_add_media"
            }
          ],
          [
            {
              text: lang === "es" ? "💬 Solo texto" : "💬 Text only",
              callback_data: "broadcast_text_only"
            }
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_broadcast"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} chose single message broadcast`);
  } catch (error) {
    logger.error("Error in handleBroadcastSingleMessage:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle multi-language text-only broadcast
 */
async function handleBroadcastMultiTextOnly(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    ctx.session.waitingFor = "broadcast_message_en";
    ctx.session.broadcast.step = 'waiting_text_en';

    const message = lang === "es"
      ? "🌐💬 **Mensajes por Idioma - Solo Texto**\n\n**Paso 3a:** Primero escribe el mensaje en **INGLÉS**:\n\n✨ **Opciones de formato:**\n**negrita** *cursiva* __subrayado__ ~tachado~\n`código` ```bloque``` ||spoiler|| [enlace](url)\n\n🔄 Después te pediremos el mensaje en español."
      : "🌐💬 **Multi-Language Messages - Text Only**\n\n**Step 3a:** First write the message in **ENGLISH**:\n\n✨ **Formatting options:**\n**bold** *italic* __underline__ ~strikethrough~\n`code` ```block``` ||spoiler|| [link](url)\n\n🔄 Then we'll ask for the Spanish message.";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_broadcast"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} chose multi-language text-only broadcast`);
  } catch (error) {
    logger.error("Error in handleBroadcastMultiTextOnly:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle English message input for multi-language broadcast
 */
async function handleBroadcastEnglishMessage(ctx, messageText) {
  try {
    const lang = ctx.session.language || "en";
    
    // Store English text
    ctx.session.broadcast.textEN = messageText;
    
    // Move to Spanish text input
    ctx.session.waitingFor = "broadcast_message_es";
    ctx.session.broadcast.step = 'waiting_text_es';

    const message = lang === "es"
      ? `✅ **Mensaje en inglés guardado**\n\n**Paso 3b:** Ahora escribe el mensaje en **ESPAÑOL**:\n\n✨ **Opciones de formato:**\n**negrita** *cursiva* __subrayado__ ~tachado~\n\`código\` \`\`\`bloque\`\`\` ||spoiler|| [enlace](url)\n\n🔄 Mensaje EN: "${messageText.substring(0, 80)}${messageText.length > 80 ? '...' : ''}"`
      : `✅ **English message saved**\n\n**Step 3b:** Now write the message in **SPANISH**:\n\n✨ **Formatting options:**\n**bold** *italic* __underline__ ~strikethrough~\n\`code\` \`\`\`block\`\`\` ||spoiler|| [link](url)\n\n🔄 EN saved: "${messageText.substring(0, 80)}${messageText.length > 80 ? '...' : ''}`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_broadcast"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} entered English text for multi-language broadcast`);
  } catch (error) {
    logger.error("Error in handleBroadcastEnglishMessage:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle Spanish message input for multi-language broadcast
 */
async function handleBroadcastSpanishMessage(ctx, messageText) {
  try {
    const lang = ctx.session.language || "en";
    
    // Store Spanish text
    ctx.session.broadcast.textES = messageText;
    
    // Clear waiting state
    ctx.session.waitingFor = null;
    ctx.session.broadcast.step = 'ready_to_send';

    const message = lang === "es"
      ? `✅ **Mensajes Listos para Enviar**\n\n📤 **Mensaje Segmentado:**\n🇺🇸 **Inglés:** "${ctx.session.broadcast.textEN.substring(0, 80)}${ctx.session.broadcast.textEN.length > 80 ? '...' : ''}"\n🇪🇸 **Español:** "${messageText.substring(0, 80)}${messageText.length > 80 ? '...' : ''}"\n\n${ctx.session.broadcast.media ? `📎 **Archivo:** ${ctx.session.broadcast.media.type}\n\n` : ''}👥 Se enviará a usuarios según su idioma configurado.`
      : `✅ **Messages Ready to Send**\n\n📤 **Segmented Message:**\n🇺🇸 **English:** "${ctx.session.broadcast.textEN.substring(0, 80)}${ctx.session.broadcast.textEN.length > 80 ? '...' : ''}"\n🇪🇸 **Spanish:** "${messageText.substring(0, 80)}${messageText.length > 80 ? '...' : ''}"\n\n${ctx.session.broadcast.media ? `📎 **Media:** ${ctx.session.broadcast.media.type}\n\n` : ''}👥 Will be sent to users based on their language preference.`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "📤 Enviar Ahora" : "📤 Send Now",
              callback_data: "simple_broadcast_confirm"
            }
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_broadcast"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} completed multi-language broadcast setup`);
  } catch (error) {
    logger.error("Error in handleBroadcastSpanishMessage:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show detailed formatting help for broadcasts
 */
async function showBroadcastFormattingHelp(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    const helpText = getFormattingHelp(lang);
    
    const title = lang === "es" 
      ? "📖 **Guía Completa de Formato**\n\n" 
      : "📖 **Complete Formatting Guide**\n\n";

    await ctx.reply(title + helpText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Volver al Broadcast" : "« Back to Broadcast",
              callback_data: "admin_broadcast"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} viewed formatting help`);
  } catch (error) {
    logger.error("Error showing formatting help:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle broadcast media upload
 */
async function handleBroadcastMedia(ctx, mediaType) {
  try {
    const lang = ctx.session.language || "en";
    
    // Get the file_id based on media type
    let fileId;
    switch (mediaType) {
      case 'photo':
        fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        break;
      case 'video':
        fileId = ctx.message.video.file_id;
        break;
      case 'document':
        fileId = ctx.message.document.file_id;
        break;
      case 'audio':
        fileId = ctx.message.audio.file_id;
        break;
      case 'voice':
        fileId = ctx.message.voice.file_id;
        break;
      case 'video_note':
        fileId = ctx.message.video_note.file_id;
        break;
      case 'animation':
        fileId = ctx.message.animation.file_id;
        break;
      case 'sticker':
        fileId = ctx.message.sticker.file_id;
        break;
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }

    // Ensure broadcast object exists
    if (!ctx.session.broadcast) {
      ctx.session.broadcast = {};
    }

    // Store media in session
    ctx.session.broadcast.media = {
      type: mediaType,
      file_id: fileId
    };

    logger.info(`Broadcast media uploaded: ${mediaType}`, {
      mediaType,
      fileId,
      hasWizard: !!ctx.session.broadcastWizard
    });

    // Check if we're in wizard mode or legacy broadcast mode
    if (ctx.session.broadcastWizard) {
      // Wizard mode - advance to next step
      const wizard = ctx.session.broadcastWizard;
      wizard.media = {
        type: mediaType,
        file_id: fileId
      };
      wizard.step = 4;
      ctx.session.waitingFor = "broadcast_text";

      const message = lang === "es"
        ? `✅ **Archivo recibido**\n\n📁 Tipo: ${mediaType}\n\n**Paso 4 de 5:** Ahora escribe el texto que acompañará al archivo:\n\n✨ **Formato disponible:**\n**negrita** *cursiva* __subrayado__ ~tachado~\n\`código\` ||spoiler|| [enlace](url)\n\n📝 Este texto aparecerá como descripción del archivo multimedia.`
        : `✅ **Media received**\n\n📁 Type: ${mediaType}\n\n**Step 4 of 5:** Now write the text to accompany the file:\n\n✨ **Formatting available:**\n**bold** *italic* __underline__ ~strikethrough~\n\`code\` ||spoiler|| [link](url)\n\n📝 This text will appear as the media caption.`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Volver" : "« Back",
                callback_data: "bcast_back_to_status"
              },
              {
                text: lang === "es" ? "✖️ Cancelar" : "✖️ Cancel",
                callback_data: "admin_back"
              }
            ]
          ]
        }
      });
    } else if (ctx.session.broadcast.multiLanguage) {
      // Legacy multi-language mode: ask for English text first
      ctx.session.waitingFor = "broadcast_message_en";
      ctx.session.broadcast.step = 'waiting_text_en';

      const message = lang === "es"
        ? `✅ **Archivo recibido**\n\n🌐 **Mensajes por Idioma + Multimedia**\n\n📁 Tipo: ${mediaType}\n\n**Paso 3a:** Ahora escribe el texto en **INGLÉS** que acompañará al archivo:\n\n✨ **Formato disponible:**\n**negrita** *cursiva* __subrayado__ ~tachado~\n\`código\` ||spoiler|| [enlace](url)\n\n🔄 Después te pediremos el texto en español.`
        : `✅ **Media received**\n\n🌐 **Multi-Language + Media**\n\n📁 Type: ${mediaType}\n\n**Step 3a:** Now write the **ENGLISH** text to accompany the file:\n\n✨ **Formatting available:**\n**bold** *italic* __underline__ ~strikethrough~\n\`code\` ||spoiler|| [link](url)\n\n🔄 Then we'll ask for the Spanish text.`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Volver" : "« Back",
                callback_data: "admin_broadcast"
              }
            ]
          ]
        }
      });
    } else {
      // Legacy single message mode: ask for text normally
      ctx.session.waitingFor = "broadcast_message";
      ctx.session.broadcast.step = 'waiting_text';

      const message = lang === "es"
        ? `✅ **Archivo recibido**\n\n📁 Tipo: ${mediaType}\n\n**Paso 3:** Ahora escribe el texto que acompañará al archivo:\n\n✨ **Formato disponible:**\n**negrita** *cursiva* __subrayado__ ~tachado~\n\`código\` ||spoiler|| [enlace](url)\n\n📝 Este texto aparecerá como descripción del archivo multimedia.`
        : `✅ **Media received**\n\n📁 Type: ${mediaType}\n\n**Step 3:** Now write the text to accompany the file:\n\n✨ **Formatting available:**\n**bold** *italic* __underline__ ~strikethrough~\n\`code\` ||spoiler|| [link](url)\n\n📝 This text will appear as the media caption.`;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Volver" : "« Back",
                callback_data: "admin_broadcast"
              }
            ]
          ]
        }
      });
    }

    logger.info(`Admin ${ctx.from.id} uploaded ${mediaType} for broadcast`);
  } catch (error) {
    logger.error("Error handling broadcast media:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle broadcast wizard text input at step 4
 */
async function handleBroadcastWizardText(ctx, messageText) {
  try {
    const lang = ctx.session.language || "en";
    const wizard = ctx.session.broadcastWizard;

    if (!wizard) {
      logger.error("Broadcast wizard not initialized");
      await ctx.reply(t("errors.generic", lang));
      return;
    }

    // Store the text message
    wizard.text = messageText;
    wizard.step = 5;
    ctx.session.waitingFor = "broadcast_buttons";

    // Ask about buttons
    const message = lang === "es"
      ? `📢 **Asistente de Mensaje Masivo**\n\n**Paso 5 de 5:** ¿Quieres agregar botones al mensaje?\n\nPuedes agregar botones con enlaces o acciones específicas, o presiona 'Enviar' para enviar el mensaje sin botones.`
      : `📢 **Broadcast Wizard**\n\n**Step 5 of 5:** Do you want to add buttons to the message?\n\nYou can add buttons with links or specific actions, or press 'Send' to send the message without buttons.`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "✉️ Enviar sin botones" : "✉️ Send without buttons",
              callback_data: "bcast_send_no_buttons"
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
      }
    });

    logger.info(`Admin ${ctx.from.id} entered broadcast text in wizard`);
  } catch (error) {
    logger.error("Error handling broadcast wizard text:", error);
    await ctx.reply(t("errors.generic", ctx.session.language || "en"));
  }
}

/**
 * Execute the simple broadcast to all users
 */
async function executeBroadcast(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    // Check if we're in wizard mode
    const isWizardMode = !!ctx.session.broadcastWizard;
    const broadcastData = isWizardMode ? ctx.session.broadcastWizard : ctx.session.broadcast;

    if (!broadcastData || (!broadcastData.text && !broadcastData.textEN && !broadcastData.textES)) {
      await ctx.reply(lang === "es" ? "Error: No hay mensaje pendiente" : "Error: No pending message");
      return;
    }

    // Extract data from wizard
    const media = broadcastData.media;
    const text = broadcastData.text;
    const textEN = broadcastData.textEN;
    const textES = broadcastData.textES;
    const multiLanguage = broadcastData.multiLanguage || (textEN && textES);
    const targetLanguage = broadcastData.targetLanguage;
    const targetStatus = broadcastData.targetStatus;
    
    // Get all users
    const usersSnapshot = await db.collection("users").get();
    let users = usersSnapshot.docs.map(doc => ({ 
      userId: doc.id,
      id: doc.id, 
      ...doc.data()
    }));

    // Filter by language if in wizard mode
    if (isWizardMode && targetLanguage !== 'all') {
      users = users.filter(u => (u.language || 'en') === targetLanguage);
    }

    // Filter by status if in wizard mode
    if (isWizardMode && targetStatus) {
      users = users.filter(u => {
        switch(targetStatus) {
          case 'subscribers':
            return u.tier && u.tier !== 'Free' && u.membershipExpiresAt && new Date(u.membershipExpiresAt) > new Date();
          case 'free':
            return !u.tier || u.tier === 'Free';
          case 'churned':
            return u.tier && u.tier !== 'Free' && (!u.membershipExpiresAt || new Date(u.membershipExpiresAt) <= new Date());
          case 'all':
          default:
            return true;
        }
      });
    }

    // Generate segment name for confirmation
    let segmentName = lang === "es" ? "Audiencia seleccionada" : "Selected audience";
    if (isWizardMode) {
      const langLabels = {
        all: lang === "es" ? "Todos" : "All",
        en: "English",
        es: "Español"
      };
      const statusLabels = {
        all: lang === "es" ? "Todos" : "All",
        subscribers: lang === "es" ? "Activos" : "Active",
        free: lang === "es" ? "Nivel Gratuito" : "Free",
        churned: lang === "es" ? "Expirados" : "Expired"
      };
      
      const langName = langLabels[targetLanguage] || "All";
      const statusName = statusLabels[targetStatus] || "All";
      segmentName = `${langName} / ${statusName}`;
    }
    
    // Clear the broadcast session
    if (isWizardMode) {
      ctx.session.broadcastWizard = null;
    } else {
      ctx.session.broadcast = null;
    }

    const broadcastType = media ? 'media + text' : 'text';
    logger.info(`Admin ${ctx.from.id} starting ${broadcastType} broadcast to ${users.length} users`);

    // Send status message
    const statusMsg = await ctx.reply(lang === "es" 
      ? `📢 **Enviando mensaje...**\n\n🎯 **Audiencia:** ${segmentName}\n👥 **Total usuarios:** ${users.length}\n📤 Enviando...`
      : `📢 **Sending broadcast...**\n\n🎯 **Target Audience:** ${segmentName}\n👥 **Total users:** ${users.length}\n📤 Sending...`
    );

    let sent = 0;
    let failed = 0;

    // Send to all users with rate limiting
    for (const user of users) {
      try {
        // Determine message text based on user language for multi-language broadcasts
        let messageText = text;
        if (multiLanguage) {
          const userLang = user.language || 'en';
          messageText = userLang === 'es' ? (textES || text) : (textEN || text);
        }

        if (media) {
          // Send media with caption
          const sendMethod = {
            photo: 'sendPhoto',
            video: 'sendVideo',
            document: 'sendDocument',
            audio: 'sendAudio',
            voice: 'sendVoice',
            video_note: 'sendVideoNote',
            animation: 'sendAnimation',
            sticker: 'sendSticker'
          };

          const method = sendMethod[media.type];
          if (method) {
            await ctx.telegram[method](user.id, media.file_id, {
              caption: messageText,
              parse_mode: "Markdown"
            });
          } else {
            // Fallback: send as document
            await ctx.telegram.sendDocument(user.id, media.file_id, {
              caption: messageText,
              parse_mode: "Markdown"
            });
          }
        } else {
          // Send text only
          await ctx.telegram.sendMessage(user.id, messageText, { parse_mode: "Markdown" });
        }
        
        sent++;
        
        // Rate limiting - wait 100ms between sends
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        logger.warn(`Failed to send broadcast to user ${user.id}:`, error.message);
      }
    }

    // Update status message with results
    const finalMsg = lang === "es"
      ? `✅ **Mensaje enviado**\n\n🎯 **Audiencia:** ${segmentName}\n👥 **Total usuarios:** ${users.length}\n📤 **Enviados:** ${sent}\n❌ **Fallidos:** ${failed}`
      : `✅ **Broadcast completed**\n\n🎯 **Target Audience:** ${segmentName}\n👥 **Total users:** ${users.length}\n📤 **Sent:** ${sent}\n❌ **Failed:** ${failed}`;

    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, finalMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "« Volver al Panel" : "« Back to Panel",
              callback_data: "admin_back"
            }
          ]
        ]
      }
    });

    // Record broadcast analytics
    try {
      const presets = getSegmentPresets();
      const segmentInfo = presets[targetSegment];
      
      await recordBroadcastAnalytics({
        adminId: ctx.from.id.toString(),
        segment: targetSegment,
        segmentName: segmentName,
        targetCount: users.length,
        sentCount: sent,
        failedCount: failed,
        type: broadcastType,
        hasMedia: !!media,
        segmentCriteria: segmentInfo?.criteria || {},
        messageLength: (text || textEN || textES || '').length
      });
    } catch (analyticsError) {
      logger.warn('Failed to record broadcast analytics:', analyticsError);
    }

    logger.info(`Broadcast completed by admin ${ctx.from.id}: ${sent} sent, ${failed} failed`);
    
    // Clear wizard state after successful broadcast
    ctx.session.broadcastWizard = null;
  } catch (error) {
    logger.error("Error executing broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
    // Clear wizard on error as well
    ctx.session.broadcastWizard = null;
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
                }]],
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
            }]],
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
            }]],
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
            }],
          [
            {
              text: lang === "es" ? "❌ Cancelar" : "❌ Cancel",
              callback_data: `admin_user_${userId}`,
            }]],
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
                }]],
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
            }]],
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
                }]],
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
            }]],
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

    // Try to edit the message first, fall back to new message if that fails
    try {
      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Cancelar" : "« Cancel",
                callback_data: "admin_back",
              }]],
        },
      });
    } catch (editError) {
      // If edit fails, send new message
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Cancelar" : "« Cancel",
                callback_data: "admin_back",
              }]],
        },
      });
    }

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
            }],
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            }]],
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
    
    // Activate membership with bot instance for invite link generation and notification
    const result = await activateMembership(userId, tier, "admin", durationDays, bot, {
      paymentMethod: userDoc.data().language === 'es' ? 'Activación Manual' : 'Manual Activation',
      reference: `admin_${Date.now()}`
    });
    
    // Note: activateMembership now automatically sends notification with invite link

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
            }],
          [
            {
              text: lang === "es" ? "« Volver al Panel" : "« Back to Panel",
              callback_data: "admin_back",
            }]],
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

    // Try to edit the message first, fall back to new message if that fails
    try {
      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Cancelar" : "« Cancel",
                callback_data: "admin_back",
              }]],
        },
      });
    } catch (editError) {
      // If edit fails, send new message
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Cancelar" : "« Cancel",
                callback_data: "admin_back",
              }]],
        },
      });
    }

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
            }],
          [
            {
              text: lang === "es" ? "📅 Modificar Expiración" : "📅 Modify Expiration",
              callback_data: `admin_modify_expiration_${userId}`,
            }],
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            }]],
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

    // Try to edit the message first, fall back to new message if that fails
    try {
      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Cancelar" : "« Cancel",
                callback_data: "admin_back",
              }]],
        },
      });
    } catch (editError) {
      // If edit fails, send new message
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "« Cancelar" : "« Cancel",
                callback_data: "admin_back",
              }]],
        },
      });
    }

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
            }],
          [
            {
              text: lang === "es" ? "+4 meses" : "+4 months",
              callback_data: `admin_extend_days_${userId}_120`,
            },
            {
              text: lang === "es" ? "+1 año" : "+1 year",
              callback_data: `admin_extend_days_${userId}_365`,
            }],
          [
            {
              text: lang === "es" ? "💎 Hacer Vitalicio" : "💎 Make Lifetime",
              callback_data: `admin_extend_days_${userId}_999999`,
            }],
          [
            {
              text: lang === "es" ? "✏️ Personalizado" : "✏️ Custom",
              callback_data: `admin_extend_custom_${userId}`,
            }],
          [
            {
              text: lang === "es" ? "« Cancelar" : "« Cancel",
              callback_data: "admin_back",
            }]],
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
      const now = new Date();
      // If membership is expired, extend from today. Otherwise extend from current expiration.
      const baseDate = currentExpiration > now ? currentExpiration : now;
      newExpiration = new Date(baseDate);
      newExpiration.setDate(newExpiration.getDate() + daysToAdd);
    }

    // Update membership expiration with audit trail
    await db.collection("users").doc(userId).update({
      membershipExpiresAt: newExpiration,
      membershipIsPremium: true,
      tierUpdatedAt: new Date(),
      tierUpdatedBy: ctx.from.id.toString(),
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
            }],
          [
            {
              text: lang === "es" ? "« Volver al Panel" : "« Back to Panel",
              callback_data: "admin_back",
            }]],
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

    // Determine if this is a premium membership based on expiration
    const now = new Date();
    const isPremium = newExpiration && newExpiration > now;

    // Update membership expiration with complete audit trail
    await db.collection("users").doc(userId).update({
      membershipExpiresAt: newExpiration,
      membershipIsPremium: isPremium,
      tierUpdatedAt: new Date(),
      tierUpdatedBy: ctx.from.id.toString(),
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
            }],
          [
            {
              text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
              callback_data: "admin_plans",
            }]],
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
            }],
          [
            {
              text: lang === "es" ? "💵 Precio COP" : "💵 COP Price",
              callback_data: `admin_plan_edit_cop_${planName.toLowerCase()}`,
            }],
          [
            {
              text: lang === "es" ? "⏱️ Duración" : "⏱️ Duration",
              callback_data: `admin_plan_edit_duration_${planName.toLowerCase()}`,
            }],
          [
            {
              text: lang === "es" ? "📝 Descripción" : "📝 Description",
              callback_data: `admin_plan_edit_desc_${planName.toLowerCase()}`,
            }],
          [
            {
              text: lang === "es" ? "✨ Características" : "✨ Features",
              callback_data: `admin_plan_edit_features_${planName.toLowerCase()}`,
            }],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_plans",
            }]].filter(row => row.length > 0),
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
            }]],
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
              }],
            [
              {
                text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
                callback_data: "admin_plans",
              }]],
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
    message += `\n${lang === "es" ? "ℹ️ Para ingresos detallados, usar los reportes de Firestore" : "ℹ️ For detailed revenue, use Firestore reports"}`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
              callback_data: "admin_plan_stats",
            }],
          [
            {
              text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
              callback_data: "admin_plans",
            }]],
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
            }],
          [
            {
              text: lang === "es" ? "👤 Ver Profile" : "👤 View Profile",
              callback_data: "admin_menu_view_profile",
            }],
          [
            {
              text: lang === "es" ? "⚙️ Ver Admin" : "⚙️ View Admin",
              callback_data: "admin_menu_view_admin",
            }],
          [
            {
              text: lang === "es" ? "💎 Ver Subscription" : "💎 View Subscription",
              callback_data: "admin_menu_view_subscription",
            }],
          [
            {
              text: lang === "es" ? "🔄 Reload Menus" : "🔄 Reload Menus",
              callback_data: "admin_menu_reload",
            }],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "admin_back",
            }]],
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
            }],
          [
            {
              text: lang === "es" ? "« Volver a Menús" : "« Back to Menus",
              callback_data: "admin_menus",
            }]],
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
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: `admin_menu_view_${menuName}`,
            }]],
      },
    });

    logger.info(`Admin ${ctx.from.id} analyzed ${menuName} menu structure`);
  } catch (error) {
    logger.error("Error analyzing menu structure:", error);
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
            }]],
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
async function handleBroadcastMediaOld(ctx, mediaType) {
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
    logger.info(`Admin callback received: ${action}`, { adminId: ctx.from.id });
    logger.info(`Callback data analysis: startsWith bcast_=${action.startsWith("bcast_")}`);

    if (action === "admin_stats") {
      await ctx.answerCbQuery();
      await showStats(ctx);
    } else if (action === "admin_broadcast") {
      await ctx.answerCbQuery();
      await broadcastMessage(ctx);
    } else if (action === "simple_broadcast_confirm") {
      await ctx.answerCbQuery();
      await executeBroadcast(ctx);
    } else if (action === "broadcast_add_media") {
      await ctx.answerCbQuery();
      await handleBroadcastAddMedia(ctx);
    } else if (action === "broadcast_text_only") {
      await ctx.answerCbQuery();
      await handleBroadcastTextOnly(ctx);
    } else if (action === "broadcast_multi_language") {
      await ctx.answerCbQuery();
      await handleBroadcastMultiLanguage(ctx);
    } else if (action === "broadcast_single_message") {
      await ctx.answerCbQuery();
      await handleBroadcastSingleMessage(ctx);
    } else if (action === "broadcast_multi_text_only") {
      await ctx.answerCbQuery();
      await handleBroadcastMultiTextOnly(ctx);
    } else if (action === "broadcast_formatting_help") {
      await ctx.answerCbQuery();
      await showBroadcastFormattingHelp(ctx);
    } else if (action === "broadcast_select_segment") {
      await ctx.answerCbQuery();
      await showSegmentSelection(ctx);
    } else if (action === "broadcast_all_users") {
      await ctx.answerCbQuery();
      await handleSegmentSelection(ctx, 'all_users');
    } else if (action === "broadcast_segment_more") {
      await ctx.answerCbQuery();
      await showMoreSegmentOptions(ctx);
    } else if (action === "broadcast_back_to_start") {
      await ctx.answerCbQuery();
      await broadcastMessage(ctx);
    } else if (action.startsWith("broadcast_segment_")) {
      const segmentKey = action.replace("broadcast_segment_", "");
      await ctx.answerCbQuery();
      await handleSegmentSelection(ctx, segmentKey);
      await handleSegmentSelection(ctx, segmentKey);
    } else if (action.startsWith("bcast_")) {
      // Handle all broadcast wizard actions
      logger.info(`Processing broadcast wizard action: ${action}`);
      logger.info(`Session broadcastWizard state:`, ctx.session.broadcastWizard);
      
      if (action === "bcast_save_scheduled") {
        await ctx.answerCbQuery();
        await saveScheduledBroadcast(ctx);
      } else if (action.startsWith("bcast_confirm_")) {
        // answerCbQuery is handled inside handleBroadcastWizard for these
        await handleBroadcastWizard(ctx, action);
      } else if (ctx.session.broadcastWizard && ctx.session.broadcastWizard.scheduledForLater) {
        // For scheduled broadcasts, show scheduled confirmation instead of executing
        if (action === "bcast_confirm_send" || action === "bcast_buttons_skip") {
          await ctx.answerCbQuery();
          await showScheduledBroadcastConfirmation(ctx);
        } else {
          // answerCbQuery is handled inside handleBroadcastWizard 
          await handleBroadcastWizard(ctx, action);
        }
      } else {
        // Regular broadcast - answerCbQuery is handled inside handleBroadcastWizard
        await handleBroadcastWizard(ctx, action);
      }
    } else if (action === "admin_users") {
      await ctx.answerCbQuery();
      await listUsers(ctx);
    } else if (action === "admin_list_all") {
      await ctx.answerCbQuery();
      await listAllUsers(ctx, 1);
    } else if (action.startsWith("admin_list_page_")) {
      await ctx.answerCbQuery();
      const page = parseInt(action.split("_").pop());
      await listAllUsers(ctx, page);
    } else if (action === "admin_search_user") {
      await ctx.answerCbQuery();
      await searchUser(ctx);
    } else if (action === "admin_back") {
      await ctx.answerCbQuery();
      await adminPanel(ctx);
    } else if (action.startsWith("admin_edit_tier_")) {
      const userId = action.replace("admin_edit_tier_", "");
      await editUserTier(ctx, userId);
    } else if (action.startsWith("admin_tier:")) {
      // New format: admin_tier:tier:duration:userId
      const parts = action.replace("admin_tier:", "").split(":");
      const tier = parts[0];
      const durationDays = parseInt(parts[1]) || 30;
      const userId = parts[2];
      await setUserTier(ctx, userId, tier, durationDays);
    } else if (action.startsWith("admin_set_tier_")) {
      // Legacy format support
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
    // XP feature not yet implemented - commented out to prevent errors
    // } else if (action.startsWith("admin_give_xp_")) {
    //   const userId = action.replace("admin_give_xp_", "");
    //   await giveXP(ctx, userId);
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
    } else if (action === "admin_menu_reload") {
      await reloadMenus(ctx);
    } else if (action === "admin_scheduled_broadcasts") {
      await showScheduledBroadcasts(ctx);
    } else if (action.startsWith("admin_schedule_broadcast_")) {
      await startScheduleBroadcast(ctx);
    } else if (action.startsWith("admin_cancel_broadcast_")) {
      const broadcastId = action.replace("admin_cancel_broadcast_", "");
      await executeCancelBroadcast(ctx, broadcastId);
    } else if (action === "admin_broadcast_analytics") {
      await ctx.answerCbQuery();
      await showBroadcastAnalytics(ctx);
    } else if (action === "admin_analytics_segments") {
      await ctx.answerCbQuery();
      await showAnalyticsBySegment(ctx);
    } else if (action === "admin_payment_broadcast") {
      await ctx.answerCbQuery();
      await sendPaymentBroadcast(ctx);
    } else if (action === "admin_payment_broadcast_confirm") {
      await ctx.answerCbQuery();
      await executePaymentBroadcast(ctx);
    } else if (action === "admin_kyrrex_dashboard") {
      await showKyrrexDashboard(ctx);
    } else if (action === "admin_kyrrex_recent") {
      await showRecentPayments(ctx);
    } else if (action === "admin_kyrrex_pending") {
      await showPendingPayments(ctx);
    } else if (action.startsWith("admin_kyrrex_confirm_") && !action.includes("_yes_")) {
      await handlePaymentConfirmation(ctx);
    } else if (action.startsWith("admin_kyrrex_confirm_yes_")) {
      await executePaymentConfirmation(ctx);
    } else if (action === "admin_kyrrex_balances") {
      await showBalances(ctx);
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

      // Notify all groups about the new scheduled event
      try {
        const groupsSnapshot = await db.collection('groups').get();
        
        const eventAnnouncement = lang === "es"
          ? `📅 *Evento Programado*\n\n🎯 ${wizard.text.substring(0, 100)}${wizard.text.length > 100 ? '...' : ''}\n\n🕐 Hora: ${wizard.scheduledTime.toLocaleString('es-CO')}\n\n💡 Usa /upcoming para ver todos los eventos programados.`
          : `📅 *Scheduled Event*\n\n🎯 ${wizard.text.substring(0, 100)}${wizard.text.length > 100 ? '...' : ''}\n\n🕐 Time: ${wizard.scheduledTime.toLocaleString('en-US')}\n\n💡 Use /upcoming to see all scheduled events.`;

        for (const groupDoc of groupsSnapshot.docs) {
          try {
            const groupData = groupDoc.data();
            const groupId = groupData.telegramGroupId || groupDoc.id;
            
            if (groupId) {
              await ctx.telegram.sendMessage(groupId, eventAnnouncement, { parse_mode: 'Markdown' });
            }
          } catch (error) {
            logger.warn(`Failed to send event notification to group:`, error.message);
          }
        }
        
        logger.info(`Event notification sent to ${groupsSnapshot.size} groups`);
      } catch (error) {
        logger.error('Error sending group event notifications:', error);
        // Don't fail the operation if notifications fail
      }

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

/**
 * Show broadcast analytics dashboard
 */
async function showBroadcastAnalytics(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    const loadingMsg = lang === "es" 
      ? "📈 **Analíticas de Broadcasts**\n\n_Cargando datos..._"
      : "📈 **Broadcast Analytics**\n\n_Loading data..._";
    
    const sentMessage = await ctx.editMessageText(loadingMsg, { parse_mode: "Markdown" });
    
    // Get analytics data for last 30 days
    const analytics = await getBroadcastAnalytics(30);
    const topSegments = await getTopPerformingSegments(5, 30);
    
    let message = lang === "es" 
      ? "📈 **Analíticas de Broadcasts** (últimos 30 días)\n\n"
      : "📈 **Broadcast Analytics** (last 30 days)\n\n";
    
    // Overall stats
    message += lang === "es"
      ? `📊 **Resumen General:**\n• Total broadcasts: ${analytics.totalBroadcasts}\n• Mensajes enviados: ${analytics.totalMessagesSent.toLocaleString()}\n• Usuarios objetivo: ${analytics.totalTargeted.toLocaleString()}\n• Tasa de éxito: ${analytics.overallSuccessRate.toFixed(1)}%\n\n`
      : `📊 **Overall Summary:**\n• Total broadcasts: ${analytics.totalBroadcasts}\n• Messages sent: ${analytics.totalMessagesSent.toLocaleString()}\n• Users targeted: ${analytics.totalTargeted.toLocaleString()}\n• Success rate: ${analytics.overallSuccessRate.toFixed(1)}%\n\n`;
    
    // Top performing segments
    if (topSegments.length > 0) {
      message += lang === "es" ? `🎯 **Mejores Segmentos:**\n` : `🎯 **Top Performing Segments:**\n`;
      
      topSegments.forEach((segment, index) => {
        const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";
        message += `${emoji} ${segment.name}: ${segment.successRate.toFixed(1)}% (${segment.broadcastCount} broadcasts)\n`;
      });
      message += "\n";
    }
    
    // Recent broadcasts
    if (analytics.recentBroadcasts.length > 0) {
      message += lang === "es" ? `📋 **Broadcasts Recientes:**\n` : `📋 **Recent Broadcasts:**\n`;
      
      analytics.recentBroadcasts.slice(0, 5).forEach(broadcast => {
        const date = broadcast.createdAt.toLocaleDateString();
        const mediaIcon = broadcast.hasMedia ? "📸" : "📝";
        message += `${mediaIcon} ${date}: ${broadcast.segment} (${broadcast.sent}/${broadcast.targeted} - ${broadcast.successRate.toFixed(1)}%)\n`;
      });
    }
    
    if (analytics.totalBroadcasts === 0) {
      message += lang === "es" 
        ? "_No hay datos de broadcasts disponibles._"
        : "_No broadcast data available._";
    }
    
    const keyboard = [
      [
        {
          text: lang === "es" ? "📊 Ver por Segmento" : "📊 View by Segment",
          callback_data: "admin_analytics_segments"
        }
      ],
      [
        {
          text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
          callback_data: "admin_broadcast_analytics"
        }
      ],
      [
        {
          text: lang === "es" ? "« Volver al Panel" : "« Back to Panel",
          callback_data: "admin_back"
        }
      ]
    ];
    
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`Admin ${ctx.from.id} viewed broadcast analytics dashboard`);
  } catch (error) {
    logger.error("Error showing broadcast analytics:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show analytics by segment
 */
async function showAnalyticsBySegment(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    const analytics = await getBroadcastAnalytics(30);
    
    let message = lang === "es" 
      ? "📊 **Analíticas por Segmento** (últimos 30 días)\n\n"
      : "📊 **Analytics by Segment** (last 30 days)\n\n";
    
    const segments = Object.entries(analytics.segmentBreakdown)
      .sort((a, b) => b[1].averageSuccessRate - a[1].averageSuccessRate);
    
    if (segments.length === 0) {
      message += lang === "es" 
        ? "_No hay datos de segmentos disponibles._"
        : "_No segment data available._";
    } else {
      segments.forEach(([key, data]) => {
        const successIcon = data.averageSuccessRate >= 90 ? "🟢" : 
                           data.averageSuccessRate >= 80 ? "🟡" : "🔴";
        
        message += `${successIcon} **${data.name}**\n`;
        message += lang === "es"
          ? `   • Broadcasts: ${data.count}\n   • Enviados: ${data.totalSent.toLocaleString()}\n   • Tasa de éxito: ${data.averageSuccessRate.toFixed(1)}%\n\n`
          : `   • Broadcasts: ${data.count}\n   • Sent: ${data.totalSent.toLocaleString()}\n   • Success rate: ${data.averageSuccessRate.toFixed(1)}%\n\n`;
      });
    }
    
    const keyboard = [
      [
        {
          text: lang === "es" ? "« Volver a Analíticas" : "« Back to Analytics",
          callback_data: "admin_broadcast_analytics"
        }
      ]
    ];
    
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`Admin ${ctx.from.id} viewed analytics by segment`);
  } catch (error) {
    logger.error("Error showing analytics by segment:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * ===============================================
 * PAYMENT CONFIRMATION SYSTEM
 * ===============================================
 */

/**
 * Handle payment confirmation start - show plan selection
 */
async function handlePaymentConfirmationStart(ctx) {
  try {
    const lang = ctx.session.language || "en";
    const plans = require("../../config/plans");
    
    const activePlans = [
      plans.TRIAL_WEEK,
      plans.PNP_MEMBER,
      plans.PNP_CRYSTAL,
      plans.PNP_DIAMOND,
      plans.LIFETIME_PASS
    ].filter(plan => plan.active);

    const keyboard = activePlans.map(plan => [{
      text: `${getPlanEmoji(plan.id)} ${plan.displayName} - $${plan.price}`,
      callback_data: `payment_confirm_${plan.id}`
    }]);

    keyboard.push([{
      text: lang === "es" ? "← Volver" : "← Back",
      callback_data: "back_to_main"
    }]);

    await ctx.editMessageText(t("paymentConfirmationStart", lang), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard
      }
    });

    logger.info(`User ${ctx.from.id} started payment confirmation process`);
  } catch (error) {
    logger.error("Error handling payment confirmation start:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle payment plan selection
 */
async function handlePaymentPlanSelection(ctx, planId) {
  try {
    const lang = ctx.session.language || "en";
    const plans = require("../../config/plans");
    
    // Find the selected plan
    const plan = Object.values(plans).find(p => p.id === planId);
    if (!plan) {
      await ctx.reply(lang === "es" ? "❌ Plan no encontrado" : "❌ Plan not found");
      return;
    }

    // Generate reference number
    const reference = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    
    // Store payment info in session
    ctx.session.waitingForPaymentProof = planId;
    ctx.session.paymentConfirmation = {
      plan: plan,
      reference: reference,
      timestamp: new Date(),
      userId: ctx.from.id
    };

    // Create payment receipt message
    const messageText = t("paymentReceiptRequest", lang)
      .replace("{amount}", plan.price.toString())
      .replace("{amountCOP}", plan.priceInCOP.toLocaleString())
      .replace("{reference}", reference)
      .replace("{planName}", plan.displayName);

    const keyboard = [
      [{
        text: lang === "es" ? "📞 Contactar Admin @pnptvadmin" : "📞 Contact Admin @pnptvadmin",
        url: "https://t.me/pnptvadmin"
      }],
      [{
        text: lang === "es" ? "← Volver al Menú" : "← Back to Menu",
        callback_data: "back_to_main"
      }]
    ];

    await ctx.editMessageText(messageText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard
      }
    });

    logger.info(`User ${ctx.from.id} selected plan ${planId} for payment confirmation`);
  } catch (error) {
    logger.error("Error handling payment plan selection:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Show all plans for payment (alternative entry point)
 */
async function showAllPlansForPayment(ctx) {
  await handlePaymentConfirmationStart(ctx);
}

/**
 * Handle payment proof upload (photo/document)
 */
async function handlePaymentProofUpload(ctx, mediaType) {
  try {
    const lang = ctx.session.language || "en";
    
    if (!ctx.session.waitingForPaymentProof || !ctx.session.paymentConfirmation) {
      await ctx.reply(lang === "es" ? "❌ No hay solicitud de pago pendiente" : "❌ No pending payment request");
      return;
    }

    const { plan, reference } = ctx.session.paymentConfirmation;
    
    // Get media info
    let mediaInfo = {};
    if (mediaType === "photo") {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      mediaInfo = {
        file_id: photo.file_id,
        file_unique_id: photo.file_unique_id,
        type: "photo"
      };
    } else if (mediaType === "document") {
      mediaInfo = {
        file_id: ctx.message.document.file_id,
        file_unique_id: ctx.message.document.file_unique_id,
        file_name: ctx.message.document.file_name,
        type: "document"
      };
    }

    // Store payment proof in Firestore
    await db.collection("payment_proofs").add({
      userId: ctx.from.id,
      username: ctx.from.username || "N/A",
      planId: plan.id,
      planName: plan.displayName,
      planPrice: plan.price,
      reference: reference,
      mediaInfo: mediaInfo,
      timestamp: new Date(),
      status: "pending",
      adminNotified: false
    });

    // Notify user
    const confirmationText = t("paymentProofReceived", lang)
      .replace("{reference}", reference);

    await ctx.reply(confirmationText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{
          text: lang === "es" ? "🏠 Menú Principal" : "🏠 Main Menu",
          callback_data: "back_to_main"
        }]]
      }
    });

    // Forward to admin
    const adminIds = process.env.ADMIN_IDS?.split(',') || [];
    const adminMessage = `💰 **New Payment Proof Received**\n\n👤 **User:** @${ctx.from.username || 'N/A'} (${ctx.from.id})\n💎 **Plan:** ${plan.displayName}\n💰 **Amount:** $${plan.price} USD\n🔖 **Reference:** COP${reference}\n📅 **Date:** ${new Date().toLocaleString()}\n\n📸 **Proof attached below:**`;

    for (const adminId of adminIds) {
      try {
        await ctx.telegram.sendMessage(adminId, adminMessage, { parse_mode: "Markdown" });
        
        // Forward the media
        if (mediaType === "photo") {
          await ctx.telegram.sendPhoto(adminId, mediaInfo.file_id, {
            caption: `Payment proof for ${plan.displayName} - User: ${ctx.from.id}`
          });
        } else if (mediaType === "document") {
          await ctx.telegram.sendDocument(adminId, mediaInfo.file_id, {
            caption: `Payment proof for ${plan.displayName} - User: ${ctx.from.id}`
          });
        }
      } catch (adminError) {
        logger.error(`Failed to notify admin ${adminId}:`, adminError);
      }
    }

    // Clear session state
    ctx.session.waitingForPaymentProof = null;
    ctx.session.paymentConfirmation = null;

    logger.info(`Payment proof received from user ${ctx.from.id} for plan ${plan.id}`);
  } catch (error) {
    logger.error("Error handling payment proof upload:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Send payment button to channel/group (admin command)
 */
async function sendPaymentButton(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply(lang === "es" ? "❌ No autorizado" : "❌ Unauthorized");
      return;
    }

    const messageText = t("paymentChannelMessage", lang);
    
    let keyboard = [[{
      text: lang === "es" ? "💰 Hice Mi Pago" : "💰 I Made My Payment",
      callback_data: "payment_confirmation_start"
    }]];
    
    keyboard = addOptOutButton(keyboard, lang);

    await ctx.reply(messageText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard
      }
    });

    logger.info(`Admin ${ctx.from.id} sent payment button to chat ${ctx.chat.id}`);
  } catch (error) {
    logger.error("Error sending payment button:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Send payment broadcast to all users
 */
async function sendPaymentBroadcast(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply(lang === "es" ? "❌ No autorizado" : "❌ Unauthorized");
      return;
    }

    // Show confirmation dialog
    const confirmationText = lang === "es" 
      ? "💰 **Confirmar Transmisión de Pagos**\n\n¿Enviar mensaje de confirmación de pago a todos los usuarios?\n\nEste mensaje incluirá:\n• Botón \"Hice Mi Pago\"\n• Opción para seleccionar plan\n• Sistema de comprobante de pago\n\n**Usuarios que recibirán:** Todos los usuarios registrados"
      : "💰 **Confirm Payment Broadcast**\n\nSend payment confirmation message to all users?\n\nThis message will include:\n• \"I Made My Payment\" button\n• Plan selection option\n• Payment proof system\n\n**Recipients:** All registered users";

    await ctx.editMessageText(confirmationText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "✅ Confirmar Envío" : "✅ Confirm Send",
              callback_data: "admin_payment_broadcast_confirm"
            }
          ],
          [
            {
              text: lang === "es" ? "❌ Cancelar" : "❌ Cancel",
              callback_data: "admin_back"
            }
          ]
        ]
      }
    });

    logger.info(`Admin ${ctx.from.id} initiated payment broadcast confirmation`);
  } catch (error) {
    logger.error("Error showing payment broadcast confirmation:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute payment broadcast to all users
 */
async function executePaymentBroadcast(ctx) {
  try {
    const lang = ctx.session.language || "en";
    
    // Show progress message
    const progressMsg = await ctx.editMessageText(
      lang === "es" ? "📤 Enviando transmisión de pagos..." : "📤 Sending payment broadcast...",
      { parse_mode: "Markdown" }
    );

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.onboardingComplete && !userData.broadcastOptOut) {
        users.push({
          userId: doc.id,
          language: userData.language || "en"
        });
      }
    });

    let successCount = 0;
    let failureCount = 0;

    // Send to users in batches
    const batchSize = 20;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (user) => {
        try {
          const userLang = user.language;
          const messageText = t("paymentBroadcastMessage", userLang);
          
          const keyboard = [[{
            text: userLang === "es" ? "💰 Hice Mi Pago" : "💰 I Made My Payment",
            callback_data: "payment_confirmation_start"
          }], [{
            text: userLang === "es" ? "💎 Ver Todos los Planes" : "💎 View All Plans",
            callback_data: "show_all_plans"
          }], [{
            text: userLang === "es" ? "🔕 No recibir transmisiones" : "🔕 Opt out from broadcasts",
            callback_data: "broadcast_opt_out"
          }]];

          await ctx.telegram.sendMessage(user.userId, messageText, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          
          successCount++;
        } catch (error) {
          logger.error(`Failed to send payment broadcast to user ${user.userId}:`, error);
          failureCount++;
        }
      }));

      // Rate limiting - wait between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update progress
      const progress = Math.round(((i + batchSize) / users.length) * 100);
      if (progress % 20 === 0) {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            undefined,
            lang === "es" 
              ? `📤 Enviando transmisión de pagos... ${progress}%`
              : `📤 Sending payment broadcast... ${progress}%`
          );
        } catch (editError) {
          // Ignore edit errors
        }
      }
    }

    // Final report
    const reportText = lang === "es"
      ? `✅ **Transmisión de Pagos Completada**\n\n📊 **Resultados:**\n• Enviados exitosamente: ${successCount}\n• Fallos: ${failureCount}\n• Total de usuarios: ${users.length}\n\n🎯 Los usuarios pueden ahora usar el botón "Hice Mi Pago" para confirmar sus pagos.`
      : `✅ **Payment Broadcast Complete**\n\n📊 **Results:**\n• Successfully sent: ${successCount}\n• Failed: ${failureCount}\n• Total users: ${users.length}\n\n🎯 Users can now use the "I Made My Payment" button to confirm their payments.`;

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      progressMsg.message_id,
      undefined,
      reportText,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{
            text: lang === "es" ? "🏠 Panel Admin" : "🏠 Admin Panel",
            callback_data: "admin_back"
          }]]
        }
      }
    );

    logger.info(`Payment broadcast completed by admin ${ctx.from.id}: ${successCount} sent, ${failureCount} failed`);
  } catch (error) {
    logger.error("Error executing payment broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Handle opt-out command
 */
async function handleOptOut(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id.toString();

    // Check current status
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (userData?.broadcastOptOut) {
      await ctx.reply(t("alreadyOptedOut", lang), { parse_mode: "Markdown" });
      return;
    }

    // Opt out user
    await db.collection("users").doc(userId).update({
      broadcastOptOut: true,
      optOutDate: new Date()
    });

    await ctx.reply(t("optOutConfirmation", lang), { parse_mode: "Markdown" });

    logger.info(`User ${userId} opted out from broadcasts`);
  } catch (error) {
    logger.error("Error handling opt-out:", error);
    await ctx.reply(t("error", ctx.session?.language || "en"));
  }
}

/**
 * Handle opt-in command
 */
async function handleOptIn(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id.toString();

    // Check current status
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.broadcastOptOut) {
      await ctx.reply(t("alreadyOptedIn", lang), { parse_mode: "Markdown" });
      return;
    }

    // Opt in user
    await db.collection("users").doc(userId).update({
      broadcastOptOut: false,
      optInDate: new Date()
    });

    await ctx.reply(t("optInConfirmation", lang), { parse_mode: "Markdown" });

    logger.info(`User ${userId} opted back in to broadcasts`);
  } catch (error) {
    logger.error("Error handling opt-in:", error);
    await ctx.reply(t("error", ctx.session?.language || "en"));
  }
}

/**
 * Handle opt-out callback from broadcast button
 */
async function handleOptOutCallback(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id.toString();

    // Opt out user
    await db.collection("users").doc(userId).update({
      broadcastOptOut: true,
      optOutDate: new Date()
    });

    await ctx.editMessageText(t("optOutConfirmation", lang), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{
          text: lang === "es" ? "🏠 Menú Principal" : "🏠 Main Menu",
          callback_data: "back_to_main"
        }]]
      }
    });

    logger.info(`User ${userId} opted out from broadcasts via button`);
  } catch (error) {
    logger.error("Error handling opt-out callback:", error);
    await ctx.reply(t("error", ctx.session?.language || "en"));
  }
}

/**
 * Add opt-out button to keyboard
 */
function addOptOutButton(keyboard, userLang) {
  if (!keyboard) {
    keyboard = [];
  }
  
  // Add opt-out button as last row
  keyboard.push([{
    text: userLang === "es" ? "🔕 No recibir transmisiones" : "🔕 Opt out from broadcasts",
    callback_data: "broadcast_opt_out"
  }]);
  
  return keyboard;
}

/**
 * Get emoji for plan
 */
function getPlanEmoji(planId) {
  const emojis = {
    'trial-week': '🔥',
    'pnp-member': '⭐',
    'crystal-member': '💎',
    'diamond-member': '👑',
    'lifetime-pass': '🌟'
  };
  return emojis[planId] || '💎';
}

module.exports = {
  adminPanel,
  showStats,
  listUsers,
  broadcastMessage,
  sendBroadcast,
  handleBroadcastMedia,
  handleBroadcastWizardText,
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
  showScheduledBroadcasts,
  startScheduleBroadcast,
  handleScheduleBroadcastDate,
  showScheduledBroadcastConfirmation,
  saveScheduledBroadcast,
  executeCancelBroadcast,
  handleBroadcastEnglishMessage,
  handleBroadcastSpanishMessage,
  showBroadcastFormattingHelp,
  showSegmentSelection,
  showMoreSegmentOptions,
  handleSegmentSelection,
  handlePaymentConfirmationStart,
  handlePaymentPlanSelection,
  showAllPlansForPayment,
  handlePaymentProofUpload,
  sendPaymentButton,
  sendPaymentBroadcast,
  executePaymentBroadcast,
  handleOptOut,
  handleOptIn,
  handleOptOutCallback,
  addOptOutButton,
};
