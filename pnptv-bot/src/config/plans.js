/**
 * Subscription Plans Configuration
 * Defines Free, Silver, and Golden tiers with features and limits
 */

const plans = {
  free: {
    name: "Free",
    price: 0,
    priceUSD: 0,
    starPrice: 0,
    features: [
      "Access to basic feed (with ads)",
      "3 daily swipes on map",
      "View lives without chat",
      "Upload videos up to 30 seconds",
      "Blurred NSFW content",
    ],
    limits: {
      dailySwipes: 3,
      videoLength: 30,
      posts: 10,
      canChatInLives: false,
      adsEnabled: true,
    },
    perks: {},
  },

  silver: {
    name: "Silver",
    price: 15,
    priceUSD: 15,
    starPrice: 150,
    features: [
      "No ads",
      "20 daily swipes",
      "Access to exclusive Telegram channel",
      "1 weekly boosted post",
      "Upload videos up to 2 minutes",
      "View NSFW content (with age verification)",
      "Chat in live streams",
      "Silver badge on profile",
    ],
    limits: {
      dailySwipes: 20,
      videoLength: 120,
      posts: 50,
      canChatInLives: true,
      adsEnabled: false,
      weeklyBoosts: 1,
    },
    perks: {
      exclusiveChannel: true,
      silverBadge: true,
      adFree: true,
    },
  },

  golden: {
    name: "Golden",
    price: 25,
    priceUSD: 25,
    starPrice: 250,
    cryptoBonus: 5,
    features: [
      "All Silver features",
      "Unlimited swipes",
      "Access to VIP Telegram channel",
      "Private lives access",
      "24h stories",
      "Golden badge on profile",
      "10% discount on crypto purchases",
      "Priority support",
      "Create custom groups",
      "5 weekly boosted posts",
      "Upload videos up to 10 minutes",
      "Early access to new features",
    ],
    limits: {
      dailySwipes: Infinity,
      videoLength: 600,
      posts: Infinity,
      canChatInLives: true,
      adsEnabled: false,
      weeklyBoosts: 5,
      canCreateStories: true,
    },
    perks: {
      exclusiveChannel: true,
      vipChannel: true,
      goldenBadge: true,
      prioritySupport: true,
      cryptoDiscount: 0.1,
      canCreateGroups: true,
      earlyAccess: true,
      unlimitedSwipes: true,
      extendedVideos: true,
    },
  },
};

/**
 * Get tier configuration by name
 * @param {string} tierName - 'free', 'silver', or 'golden'
 * @returns {object} Tier configuration
 */
function getTierByName(tierName) {
  const normalizedName = tierName.toLowerCase();
  return plans[normalizedName] || plans.free;
}

/**
 * Check if user can perform an action based on their tier
 * @param {string} userTier - User's current tier
 * @param {string} action - Action to check
 * @param {object} user - User data with current usage stats
 * @returns {boolean} Whether action is allowed
 */
function canUserPerformAction(userTier, action, user = {}) {
  const tier = getTierByName(userTier);

  const actions = {
    swipe: () => {
      const swipesUsed = user.dailySwipes || 0;
      return swipesUsed < tier.limits.dailySwipes;
    },

    post: () => {
      const postsToday = user.postsToday || 0;
      return postsToday < tier.limits.posts;
    },

    chatInLive: () => {
      return tier.limits.canChatInLives;
    },

    createStory: () => {
      return tier.limits.canCreateStories || false;
    },

    boost: () => {
      const boostsUsed = user.weeklyBoosts || 0;
      return boostsUsed < (tier.limits.weeklyBoosts || 0);
    },

    uploadVideo: (durationSeconds) => {
      return durationSeconds <= tier.limits.videoLength;
    },

    viewAds: () => {
      return tier.limits.adsEnabled;
    },

    createGroup: () => {
      return tier.perks.canCreateGroups || false;
    },
  };

  const actionHandler = actions[action];
  return actionHandler ? actionHandler(user) : false;
}

/**
 * Get remaining usage for a limit
 * @param {string} userTier - User's tier
 * @param {string} limitType - Type of limit to check
 * @param {object} user - User data
 * @returns {number|string} Remaining amount or "Unlimited"
 */
function getRemainingUsage(userTier, limitType, user = {}) {
  const tier = getTierByName(userTier);

  const calculations = {
    dailySwipes: () => {
      const limit = tier.limits.dailySwipes;
      if (limit === Infinity) return "Unlimited";
      const used = user.dailySwipes || 0;
      return Math.max(0, limit - used);
    },

    posts: () => {
      const limit = tier.limits.posts;
      if (limit === Infinity) return "Unlimited";
      const used = user.postsToday || 0;
      return Math.max(0, limit - used);
    },

    weeklyBoosts: () => {
      const limit = tier.limits.weeklyBoosts || 0;
      const used = user.weeklyBoosts || 0;
      return Math.max(0, limit - used);
    },
  };

  const calculator = calculations[limitType];
  return calculator ? calculator() : 0;
}

/**
 * Compare two tiers
 * @param {string} tier1 - First tier name
 * @param {string} tier2 - Second tier name
 * @returns {number} -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2
 */
function compareTiers(tier1, tier2) {
  const tierOrder = { free: 0, silver: 1, golden: 2 };
  const order1 = tierOrder[tier1.toLowerCase()] || 0;
  const order2 = tierOrder[tier2.toLowerCase()] || 0;

  if (order1 < order2) return -1;
  if (order1 > order2) return 1;
  return 0;
}

/**
 * Check if upgrade is available
 * @param {string} currentTier - Current tier
 * @param {string} targetTier - Target tier
 * @returns {boolean} Whether upgrade is possible
 */
function canUpgrade(currentTier, targetTier) {
  return compareTiers(currentTier, targetTier) < 0;
}

/**
 * Get upgrade path
 * @param {string} currentTier - Current tier
 * @returns {array} Available upgrade options
 */
function getUpgradeOptions(currentTier) {
  const tierOrder = ["free", "silver", "golden"];
  const currentIndex = tierOrder.indexOf(currentTier.toLowerCase());

  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return [];
  }

  return tierOrder.slice(currentIndex + 1).map((tierName) => ({
    tier: tierName,
    ...plans[tierName],
  }));
}

/**
 * Calculate subscription value
 * @param {string} tierName - Tier name
 * @param {number} months - Number of months
 * @returns {object} Price breakdown
 */
function calculateSubscriptionValue(tierName, months = 1) {
  const tier = getTierByName(tierName);
  const monthlyPrice = tier.price;
  const totalPrice = monthlyPrice * months;

  // Discount for longer subscriptions
  const discounts = {
    1: 0, // No discount
    3: 0.05, // 5% off
    6: 0.1, // 10% off
    12: 0.15, // 15% off
  };

  const discount = discounts[months] || 0;
  const discountAmount = totalPrice * discount;
  const finalPrice = totalPrice - discountAmount;

  return {
    monthlyPrice,
    months,
    subtotal: totalPrice,
    discount: discountAmount,
    total: finalPrice,
    savings: discountAmount,
    pricePerMonth: finalPrice / months,
  };
}

/**
 * Get all plan names
 * @returns {array} Array of plan names
 */
function getAllPlanNames() {
  return Object.keys(plans);
}

/**
 * Get feature comparison
 * @returns {object} Comparison of all tiers
 */
function getFeatureComparison() {
  return {
    free: plans.free.features,
    silver: plans.silver.features,
    golden: plans.golden.features,
  };
}

/**
 * Format tier for display
 * @param {string} tierName - Tier name
 * @param {string} language - Language code (en/es)
 * @returns {string} Formatted tier description
 */
function formatTierDescription(tierName, language = "en") {
  const tier = getTierByName(tierName);

  const translations = {
    en: {
      price: `$${tier.price}/month`,
      or: "or",
      stars: `${tier.starPrice} Telegram Stars`,
      features: "Features",
    },
    es: {
      price: `$${tier.price}/mes`,
      or: "o",
      stars: `${tier.starPrice} Telegram Stars`,
      features: "Características",
    },
  };

  const t = translations[language] || translations.en;

  let description = `💎 **${tier.name} Tier**\n\n`;

  if (tier.price > 0) {
    description += `💵 ${t.price}`;
    if (tier.starPrice > 0) {
      description += ` ${t.or} ⭐ ${tier.starPrice} Stars`;
    }
    description += "\n\n";
  }

  description += `✨ **${t.features}:**\n`;
  tier.features.forEach((feature) => {
    description += `• ${feature}\n`;
  });

  return description;
}

// Export everything
module.exports = {
  // Plan configurations
  plans,
  free: plans.free,
  silver: plans.silver,
  golden: plans.golden,

  // Functions
  getTierByName,
  canUserPerformAction,
  getRemainingUsage,
  compareTiers,
  canUpgrade,
  getUpgradeOptions,
  calculateSubscriptionValue,
  getAllPlanNames,
  getFeatureComparison,
  formatTierDescription,
};
