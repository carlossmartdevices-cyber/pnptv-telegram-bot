/**
 * Menu Handlers
 * All menu button handlers separated from main bot logic
 */

const { Markup } = require("telegraf");
const { collections } = require("../config/firebase");
const menus = require("../config/menus");
const { GamificationManager } = require("../config/gamification");
const GeolocationManager = require("../utils/geolocation");

class MenuHandlers {
  /**
   * Handle "My Profile" button
   */
  static async handleProfile(ctx) {
    const userId = ctx.from.id.toString();

    if (!ctx.userData || !ctx.userData.onboardingComplete) {
      return ctx.reply("Please complete onboarding first. Use /start");
    }

    const userData = ctx.userData;
    const profileText = ctx.i18n.t("profileInfo", userData);

    // Convert menu config to Telegraf buttons
    const keyboard = menus.profileButtons.map((row) =>
      row.map((btn) => Markup.button.callback(btn.text, btn.callback))
    );

    return ctx.reply(profileText, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(keyboard),
    });
  }

  /**
   * Handle "I want to Subscribe" button
   */
  static async handleSubscribe(ctx) {
    const userId = ctx.from.id.toString();

    if (!ctx.userData || !ctx.userData.onboardingComplete) {
      return ctx.reply("Please complete onboarding first. Use /start");
    }

    if (!menus.isFeatureEnabled("subscriptionEnabled")) {
      return ctx.reply(
        "Subscriptions are currently unavailable. Check back soon!"
      );
    }

    const currentTier = ctx.userData.tier || "free";
    const language = ctx.i18n.lang || "en";

    const message = menus.formatSubscriptionMenu(language, currentTier);

    const keyboard = [];

    if (currentTier !== "silver") {
      keyboard.push([
        Markup.button.callback("🥈 Subscribe to Silver", "subscribe_silver"),
      ]);
    }

    if (currentTier !== "golden") {
      keyboard.push([
        Markup.button.callback("👑 Subscribe to Golden", "subscribe_golden"),
      ]);
    }

    if (currentTier !== "free") {
      keyboard.push([
        Markup.button.callback("📊 View My Subscription", "view_subscription"),
      ]);
    }

    return ctx.reply(message, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(keyboard),
    });
  }

  /**
   * Handle "I need Help" button
   */
  static async handleHelp(ctx) {
    if (!menus.isFeatureEnabled("helpEnabled")) {
      return ctx.reply("Help is currently unavailable.");
    }

    const helpText = `
❓ **PNPtv Help & Commands**

**Getting Started:**
/start - Start or restart the bot
/menu - Show main menu

**Main Features:**
• Click "My Profile" - View and edit your profile
• Click "Who is near me?" - Discover nearby users
• Click "I want to Subscribe" - View subscription plans
• Click "I need Help" - Show this help message

**Additional Commands:**
/profile - View your profile
/map - Discover nearby users
/quests - View daily quests
/leaderboard - View rankings
/settings - Change your settings

**Subscription Tiers:**
🆓 Free - Basic access
🥈 Silver ($15/month) - No ads, 20 swipes, exclusive channel
👑 Golden ($25/month) - All features, unlimited swipes, VIP access

**Gamification:**
• Earn XP by posting, commenting, and completing quests
• Unlock badges and level up
• Compete on leaderboards

**Need More Help?**
Contact support: @PNPtvSupport
Terms: https://pnp.tv/terms
Privacy: https://pnp.tv/privacy
    `;

    // Convert menu config to Telegraf buttons
    const keyboard = menus.helpButtons.map((row) =>
      row.map((btn) => Markup.button.callback(btn.text, btn.callback))
    );

    return ctx.reply(helpText, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(keyboard),
    });
  }

  /**
   * Handle "Who is near me?" button
   */
  static async handleDiscover(ctx) {
    const userId = ctx.from.id.toString();

    if (!ctx.userData || !ctx.userData.onboardingComplete) {
      return ctx.reply("Please complete onboarding first. Use /start");
    }

    if (!menus.isFeatureEnabled("discoveryEnabled")) {
      return ctx.reply("Discovery feature is currently unavailable.");
    }

    if (!ctx.userData.location || !ctx.userData.locationEnabled) {
      const language = ctx.i18n.lang || "en";
      const message = menus.messages.locationRequired[language];

      return ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("⚙️ Go to Settings", "settings_location")],
        ]),
      });
    }

    // Convert menu config to Telegraf buttons
    const keyboard = menus.discoveryButtons.map((row) =>
      row.map((btn) => Markup.button.callback(btn.text, btn.callback))
    );

    return ctx.reply(
      "🗺️ **Discover Nearby Users**\n\nFind people near you based on your interests!",
      Markup.inlineKeyboard(keyboard)
    );
  }

  /**
   * Get main keyboard for user
   */
  static getMainKeyboard(language = "en") {
    const keyboard = menus.getMainKeyboard(language);
    return Markup.keyboard(keyboard).resize().persistent();
  }

  /**
   * Get admin keyboard
   */
  static getAdminKeyboard(language = "en") {
    const keyboard = menus.getAdminKeyboard(language);
    return Markup.keyboard(keyboard).resize().persistent();
  }

  /**
   * Register all menu handlers with bot
   */
  static registerHandlers(bot) {
    // Profile button
    bot.hears(menus.buttonMappings.profile, (ctx) => this.handleProfile(ctx));

    // Subscribe button
    bot.hears(menus.buttonMappings.subscribe, (ctx) =>
      this.handleSubscribe(ctx)
    );

    // Help button
    bot.hears(menus.buttonMappings.help, (ctx) => this.handleHelp(ctx));

    // Discover button
    bot.hears(menus.buttonMappings.discover, (ctx) => this.handleDiscover(ctx));

    // Admin buttons (registered separately in admin handlers)
    // These are handled by adminFunctions
  }
}

module.exports = MenuHandlers;
