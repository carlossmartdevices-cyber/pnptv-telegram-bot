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

  // Admin menu - Main categories (reorganized structure)
  admin: {
    inline_keyboard: [
      [
        { text: "👥 User Management", callback_data: "admin_category_users" },
        { text: "📢 Broadcasts", callback_data: "admin_category_broadcasts" },
      ],
      [
        { text: "🔗 Channels", callback_data: "admin_category_channels" },
        { text: "⚙️ Settings", callback_data: "admin_category_settings" },
      ],
      [{ text: "🔐 User Mode", callback_data: "toggle_admin_mode" }],
    ],
  },

  // User Management submenu
  admin_users: {
    inline_keyboard: [
      [
        { text: "👥 List Users", callback_data: "admin_users" },
        { text: "🔍 Search", callback_data: "admin_search_user" },
      ],
      [
        { text: "✨ Activate", callback_data: "admin_activate_membership" },
        { text: "📝 Update Tier", callback_data: "admin_update_member" },
      ],
      [
        { text: "🔄 Extend", callback_data: "admin_extend_membership" },
        { text: "⏰ Expiring", callback_data: "admin_expiring" },
      ],
      [
        { text: "🔄 Exp Check", callback_data: "admin_expire_check" },
        { text: "📊 Stats", callback_data: "admin_stats" },
      ],
      [{ text: "« Back", callback_data: "admin_back" }],
    ],
  },

  // Broadcasts & Announcements submenu
  admin_broadcasts: {
    inline_keyboard: [
      [
        { text: "📢 Send Broadcast", callback_data: "admin_broadcast" },
        { text: "🗓️ Scheduled", callback_data: "admin_scheduled_broadcasts" },
      ],
      [
        { text: "📈 Analytics", callback_data: "admin_broadcast_analytics" },
      ],
      [{ text: "« Back", callback_data: "admin_back" }],
    ],
  },

  // Channel Management submenu
  admin_channels: {
    inline_keyboard: [
      [
        { text: "📤 Free Channels", callback_data: "admin_channels_free" },
        { text: "💎 Premium", callback_data: "admin_channels_premium" },
      ],
      [{ text: "« Back", callback_data: "admin_back" }],
    ],
  },

  // Free Channels submenu
  admin_channels_free: {
    inline_keyboard: [
      [
        { text: "📢 Channel Broadcaster", callback_data: "cbc_new_post" },
        { text: "📤 Post-to-Channel", callback_data: "ptc_menu" },
      ],
      [{ text: "« Back", callback_data: "admin_category_channels" }],
    ],
  },

  // Premium Channels submenu
  admin_channels_premium: {
    inline_keyboard: [
      [
        { text: "💎 Prime Channel", callback_data: "admin_payment_broadcast" },
      ],
      [{ text: "« Back", callback_data: "admin_category_channels" }],
    ],
  },

  // Other Settings submenu
  admin_settings: {
    inline_keyboard: [
      [
        { text: "💰 Plans", callback_data: "admin_plans" },
        { text: "🪙 Kyrrex", callback_data: "admin_kyrrex_dashboard" },
      ],
      [
        { text: "📋 Menu Config", callback_data: "admin_menus" },
      ],
      [{ text: "« Back", callback_data: "admin_back" }],
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
