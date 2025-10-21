# Daimo Pay - Quick Start Guide

## ✅ What's Ready

You have a complete Daimo crypto payment integration running locally:

- **Server API:** `http://localhost:8080` (running)
- **Web App:** `http://localhost:5173` (running)
- **Plans:** Trial Pass, PNP Member, Crystal Member, Diamond Member
- **Webhook:** Ready to receive payment notifications
- **Firestore:** Configured for subscription storage

## 🧪 Test Now (3 Steps)

### 1. Test API

```bash
# Test plan endpoints
curl http://localhost:8080/api/plans/trial-pass
curl http://localhost:8080/api/plans/pnp-member
```

### 2. Test Payment Page

Open in browser:
```
http://localhost:5173/?plan=trial-pass&userId=8365312597
```

You should see:
- ✅ PNPtv branding (purple/magenta)
- ✅ Trial Pass - $14.99/week
- ✅ Daimo Pay button
- ✅ Feature cards

### 3. Run Full Test Suite

```bash
node test-daimo-integration.js
```

This will:
- ✅ Test all plan endpoints
- ✅ Test webhook with mock payment
- ✅ Verify Firestore update
- ✅ Check payment page

## 🤖 Add to Your Bot

### Option 1: Quick Integration (5 minutes)

Add to your existing bot file:

```javascript
// At the top with other requires
const { showDaimoPlans, handleDaimoPlanSelection, hasDaimoSubscription } =
  require('./src/bot/handlers/daimoSubscription');

// Add /subscribe command
bot.onText(/\/subscribe/, async (msg) => {
  await showDaimoPlans(bot, msg.chat.id);
});

// Add to your callback_query handler
bot.on('callback_query', async (query) => {
  if (query.data.startsWith('daimo_plan_')) {
    await handleDaimoPlanSelection(bot, query);
  } else if (query.data === 'daimo_show_plans') {
    await showDaimoPlans(bot, query.message.chat.id);
    await bot.answerCallbackQuery(query.id);
  }
  // ... your existing callbacks
});

// Protect premium content
bot.onText(/\/premium/, async (msg) => {
  const userId = msg.from.id.toString();
  const hasSubscription = await hasDaimoSubscription(userId);

  if (!hasSubscription) {
    return bot.sendMessage(msg.chat.id,
      '❌ Premium subscription required!\n\nUse /subscribe to unlock premium content.',
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

### Option 2: Full Integration (10 minutes)

Add routes to your main Express app:

```javascript
// In your main bot file (src/index.js or app.js)
const daimoRoutes = require('./src/api/daimo-routes');

// Add Daimo routes
app.use(daimoRoutes);

// Now you have:
// - GET  /api/plans/:planId
// - POST /api/daimo/webhook
// - GET  /api/daimo/health
```

## 🚀 Deploy to Production

### Fastest Way (Using Your Ngrok)

Your ngrok is already running at:
```
https://unhonied-cleora-muddledly.ngrok-free.dev
```

**1. Add routes to your existing bot**
```bash
# Copy the daimo-routes.js file content into your main app
# The routes will be available at your ngrok URL
```

**2. Deploy Web App to Vercel (FREE)**
```bash
cd web
npm i -g vercel
vercel login
vercel

# Set environment variables in Vercel dashboard:
# VITE_API_BASE=https://unhonied-cleora-muddledly.ngrok-free.dev
# (other VITE_ vars from web/.env)

vercel --prod
# Note the URL, e.g., https://pnptv-pay.vercel.app
```

**3. Update Bot to Use Production URL**
```javascript
// In your .env
WEB_APP_URL=https://pnptv-pay.vercel.app
```

**4. Register Webhook in Daimo Dashboard**
1. Go to https://pay.daimo.com/dashboard
2. Add webhook: `https://unhonied-cleora-muddledly.ngrok-free.dev/api/daimo/webhook`
3. Authorization: `Basic 0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c`

**5. Test with Real Payment**
- Send /subscribe in your bot
- Select Trial Pass ($14.99)
- Complete payment with Daimo
- Check Firestore for subscription activation

## 📁 Files Created

### Core Integration
- `server/` - Express API with Daimo webhook
- `web/` - React payment page
- `server/.env` - Server configuration (configured ✅)
- `web/.env` - Web app configuration (configured ✅)

### Bot Integration
- `src/bot/handlers/daimoSubscription.js` - Bot handler (ready to use)
- `src/api/daimo-routes.js` - API routes for your main app (ready to use)

### Documentation
- `DAIMO_TESTING_AND_DEPLOYMENT.md` - Complete guide
- `DAIMO_QUICKSTART.md` - This file
- `DAIMO_PNPTV_README.md` - Full technical documentation
- `DAIMO_INTEGRATION_COMPLETE.md` - Setup summary

### Testing
- `test-daimo-integration.js` - Automated test script

### Bot Examples
- `server/BOT_INTEGRATION_SNIPPET.js` - Complete examples

## 🎯 Your Plans

```
Trial Pass      - $14.99 / week    (7 days)
PNP Member      - $24.99 / month   (30 days)
Crystal Member  - $49.99 / 4 months (120 days)
Diamond Member  - $99.99 / 1 year   (365 days)
```

## 🔍 Check Status

### Test Webhook
```bash
curl -X POST http://localhost:8080/api/daimo/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic 0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c" \
  -d '{"type":"payment_completed","payment":{"id":"pay_test_123","status":"payment_completed","metadata":{"userId":"8365312597","planId":"trial-pass"}}}'
```

### Check Firestore
Firebase Console → Firestore → Check:
- `users/8365312597` - Should have `subscriptionActive: true`
- `payments/pay_test_123` - Payment record

## ⚡ Development Commands

```bash
# Start server (Terminal 1)
cd server && npm run dev

# Start web app (Terminal 2)
cd web && npm run dev

# Run tests
node test-daimo-integration.js

# Build for production
cd server && npm run build
cd web && npm run build
```

## 🆘 Troubleshooting

### Webhook 401 Unauthorized
- Check `DAIMO_WEBHOOK_TOKEN` matches in both server/.env and curl command
- Verify Authorization header: `Basic <token>`

### Payment page won't load
- Ensure web dev server is running on port 5173
- Check `VITE_API_BASE` points to localhost:8080

### Daimo button doesn't show
- Check browser console for errors
- Verify wallet addresses are valid
- Ensure `@daimo/pay` is installed

### Can't import handler in bot
- File location: `src/bot/handlers/daimoSubscription.js`
- Check path: `require('./src/bot/handlers/daimoSubscription')`
- Verify firestore is initialized

## 📞 Support

**Daimo Issues:**
- Docs: https://pay.daimo.com/docs
- Dashboard: https://pay.daimo.com/dashboard

**Integration Issues:**
- Check `DAIMO_TESTING_AND_DEPLOYMENT.md` for detailed troubleshooting
- Review `DAIMO_PNPTV_README.md` for API reference

## ✨ Next Steps

1. ✅ Test locally (you can do this now!)
2. 📝 Add `/subscribe` to your bot
3. 🧪 Test webhook with curl
4. 🌐 Deploy web to Vercel
5. 🔔 Register webhook in Daimo dashboard
6. 💰 Test with $1 payment
7. 🚀 Go live!

---

**Ready to test?** Run:
```bash
node test-daimo-integration.js
```

Then open your browser:
```
http://localhost:5173/?plan=trial-pass&userId=8365312597
```
