# Daimo Pay - Testing & Deployment Guide

## 🧪 Local Testing

### Prerequisites
Both servers should be running:
- ✅ Server API: `http://localhost:8080`
- ✅ Web App: `http://localhost:5173`

### 1. Test Plan API Endpoints

```bash
# Test all plans
curl http://localhost:8080/api/plans/trial-pass
curl http://localhost:8080/api/plans/pnp-member
curl http://localhost:8080/api/plans/crystal-member
curl http://localhost:8080/api/plans/diamond-member

# Should return JSON like:
# {"id":"trial-pass","name":"Trial Pass","price":"14.99","description":"7 days access","periodLabel":"week"}
```

### 2. Test Payment Page UI

Open in your browser:
```
http://localhost:5173/?plan=trial-pass&userId=test-user-123
```

**What you should see:**
- PNPtv branding (purple/magenta colors)
- Plan details: Trial Pass, $14.99/week
- Daimo Pay button
- Feature cards (Exclusive Content, No Ads, etc.)

**Test all plan pages:**
- http://localhost:5173/?plan=trial-pass&userId=test-123
- http://localhost:5173/?plan=pnp-member&userId=test-123
- http://localhost:5173/?plan=crystal-member&userId=test-123
- http://localhost:5173/?plan=diamond-member&userId=test-123

### 3. Test Webhook Endpoint

Test the webhook that Daimo will call when payment completes:

```bash
curl -X POST http://localhost:8080/api/daimo/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic 0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c" \
  -d '{
    "type": "payment_completed",
    "payment": {
      "id": "pay_test_12345",
      "status": "payment_completed",
      "metadata": {
        "userId": "8365312597",
        "planId": "trial-pass"
      }
    }
  }'
```

**Expected response:** `OK`

**Check Firestore:**
Go to Firebase Console → Firestore Database and verify:
- Document created at `users/8365312597`
- Fields: `subscriptionActive: true`, `tier: "trial-pass"`, `lastPaymentId: "pay_test_12345"`
- Document created at `payments/pay_test_12345`

### 4. Test with Your Bot (Local)

Add this to your bot's subscription handler:

```javascript
// In src/bot/handlers/subscribe.js or similar

const PLANS = [
  { id: 'trial-pass', name: 'Trial Pass', price: '14.99', periodLabel: 'week' },
  { id: 'pnp-member', name: 'PNP Member', price: '24.99', periodLabel: 'month' },
  { id: 'crystal-member', name: 'Crystal Member', price: '49.99', periodLabel: '4 months' },
  { id: 'diamond-member', name: 'Diamond Member', price: '99.99', periodLabel: '1 year' },
];

// When user selects a plan:
async function sendPaymentLink(bot, chatId, planId, userId) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  const paymentLink = `http://localhost:5173?plan=${planId}&userId=${userId}`;

  await bot.sendMessage(chatId, {
    text: `💎 **${plan.name}**\n\n` +
          `💰 Price: $${plan.price} USDC\n` +
          `⏰ Duration: ${plan.periodLabel}\n\n` +
          `Click below to pay with crypto:`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: `💰 Pay $${plan.price}`, url: paymentLink }
      ]]
    }
  });
}
```

**Test flow:**
1. Run your bot locally
2. Send `/subscribe` command
3. Click payment link
4. Opens local payment page in browser

---

## 🚀 Production Deployment

### Option A: Deploy to Existing Infrastructure (Recommended)

Since you're already using ngrok and running your bot, integrate Daimo into your existing setup:

#### 1. Move Server Code to Main Bot

Copy the Daimo server routes into your existing Express app:

```bash
# Copy routes
cp server/src/routes/daimo-webhook.ts src/api/routes/
cp server/src/routes/plans.ts src/api/routes/

# Update your main app.ts to include routes
```

Add to your main Express app:
```javascript
// In your existing src/index.js or app.js
import daimoWebhook from './api/routes/daimo-webhook';
import plans from './api/routes/plans';

app.use('/api/plans', plans);
app.use(daimoWebhook); // mounts /api/daimo/webhook
```

#### 2. Add Daimo Env Vars to Main .env

Already done! Your main `.env` has:
```bash
DAIMO_API_KEY=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_APP_ID=pnptv-bot
DAIMO_WEBHOOK_TOKEN=0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c
NEXT_PUBLIC_TREASURY_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
NEXT_PUBLIC_REFUND_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
```

#### 3. Deploy Web App

**Option 3a: Vercel (Recommended for React)**

```bash
cd web

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# VITE_DAIMO_APP_ID=pnptv-bot
# VITE_DAIMO_TREASURY_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
# VITE_DAIMO_REFUND_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
# VITE_WEB_APP_URL=https://your-app.vercel.app
# VITE_API_BASE=https://unhonied-cleora-muddledly.ngrok-free.dev

# Production deploy
vercel --prod
```

**Option 3b: Netlify**

```bash
cd web

# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy

# Set env vars in Netlify dashboard, then:
netlify deploy --prod
```

**Option 3c: Host on Same Server (Next.js App)**

If you want to integrate into your existing Next.js app at `payment-app/`:

```bash
# Copy React components to Next.js
cp web/src/App.tsx payment-app/src/app/pay/page.tsx
# Adapt to Next.js conventions
```

#### 4. Configure Ngrok for Webhook

Your ngrok is already running at:
```
https://unhonied-cleora-muddledly.ngrok-free.dev
```

Update your web app `.env`:
```bash
VITE_API_BASE=https://unhonied-cleora-muddledly.ngrok-free.dev
```

Webhook URL will be:
```
https://unhonied-cleora-muddledly.ngrok-free.dev/api/daimo/webhook
```

#### 5. Register Webhook with Daimo

1. Go to Daimo Dashboard: https://pay.daimo.com/dashboard
2. Navigate to Webhooks section
3. Add webhook URL: `https://unhonied-cleora-muddledly.ngrok-free.dev/api/daimo/webhook`
4. Set Authorization header: `Basic 0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c`

#### 6. Update Bot Payment Links

Update your bot to use production URL:

```javascript
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-vercel-app.vercel.app';
const paymentLink = `${WEB_APP_URL}?plan=${planId}&userId=${userId}`;
```

### Option B: Separate Deployment (Alternative)

If you want to keep Daimo server separate:

#### Server Deployment (Railway/Render/Heroku)

**Railway (Free Tier):**
```bash
cd server

# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add environment variables via Railway dashboard
# Deploy
railway up
```

**Render (Free Tier):**
1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Build Command: `cd server && npm install && npm run build`
5. Start Command: `cd server && npm start`
6. Add environment variables
7. Deploy

---

## 🔐 Production Checklist

### Security

- [ ] **NEVER** use `pay-demo` in production
- [ ] Generate strong `DAIMO_WEBHOOK_TOKEN` (32+ random characters)
- [ ] Use real Daimo App ID from dashboard
- [ ] Verify wallet addresses are correct
- [ ] Enable HTTPS (ngrok provides this)
- [ ] Test webhook authorization

### Daimo Configuration

- [ ] Register webhook URL in Daimo dashboard
- [ ] Verify App ID matches `.env`
- [ ] Test with small payment ($1-2) first
- [ ] Monitor webhook logs for errors

### Firebase

- [ ] Verify Firestore rules allow server writes
- [ ] Test subscription activation
- [ ] Check payment document creation
- [ ] Monitor Firebase usage

### DNS (if using custom domain)

- [ ] Point `pay.pnptv.app` to web deployment
- [ ] Point `api.pnptv.app` to server (or use ngrok)
- [ ] Enable SSL certificates

---

## 🧪 End-to-End Testing (Production)

### 1. Test with Real Payment (Small Amount)

```bash
# Use a test amount plan or modify temporarily
# Change one plan to $1.00 for testing
```

### 2. Full Flow Test

1. Start bot
2. Send `/subscribe` command
3. Select a plan
4. Click payment link
5. Complete payment with Daimo wallet
6. Verify webhook fires
7. Check Firestore updated
8. Verify bot recognizes subscription

### 3. Monitor Logs

**Server logs:**
```bash
# Look for:
[INFO] Daimo event: payment_completed pay_abc123
[INFO] Activated subscription for user 8365312597 plan trial-pass
```

**Firestore:**
Check `users/{userId}`:
```javascript
{
  tier: "trial-pass",
  subscriptionActive: true,
  subscriptionEndsAt: Timestamp,
  lastPaymentId: "pay_abc123",
  lastPaymentAt: Timestamp
}
```

---

## 📱 Bot Integration

### Complete Subscription Handler

Create `src/bot/handlers/daimo-subscription.js`:

```javascript
const PLANS = [
  { id: 'trial-pass', name: 'Trial Pass', price: '14.99', periodLabel: 'week', days: 7 },
  { id: 'pnp-member', name: 'PNP Member', price: '24.99', periodLabel: 'month', days: 30 },
  { id: 'crystal-member', name: 'Crystal Member', price: '49.99', periodLabel: '4 months', days: 120 },
  { id: 'diamond-member', name: 'Diamond Member', price: '99.99', periodLabel: '1 year', days: 365 },
];

async function showPlans(bot, chatId) {
  const keyboard = PLANS.map(plan => [{
    text: `${plan.name} - $${plan.price}/${plan.periodLabel}`,
    callback_data: `daimo_plan_${plan.id}`
  }]);

  await bot.sendMessage(chatId, {
    text: '💎 **PNPtv Premium Plans**\n\n' +
          'Pay with crypto (USDC) using Daimo:\n\n' +
          '✅ Instant activation\n' +
          '✅ Secure blockchain payment\n' +
          '✅ No credit card needed\n\n' +
          'Choose your plan:',
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function handlePlanSelection(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id.toString();
  const planId = callbackQuery.data.replace('daimo_plan_', '');

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return;

  const WEB_APP_URL = process.env.WEB_APP_URL || 'https://your-app.vercel.app';
  const paymentLink = `${WEB_APP_URL}?plan=${planId}&userId=${userId}`;

  await bot.sendMessage(chatId, {
    text: `💎 **${plan.name}**\n\n` +
          `💰 **Price:** $${plan.price} USDC\n` +
          `⏰ **Duration:** ${plan.periodLabel}\n` +
          `📺 **Access:** ${plan.days} days of premium content\n\n` +
          `✅ **Includes:**\n` +
          `• Exclusive premium streams\n` +
          `• Ad-free experience\n` +
          `• Priority support\n` +
          `• Early access to new content\n\n` +
          `🔐 **Secure crypto payment via Daimo**\n\n` +
          `Click below to pay:`,
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

// Check if user has active subscription
async function hasActiveSubscription(firestore, userId) {
  const doc = await firestore.collection('users').doc(userId).get();
  if (!doc.exists) return false;

  const data = doc.data();
  const now = new Date();
  const endsAt = data.subscriptionEndsAt?.toDate();

  return data.subscriptionActive && endsAt && endsAt > now;
}

module.exports = {
  showPlans,
  handlePlanSelection,
  hasActiveSubscription,
  PLANS
};
```

### Add to Main Bot

In your `src/bot/index.js`:

```javascript
const { showPlans, handlePlanSelection, hasActiveSubscription } = require('./handlers/daimo-subscription');

// Command handler
bot.onText(/\/subscribe/, async (msg) => {
  await showPlans(bot, msg.chat.id);
});

// Callback query handler
bot.on('callback_query', async (query) => {
  if (query.data.startsWith('daimo_plan_')) {
    await handlePlanSelection(bot, query);
  } else if (query.data === 'daimo_show_plans') {
    await showPlans(bot, query.message.chat.id);
    await bot.answerCallbackQuery(query.id);
  }
  // ... other callback handlers
});

// Protect premium content
bot.onText(/\/premium/, async (msg) => {
  const userId = msg.from.id.toString();
  const hasSubscription = await hasActiveSubscription(firestore, userId);

  if (!hasSubscription) {
    return bot.sendMessage(msg.chat.id,
      '❌ Premium subscription required!\n\n' +
      'Use /subscribe to get access.',
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '💎 Subscribe Now', callback_data: 'daimo_show_plans' }
          ]]
        }
      }
    );
  }

  // Show premium content...
  await bot.sendMessage(msg.chat.id, '✅ Welcome to premium content!');
});
```

---

## 🔧 Troubleshooting

### Webhook Not Firing

1. Check webhook URL is registered in Daimo dashboard
2. Verify Authorization header matches `DAIMO_WEBHOOK_TOKEN`
3. Check server logs for incoming requests
4. Test webhook manually with curl (see above)
5. Ensure server is publicly accessible (ngrok running)

### Payment Not Activating Subscription

1. Check Firestore permissions (server SDK has write access)
2. Verify `userId` in metadata matches Telegram user ID
3. Check server logs for webhook processing
4. Verify Firebase credentials in `.env`

### Daimo Button Not Loading

1. Check browser console for errors
2. Verify all VITE_ environment variables are set
3. Ensure wallet addresses are valid (checksummed)
4. Check that `@daimo/pay` version is 1.18.x

### CORS Errors

Make sure your server has:
```javascript
app.use(cors({ origin: true }));
```

---

## 📊 Monitoring

### Check Subscription Status

```javascript
// In your bot or admin panel
const doc = await firestore.collection('users').doc(userId).get();
const data = doc.data();

console.log('Subscription:', {
  active: data.subscriptionActive,
  tier: data.tier,
  endsAt: data.subscriptionEndsAt?.toDate(),
  lastPayment: data.lastPaymentId
});
```

### View All Payments

```javascript
const payments = await firestore.collection('payments')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

payments.forEach(doc => {
  const p = doc.data();
  console.log(`${p.userId} paid $${p.raw.amount} for ${p.planId}`);
});
```

---

## 🎉 Quick Deployment Summary

**Fastest path to production:**

1. **Keep servers running locally** (ngrok already provides public URL)
2. **Deploy web to Vercel:** `cd web && vercel --prod`
3. **Register webhook** in Daimo dashboard
4. **Update bot** with production web URL
5. **Test** with small payment
6. **Go live!**

That's it! Your current setup with ngrok is already production-ready for the backend.
