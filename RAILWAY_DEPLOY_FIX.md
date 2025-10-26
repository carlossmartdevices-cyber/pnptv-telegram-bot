# Railway Deployment Fix

## Issue Fixed

**Problem**: Railway showed "train has not arrived at the station" error
**Cause**: Bot was starting in polling mode instead of webhook mode
**Solution**: Created `start-production.js` that forces webhook mode

---

## Changes Made

### 1. Created Production Starter
**File**: `start-production.js`

```javascript
// Forces NODE_ENV=production and starts webhook server
process.env.NODE_ENV = "production";
require("./instrument.js");
require("./src/config/env");
require("./src/bot/webhook.js");
```

### 2. Updated Railway Configuration
**File**: `railway.toml`

```toml
[deploy]
startCommand = "node start-production.js"  # Changed from "npm start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
```

---

## How It Works Now

### Development Mode (Local)
```bash
npm start  # Uses polling mode (start-bot.js)
```
- Bot connects to Telegram via long-polling
- No webhook needed
- No PORT listening required

### Production Mode (Railway)
```bash
node start-production.js  # Uses webhook mode
```
- Express server listens on PORT
- Telegram sends updates to webhook
- Health check at `/health`
- Payment page at `/pay`

---

## Deployment Steps

### 1. Commit Changes

```bash
git add start-production.js railway.toml
git commit -m "Fix Railway deployment - use webhook mode"
git push
```

### 2. Railway Will Auto-Deploy

Railway detects the push and redeploys automatically.

### 3. Set Telegram Webhook

After Railway deploys successfully, set the webhook:

```bash
curl "https://api.telegram.org/bot8499797477:AAGxHvVkK2DazymRAX0_iE1ioG4mrY1TRoc/setWebhook?url=https://pnptv-production-2787.up.railway.app/telegram/webhook"
```

Expected response:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 4. Verify Deployment

**Check Health:**
```bash
curl https://pnptv-production-2787.up.railway.app/health
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "2025-10-26T...",
  "uptime": 123.45,
  "environment": "production"
}
```

**Check Webhook Info:**
```bash
curl "https://api.telegram.org/bot8499797477:AAGxHvVkK2DazymRAX0_iE1ioG4mrY1TRoc/getWebhookInfo"
```

Should show:
```json
{
  "url": "https://pnptv-production-2787.up.railway.app/telegram/webhook",
  "has_custom_certificate": false,
  "pending_update_count": 0
}
```

---

## Environment Variables Required

Make sure these are set in Railway dashboard:

### Critical
```
NODE_ENV=production
PORT=3000
TELEGRAM_BOT_TOKEN=8499797477:AAGxHvVkK2DazymRAX0_iE1ioG4mrY1TRoc
BOT_URL=https://pnptv-production-2787.up.railway.app
```

### Firebase
```
FIREBASE_PROJECT_ID=pnptv-b8af8
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@pnptv-b8af8.iam.gserviceaccount.com
FIREBASE_CREDENTIALS={"type":"service_account",...}
```

### Payment Gateways
```
EPAYCO_PUBLIC_KEY=6d5c47f6a632c0bacd5bb31990d4e994
EPAYCO_PRIVATE_KEY=c3b7fa0d75e65dd28804fb9c18989693
EPAYCO_TEST_MODE=false
DAIMO_APP_ID=pnptv-bot
DAIMO_WEBHOOK_TOKEN=0x36f81c73...
```

### URLs
```
PAYMENT_PAGE_URL=https://pnptv-production-2787.up.railway.app/pay
WEBAPP_URL=https://pnptv-production-2787.up.railway.app
EPAYCO_RESPONSE_URL=https://pnptv-production-2787.up.railway.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv-production-2787.up.railway.app/epayco/confirmation
```

---

## Troubleshooting

### Bot Not Responding

**Check Railway Logs:**
```bash
railway logs
```

**Common Issues:**
1. Webhook not set → Set webhook using curl command above
2. Wrong BOT_URL → Update in Railway dashboard
3. Missing environment variables → Add from .env.production

### "Train has not arrived"

**Cause**: Server not listening on PORT

**Fix**:
1. Check Railway logs for startup errors
2. Verify `start-production.js` is being used
3. Ensure PORT environment variable is set (Railway auto-sets this)

### Health Check Failing

**Check**:
```bash
curl https://pnptv-production-2787.up.railway.app/health
```

**If fails**:
1. Check if server started successfully in logs
2. Verify PORT is correct (should be 3000 or Railway-assigned)
3. Check if firewall/security rules block health check

---

## Files Structure

```
start-bot.js           → Development (polling mode)
start-production.js    → Production (webhook mode)  ← NEW
src/bot/index.js       → Bot logic (polling)
src/bot/webhook.js     → Webhook server (production)
railway.toml           → Railway config (updated)
Procfile               → Heroku config (optional)
```

---

## Testing Production Mode Locally

You can test production mode locally:

```bash
# Set environment
export NODE_ENV=production
export BOT_URL=https://your-ngrok-url.ngrok.io
export PORT=3000

# Start in production mode
node start-production.js

# In another terminal, set webhook
curl "https://api.telegram.org/bot.../setWebhook?url=https://your-ngrok-url.ngrok.io/telegram/webhook"
```

---

## Success Indicators

✅ Railway deployment successful
✅ Health check returns 200 OK
✅ Webhook shows correct URL
✅ Bot responds to /start command
✅ Payment pages load
✅ Daimo button appears

---

## Next Steps After Deployment

1. **Test Bot**: Send `/start` to @PNPtvbot
2. **Test Payments**: Try subscription flow
3. **Monitor Logs**: Watch for errors in Railway
4. **Set Up Alerts**: Configure Railway alerts for downtime
5. **Configure Daimo Webhook**: Add webhook in Daimo dashboard

---

## Monitoring

**Railway Dashboard**:
- https://railway.app/project/your-project

**Bot Endpoints**:
- Health: https://pnptv-production-2787.up.railway.app/health
- Payment: https://pnptv-production-2787.up.railway.app/pay
- Root: https://pnptv-production-2787.up.railway.app/

**Telegram**:
- Bot: https://t.me/PNPtvbot
- Webhook Info: https://api.telegram.org/bot.../getWebhookInfo
