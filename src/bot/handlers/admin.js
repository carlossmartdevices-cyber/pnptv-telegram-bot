const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { getMenu } = require("../../config/menus");

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
    let silverTier = 0;
    let goldenTier = 0;
    let activeToday = 0;
    let activeThisWeek = 0;
    let withPhotos = 0;
    let withLocations = 0;
    let totalXP = 0;
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
      else if (tier === "Silver") silverTier++;
      else if (tier === "Golden") goldenTier++;

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

      // Sum XP
      totalXP += userData.xp || 0;
    });

    // Calculate percentages
    const photoPercentage = totalUsers > 0 ? Math.round((withPhotos / totalUsers) * 100) : 0;
    const locationPercentage = totalUsers > 0 ? Math.round((withLocations / totalUsers) * 100) : 0;
    const onboardingPercentage = totalUsers > 0 ? Math.round((onboardingComplete / totalUsers) * 100) : 0;
    const avgXP = totalUsers > 0 ? Math.round(totalXP / totalUsers) : 0;

    // Calculate revenue (estimates)
    const monthlyRevenue = (silverTier * 15) + (goldenTier * 25);
    const annualRevenue = monthlyRevenue * 12;

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
    message += `• Silver: ${silverTier} (${totalUsers > 0 ? Math.round((silverTier / totalUsers) * 100) : 0}%)\n`;
    message += `• Golden: ${goldenTier} (${totalUsers > 0 ? Math.round((goldenTier / totalUsers) * 100) : 0}%)\n\n`;

    message += lang === "es"
      ? `✨ **Características**\n`
      : `✨ **Features**\n`;
    message += `• Con foto: ${withPhotos} (${photoPercentage}%)\n`;
    message += `• Con ubicación: ${withLocations} (${locationPercentage}%)\n`;
    message += `• XP promedio: ${avgXP}\n\n`;

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
    await ctx.reply(t("error", lang));
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
      const tierIcon = user.tier === "Golden" ? "🥇" : user.tier === "Silver" ? "🥈" : "⚪";
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
    message += `⭐ XP: ${userData.xp || 0}\n`;
    message += `🏆 Badges: ${userData.badges?.join(", ") || "None"}\n`;
    message += `📸 Photo: ${userData.photoFileId ? "Yes" : "No"}\n`;
    message += `📍 Location: ${userData.location ? "Yes" : "No"}\n`;
    message += `📝 Bio: ${userData.bio || "Not set"}\n\n`;

    const createdAt = userData.createdAt?.toDate();
    const lastActive = userData.lastActive?.toDate();

    message += `📅 Created: ${createdAt ? createdAt.toLocaleDateString() : "Unknown"}\n`;
    message += `🕐 Last Active: ${lastActive ? lastActive.toLocaleString() : "Unknown"}\n`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "✏️ Editar Tier" : "✏️ Edit Tier",
              callback_data: `admin_edit_tier_${userId}`,
            },
            {
              text: lang === "es" ? "🎁 Dar XP" : "🎁 Give XP",
              callback_data: `admin_give_xp_${userId}`,
            },
          ],
          [
            {
              text: lang === "es" ? "💬 Mensaje" : "💬 Message",
              callback_data: `admin_message_${userId}`,
            },
            {
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
        ],
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
              callback_data: `admin_set_tier_${userId}_Free`,
            },
          ],
          [
            {
              text: "🥈 Silver",
              callback_data: `admin_set_tier_${userId}_Silver`,
            },
          ],
          [
            {
              text: "🥇 Golden",
              callback_data: `admin_set_tier_${userId}_Golden`,
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
 * Set user tier
 */
async function setUserTier(ctx, userId, tier) {
  try {
    const lang = ctx.session.language || "en";

    await db.collection("users").doc(userId).update({
      tier: tier,
      tierUpdatedAt: new Date(),
      tierUpdatedBy: "admin",
    });

    // Notify user
    try {
      const message = lang === "es"
        ? `🎉 ¡Felicitaciones!\n\nTu tier ha sido actualizado a: **${tier}**\n\nDisfruta tus nuevas características.`
        : `🎉 Congratulations!\n\nYour tier has been upgraded to: **${tier}**\n\nEnjoy your new features!`;

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about tier change:`, e.message);
    }

    await ctx.answerCbQuery(
      lang === "es"
        ? `✅ Tier actualizado a ${tier}`
        : `✅ Tier updated to ${tier}`
    );

    // Refresh user details
    const userDoc = await db.collection("users").doc(userId).get();
    await showUserDetails(ctx, userId, userDoc.data());

    logger.info(`Admin ${ctx.from.id} set tier ${tier} for user: ${userId}`);
  } catch (error) {
    logger.error("Error setting user tier:", error);
    await ctx.answerCbQuery(t("error", lang));
  }
}

/**
 * Broadcast message to all users
 */
async function broadcastMessage(ctx) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = "broadcast_message";

    const message = lang === "es"
      ? "📢 **Mensaje Masivo**\n\nEnvía el mensaje que quieres enviar a todos los usuarios:"
      : "📢 **Broadcast Message**\n\nSend the message you want to broadcast to all users:";

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} initiated broadcast`);
  } catch (error) {
    logger.error("Error in broadcast:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Send broadcast message to all users
 */
async function sendBroadcast(ctx, message) {
  try {
    const lang = ctx.session.language || "en";

    const statusMsg = await ctx.reply(
      lang === "es"
        ? "📤 Enviando mensaje masivo..."
        : "📤 Sending broadcast message..."
    );

    const usersSnapshot = await db.collection("users").get();
    let sentCount = 0;
    let failedCount = 0;

    for (const doc of usersSnapshot.docs) {
      try {
        const userId = doc.id;
        await ctx.telegram.sendMessage(userId, message, {
          parse_mode: "Markdown",
        });
        sentCount++;
      } catch (error) {
        failedCount++;
        logger.warn(`Failed to send broadcast to user ${doc.id}:`, error.message);
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

    await ctx.reply(
      lang === "es"
        ? `✅ Mensaje enviado exitosamente.\n\n✉️ Enviados: ${sentCount}\n❌ Fallidos: ${failedCount}`
        : `✅ Broadcast sent successfully.\n\n✉️ Sent: ${sentCount}\n❌ Failed: ${failedCount}`,
      { parse_mode: "Markdown" }
    );

    logger.info(`Admin ${ctx.from.id} sent broadcast to ${sentCount} users`);

    ctx.session.waitingFor = null;
  } catch (error) {
    logger.error("Error sending broadcast:", error);
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
    await ctx.answerCbQuery();

    if (action === "admin_stats") {
      await showStats(ctx);
    } else if (action === "admin_broadcast") {
      await broadcastMessage(ctx);
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
      await setUserTier(ctx, userId, tier);
    } else if (action.startsWith("admin_user_")) {
      const userId = action.replace("admin_user_", "");
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        await showUserDetails(ctx, userId, userDoc.data());
      }
    } else if (action === "admin_plans") {
      await ctx.reply(
        lang === "es"
          ? "💰 Gestión de planes estará disponible pronto."
          : "💰 Plan management coming soon."
      );
    } else if (action === "admin_menus") {
      await ctx.reply(
        lang === "es"
          ? "📋 Configuración de menús estará disponible pronto."
          : "📋 Menu configuration coming soon."
      );
    }
  } catch (error) {
    logger.error("Error handling admin callback:", error);
    await ctx.reply(t("error", lang));
  }
}

module.exports = {
  adminPanel,
  showStats,
  listUsers,
  broadcastMessage,
  sendBroadcast,
  handleAdminCallback,
  executeSearch,
};
