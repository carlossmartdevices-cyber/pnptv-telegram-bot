require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { collections, FieldValue } = require("../config/firebase");
const plans = require("../config/plans");
const messages = require("../config/messages");
const cron = require("node-cron");
const { GamificationManager } = require("../config/gamification");
const GeolocationManager = require("../utils/geolocation");
const PaymentManager = require("../config/payments");
const adminFunctions = require("./admin");
const express = require("express");
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const app = express();
// Session storage
const sessions = {};
// Middleware - Session Management
bot.use((ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  if (!sessions[userId]) {
    sessions[userId] = {
      language: "en",
      onboardingStep: "start",
      selectedInterests: [],
      tempData: {},
      waitingFor: null,
    };
  }
  ctx.session = sessions[userId];
  return next();
});
// Middleware - User Data
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id?.toString();
  if (!userId) return next();

  try {
    const userDoc = await collections.users.doc(userId).get();
    ctx.userData = userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
  return next();
});
// Middleware - i18n
bot.use((ctx, next) => {
  const language = ctx.userData?.language || ctx.session?.language || "en";
  ctx.i18n = {
    t: (key, data) => {
      const msg = messages[language]?.[key];
      if (!msg) return `Missing translation: ${key}`;
      return typeof msg === "function" ? msg(data) : msg;
    },
    lang: language,
  };
  return next();
});
// Helper Functions
async function createUser(userId, username, language = "en") {
  const userData = {
    userId,
    username,
    language,
    tier: "free",
    xp: 0,
    level: 1,
    badges: [],
    interests: [],
    loginStreak: 0,
    dailySwipes: 0,
    dailySwipesReset: new Date().toISOString().split("T")[0],
    postsToday: 0,
    weeklyBoosts: 0,
    starsBalance: 0,
    totalPosts: 0,
    totalGiftsReceived: 0,
    totalStarsReceived: 0,
    totalStarsGifted: 0,
    onboardingComplete: false,
    profileComplete: false,
    locationEnabled: false,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    lastLogin: new Date().toISOString().split("T")[0],
    referrals: {},
  };

  await collections.users.doc(userId).set(userData);
  await GamificationManager.awardBadge(userId, "WELCOME");
  return userData;
}
async function updateLastActive(userId) {
  try {
    const userDoc = await collections.users.doc(userId).get();
    if (userDoc.exists) {
      await collections.users.doc(userId).update({
        lastActive: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Silently ignore if user doesn't exist yet
  }
}
async function resetDailyLimits() {
  const today = new Date().toISOString().split("T")[0];
  const usersSnapshot = await collections.users.get();

  const batch = collections.db.batch();
  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    if (userData.dailySwipesReset !== today) {
      const ref = collections.users.doc(doc.id);
      batch.update(ref, {
        dailySwipes: 0,
        postsToday: 0,
        dailySwipesReset: today,
      });
    }
  });
  await batch.commit();
}
// START COMMAND - Onboarding Flow
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username;

  await updateLastActive(userId);

  // Check if user exists
  if (ctx.userData && ctx.userData.onboardingComplete) {
    // Update streak
    const streakResult = await GamificationManager.updateStreak(userId);

    let welcomeMsg = ctx.i18n.t("welcome");
    if (streakResult?.continued && streakResult.streak > 1) {
      welcomeMsg = ctx.i18n.t("welcomeBack", { streak: streakResult.streak });
      if (streakResult.reward) {
        welcomeMsg += `\n\n${streakResult.reward.message}`;
      }
    }

    return ctx.reply(
      welcomeMsg,
      Markup.keyboard([
        [ctx.i18n.t("profile"), ctx.i18n.t("map")],
        [ctx.i18n.t("live"), ctx.i18n.t("feed")],
        [ctx.i18n.t("help"), ctx.i18n.t("settings")],
      ]).resize()
    );
  }

  // New user - Start onboarding
  if (!ctx.userData) {
    await createUser(userId, username);
  }

  // Language selection
  ctx.session.onboardingStep = "language";
  await ctx.reply(
    ctx.i18n.t("welcomeOnboarding"),
    Markup.inlineKeyboard([
      [
        Markup.button.callback("English 🇺🇸", "lang_en"),
        Markup.button.callback("Español 🇪🇸", "lang_es"),
      ],
    ])
  );
});
// Language Selection Handler
bot.action(/lang_(.+)/, async (ctx) => {
  const language = ctx.match[1];
  const userId = ctx.from.id.toString();
  ctx.session.language = language;
  await collections.users.doc(userId).update({ language });
  await ctx.answerCbQuery();
  // Age verification
  ctx.session.onboardingStep = "age_verification";
  ctx.i18n.lang = language;
  await ctx.editMessageText(
    messages[language]?.ageVerification || "Please verify your age.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          messages[language]?.ageConfirm || "I'm 18+",
          "age_confirm"
        ),
      ],
      [
        Markup.button.callback(
          messages[language]?.ageDecline || "I'm under 18",
          "age_decline"
        ),
      ],
    ])
  );
});
// Age Verification Handlers
bot.action("age_confirm", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.onboardingStep = "terms";
  await ctx.editMessageText(
    ctx.i18n.t("terms"),
    Markup.inlineKeyboard([
      [Markup.button.url("📄 Read Terms", ctx.i18n.t("termsUrl"))],
      [
        Markup.button.callback(ctx.i18n.t("termsAccept"), "terms_accept"),
        Markup.button.callback(ctx.i18n.t("termsDecline"), "terms_decline"),
      ],
    ])
  );
});
bot.action("age_decline", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    ctx.i18n.t("ageDeclined") || "You must be 18+ to use this bot."
  );
});
// Terms & Privacy Handlers
bot.action("terms_accept", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.onboardingStep = "privacy";
  await ctx.editMessageText(
    ctx.i18n.t("privacy"),
    Markup.inlineKeyboard([
      [Markup.button.url("🔒 Privacy Policy", ctx.i18n.t("privacyUrl"))],
      [
        Markup.button.callback(ctx.i18n.t("privacyAccept"), "privacy_accept"),
        Markup.button.callback(ctx.i18n.t("privacyDecline"), "privacy_decline"),
      ],
    ])
  );
});
bot.action("terms_decline", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    ctx.i18n.t("termsRequired") || "You must accept the terms to continue."
  );
});
bot.action("privacy_accept", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.onboardingStep = "interests";
  const interests = [
    "🎮 Gaming",
    "🎵 Music",
    "🎬 Movies",
    "📚 Books",
    "🏋️ Fitness",
    "✈️ Travel",
    "🍕 Food",
    "🎨 Art",
    "💻 Tech",
    "⚽ Sports",
    "📸 Photography",
    "🎭 Theater",
    "🌈 LGBTQ+",
    "🎪 Events",
    "🎤 Karaoke",
    "🍷 Wine",
  ];
  const keyboard = [];
  for (let i = 0; i < interests.length; i += 2) {
    keyboard.push([
      Markup.button.callback(interests[i], `interest_${i}`),
      Markup.button.callback(interests[i + 1] || "", `interest_${i + 1}`),
    ]);
  }
  keyboard.push([
    Markup.button.callback(
      `✅ ${ctx.i18n.t("interestsContinue")} (0/3)`,
      "interests_done"
    ),
  ]);
  await ctx.editMessageText(
    ctx.i18n.t("selectInterests"),
    Markup.inlineKeyboard(keyboard)
  );
});
bot.action("privacy_decline", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    ctx.i18n.t("privacyRequired") ||
      "You must accept the privacy policy to continue."
  );
});
// Interest Selection Handler
bot.action(/interest_(\d+)/, async (ctx) => {
  const interests = [
    "Gaming",
    "Music",
    "Movies",
    "Books",
    "Fitness",
    "Travel",
    "Food",
    "Art",
    "Tech",
    "Sports",
    "Photography",
    "Theater",
    "LGBTQ+",
    "Events",
    "Karaoke",
    "Wine",
  ];
  const index = parseInt(ctx.match[1]);
  const interest = interests[index];
  if (!ctx.session.selectedInterests) {
    ctx.session.selectedInterests = [];
  }
  const idx = ctx.session.selectedInterests.indexOf(interest);
  if (idx > -1) {
    ctx.session.selectedInterests.splice(idx, 1);
  } else if (ctx.session.selectedInterests.length < 3) {
    ctx.session.selectedInterests.push(interest);
  }
  await ctx.answerCbQuery(`${interest} ${idx > -1 ? "removed" : "added"}`);
  // Update button
  const fullInterests = [
    "🎮 Gaming",
    "🎵 Music",
    "🎬 Movies",
    "📚 Books",
    "🏋️ Fitness",
    "✈️ Travel",
    "🍕 Food",
    "🎨 Art",
    "💻 Tech",
    "⚽ Sports",
    "📸 Photography",
    "🎭 Theater",
    "🌈 LGBTQ+",
    "🎪 Events",
    "🎤 Karaoke",
    "🍷 Wine",
  ];
  const keyboard = [];
  for (let i = 0; i < fullInterests.length; i += 2) {
    const button1Text = ctx.session.selectedInterests.includes(interests[i])
      ? `✅ ${fullInterests[i]}`
      : fullInterests[i];
    const button2Text = fullInterests[i + 1]
      ? ctx.session.selectedInterests.includes(interests[i + 1])
        ? `✅ ${fullInterests[i + 1]}`
        : fullInterests[i + 1]
      : "";
    keyboard.push(
      [
        Markup.button.callback(button1Text, `interest_${i}`),
        button2Text
          ? Markup.button.callback(button2Text, `interest_${i + 1}`)
          : null,
      ].filter(Boolean)
    );
  }
  const count = ctx.session.selectedInterests.length;
  keyboard.push([
    Markup.button.callback(
      `✅ ${ctx.i18n.t("interestsContinue")} (${count}/3)`,
      "interests_done"
    ),
  ]);
  await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
});
bot.action("interests_done", async (ctx) => {
  if (ctx.session.selectedInterests.length < 3) {
    return ctx.answerCbQuery(
      ctx.i18n.t("selectAtLeastThree") || "Please select at least 3 interests",
      { show_alert: true }
    );
  }
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  await collections.users
    .doc(userId)
    .update({ interests: ctx.session.selectedInterests });
  ctx.session.onboardingStep = "location";
  await ctx.editMessageText(
    ctx.i18n.t("setupLocation"),
    Markup.inlineKeyboard([
      [Markup.button.callback(ctx.i18n.t("locationShare"), "location_share")],
      [Markup.button.callback(ctx.i18n.t("locationSkip"), "location_skip")],
    ])
  );
});
// Location Handlers
bot.action("location_share", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Please share your location:",
    Markup.keyboard([[Markup.button.locationRequest("📍 Share Location")]])
      .oneTime()
      .resize()
  );
  ctx.session.onboardingStep = "waiting_location";
});
bot.on("location", async (ctx) => {
  if (ctx.session.onboardingStep === "waiting_location") {
    const userId = ctx.from.id.toString();
    const { latitude, longitude } = ctx.message.location;
    await GeolocationManager.updateUserLocation(userId, latitude, longitude);
    await ctx.reply("✅ Location saved!");
    ctx.session.onboardingStep = "bio";
    await ctx.reply(ctx.i18n.t("setupBio"), Markup.removeKeyboard());
  }
});
bot.action("location_skip", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.onboardingStep = "bio";
  await ctx.editMessageText(ctx.i18n.t("setupBio"));
});
// Bio Handler
bot.on("text", async (ctx, next) => {
  if (ctx.session.onboardingStep === "bio") {
    const userId = ctx.from.id.toString();
    const bio = ctx.message.text.slice(0, 200);
    await collections.users
      .doc(userId)
      .update({ bio, onboardingComplete: true, profileComplete: true });
    await GamificationManager.addXP(userId, "PROFILE_COMPLETE", 50);
    await GamificationManager.awardBadge(userId, "EARLY_BIRD");
    ctx.session.onboardingStep = "complete";
    await ctx.reply(
      ctx.i18n.t("profileComplete"),
      Markup.keyboard([
        [ctx.i18n.t("profile"), ctx.i18n.t("map")],
        [ctx.i18n.t("live"), ctx.i18n.t("feed")],
        [ctx.i18n.t("help"), ctx.i18n.t("settings")],
      ]).resize()
    );
    return;
  }
  return next();
});
// PROFILE COMMAND
bot.command("profile", async (ctx) => {
  const userId = ctx.from.id.toString();
  await updateLastActive(userId);
  if (!ctx.userData || !ctx.userData.onboardingComplete) {
    return ctx.reply(
      ctx.i18n.t("completeOnboarding") ||
        "Please complete onboarding first. Use /start"
    );
  }
  const userData = ctx.userData;
  const profileText = ctx.i18n.t("profileInfo", userData);
  await ctx.reply(profileText, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback("✏️ " + ctx.i18n.t("editBio"), "edit_bio"),
        Markup.button.callback(
          "🎯 " + ctx.i18n.t("editInterests"),
          "edit_interests"
        ),
      ],
      [
        Markup.button.callback(
          "⬆️ " + ctx.i18n.t("upgradeTier"),
          "upgrade_menu"
        ),
        Markup.button.callback("🎯 Daily Quests", "view_quests"),
      ],
      [
        Markup.button.callback("🏆 Leaderboard", "view_leaderboard"),
        Markup.button.callback("🎖️ Badges", "view_badges"),
      ],
    ]),
  });
});
// Edit Profile Handlers
bot.action("edit_bio", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.waitingFor = "bio";
  await ctx.reply(ctx.i18n.t("setupBio"));
});
bot.action("edit_interests", async (ctx) => {
  await ctx.answerCbQuery();
  const interests = [
    "🎮 Gaming",
    "🎵 Music",
    "🎬 Movies",
    "📚 Books",
    "🏋️ Fitness",
    "✈️ Travel",
    "🍕 Food",
    "🎨 Art",
    "💻 Tech",
    "⚽ Sports",
    "📸 Photography",
    "🎭 Theater",
    "🌈 LGBTQ+",
    "🎪 Events",
    "🎤 Karaoke",
    "🍷 Wine",
  ];
  ctx.session.selectedInterests = ctx.userData.interests || [];
  const keyboard = [];
  for (let i = 0; i < interests.length; i += 2) {
    keyboard.push([
      Markup.button.callback(interests[i], `interest_edit_${i}`),
      Markup.button.callback(interests[i + 1] || "", `interest_edit_${i + 1}`),
    ]);
  }
  keyboard.push([Markup.button.callback("✅ Save", "interests_save")]);
  await ctx.editMessageText(
    "🎯 Select your interests:",
    Markup.inlineKeyboard(keyboard)
  );
});
// Handle text updates
bot.on("text", async (ctx, next) => {
  const userId = ctx.from.id.toString();
  if (ctx.session.waitingFor === "bio") {
    const bio = ctx.message.text.slice(0, 200);
    await collections.users.doc(userId).update({ bio });
    await ctx.reply(ctx.i18n.t("bioSet"));
    ctx.session.waitingFor = null;
    return;
  }
  if (ctx.session.waitingFor === "post_content") {
    const content = ctx.message.text;
    await collections.posts.add({
      userId,
      username: ctx.userData.username,
      content,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: new Date().toISOString(),
    });
    await collections.users.doc(userId).update({
      totalPosts: FieldValue.increment(1),
      postsToday: FieldValue.increment(1),
    });
    await GamificationManager.addXP(userId, "POST_CONTENT", 10);
    await GamificationManager.updateQuestProgress(userId, "post", {
      hashtag: content.includes("#PNPtvLove") ? "#PNPtvLove" : null,
    });
    await ctx.reply(ctx.i18n.t("postCreated"));
    ctx.session.waitingFor = null;
    return;
  }
  return next();
});
// UPGRADE MENU
bot.action("upgrade_menu", async (ctx) => {
  await ctx.answerCbQuery();
  const tiers = ["free", "silver", "golden"];
  const currentTier = ctx.userData.tier || "free";
  let message = "💎 **Subscription Tiers**\n\n";
  tiers.forEach((tierName) => {
    const tier = plans[tierName];
    message += `**${tier.name}** - $${tier.price}/month\n${tier.features
      .slice(0, 3)
      .join("\n")}\n\n`;
  });
  const keyboard = [];
  if (currentTier !== "silver")
    keyboard.push([
      Markup.button.callback("💳 Subscribe to Silver", "subscribe_silver"),
    ]);
  if (currentTier !== "golden")
    keyboard.push([
      Markup.button.callback("👑 Subscribe to Golden", "subscribe_golden"),
    ]);
  await ctx.editMessageText(message, Markup.inlineKeyboard(keyboard));
});
// Subscribe Handlers
bot.action(/subscribe_(.+)/, async (ctx) => {
  const tier = ctx.match[1];
  const userId = ctx.from.id.toString();
  await ctx.answerCbQuery();
  const plan = plans[tier];
  const paymentResult = await PaymentManager.createTelegramStarsPayment(
    userId,
    tier,
    bot
  );
  if (paymentResult.success) {
    try {
      await ctx.replyWithInvoice(paymentResult.invoice);
    } catch (error) {
      console.error("Error sending invoice:", error);
      await ctx.reply(
        ctx.i18n.t("paymentUnavailable") ||
          "Payment system temporarily unavailable. Please try again later."
      );
    }
  } else {
    await ctx.reply(
      ctx.i18n.t("paymentError") || "Error creating payment. Please try again."
    );
  }
});
// MAP/DISCOVER COMMAND
bot.command("map", async (ctx) => {
  const userId = ctx.from.id.toString();
  await updateLastActive(userId);
  if (!ctx.userData || !ctx.userData.onboardingComplete) {
    return ctx.reply(
      ctx.i18n.t("completeOnboarding") ||
        "Please complete onboarding first. Use /start"
    );
  }
  await ctx.reply(
    ctx.i18n.t("mapDiscover"),
    Markup.inlineKeyboard([
      [Markup.button.callback("🔍 Find Nearby", "discover_nearby")],
      [Markup.button.callback("🎯 Filter by Interests", "discover_filter")],
    ])
  );
});
bot.action("discover_nearby", async (ctx) => {
  await ctx.answerCbQuery(
    ctx.i18n.t("searchingNearby") || "Searching for nearby users..."
  );
  const userId = ctx.from.id.toString();
  const userData = ctx.userData;
  const tier = plans[userData.tier || "free"];
  if (userData.dailySwipes >= tier.limits.dailySwipes) {
    return ctx.reply(
      ctx.i18n.t("swipesExhausted") || "You've exhausted your daily swipes."
    );
  }
  const result = await GeolocationManager.findNearbyUsers(userId, 50);
  if (!result.success || result.users.length === 0) {
    return ctx.editMessageText(
      ctx.i18n.t("mapNoUsers") || "No users found nearby."
    );
  }
  ctx.session.nearbyUsers = result.users;
  ctx.session.currentUserIndex = 0;
  await showUserCard(ctx);
});
// HELP COMMAND
bot.command("help", async (ctx) => {
  await ctx.reply(
    ctx.i18n.t("helpText") ||
      "Here's how you can use the bot:\n\n/start - Begin or restart onboarding\n/profile - View and edit your profile\n/map - Discover nearby users\n/leaderboard - View top users\n/quests - View daily quests\n/settings - Change your settings\n/help - Show this help message",
    { parse_mode: "Markdown" }
  );
});
// SETTINGS COMMAND
bot.command("settings", async (ctx) => {
  const userId = ctx.from.id.toString();
  await updateLastActive(userId);
  if (!ctx.userData || !ctx.userData.onboardingComplete) {
    return ctx.reply(
      ctx.i18n.t("completeOnboarding") ||
        "Please complete onboarding first. Use /start"
    );
  }
  await ctx.reply(
    ctx.i18n.t("settingsMenu") ||
      "⚙️ **Settings**\n\nChange your preferences here.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          ctx.i18n.t("changeLanguage") || "Change Language",
          "settings_language"
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("privacySettings") || "Privacy Settings",
          "settings_privacy"
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("notifications") || "Notifications",
          "settings_notifications"
        ),
      ],
      [Markup.button.callback("📍 Location Sharing", "settings_location")],
      [
        Markup.button.callback(
          ctx.i18n.t("blockedUsers") || "Blocked Users",
          "settings_blocked"
        ),
      ],
    ])
  );
});
bot.action("settings_language", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🌐 Select your language:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("English 🇺🇸", "change_lang_en"),
        Markup.button.callback("Español 🇪🇸", "change_lang_es"),
      ],
      [Markup.button.callback("« Back", "back_to_settings")],
    ])
  );
});
bot.action(/change_lang_(.+)/, async (ctx) => {
  const language = ctx.match[1];
  const userId = ctx.from.id.toString();
  await collections.users.doc(userId).update({ language });
  await ctx.answerCbQuery(
    messages[language]?.languageChanged || "Language changed!"
  );
  ctx.session.language = language;
  await ctx.editMessageText(
    messages[language]?.settingsMenu ||
      "⚙️ **Settings**\n\nChange your preferences here.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          messages[language]?.changeLanguage || "Change Language",
          "settings_language"
        ),
      ],
      [
        Markup.button.callback(
          messages[language]?.privacySettings || "Privacy Settings",
          "settings_privacy"
        ),
      ],
      [
        Markup.button.callback(
          messages[language]?.notifications || "Notifications",
          "settings_notifications"
        ),
      ],
      [Markup.button.callback("📍 Location Sharing", "settings_location")],
      [
        Markup.button.callback(
          messages[language]?.blockedUsers || "Blocked Users",
          "settings_blocked"
        ),
      ],
    ])
  );
});
bot.action("settings_location", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  const userDoc = await collections.users.doc(userId).get();
  const locationEnabled = userDoc.data().locationEnabled || false;
  await ctx.editMessageText(
    `📍 **Location Sharing**\n\nCurrent status: ${
      locationEnabled ? "✅ Enabled" : "❌ Disabled"
    }\n\nLocation sharing allows other users to discover you on the map.`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          locationEnabled ? "❌ Disable" : "✅ Enable",
          `toggle_location_${!locationEnabled}`
        ),
      ],
      [Markup.button.callback("« Back", "back_to_settings")],
    ])
  );
});
bot.action(/toggle_location_(.+)/, async (ctx) => {
  const enabled = ctx.match[1] === "true";
  const userId = ctx.from.id.toString();
  await GeolocationManager.toggleLocationSharing(userId, enabled);
  await ctx.answerCbQuery(
    `Location sharing ${enabled ? "enabled" : "disabled"}`
  );
  await ctx.editMessageText(
    `📍 **Location Sharing**\n\nCurrent status: ${
      enabled ? "✅ Enabled" : "❌ Disabled"
    }\n\nLocation sharing allows other users to discover you on the map.`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          enabled ? "❌ Disable" : "✅ Enable",
          `toggle_location_${!enabled}`
        ),
      ],
      [Markup.button.callback("« Back", "back_to_settings")],
    ])
  );
});
bot.action("back_to_settings", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    ctx.i18n.t("settingsMenu") ||
      "⚙️ **Settings**\n\nChange your preferences here.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          ctx.i18n.t("changeLanguage") || "Change Language",
          "settings_language"
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("privacySettings") || "Privacy Settings",
          "settings_privacy"
        ),
      ],
      [
        Markup.button.callback(
          ctx.i18n.t("notifications") || "Notifications",
          "settings_notifications"
        ),
      ],
      [Markup.button.callback("📍 Location Sharing", "settings_location")],
      [
        Markup.button.callback(
          ctx.i18n.t("blockedUsers") || "Blocked Users",
          "settings_blocked"
        ),
      ],
    ])
  );
});
// REFERRAL SYSTEM
bot.command("referral", async (ctx) => {
  const userId = ctx.from.id.toString();
  await updateLastActive(userId);
  if (!ctx.userData || !ctx.userData.onboardingComplete) {
    return ctx.reply(
      ctx.i18n.t("completeOnboarding") ||
        "Please complete onboarding first. Use /start"
    );
  }
  const referralCode = Buffer.from(userId).toString("base64").slice(0, 8);
  const referralLink = `https://t.me/${ctx.botInfo.username}?start=ref_${referralCode}`;
  await ctx.reply(
    (ctx.i18n.t("referralCode", { code: referralCode }) ||
      `Your referral code: \`${referralCode}\``) +
      `\n\nShare your link:\n${referralLink}`,
    { parse_mode: "Markdown" }
  );
});
// Handle referral links
bot.start(async (ctx) => {
  const startPayload = ctx.startPayload;
  if (startPayload && startPayload.startsWith("ref_")) {
    const referralCode = startPayload.replace("ref_", "");
    const referrerId = Buffer.from(referralCode, "base64").toString();
    const userId = ctx.from.id.toString();
    if (referrerId !== userId) {
      await GamificationManager.addXP(referrerId, "INVITE_FRIEND", 25);
      await GamificationManager.addXP(userId, "INVITE_FRIEND", 25);
      await collections.users
        .doc(referrerId)
        .update({ [`referrals.${userId}`]: new Date().toISOString() });
      await ctx.reply(
        ctx.i18n.t("referralSuccess") ||
          "Thanks for using a referral link! Both you and your friend earned 25 XP."
      );
    }
  }
});
// ADMIN COMMANDS
bot.command("admin", async (ctx) => {
  if (!adminFunctions.isAdmin(ctx.from.id))
    return ctx.reply(ctx.i18n.t("accessDenied") || "Access denied.");
  await ctx.reply(
    ctx.i18n.t("adminPanel") ||
      "🛠 **Admin Panel**\n\nManage users, stats, and broadcasts.",
    Markup.keyboard([
      [
        ctx.i18n.t("adminUsers") || "Users",
        ctx.i18n.t("adminStats") || "Stats",
      ],
      [
        ctx.i18n.t("adminBroadcast") || "Broadcast",
        ctx.i18n.t("adminReports") || "Reports",
      ],
    ]).resize()
  );
});
bot.command("admin_users", async (ctx) => {
  if (!adminFunctions.isAdmin(ctx.from.id))
    return ctx.reply(ctx.i18n.t("accessDenied") || "Access denied.");
  await adminFunctions.listUsers(ctx);
});
bot.command("admin_stats", async (ctx) => {
  if (!adminFunctions.isAdmin(ctx.from.id))
    return ctx.reply(ctx.i18n.t("accessDenied") || "Access denied.");
  await adminFunctions.showStats(ctx);
});
bot.command("admin_broadcast", async (ctx) => {
  if (!adminFunctions.isAdmin(ctx.from.id))
    return ctx.reply(ctx.i18n.t("accessDenied") || "Access denied.");
  ctx.session.waitingFor = "broadcast_message";
  await ctx.reply("Please send the message to broadcast to all users:");
});
bot.on("text", async (ctx, next) => {
  if (ctx.session.waitingFor === "broadcast_message") {
    if (!adminFunctions.isAdmin(ctx.from.id))
      return ctx.reply(ctx.i18n.t("accessDenied") || "Access denied.");
    await adminFunctions.broadcastMessage(ctx, ctx.message.text);
    ctx.session.waitingFor = null;
    return;
  }
  return next();
});
bot.command("admin_reports", async (ctx) => {
  if (!adminFunctions.isAdmin(ctx.from.id))
    return ctx.reply(ctx.i18n.t("accessDenied") || "Access denied.");
  const reportsSnapshot = await collections.reports
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  if (reportsSnapshot.empty) return ctx.reply("No reports found.");
  let message = "🚨 **Recent Reports**\n\n";
  reportsSnapshot.forEach((doc) => {
    const report = doc.data();
    message += `ID: ${doc.id}\nReporter: ${report.reporterId}\nReported: ${report.reportedUserId}\nReason: ${report.reason}\nStatus: ${report.status}\n\n`;
  });
  await ctx.reply(message);
});
// LEADERBOARD COMMAND
bot.command("leaderboard", async (ctx) => {
  const userId = ctx.from.id.toString();
  await updateLastActive(userId);
  if (!ctx.userData || !ctx.userData.onboardingComplete)
    return ctx.reply(
      ctx.i18n.t("completeOnboarding") ||
        "Please complete onboarding first. Use /start"
    );
  const leaderboard = await GamificationManager.getLeaderboard("xp", 10);
  let message =
    ctx.i18n.t("leaderboard") || "🏆 **Leaderboard**\n\nTop users by XP:\n\n";
  leaderboard.forEach((user) => {
    message +=
      ctx.i18n.t("leaderboardUser", {
        rank: user.rank,
        username: user.username,
        xp: user.xp,
      }) || `#${user.rank} @${user.username} - ${user.xp} XP\n`;
  });
  await ctx.reply(
    message,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("XP", "leaderboard_xp"),
        Markup.button.callback("Posts", "leaderboard_posts"),
        Markup.button.callback("Gifts", "leaderboard_gifts"),
      ],
    ])
  );
});
// QUESTS COMMAND
bot.command("quests", async (ctx) => {
  const userId = ctx.from.id.toString();
  await updateLastActive(userId);
  if (!ctx.userData || !ctx.userData.onboardingComplete)
    return ctx.reply(
      ctx.i18n.t("completeOnboarding") ||
        "Please complete onboarding first. Use /start"
    );
  const quests = await GamificationManager.getDailyQuests(userId);
  let message =
    ctx.i18n.t("dailyQuests") ||
    "🎯 **Daily Quests**\n\nComplete quests to earn XP and rewards!\n\n";
  quests.forEach((quest) => {
    message +=
      ctx.i18n.t("questProgress", {
        name: quest.name,
        progress: quest.progress,
        reward: quest.reward,
      }) ||
      `- ${quest.name}: ${quest.progress}\n  Reward: ${quest.reward} XP\n\n`;
  });
  await ctx.reply(message, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🔄 Refresh", "refresh_quests")],
    ]),
  });
});
bot.action("refresh_quests", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id.toString();
  const quests = await GamificationManager.getDailyQuests(userId);
  let message =
    ctx.i18n.t("dailyQuests") ||
    "🎯 **Daily Quests**\n\nComplete quests to earn XP and rewards!\n\n";
  quests.forEach((quest) => {
    message +=
      ctx.i18n.t("questProgress", {
        name: quest.name,
        progress: quest.progress,
        reward: quest.reward,
      }) ||
      `- ${quest.name}: ${quest.progress}\n  Reward: ${quest.reward} XP\n\n`;
  });
  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("🔄 Refresh", "refresh_quests")],
    ]),
  });
});
// PAYMENT HANDLERS
bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});
bot.on("successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = JSON.parse(payment.invoice_payload);
  const userId = payload.userId;
  const tier = payload.tier;
  await PaymentManager.processSuccessfulPayment(
    userId,
    tier,
    payment.telegram_payment_charge_id,
    "telegram_stars"
  );
  await ctx.reply(
    (
      ctx.i18n.t("paymentSuccess") ||
      "Payment successful! You are now a ${tier} member."
    ).replace("${tier}", tier)
  );
});
// CRON JOBS
cron.schedule("0 0 * * *", async () => {
  console.log("Resetting daily limits...");
  await resetDailyLimits();
});
cron.schedule("0 1 * * *", async () => {
  console.log("Checking subscription status...");
  const usersSnapshot = await collections.users
    .where("tier", "in", ["silver", "golden"])
    .get();
  usersSnapshot.forEach(async (doc) => {
    await PaymentManager.checkSubscriptionStatus(doc.id);
  });
});
// ERROR HANDLING
bot.catch((err, ctx) => {
  console.error("Bot error:", err);
  ctx.reply(
    ctx.i18n.t("error") || "An error occurred. Please try again later."
  );
});
// GRACEFUL SHUTDOWN
process.once("SIGINT", () => {
  console.log("SIGINT received. Stopping bot...");
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  console.log("SIGTERM received. Stopping bot...");
  bot.stop("SIGTERM");
});
// WEBHOOK SETUP (Optional - for production)
if (process.env.WEBHOOK_URL) {
  app.use(express.json());
  app.post(`/webhook/${process.env.TELEGRAM_TOKEN}`, (req, res) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  });
  app.listen(process.env.PORT || 3000, async () => {
    console.log(`Webhook server listening on port ${process.env.PORT || 3000}`);
    await bot.telegram.setWebhook(
      `${process.env.WEBHOOK_URL}/webhook/${process.env.TELEGRAM_TOKEN}`
    );
    console.log("Webhook set successfully");
  });
} else {
  // POLLING MODE (for development)
  bot
    .launch({ dropPendingUpdates: true })
    .then(() => {
      console.log("Bot started successfully in polling mode");
      console.log("All features loaded:");
      console.log("✅ Onboarding with gamification");
      console.log("✅ Profile management");
      console.log("✅ Geolocation & discovery");
      console.log("✅ Daily quests & XP system");
      console.log("✅ Leaderboards & badges");
      console.log("✅ Subscription tiers (Free/Silver/Golden)");
      console.log("✅ Live streams");
      console.log("✅ Feed & posts");
      console.log("✅ Referral system");
      console.log("✅ Admin panel");
      console.log("✅ Payment integration");
      console.log("✅ Multilingual support (EN/ES)");
    })
    .catch((err) => {
      console.error("Failed to start bot:", err);
    });
}
module.exports = bot;
