// Daimo crypto payment subscription handler
const { firestore } = require('../../config/firebase');
const logger = require('../../utils/logger');

const PLANS = [
  { 
    id: 'trial-week', 
    name: 'Trial Week', 
    price: '14.99', 
    periodLabel: 'week', 
    days: 7,
    description: 'Perfect for trying out our premium features',
    features: ['Basic access', '720p streaming', 'Standard support']
  },
  { 
    id: 'pnp-member', 
    name: 'PNP Member', 
    price: '24.99', 
    periodLabel: 'month', 
    days: 30,
    description: 'Most popular choice for regular users',
    features: ['Full access', '1080p streaming', 'Priority support']
  },
  { 
    id: 'crystal-member', 
    name: 'PNP Crystal Member', 
    price: '49.99', 
    periodLabel: '4 months', 
    days: 120,
    description: 'Best value for committed members',
    features: ['Premium access', '4K streaming', 'Priority support', 'Early access']
  },
  { 
    id: 'diamond-member', 
    name: 'PNP Diamond Member', 
    price: '99.99', 
    periodLabel: '1 year', 
    days: 365,
    description: 'Ultimate experience for dedicated users',
    features: ['VIP access', '4K+ streaming', '24/7 support', 'Exclusive content']
  },
];

/**
 * Show available Daimo payment plans
 */
async function showDaimoPlans(bot, chatId) {
  try {
    // Format plans into a grid with 2 plans per row
    const keyboard = [];
    for (let i = 0; i < PLANS.length; i += 2) {
      const row = [];
      row.push({
        text: `${PLANS[i].name} - $${PLANS[i].price}`,
        callback_data: `daimo_plan_${PLANS[i].id}`
      });
      if (PLANS[i + 1]) {
        row.push({
          text: `${PLANS[i + 1].name} - $${PLANS[i + 1].price}`,
          callback_data: `daimo_plan_${PLANS[i + 1].id}`
        });
      }
      keyboard.push(row);
    }

    // Create plan details message
    const plansMessage = PLANS.map(plan => {
      return `*${plan.name}* - $${plan.price}/${plan.periodLabel}\n` +
             `📝 ${plan.description}\n` +
             plan.features.map(f => `✓ ${f}`).join('\n') + '\n';
    }).join('\n');

    await bot.sendMessage(chatId, {
      text: '💎 *PNPtv Premium Plans*\n\n' +
            '💰 Pay with crypto (USDC) using Daimo:\n\n' +
            '✅ Instant activation\n' +
            '✅ Secure blockchain payment\n' +
            '✅ No credit card needed\n\n' +
            plansMessage + '\n' +
            '🔒 All plans include secure payment and instant access\n' +
            '💫 Choose your plan below:',
      parse_mode: 'Markdown',
      reply_markup: { 
        inline_keyboard: [
          ...keyboard,
          [{ text: '❓ Need help choosing?', callback_data: 'daimo_help' }]
        ]
      }
    });
  } catch (error) {
    logger.error('Error showing Daimo plans:', error);
    await bot.sendMessage(chatId, 
      '❌ Sorry, there was an error displaying the plans. Please try again later.');
  }
}

/**
 * Handle plan selection and generate payment link
 */
async function handleDaimoPlanSelection(bot, callbackQuery) {
  try {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id.toString();
    const planId = callbackQuery.data.replace('daimo_plan_', '');

    // Validate plan
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '❌ Invalid plan selected',
        show_alert: true
      });
      return;
    }

    // Check if user already has active subscription
    const hasActive = await hasDaimoSubscription(userId);
    if (hasActive) {
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: '⚠️ You already have an active subscription',
        show_alert: true
      });
      return;
    }

    // Get configured payment page URL
    const PAYMENT_PAGE_URL = process.env.PAYMENT_PAGE_URL || process.env.BOT_URL + '/payment';
    if (!PAYMENT_PAGE_URL) {
      throw new Error('Payment page URL not configured');
    }

    // Generate payment link with signature
    const timestamp = Date.now();
    const signature = generatePaymentSignature(userId, planId, timestamp);
    const paymentLink = `${PAYMENT_PAGE_URL}?plan=${planId}&user=${userId}&amount=${plan.price}&ts=${timestamp}&sig=${signature}`;

    // Format features list
    const features = plan.features.map(f => `• ${f}`).join('\n');

    // Send detailed plan info with payment button
    await bot.editMessageText(
      `💎 *${plan.name}*\n\n` +
      `💰 *Price:* $${plan.price} USDC\n` +
      `⏰ *Duration:* ${plan.periodLabel} (${plan.days} days)\n` +
      `� *Description:* ${plan.description}\n\n` +
      `✨ *Features:*\n${features}\n\n` +
      `🔒 *Secure Payment:*\n` +
      `• Instant activation\n` +
      `• Pay with any cryptocurrency\n` +
      `• Secure blockchain transaction\n\n` +
      `Click the button below to complete your payment:`,
      {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: `� Secure Payment - $${plan.price} USDC`, url: paymentLink }],
            [
              { text: '« Back to Plans', callback_data: 'daimo_show_plans' },
              { text: '❓ Help', callback_data: 'daimo_help' }
            ]
          ]
        }
      }
    );

    // Log selection
    logger.info('Plan selected:', {
      userId,
      planId,
      price: plan.price,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error handling plan selection:', error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '❌ Sorry, there was an error. Please try again.',
      show_alert: true
    });
  }

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
