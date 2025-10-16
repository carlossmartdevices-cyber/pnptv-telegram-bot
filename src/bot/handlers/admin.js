const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { getMenu } = require("../../config/menus");
const { activateMembership, getExpiringMemberships } = require("../../utils/membershipManager");
const { runManualExpirationCheck } = require("../../services/scheduler");

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

    message += `⭐ XP: ${userData.xp || 0}\n`;
    message += `🏆 Badges: ${userData.badges?.join(", ") || "None"}\n`;
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
          text: lang === "es" ? "🎁 Dar XP" : "🎁 Give XP",
          callback_data: `admin_give_xp_${userId}`,
        },
      ],
      [
        {
          text: lang === "es" ? "💬 Mensaje" : "💬 Message",
          callback_data: `admin_message_${userId}`,
        },
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
              text: "🥈 Silver (30 days)",
              callback_data: `admin_set_tier_${userId}_Silver_30`,
            },
          ],
          [
            {
              text: "🥈 Silver (60 days)",
              callback_data: `admin_set_tier_${userId}_Silver_60`,
            },
          ],
          [
            {
              text: "🥈 Silver (90 days)",
              callback_data: `admin_set_tier_${userId}_Silver_90`,
            },
          ],
          [
            {
              text: "🥇 Golden (30 days)",
              callback_data: `admin_set_tier_${userId}_Golden_30`,
            },
          ],
          [
            {
              text: "🥇 Golden (60 days)",
              callback_data: `admin_set_tier_${userId}_Golden_60`,
            },
          ],
          [
            {
              text: "🥇 Golden (90 days)",
              callback_data: `admin_set_tier_${userId}_Golden_90`,
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
      const tierIcon = user.tier === "Golden" ? "🥇" : "🥈";
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
 * Give XP to user
 */
async function giveXP(ctx, userId) {
  try {
    const lang = ctx.session.language || "en";

    ctx.session.waitingFor = `admin_give_xp_${userId}`;

    const message = lang === "es"
      ? `🎁 **Dar XP**\n\nUsuario: \`${userId}\`\n\nEnvía la cantidad de XP a dar (ejemplo: 100):`
      : `🎁 **Give XP**\n\nUser: \`${userId}\`\n\nSend the amount of XP to give (example: 100):`;

    await ctx.reply(message, { parse_mode: "Markdown" });

    logger.info(`Admin ${ctx.from.id} initiated XP gift for user: ${userId}`);
  } catch (error) {
    logger.error("Error in give XP:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
  }
}

/**
 * Execute XP gift
 */
async function executeGiveXP(ctx, userId, amount) {
  try {
    const lang = ctx.session.language || "en";

    const xpAmount = parseInt(amount);
    if (isNaN(xpAmount) || xpAmount <= 0) {
      await ctx.reply(
        lang === "es"
          ? "❌ Cantidad inválida. Envía un número positivo."
          : "❌ Invalid amount. Send a positive number."
      );
      return;
    }

    // Get current user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      await ctx.reply(
        lang === "es" ? "❌ Usuario no encontrado." : "❌ User not found."
      );
      return;
    }

    const userData = userDoc.data();
    const currentXP = userData.xp || 0;
    const newXP = currentXP + xpAmount;

    // Update XP
    await db.collection("users").doc(userId).update({
      xp: newXP,
      lastActive: new Date(),
    });

    // Notify user
    try {
      const userLang = userData.language || "en";
      const message = userLang === "es"
        ? `🎁 ¡Felicitaciones!\n\nHas recibido **${xpAmount} XP** de parte de un administrador.\n\nXP Total: ${newXP}`
        : `🎁 Congratulations!\n\nYou've received **${xpAmount} XP** from an administrator.\n\nTotal XP: ${newXP}`;

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about XP gift:`, e.message);
    }

    await ctx.reply(
      lang === "es"
        ? `✅ **XP Otorgado**\n\n👤 Usuario: \`${userId}\`\n🎁 XP dado: ${xpAmount}\n⭐ XP nuevo: ${newXP}`
        : `✅ **XP Given**\n\n👤 User: \`${userId}\`\n🎁 XP given: ${xpAmount}\n⭐ New XP: ${newXP}`,
      { parse_mode: "Markdown" }
    );

    logger.info(`Admin ${ctx.from.id} gave ${xpAmount} XP to user: ${userId}`);
    ctx.session.waitingFor = null;
  } catch (error) {
    logger.error("Error executing give XP:", error);
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

    // Get premium users
    const premiumSnapshot = await db
      .collection("users")
      .where("tier", "in", ["Silver", "Golden"])
      .orderBy("tierUpdatedAt", "desc")
      .limit(50)
      .get();

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

    premiumSnapshot.forEach((doc, index) => {
      const userData = doc.data();
      const tierIcon = userData.tier === "Golden" ? "🥇" : "🥈";

      let expiryInfo = "";
      if (userData.membershipExpiresAt) {
        const expiresAt = userData.membershipExpiresAt.toDate();
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        expiryInfo = daysRemaining > 0 ? ` (${daysRemaining}d)` : ` (⚠️)`;
      }

      message += `${index + 1}. ${tierIcon} @${userData.username || "Anonymous"}${expiryInfo}\n`;
      message += `   ID: \`${doc.id}\` | XP: ${userData.xp || 0}\n\n`;
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
      const tierIcon = userData.tier === "Golden" ? "🥇" : userData.tier === "Silver" ? "🥈" : "⚪";
      const createdAt = userData.createdAt?.toDate();
      const daysAgo = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));

      message += `${index + 1}. ${tierIcon} @${userData.username || "Anonymous"}\n`;
      message += `   ID: \`${doc.id}\` | ${daysAgo}d ago | XP: ${userData.xp || 0}\n\n`;
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
              text: "🥈 Silver (30 days)",
              callback_data: `admin_quick_activate_${userId}_Silver_30`,
            },
          ],
          [
            {
              text: "🥈 Silver (60 days)",
              callback_data: `admin_quick_activate_${userId}_Silver_60`,
            },
          ],
          [
            {
              text: "🥈 Silver (90 days)",
              callback_data: `admin_quick_activate_${userId}_Silver_90`,
            },
          ],
          [
            {
              text: "🥇 Golden (30 days)",
              callback_data: `admin_quick_activate_${userId}_Golden_30`,
            },
          ],
          [
            {
              text: "🥇 Golden (60 days)",
              callback_data: `admin_quick_activate_${userId}_Golden_60`,
            },
          ],
          [
            {
              text: "🥇 Golden (90 days)",
              callback_data: `admin_quick_activate_${userId}_Golden_90`,
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

    // Activate membership
    const result = await activateMembership(userId, tier, "admin", durationDays);

    const userData = userDoc.data();
    const userLang = userData.language || "en";

    // Notify user
    try {
      let message = userLang === "es"
        ? `🎉 ¡Felicitaciones!\n\nTu membresía ha sido activada:\n**${tier}**\n\n`
        : `🎉 Congratulations!\n\nYour membership has been activated:\n**${tier}**\n\n`;

      if (result.expiresAt) {
        const expiresDate = result.expiresAt.toLocaleDateString();
        message += userLang === "es"
          ? `⏰ Vence el: ${expiresDate} (${durationDays} días)\n\n`
          : `⏰ Expires on: ${expiresDate} (${durationDays} days)\n\n`;
      }

      message += userLang === "es"
        ? "¡Disfruta todas las características premium!"
        : "Enjoy all premium features!";

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about activation:`, e.message);
    }

    // Confirm to admin
    await ctx.answerCbQuery(
      lang === "es"
        ? `✅ Membresía activada: ${tier} (${durationDays}d)`
        : `✅ Membership activated: ${tier} (${durationDays}d)`
    );

    let confirmMessage = lang === "es"
      ? `✅ **Membresía Activada**\n\n👤 Usuario: \`${userId}\`\n💎 Tier: **${tier}**\n`
      : `✅ **Membership Activated**\n\n👤 User: \`${userId}\`\n💎 Tier: **${tier}**\n`;

    if (result.expiresAt) {
      const expiresDate = result.expiresAt.toLocaleDateString();
      confirmMessage += lang === "es"
        ? `⏰ Vence: ${expiresDate}\n📅 Duración: ${durationDays} días`
        : `⏰ Expires: ${expiresDate}\n📅 Duration: ${durationDays} days`;
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
              text: "+7 días",
              callback_data: `admin_extend_days_${userId}_7`,
            },
            {
              text: "+15 días",
              callback_data: `admin_extend_days_${userId}_15`,
            },
          ],
          [
            {
              text: "+30 días",
              callback_data: `admin_extend_days_${userId}_30`,
            },
            {
              text: "+60 días",
              callback_data: `admin_extend_days_${userId}_60`,
            },
          ],
          [
            {
              text: "+90 días",
              callback_data: `admin_extend_days_${userId}_90`,
            },
            {
              text: "+180 días",
              callback_data: `admin_extend_days_${userId}_180`,
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

    if (!userData.membershipExpiresAt) {
      await ctx.answerCbQuery(
        lang === "es" ? "❌ Sin membresía activa" : "❌ No active membership"
      );
      return;
    }

    // Calculate new expiration date
    const currentExpiration = userData.membershipExpiresAt.toDate();
    const newExpiration = new Date(currentExpiration);
    newExpiration.setDate(newExpiration.getDate() + daysToAdd);

    // Update membership expiration
    await db.collection("users").doc(userId).update({
      membershipExpiresAt: newExpiration,
      lastActive: new Date(),
    });

    const userLang = userData.language || "en";

    // Notify user
    try {
      let message = userLang === "es"
        ? `🎉 ¡Buenas noticias!\n\nTu membresía **${userData.tier}** ha sido extendida.\n\n`
        : `🎉 Good news!\n\nYour **${userData.tier}** membership has been extended.\n\n`;

      message += userLang === "es"
        ? `⏰ Nueva fecha de expiración: ${newExpiration.toLocaleDateString()}\n📅 Días agregados: ${daysToAdd}`
        : `⏰ New expiration date: ${newExpiration.toLocaleDateString()}\n📅 Days added: ${daysToAdd}`;

      await ctx.telegram.sendMessage(userId, message, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      logger.warn(`Could not notify user ${userId} about extension:`, e.message);
    }

    // Confirm to admin
    await ctx.answerCbQuery(
      lang === "es"
        ? `✅ Extendida ${daysToAdd} días`
        : `✅ Extended ${daysToAdd} days`
    );

    let confirmMessage = lang === "es"
      ? `✅ **Membresía Extendida**\n\n👤 Usuario: \`${userId}\`\n💎 Tier: **${userData.tier}**\n📅 Días agregados: ${daysToAdd}\n⏰ Nueva expiración: ${newExpiration.toLocaleDateString()}`
      : `✅ **Membership Extended**\n\n👤 User: \`${userId}\`\n💎 Tier: **${userData.tier}**\n📅 Days added: ${daysToAdd}\n⏰ New expiration: ${newExpiration.toLocaleDateString()}`;

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
    const lang = ctx.session.language || "en";
    const plans = require("../../config/plans");

    // Get subscription statistics
    const silverCount = await db.collection("users").where("tier", "==", "Silver").get();
    const goldenCount = await db.collection("users").where("tier", "==", "Golden").get();

    let message = lang === "es"
      ? "💰 **Gestión de Planes**\n\n"
      : "💰 **Plan Management**\n\n";

    message += lang === "es" ? "📋 **Planes Actuales:**\n\n" : "📋 **Current Plans:**\n\n";

    // Silver Plan
    message += `🥈 **Silver**\n`;
    message += `💵 Precio: $${plans.SILVER.price} USD / ${plans.SILVER.priceInCOP.toLocaleString()} COP\n`;
    message += `⏱️ Duración: ${plans.SILVER.duration} días\n`;
    message += `👥 Suscriptores: ${silverCount.size}\n`;
    message += `📊 Ingresos/mes: $${silverCount.size * plans.SILVER.price}\n\n`;

    // Golden Plan
    message += `🥇 **Golden**\n`;
    message += `💵 Precio: $${plans.GOLDEN.price} USD / ${plans.GOLDEN.priceInCOP.toLocaleString()} COP\n`;
    message += `⏱️ Duración: ${plans.GOLDEN.duration} días\n`;
    message += `💎 Bonus: ${plans.GOLDEN.cryptoBonus}\n`;
    message += `👥 Suscriptores: ${goldenCount.size}\n`;
    message += `📊 Ingresos/mes: $${goldenCount.size * plans.GOLDEN.price}\n\n`;

    // Total revenue
    const totalRevenue = (silverCount.size * plans.SILVER.price) + (goldenCount.size * plans.GOLDEN.price);
    message += lang === "es"
      ? `💰 **Ingresos Totales/mes:** $${totalRevenue}\n`
      : `💰 **Total Revenue/month:** $${totalRevenue}\n`;
    message += lang === "es"
      ? `📈 **Ingresos Anuales:** $${totalRevenue * 12}\n\n`
      : `📈 **Annual Revenue:** $${totalRevenue * 12}\n\n`;

    message += lang === "es"
      ? "Selecciona una opción:"
      : "Select an option:";

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🥈 Ver Silver" : "🥈 View Silver",
              callback_data: "admin_plan_view_silver",
            },
            {
              text: lang === "es" ? "🥇 Ver Golden" : "🥇 View Golden",
              callback_data: "admin_plan_view_golden",
            },
          ],
          [
            {
              text: lang === "es" ? "✏️ Editar Silver" : "✏️ Edit Silver",
              callback_data: "admin_plan_edit_silver",
            },
            {
              text: lang === "es" ? "✏️ Editar Golden" : "✏️ Edit Golden",
              callback_data: "admin_plan_edit_golden",
            },
          ],
          [
            {
              text: lang === "es" ? "📊 Estadísticas" : "📊 Statistics",
              callback_data: "admin_plan_stats",
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

    logger.info(`Admin ${ctx.from.id} viewed plan management`);
  } catch (error) {
    logger.error("Error in plan management:", error);
    await ctx.reply(t("error", ctx.session.language || "en"));
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

    const icon = planName.toLowerCase() === "silver" ? "🥈" : "🥇";
    const tierName = planName.charAt(0).toUpperCase() + planName.slice(1);

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

    // Get subscriber count
    const subscribersCount = await db.collection("users").where("tier", "==", tierName).get();
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
    const icon = planName.toLowerCase() === "silver" ? "🥈" : "🥇";
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
          planName.toLowerCase() === "golden" ? [
            {
              text: lang === "es" ? "💎 Crypto Bonus" : "💎 Crypto Bonus",
              callback_data: `admin_plan_edit_crypto_${planName.toLowerCase()}`,
            },
          ] : [],
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
    const icon = planName.toLowerCase() === "silver" ? "🥈" : "🥇";
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
    const fs = require("fs");
    const path = require("path");
    const plansPath = path.join(__dirname, "../../config/plans.js");

    // Read current plans
    delete require.cache[require.resolve("../../config/plans")];
    const plans = require("../../config/plans");
    const planKey = planName.toUpperCase();
    const planKeyLower = planName.toLowerCase();

    if (!plans[planKey]) {
      await ctx.reply(lang === "es" ? "❌ Plan no encontrado." : "❌ Plan not found.");
      return;
    }

    // Update plan based on field
    let updateSuccess = false;
    let displayValue = newValue;

    switch (field) {
      case "price":
        const price = parseFloat(newValue);
        if (isNaN(price) || price <= 0) {
          await ctx.reply(lang === "es" ? "❌ Precio inválido." : "❌ Invalid price.");
          return;
        }
        plans[planKey].price = price;
        plans[planKeyLower].price = price;
        displayValue = `$${price}`;
        updateSuccess = true;
        break;

      case "cop":
        const copPrice = parseInt(newValue.replace(/[^\d]/g, ""));
        if (isNaN(copPrice) || copPrice <= 0) {
          await ctx.reply(lang === "es" ? "❌ Precio inválido." : "❌ Invalid price.");
          return;
        }
        plans[planKey].priceInCOP = copPrice;
        plans[planKeyLower].priceInCOP = copPrice;
        displayValue = `${copPrice.toLocaleString()} COP`;
        updateSuccess = true;
        break;

      case "duration":
        const duration = parseInt(newValue);
        if (isNaN(duration) || duration <= 0) {
          await ctx.reply(lang === "es" ? "❌ Duración inválida." : "❌ Invalid duration.");
          return;
        }
        plans[planKey].duration = duration;
        plans[planKey].durationDays = duration;
        plans[planKeyLower].duration = duration;
        plans[planKeyLower].durationDays = duration;
        displayValue = `${duration} ${lang === "es" ? "días" : "days"}`;
        updateSuccess = true;
        break;

      case "crypto":
        plans[planKey].cryptoBonus = newValue;
        plans[planKeyLower].cryptoBonus = newValue;
        updateSuccess = true;
        break;

      case "desc":
        plans[planKey].description = newValue;
        plans[planKeyLower].description = newValue;
        updateSuccess = true;
        break;

      case "features":
        const features = newValue.split("\n").map(f => f.trim()).filter(f => f.length > 0);
        if (features.length === 0) {
          await ctx.reply(lang === "es" ? "❌ Características inválidas." : "❌ Invalid features.");
          return;
        }
        plans[planKey].features = features;
        plans[planKeyLower].features = features;
        displayValue = features.join(", ");
        updateSuccess = true;
        break;
    }

    if (updateSuccess) {
      // Write updated plans to file
      const fileContent = `const plans = ${JSON.stringify(plans, null, 2)};\n\nmodule.exports = plans;\n`;
      fs.writeFileSync(plansPath, fileContent, "utf8");

      // Clear require cache
      delete require.cache[require.resolve("../../config/plans")];

      const icon = planName.toLowerCase() === "silver" ? "🥈" : "🥇";
      const tierName = planName.charAt(0).toUpperCase() + planName.slice(1);

      const fieldNames = {
        price: lang === "es" ? "Precio USD" : "USD Price",
        cop: lang === "es" ? "Precio COP" : "COP Price",
        duration: lang === "es" ? "Duración" : "Duration",
        crypto: "Crypto Bonus",
        desc: lang === "es" ? "Descripción" : "Description",
        features: lang === "es" ? "Características" : "Features"
      };

      const message = lang === "es"
        ? `✅ **Plan ${tierName} Actualizado**\n\n${icon} **${fieldNames[field]}** actualizado a:\n${displayValue}\n\n✨ Los cambios han sido guardados.`
        : `✅ **${tierName} Plan Updated**\n\n${icon} **${fieldNames[field]}** updated to:\n${displayValue}\n\n✨ Changes have been saved.`;

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

      logger.info(`Admin ${ctx.from.id} updated ${field} for ${planName} to: ${displayValue}`);
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

    let silverActive = 0;
    let goldenActive = 0;
    let silverExpired = 0;
    let goldenExpired = 0;
    let silverRevenue = 0;
    let goldenRevenue = 0;

    const now = new Date();

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const tier = userData.tier;

      if (tier === "Silver" || tier === "Golden") {
        const isActive = !userData.membershipExpiresAt || userData.membershipExpiresAt.toDate() > now;

        if (tier === "Silver") {
          if (isActive) {
            silverActive++;
            silverRevenue += plans.SILVER.price;
          } else {
            silverExpired++;
          }
        } else if (tier === "Golden") {
          if (isActive) {
            goldenActive++;
            goldenRevenue += plans.GOLDEN.price;
          } else {
            goldenExpired++;
          }
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

    // Silver Stats
    message += "🥈 **Silver**\n";
    message += `• ${lang === "es" ? "Activos" : "Active"}: ${silverActive}\n`;
    message += `• ${lang === "es" ? "Expirados" : "Expired"}: ${silverExpired}\n`;
    message += `• ${lang === "es" ? "Total histórico" : "Total historical"}: ${silverActive + silverExpired}\n`;
    message += `• ${lang === "es" ? "Ingresos/mes" : "Revenue/month"}: $${silverRevenue}\n`;
    message += `• ${lang === "es" ? "Ingresos/año" : "Revenue/year"}: $${silverRevenue * 12}\n\n`;

    // Golden Stats
    message += "🥇 **Golden**\n";
    message += `• ${lang === "es" ? "Activos" : "Active"}: ${goldenActive}\n`;
    message += `• ${lang === "es" ? "Expirados" : "Expired"}: ${goldenExpired}\n`;
    message += `• ${lang === "es" ? "Total histórico" : "Total historical"}: ${goldenActive + goldenExpired}\n`;
    message += `• ${lang === "es" ? "Ingresos/mes" : "Revenue/month"}: $${goldenRevenue}\n`;
    message += `• ${lang === "es" ? "Ingresos/año" : "Revenue/year"}: $${goldenRevenue * 12}\n\n`;

    // Totals
    const totalActive = silverActive + goldenActive;
    const totalRevenue = silverRevenue + goldenRevenue;
    const conversionRate = usersSnapshot.size > 0
      ? ((totalActive / usersSnapshot.size) * 100).toFixed(2)
      : 0;

    message += lang === "es" ? "💰 **Totales**\n" : "💰 **Totals**\n";
    message += `• ${lang === "es" ? "Suscriptores activos" : "Active subscribers"}: ${totalActive}\n`;
    message += `• ${lang === "es" ? "Ingresos mensuales" : "Monthly revenue"}: $${totalRevenue}\n`;
    message += `• ${lang === "es" ? "Ingresos anuales" : "Annual revenue"}: $${totalRevenue * 12}\n`;
    message += `• ${lang === "es" ? "Tasa de conversión" : "Conversion rate"}: ${conversionRate}%\n`;

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
  showExpiringMemberships,
  runExpirationCheck,
  giveXP,
  executeGiveXP,
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
};
