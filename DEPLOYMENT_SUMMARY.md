# Deployment Summary - pnptv.app

## Changes Made

### 1. Updated ecosystem.config.js
- **Changed entry point** from `./src/bot/index.js` to `./src/bot/webhook.js`
- This enables webhook mode instead of polling mode
- Bot will now run an Express server on port 3000

### 2. Updated .env File - NEW PRODUCTION CREDENTIALS

#### ePayco Credentials (UPDATED):
```bash
EPAYCO_PUBLIC_KEY=6d5c47f6a632c0bacd5bb31990d4e994
EPAYCO_PRIVATE_KEY=c3b7fa0d75e65dd28804fb9c18989693
EPAYCO_CUSTOMER_ID=1565511
EPAYCO_P_CUST_ID=1565511
EPAYCO_P_KEY=4ae1e189c9af6a730b71bc4f15546b78520ad338
```

#### Production Mode:
```bash
EPAYCO_TEST=false
EPAYCO_TEST_MODE=false
NODE_ENV=production
```

#### All URLs Updated to pnptv.app:
```bash
BOT_URL=https://pnptv.app
WEBAPP_URL=https://pnptv.app
WEB_APP_URL=https://pnptv.app
WEBHOOK_URL=https://pnptv.app

# Webhooks
EPAYCO_RESPONSE_URL=https://pnptv.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv.app/epayco/confirmation
DAIMO_WEBHOOK_URL=https://pnptv.app/daimo/webhook
DAIMO_RETURN_URL=https://pnptv.app/payment/success

# Public URLs
NEXT_PUBLIC_BOT_URL=https://pnptv.app
NEXT_PUBLIC_WEBAPP_URL=https://pnptv.app
```

---

## Deployment Steps

### Step 1: Upload Files to VPS

**Option A: Use deployment script (in Git Bash or WSL)**
```bash
cd /mnt/c/Users/carlo/Documents/Bots
chmod +x deploy-to-vps.sh
./deploy-to-vps.sh
```

**Option B: Manual upload**
```bash
# Upload .env
scp C:\Users\carlo\Documents\Bots\.env root@72.60.29.80:/var/www/telegram-bot/

# Upload ecosystem.config.js
scp C:\Users\carlo\Documents\Bots\ecosystem.config.js root@72.60.29.80:/var/www/telegram-bot/
```

### Step 2: Restart Bot on VPS

```bash
# SSH into VPS
ssh root@72.60.29.80

# Navigate to bot directory
cd /var/www/telegram-bot

# Stop current bot
pm2 stop pnptv-bot

# Delete from PM2
pm2 delete pnptv-bot

# Start with webhook mode
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save

# Check logs
pm2 logs pnptv-bot --lines 30
```

### Step 3: Verify Bot is Running

```bash
# Check PM2 status
pm2 status

# Test health endpoint
curl https://pnptv.app/health

# Test from browser
# Open: https://pnptv.app
```

You should see JSON response like:
```json
{
  "service": "PNPtv Telegram Bot",
  "status": "running",
  "version": "2.0.0",
  "environment": "production"
}
```

### Step 4: Test Telegram Bot

1. Open Telegram
2. Search for @PNPtvBot
3. Send `/start`
4. Bot should respond!

---

## Post-Deployment Configuration

### 1. Configure ePayco Dashboard

Go to: https://dashboard.epayco.co/

Navigate to: **Settings → API → Webhooks**

Set these URLs:
- **Confirmation URL**: `https://pnptv.app/epayco/confirmation`
- **Response URL**: `https://pnptv.app/epayco/response`

✅ Save changes

### 2. Configure Daimo Pay Dashboard

Go to: https://pay.daimo.com/dashboard

Navigate to: **Webhooks**

Set:
- **Webhook URL**: `https://pnptv.app/daimo/webhook`

✅ Save changes

### 3. Test Payment Flow

#### Test ePayco (use test card):
- Card: 4575623182290326
- CVV: 123
- Expiry: Any future date

#### Test Daimo:
- Use Daimo app or wallet
- Make test payment

---

## Troubleshooting

### Bot Returns 502 Bad Gateway

```bash
# Check if PM2 is running
pm2 status

# Check logs for errors
pm2 logs pnptv-bot --lines 50

# Restart bot
pm2 restart pnptv-bot --update-env
```

### Webhook Not Working

```bash
# Get webhook info
curl "https://api.telegram.org/bot8499797477:AAFo--MV4tUfIhv_Al2MaLMFzvi2TbI1eso/getWebhookInfo"

# The webhook should be set automatically by webhook.js
# If not, it will be set when the bot starts
```

### Check if Port 3000 is Listening

```bash
# On VPS
netstat -tlnp | grep 3000
# or
ss -tlnp | grep 3000
```

You should see:
```
tcp  0  0 0.0.0.0:3000  0.0.0.0:*  LISTEN  <process_id>/node
```

### Payment Webhooks Not Working

1. Check ePayco dashboard webhook configuration
2. Check logs: `pm2 logs pnptv-bot | grep -i epayco`
3. Verify signature settings: `EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false`
4. Test webhook manually:
   ```bash
   curl -X POST https://pnptv.app/epayco/confirmation \
     -H "Content-Type: application/json" \
     -d '{"x_transaction_state":"test"}'
   ```

---

## Important URLs

### Your Bot
- **Domain**: https://pnptv.app
- **Health Check**: https://pnptv.app/health
- **Telegram Bot**: https://t.me/PNPtvBot

### Webhooks
- **ePayco Response**: https://pnptv.app/epayco/response
- **ePayco Confirmation**: https://pnptv.app/epayco/confirmation
- **Daimo Webhook**: https://pnptv.app/daimo/webhook

### Payment Dashboards
- **ePayco**: https://dashboard.epayco.co/
- **Daimo Pay**: https://pay.daimo.com/dashboard

---

## What Changed from Before

| Before | After |
|--------|-------|
| Polling mode (start-bot.js) | Webhook mode (webhook.js) |
| Heroku URLs | pnptv.app URLs |
| Test mode enabled | Production mode |
| Old ePayco credentials | NEW production credentials |
| No web server | Express server on port 3000 |
| Bot checks for updates | Telegram sends updates to bot |

---

## Key Files

- **src/bot/webhook.js** - Main entry point (Express + Telegram webhook)
- **ecosystem.config.js** - PM2 configuration
- **.env** - Environment variables (NEVER commit to git!)
- **src/bot/index.js** - Bot logic (handlers, commands)

---

## Security Checklist

- [x] HTTPS enabled (Let's Encrypt SSL)
- [x] Production credentials configured
- [x] Test mode disabled
- [x] Webhook signature verification enabled
- [x] Firewall configured (UFW)
- [x] PM2 process management
- [x] Automatic restarts enabled

---

## Next Steps After Deployment

1. ✅ Upload files to VPS
2. ✅ Restart bot with new config
3. ✅ Verify bot responds at https://pnptv.app/health
4. ✅ Test bot in Telegram (@PNPtvBot)
5. ✅ Configure ePayco webhooks
6. ✅ Configure Daimo webhooks
7. ✅ Test payment flow
8. ✅ Monitor logs for any issues

---

**Last Updated**: 2025-10-20
**Domain**: pnptv.app
**VPS IP**: 72.60.29.80
