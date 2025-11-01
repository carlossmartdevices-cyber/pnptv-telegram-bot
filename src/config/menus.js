/**
 * Menu Configuration
 * Centralized menu definitions for easy customization
 */

const menus = {
  main: {
    en: {
      keyboard: [
        ["👤 My Profile", "💎 Subscription Plans"],
        ["🌐 Nearby Members", "🤖 Customer Support"],
        ["🤖 PNPtv! Support"],
      ],
      resize_keyboard: true,
    },
    es: {
      keyboard: [
        ["👤 Mi Perfil", "💎 Planes de Suscripción"],
        ["🌐 Miembros en el Área", "🤖 Soporte al Cliente"],
        ["🤖 PNPtv! Soporte"],
      ],
      resize_keyboard: true,
    },
  },

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
        { text: "� Scheduled", callback_data: "admin_scheduled_broadcasts" },
      ],
      [
        { text: "�💰 Plan Management", callback_data: "admin_plans" },
      ],
      [{ text: "📋 Menu Config", callback_data: "admin_menus" }],
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
