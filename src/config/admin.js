/**
 * Admin Configuration
 * Defines admin user IDs and permissions
 */

// Load admin IDs from environment variable or use default
// ADMIN MODE DISABLED - No admin access allowed
const ADMIN_IDS = process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
  : []; // Empty array - admin mode disabled

/**
 * Check if a user is an admin
 * @param {number|string} userId - The user ID to check
 * @returns {boolean} True if user is admin
 */
function isAdmin(userId) {
  // Admin mode is disabled - always return false
  return false;
}

/**
 * Admin middleware for Telegraf
 * Restricts access to admin-only commands
 */
function adminMiddleware() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId || !isAdmin(userId)) {
      await ctx.reply("⛔ Access denied. This command is for administrators only.");
      return;
    }

    return next();
  };
}

module.exports = {
  ADMIN_IDS,
  isAdmin,
  adminMiddleware,
};
