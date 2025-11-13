/**
 * Menu Configuration
 * Centralized menu definitions for easy customization
 * NOTE: Only inline keyboards are used - no fixed bottom keyboards
 */

const menus = {
  // Main menu removed - bot uses inline keyboards only

  profile: {
    inline_keyboard: [
      [
        { text: "📝 Edit Bio", callback_data: "edit_bio" },
        { text: "📍 Edit Location", callback_data: "edit_location" },
      ],
      [
        { text: "💎 Upgrade Tier", callback_data: "upgrade_tier" },
        { text: "🗺️ View Map", callback_data: "view_map" },
      ],
    ],
  },

  // Admin menu - Full admin features
  admin: {
    inline_keyboard: [
      [
        { text: "👥 User Management", callback_data: "admin_users" },
        { text: "📊 Statistics", callback_data: "admin_stats" },
      ],
      [
        { text: "✨ Activate Membership", callback_data: "admin_activate_membership" },
      ],
      [
        { text: "📝 Update Member", callback_data: "admin_update_member" },
        { text: "🔄 Extend Membership", callback_data: "admin_extend_membership" },
      ],
      [
        { text: "⏰ Expiring Soon", callback_data: "admin_expiring" },
        { text: "🔄 Expire Check", callback_data: "admin_expire_check" },
      ],
      [
        { text: "📢 Broadcast", callback_data: "admin_broadcast" },
        { text: "🗓 Scheduled", callback_data: "admin_scheduled_broadcasts" },
      ],
      [
        { text: "📤 Post-to-Channel", callback_data: "ptc_menu" },
        { text: "📢 Channel Broadcaster", callback_data: "cbc_new_post" },
      ],
      [
        { text: "💰 Payment Broadcast", callback_data: "admin_payment_broadcast" },
      ],
      [
        { text: "📈 Broadcast Analytics", callback_data: "admin_broadcast_analytics" },
      ],
      [
        { text: "💰 Plan Management", callback_data: "admin_plans" },
        { text: "🪙 Kyrrex Crypto", callback_data: "admin_kyrrex_dashboard" },
      ],
      [{ text: "📋 Menu Config", callback_data: "admin_menus" }],
      [{ text: "🔐 Switch to User Mode", callback_data: "toggle_admin_mode" }],
    ],
  },

  // Admin mode toggle menu - For switching modes
  adminToggle: {
    inline_keyboard: [
      [{ text: "⚙️ Switch to Admin Mode", callback_data: "toggle_admin_mode" }],
    ],
  },

  subscription: {
    inline_keyboard: [
      [{ text: "« Back", callback_data: "back_to_main" }],
    ],
  },
};

/**
 * Get menu by type and language
 * @param {string} type - Menu type (main, profile, admin, subscription)
 * @param {string} lang - Language code (en, es)
 * @returns {object} Menu configuration
 */
function getMenu(type, lang = "en") {
  const menu = menus[type];
  if (!menu) return null;

  // If menu has language variants, return the appropriate one
  if (menu[lang]) {
    return menu[lang];
  }

  // Otherwise return the menu as-is (for inline keyboards)
  return menu;
}

/**
 * Update menu configuration (admin function)
 * @param {string} type - Menu type
 * @param {string} lang - Language code
 * @param {object} config - New menu configuration
 */
function updateMenu(type, lang, config) {
  if (!menus[type]) {
    menus[type] = {};
  }

  if (lang) {
    menus[type][lang] = config;
  } else {
    menus[type] = config;
  }
}

module.exports = {
  menus,
  getMenu,
  updateMenu,
};
