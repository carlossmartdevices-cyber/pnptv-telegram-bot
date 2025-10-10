/**
 * Menu Configuration
 * Centralized place to manage all bot menus
 * Easy to customize without touching main bot code
 */

module.exports = {
  // Main user keyboard (persistent at bottom of screen)
  mainKeyboard: {
    en: [
      ["👤 My Profile", "🗺️ Who is near me?"],
      ["💎 I want to Subscribe", "❓ I need Help"],
    ],
    es: [
      ["👤 Mi Perfil", "🗺️ ¿Quién está cerca?"],
      ["💎 Quiero Suscribirme", "❓ Necesito Ayuda"],
    ],
  },

  // Button text mappings (for bot.hears to recognize)
  buttonMappings: {
    profile: [
      "My Profile",
      "👤 My Profile",
      "Profile",
      "👤 Profile",
      "Mi Perfil",
      "👤 Mi Perfil",
      "Perfil",
      "👤 Perfil",
    ],
    subscribe: [
      "I want to Subscribe",
      "💎 I want to Subscribe",
      "Subscribe",
      "💳 Subscribe",
      "Quiero Suscribirme",
      "💎 Quiero Suscribirme",
      "Suscribirme",
      "💳 Suscribirme",
    ],
    help: [
      "I need Help",
      "❓ I need Help",
      "Help",
      "❓ Help",
      "Necesito Ayuda",
      "❓ Necesito Ayuda",
      "Ayuda",
      "❓ Ayuda",
    ],
    discover: [
      "Who is near me?",
      "🗺️ Who is near me?",
      "Discover",
      "🗺️ Discover",
      "¿Quién está cerca?",
      "🗺️ ¿Quién está cerca?",
      "Descubrir",
      "🗺️ Descubrir",
    ],
  },

  // Admin keyboard (only for admins)
  adminKeyboard: {
    en: [
      ["👥 Users", "📊 Statistics"],
      ["📢 Broadcast", "🚨 Reports"],
      ["⚙️ Settings", "🔙 Back to User Mode"],
    ],
    es: [
      ["👥 Usuarios", "📊 Estadísticas"],
      ["📢 Difusión", "🚨 Reportes"],
      ["⚙️ Configuración", "🔙 Volver a Modo Usuario"],
    ],
  },

  // Subscription plans display
  subscriptionMenu: {
    en: {
      title: "💎 **PNPtv Subscription Plans**\n\n",
      free: {
        title: "🆓 **FREE TIER** (Current)\n",
        features: [
          "• Basic access to feed (with ads)",
          "• 3 daily swipes on map",
          "• View lives without chat",
        ],
      },
      silver: {
        title: "🥈 **SILVER TIER** - $15/month or 150⭐\n",
        features: [
          "• No ads",
          "• 20 daily swipes",
          "• Exclusive Telegram channel",
          "• 1 weekly boosted post",
          "• Chat in live streams",
        ],
      },
      golden: {
        title: "👑 **GOLDEN TIER** - $25/month or 250⭐\n",
        features: [
          "• All Silver features",
          "• Unlimited swipes",
          "• VIP Telegram channel",
          "• Private lives access",
          "• 24h stories",
          "• Golden badge on profile",
          "• 10% discount on crypto",
          "• Priority support",
        ],
      },
    },
    es: {
      title: "💎 **Planes de Suscripción PNPtv**\n\n",
      free: {
        title: "🆓 **PLAN GRATUITO** (Actual)\n",
        features: [
          "• Acceso básico al feed (con anuncios)",
          "• 3 swipes diarios en el mapa",
          "• Ver transmisiones sin chat",
        ],
      },
      silver: {
        title: "🥈 **PLAN SILVER** - $15/mes o 150⭐\n",
        features: [
          "• Sin anuncios",
          "• 20 swipes diarios",
          "• Canal exclusivo de Telegram",
          "• 1 publicación destacada semanal",
          "• Chat en transmisiones",
        ],
      },
      golden: {
        title: "👑 **PLAN GOLDEN** - $25/mes o 250⭐\n",
        features: [
          "• Todas las características Silver",
          "• Swipes ilimitados",
          "• Canal VIP de Telegram",
          "• Acceso a transmisiones privadas",
          "• Historias de 24h",
          "• Insignia dorada en perfil",
          "• 10% de descuento en crypto",
          "• Soporte prioritario",
        ],
      },
    },
  },

  // Profile inline buttons
  profileButtons: [
    [
      { text: "✏️ Edit Bio", callback: "edit_bio" },
      { text: "🎯 Edit Interests", callback: "edit_interests" },
    ],
    [
      { text: "⬆️ Upgrade Tier", callback: "upgrade_menu" },
      { text: "🎯 Daily Quests", callback: "view_quests" },
    ],
    [
      { text: "🏆 Leaderboard", callback: "view_leaderboard" },
      { text: "🎖️ Badges", callback: "view_badges" },
    ],
  ],

  // Discovery inline buttons
  discoveryButtons: [
    [{ text: "🔍 Find Nearby", callback: "discover_nearby" }],
    [{ text: "🎯 Filter by Interests", callback: "discover_filter" }],
  ],

  // Settings inline buttons
  settingsButtons: [
    [{ text: "🌐 Change Language", callback: "settings_language" }],
    [{ text: "🔒 Privacy Settings", callback: "settings_privacy" }],
    [{ text: "🔔 Notifications", callback: "settings_notifications" }],
    [{ text: "📍 Location Sharing", callback: "settings_location" }],
    [{ text: "🚫 Blocked Users", callback: "settings_blocked" }],
  ],

  // Help inline buttons
  helpButtons: [
    [{ text: "🎯 Daily Quests", callback: "view_quests" }],
    [{ text: "💎 Subscribe", callback: "upgrade_menu" }],
  ],

  // Admin menu buttons mapping
  adminButtonMappings: {
    users: ["Users", "👥 Users", "Usuarios", "👥 Usuarios"],
    stats: ["Statistics", "📊 Statistics", "Estadísticas", "📊 Estadísticas"],
    broadcast: ["Broadcast", "📢 Broadcast", "Difusión", "📢 Difusión"],
    reports: ["Reports", "🚨 Reports", "Reportes", "🚨 Reportes"],
    settings: ["Settings", "⚙️ Settings", "Configuración", "⚙️ Configuración"],
    backToUser: [
      "Back to User Mode",
      "🔙 Back to User Mode",
      "Volver a Modo Usuario",
      "🔙 Volver a Modo Usuario",
    ],
  },

  // Feature toggles (for easy enabling/disabling features)
  features: {
    profileEnabled: true,
    subscriptionEnabled: true,
    discoveryEnabled: true,
    helpEnabled: true,
    questsEnabled: true,
    leaderboardEnabled: true,
    badgesEnabled: true,
    liveStreamsEnabled: false, // Not implemented yet
    storiesEnabled: false, // Not implemented yet
    cryptoPaymentsEnabled: false, // Requires Bold.co setup
    referralSystemEnabled: true,
  },

  // Customizable messages
  messages: {
    locationRequired: {
      en: "📍 **Location Required**\n\nTo discover nearby users, you need to:\n1. Enable location sharing\n2. Share your location\n\nGo to Settings → Location Sharing to enable it.",
      es: "📍 **Ubicación Requerida**\n\nPara descubrir usuarios cercanos, necesitas:\n1. Habilitar compartir ubicación\n2. Compartir tu ubicación\n\nVe a Configuración → Compartir Ubicación para habilitarla.",
    },
    subscriptionSuccess: {
      en: "🎉 **Subscription Successful!**\n\nWelcome to {tier} tier! Enjoy your premium features.",
      es: "🎉 **¡Suscripción Exitosa!**\n\n¡Bienvenido al tier {tier}! Disfruta tus características premium.",
    },
    adminWelcome: {
      en: "🛠 **Admin Panel**\n\nYou have access to admin features.",
      es: "🛠 **Panel de Administración**\n\nTienes acceso a características de administrador.",
    },
  },

  // Configuration metadata
  version: "1.0.0",
  lastUpdated: "2025-01-10",

  // Helper function to get keyboard by language
  getMainKeyboard(language = "en") {
    return this.mainKeyboard[language] || this.mainKeyboard.en;
  },

  // Helper function to get admin keyboard
  getAdminKeyboard(language = "en") {
    return this.adminKeyboard[language] || this.adminKeyboard.en;
  },

  // Helper function to format subscription menu
  formatSubscriptionMenu(language = "en", currentTier = "free") {
    const menu = this.subscriptionMenu[language] || this.subscriptionMenu.en;
    let message = menu.title;

    // Add Free tier
    message += menu.free.title;
    message += menu.free.features.join("\n") + "\n\n";

    // Add Silver tier
    message += menu.silver.title;
    message += menu.silver.features.join("\n") + "\n\n";

    // Add Golden tier
    message += menu.golden.title;
    message += menu.golden.features.join("\n") + "\n\n";

    return message;
  },

  // Helper function to check if feature is enabled
  isFeatureEnabled(featureName) {
    return this.features[featureName] !== false;
  },
};
