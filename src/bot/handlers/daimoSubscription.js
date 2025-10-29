// Daimo crypto payment subscription handler
const { firestore } = require('../../config/firebase');

const PLANS = [
  { id: 'trial-pass', name: 'Trial Week', price: '15', periodLabel: 'week', days: 7 },
  { id: 'pnp-member', name: 'Prime Member', price: '25', periodLabel: 'month', days: 30 },
  { id: 'crystal-member', name: 'Crystal Member', price: '50', periodLabel: '4 months', days: 120 },
  { id: 'diamond-member', name: 'Diamond Member', price: '100', periodLabel: '1 year', days: 365 },
];

/**
 * Show available Daimo payment plans
 */
async function showDaimoPlans(bot, chatId) {
  const keyboard = PLANS.map(plan => [{
    text: `${plan.name} - $${plan.price}/${plan.periodLabel}`,
    callback_data: `daimo_plan_${plan.id}`
  }]);

  await bot.sendMessage(chatId, {
    text: '💎 **PNPtv Premium Plans**\n\n' +
          '💰 Pay with crypto (USDC) using Daimo:\n\n' +
          '✅ Instant activation\n' +
          '✅ Secure blockchain payment\n' +
          '✅ No credit card needed\n\n' +
          'Choose your plan:',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

/**
 * Handle plan selection and generate payment link
 */
async function handleDaimoPlanSelection(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id.toString();
  const planId = callbackQuery.data.replace('daimo_plan_', '');

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '❌ Invalid plan selected',
      show_alert: true
    });
    return;
  }

  // Use environment variable or default to localhost for testing
  const PAYMENT_PAGE_URL = process.env.PAYMENT_PAGE_URL || process.env.BOT_URL + '/pay';
  const paymentLink = `${PAYMENT_PAGE_URL}?plan=${planId}&user=${userId}&amount=${plan.price}`;

  await bot.sendMessage(chatId, {
    text: `💎 **${plan.name}**\n\n` +
          `💰 **Price:** $${plan.price} USDC\n` +
          `⏰ **Duration:** ${plan.periodLabel} (${plan.days} days)\n` +
          `📺 **Access:** Premium content\n\n` +
          `✅ **Includes:**\n` +
          `• Exclusive premium streams\n` +
          `• Ad-free experience\n` +
          `• Priority support\n` +
          `• Early access to new content\n\n` +
          `🔐 **Secure crypto payment via Daimo**\n\n` +
          `Click below to complete payment:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: `💰 Pay $${plan.price} USDC`, url: paymentLink }],
        [{ text: '« Back to Plans', callback_data: 'daimo_show_plans' }]
      ]
    }
  });

  await bot.answerCallbackQuery(callbackQuery.id);
}

/**
 * Check if user has an active Daimo subscription
 */
async function hasDaimoSubscription(userId) {
  try {
    const doc = await firestore.collection('users').doc(userId.toString()).get();

    if (!doc.exists) {
      return false;
    }

    const data = doc.data();
    const now = new Date();
    const endsAt = data.subscriptionEndsAt?.toDate();

    return data.subscriptionActive && endsAt && endsAt > now;
  } catch (error) {
    console.error('Error checking Daimo subscription:', error);
    return false;
  }
}

/**
 * Get user's subscription info
 */
async function getDaimoSubscriptionInfo(userId) {
  try {
    const doc = await firestore.collection('users').doc(userId.toString()).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    const now = new Date();
    const endsAt = data.subscriptionEndsAt?.toDate();
    const isActive = data.subscriptionActive && endsAt && endsAt > now;

    return {
      active: isActive,
      tier: data.tier,
      endsAt: endsAt,
      lastPaymentId: data.lastPaymentId,
      lastPaymentAt: data.lastPaymentAt?.toDate()
    };
  } catch (error) {
    console.error('Error getting Daimo subscription info:', error);
    return null;
  }
}

/**
 * Handle callback query for showing plans
 */
async function handleShowPlansCallback(bot, callbackQuery) {
  await showDaimoPlans(bot, callbackQuery.message.chat.id);
  await bot.answerCallbackQuery(callbackQuery.id);
}

module.exports = {
  showDaimoPlans,
  handleDaimoPlanSelection,
  hasDaimoSubscription,
  getDaimoSubscriptionInfo,
  handleShowPlansCallback,
  PLANS
};
