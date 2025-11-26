/**
 * Admin Mode Toggle Handler
 * Allows admin users to switch between admin mode and regular user mode
 * In admin mode: Only admin features visible
 * In regular mode: Normal user features visible
 */

const { isAdmin } = require("../../config/admin");
const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");

/**
 * Toggle admin mode on/off for the current admin user
 */
async function toggleAdminMode(ctx) {
  try {
    const userId = ctx.from.id;
    const lang = ctx.session.language || "en";

    // Check if user is admin
    if (!isAdmin(userId)) {
      await ctx.answerCbQuery(
        lang === "es"
          ? "❌ Solo administradores pueden usar esta función"
          : "❌ Only admins can use this function",
        { show_alert: true }
      );
      return;
    }

    // Toggle admin mode
    if (!ctx.session) {
      ctx.session = {};
    }

    const currentMode = ctx.session.adminModeEnabled || false;
    ctx.session.adminModeEnabled = !currentMode;

    const newMode = ctx.session.adminModeEnabled;

    // Create confirmation message
    const messageEn = newMode
      ? "✅ **Admin Mode Enabled**\n\nYou are now in admin-only mode. All user features are hidden."
      : "✅ **Regular Mode Enabled**\n\nYou are now in regular user mode. Admin features are hidden.";

    const messageEs = newMode
      ? "✅ **Modo Admin Activado**\n\nAhora estás en modo solo administrador. Todas las características de usuario están ocultas."
      : "✅ **Modo Regular Activado**\n\nAhora estás en modo usuario regular. Las características de administrador están ocultas.";

    const message = lang === "es" ? messageEs : messageEn;

    // Show confirmation
    await ctx.answerCbQuery();

    // Edit or send new message
    try {
      await ctx.editMessageText(message, {
        parse_mode: "Markdown",
        reply_markup: getAdminModeMenu(lang, newMode),
      });
    } catch (editError) {
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: getAdminModeMenu(lang, newMode),
      });
    }

    logger.info(`Admin ${userId} toggled admin mode: ${newMode}`);
  } catch (error) {
    logger.error("Error toggling admin mode:", error);
    await ctx.answerCbQuery(
      ctx.session.language === "es" ? "❌ Error" : "❌ Error",
      { show_alert: true }
    );
  }
}

/**
 * Get admin mode menu based on current state
 */
function getAdminModeMenu(lang, adminModeEnabled) {
  const toggleText = adminModeEnabled
    ? lang === "es"
      ? "🔐 Cambiar a Modo Usuario"
      : "🔐 Switch to User Mode"
    : lang === "es"
    ? "⚙️ Cambiar a Modo Admin"
    : "⚙️ Switch to Admin Mode";

  return {
    inline_keyboard: [[{ text: toggleText, callback_data: "toggle_admin_mode" }]],
  };
}

/**
 * Get menu based on admin mode status
 * If admin mode is ON: show admin menu
 * If admin mode is OFF: show user menu
 */
function getDynamicMenu(ctx, adminMenu, userMenu) {
  const isAdminModeEnabled = ctx.session?.adminModeEnabled || false;
  return isAdminModeEnabled ? adminMenu : userMenu;
}

/**
 * Add admin mode toggle button to any keyboard
 */
function addAdminModeToggleButton(keyboard, lang, adminModeEnabled = false) {
  const toggleText = adminModeEnabled
    ? lang === "es"
      ? "🔐 Modo Usuario"
      : "🔐 User Mode"
    : lang === "es"
    ? "⚙️ Modo Admin"
    : "⚙️ Admin Mode";

  return [
    ...keyboard,
    [{ text: toggleText, callback_data: "toggle_admin_mode" }],
  ];
}

/**
 * Middleware to apply admin mode menu in response to user actions
 */
function adminModeMiddleware() {
  return async (ctx, next) => {
    // Store admin mode state in context for easy access
    ctx.isAdminModeEnabled = ctx.session?.adminModeEnabled || false;
    ctx.isUserAdmin = isAdmin(ctx.from?.id);

    await next();
  };
}

/**
 * Check if user is in admin mode
 */
function isInAdminMode(ctx) {
  return ctx.isUserAdmin && (ctx.session?.adminModeEnabled || false);
}

module.exports = {
  toggleAdminMode,
  getAdminModeMenu,
  getDynamicMenu,
  addAdminModeToggleButton,
  adminModeMiddleware,
  isInAdminMode,
};
