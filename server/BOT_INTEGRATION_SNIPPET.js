// ============================================
// PNPtv Telegram Bot - Daimo Payment Integration
// ============================================
// Add this to your Telegram bot subscription handler

/**
 * Generate Daimo payment deep link for a plan
 * @param {string} planId - One of: trial-pass, pnp-member, crystal-member, diamond-member
 * @param {string} userId - Telegram user ID
 * @returns {string} Payment page URL
 */
function generatePaymentLink(planId, userId) {
  const baseUrl = process.env.WEB_APP_URL || 'https://pay.pnptv.app';
  return `${baseUrl}?plan=${encodeURIComponent(planId)}&userId=${encodeURIComponent(userId)}`;
}

// ============================================
// Example 1: Simple Message with Link
// ============================================

async function sendPaymentLink_Simple(bot, chatId, plan, userId) {
  const paymentLink = generatePaymentLink(plan.id, userId);

  await bot.sendMessage(chatId,
    `💳 Pay with crypto: ${paymentLink}`
  );
}

// ============================================
// Example 2: Inline Keyboard Button
// ============================================

async function sendPaymentLink_InlineButton(bot, chatId, plan, userId) {
  const paymentLink = generatePaymentLink(plan.id, userId);

  await bot.sendMessage(chatId, {
    text: `💎 **${plan.name} Subscription**\n\n` +
          `💰 Price: $${plan.price} USDC\n` +
          `⏰ Duration: ${plan.description}\n\n` +
          `Click below to pay securely with crypto:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '💰 Pay with Daimo', url: paymentLink }
      ]]
    }
  });
}

// ============================================
// Example 3: Full Plan Selection Handler
// ============================================

// Available plans (matches server/src/routes/plans.ts)
const PLANS = [
  { id: 'trial-pass', name: 'Trial Pass', price: '14.99', description: '7 days access', periodLabel: 'week' },
  { id: 'pnp-member', name: 'PNP Member', price: '24.99', description: '30 days access', periodLabel: 'month' },
  { id: 'crystal-member', name: 'Crystal Member', price: '49.99', description: '120 days access', periodLabel: '4 months' },
  { id: 'diamond-member', name: 'Diamond Member', price: '99.99', description: '365 days access', periodLabel: '1 year' },
];

async function handlePlanSelection(bot, msg, planId) {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  // Find the selected plan
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) {
    return bot.sendMessage(chatId, '❌ Invalid plan selected.');
  }

  // Generate payment link
  const paymentLink = generatePaymentLink(plan.id, userId);

  // Send payment message
  await bot.sendMessage(chatId, {
    text: `💎 **${plan.name} Plan Selected**\n\n` +
          `💰 **Price:** $${plan.price} USDC\n` +
          `⏰ **Duration:** ${plan.periodLabel}\n` +
          `📺 **Access:** ${plan.description}\n\n` +
          `✅ **What's included:**\n` +
          `• Exclusive premium content\n` +
          `• Ad-free streaming\n` +
          `• Priority support\n` +
          `• Early access to new features\n\n` +
          `🔐 **Secure crypto payment powered by Daimo**\n` +
          `Click the button below to complete your subscription:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💰 Pay $' + plan.price + ' with USDC', url: paymentLink }],
        [{ text: '« Back to Plans', callback_data: 'show_plans' }]
      ]
    }
  });
}

// ============================================
// Example 4: Check Subscription Status
// ============================================

async function checkSubscriptionStatus(firestore, userId) {
  const userDoc = await firestore.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return { active: false, message: 'No subscription found' };
  }

  const userData = userDoc.data();
  const now = new Date();
  const endsAt = userData.subscriptionEndsAt?.toDate();

  if (userData.subscriptionActive && endsAt && endsAt > now) {
    return {
      active: true,
      tier: userData.tier,
      endsAt: endsAt,
      message: `Active ${userData.tier} subscription until ${endsAt.toLocaleDateString()}`
    };
  }

  return { active: false, message: 'Subscription expired' };
}

// ============================================
// Example 5: Callback Query Handler
// ============================================

async function handleCallbackQuery(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id.toString();
  const data = callbackQuery.data;

  // Handle plan selection callbacks
  if (data.startsWith('select_plan_')) {
    const planId = data.replace('select_plan_', '');
    await handlePlanSelection(bot, callbackQuery.message, planId);
    await bot.answerCallbackQuery(callbackQuery.id);
  }

  // Handle show plans callback
  else if (data === 'show_plans') {
    await showAvailablePlans(bot, chatId);
    await bot.answerCallbackQuery(callbackQuery.id);
  }
}

// ============================================
// Example 6: Show Available Plans
// ============================================

async function showAvailablePlans(bot, chatId) {
  const keyboard = PLANS.map(plan => [{
    text: `${plan.name} - $${plan.price}/${plan.periodLabel}`,
    callback_data: `select_plan_${plan.id}`
  }]);

  await bot.sendMessage(chatId, {
    text: `📺 **PNPtv Premium Plans**\n\n` +
          `Choose your subscription plan:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

// ============================================
// USAGE IN YOUR BOT
// ============================================

/*
// In your main bot file (e.g., src/bot/index.js):

bot.onText(/\/subscribe/, async (msg) => {
  await showAvailablePlans(bot, msg.chat.id);
});

bot.on('callback_query', async (callbackQuery) => {
  await handleCallbackQuery(bot, callbackQuery);
});

// To check if user has active subscription before allowing access:
const status = await checkSubscriptionStatus(firestore, userId);
if (!status.active) {
  return bot.sendMessage(chatId,
    '❌ You need an active subscription. Use /subscribe to get started!'
  );
}
*/

// ============================================
// EXPORTS
// ============================================

module.exports = {
  generatePaymentLink,
  sendPaymentLink_Simple,
  sendPaymentLink_InlineButton,
  handlePlanSelection,
  checkSubscriptionStatus,
  handleCallbackQuery,
  showAvailablePlans,
  PLANS
};
