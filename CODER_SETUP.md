# Coder Workspace Setup Guide

## Step 1: Set Up SSH Key

Your SSH public key:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIF1Wog7dMkKM1EgW8D7ovYPR+6XfSgJTBCieOFuw+n8U
```

### Add to GitHub

1. Go to https://github.com/settings/keys
2. Click **"New SSH key"**
3. Title: `Coder Workspace`
4. Paste the key above
5. Click **"Add SSH key"**

### Test Connection

```bash
ssh -T git@github.com
# Should show: "Hi username! You've successfully authenticated"
```

---

## Step 2: Clone Repository

```bash
# Clone your repo (replace with your repo URL)
git clone git@github.com:yourusername/pnptv-telegram-bot.git
cd pnptv-telegram-bot

# Or if already exists, pull latest
git pull origin main
```

---

## Step 3: Install Dependencies

```bash
# Install main dependencies
npm install

# Install payment-app dependencies
cd payment-app
npm install
cd ..
```

---

## Step 4: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

### Required Environment Variables

```env
# ============================================
# Telegram Bot Configuration
# ============================================
TELEGRAM_TOKEN=<Get from @BotFather>
ADMIN_IDS=<Your Telegram user ID - get from @userinfobot>

# ============================================
# Firebase Configuration
# ============================================
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# ============================================
# Channel Configuration
# ============================================
CHANNEL_ID=<Your channel ID (negative number) - forward a message to @userinfobot>

# ============================================
# Daimo Pay Configuration
# ============================================
DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_WEBHOOK_TOKEN=<Get from https://pay.daimo.com/dashboard>

# Frontend (Vite) variables
VITE_DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
VITE_TREASURY_ADDRESS=<0xYour...Wallet where you receive USDC>
VITE_REFUND_ADDRESS=<0xYour...Wallet for refunds - MUST be valid on ALL chains>
VITE_SETTLEMENT_CHAIN=10
VITE_SETTLEMENT_TOKEN=0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85

# ============================================
# ePayco Configuration (Optional)
# ============================================
EPAYCO_PUBLIC_KEY=<your_epayco_public_key>
EPAYCO_PRIVATE_KEY=<your_epayco_private_key>
EPAYCO_P_CUST_ID=<your_customer_id>
EPAYCO_P_KEY=<your_p_key>
EPAYCO_TEST_MODE=true

# ============================================
# Server Configuration (will be set by Railway)
# ============================================
PORT=3000
NODE_ENV=development
```

---

## Step 5: Deploy to Railway

### Option A: One-Command Deploy (Recommended)

```bash
./deploy-from-coder.sh
```

This automated script will:
- ✅ Install Railway CLI
- ✅ Login to Railway
- ✅ Create/link project
- ✅ Build payment app
- ✅ Set all environment variables
- ✅ Deploy to Railway
- ✅ Configure URLs
- ✅ Show deployment status

### Option B: Manual Deploy

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login (opens browser)
railway login

# 3. Initialize project
railway init

# 4. Build payment app
cd payment-app
npm run build
cd ..

# 5. Deploy
railway up

# 6. Get your URL
railway domain

# 7. Set BOT_URL variable
railway variables set BOT_URL=https://your-app.up.railway.app

# 8. Redeploy with updated URL
railway up
```

---

## Step 6: Configure Webhooks

After deployment, configure these webhooks:

### Daimo Webhook

1. Go to https://pay.daimo.com/dashboard
2. Click **"Webhooks"**
3. Add webhook URL: `https://your-app.up.railway.app/daimo/webhook`
4. Copy the webhook token
5. Update in Railway:
   ```bash
   railway variables set DAIMO_WEBHOOK_TOKEN=<your_token>
   railway up
   ```

### ePayco Webhooks (if using)

1. Go to ePayco Dashboard → Settings → Webhooks
2. Set **Response URL**: `https://your-app.up.railway.app/epayco/response`
3. Set **Confirmation URL**: `https://your-app.up.railway.app/epayco/confirmation`

---

## Step 7: Add Bot to Channel

1. Go to your Telegram channel
2. Add your bot as administrator
3. Give these permissions:
   - ✅ Post messages
   - ✅ Delete messages
   - ✅ Invite users via link
   - ✅ Ban users

---

## Step 8: Test Your Bot

### Test Basic Commands

```
/start - Should show welcome message
/help - Should show help menu
/profile - Should show your profile
```

### Test Subscription Flow

1. Click "Subscribe" or send `/subscribe`
2. Browse available plans
3. Click on a plan
4. Choose payment method
5. Complete payment (use test mode)
6. Verify you receive:
   - ✅ Payment confirmation message
   - ✅ Channel invite link
   - ✅ Link works and is single-use

---

## Monitoring & Debugging

### View Logs

**Railway:**
```bash
railway logs
railway logs --follow  # Real-time logs
```

**Local testing:**
```bash
npm run dev
```

### Check Bot Status

```bash
# Check webhook info
curl https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo

# Check if bot is running
curl https://your-app.up.railway.app/health
```

### Common Issues

**Bot not responding:**
```bash
# Check logs
railway logs

# Verify webhook is set
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Check environment variables
railway variables
```

**Payment page 404:**
```bash
# Rebuild payment app
cd payment-app
npm run build
cd ..

# Redeploy
railway up
```

**Firebase errors:**
```bash
# Verify credentials are valid JSON
echo $FIREBASE_CREDENTIALS | jq .

# Test connection
npm run test:connection
```

---

## Development Workflow

### Making Changes

```bash
# 1. Make your code changes in Coder
nano src/bot/handlers/subscribe.js

# 2. Test locally (optional)
npm run dev

# 3. Commit changes
git add .
git commit -m "Update subscription handler"
git push origin main

# 4. Deploy to Railway
railway up

# 5. Check logs
railway logs
```

### Environment Variables

**Add new variable:**
```bash
railway variables set NEW_VARIABLE=value
railway up  # Redeploy
```

**View all variables:**
```bash
railway variables
```

**Delete variable:**
```bash
railway variables delete VARIABLE_NAME
```

---

## Cost Optimization

### Railway Pricing

- **Hobby Plan**: $5/month (includes $5 credit)
- **Usage**: ~$5-10/month for small bot
- **Free Trial**: $5 credit to start

### Tips to Reduce Costs

1. **Remove unused services** in Railway dashboard
2. **Optimize logs** - reduce verbose logging
3. **Use Redis caching** - reduces Firebase reads
4. **Monitor usage** - check Railway dashboard weekly

---

## Backup & Recovery

### Backup Firebase Data

```bash
# Export Firestore data
firebase firestore:export gs://your-bucket-name/backups/$(date +%Y%m%d)
```

### Backup Environment Variables

```bash
# Export Railway variables to file
railway variables > railway-vars-backup.txt
```

### Restore Deployment

```bash
# If deployment fails, rollback
railway rollback

# Or redeploy from Git
railway up
```

---

## Security Checklist

- [ ] SSH key added to GitHub
- [ ] `.env` file never committed to Git
- [ ] `TELEGRAM_TOKEN` kept secret
- [ ] `FIREBASE_CREDENTIALS` in Railway variables
- [ ] `DAIMO_WEBHOOK_TOKEN` configured
- [ ] Bot is admin in channel only (not in groups)
- [ ] HTTPS URLs used everywhere
- [ ] Test mode enabled for ePayco initially

---

## Next Steps

1. ✅ **Test thoroughly** - Try all commands and payment flows
2. ✅ **Monitor logs** - Watch for errors in first 24 hours
3. ✅ **Set up Sentry** - For error tracking (see DEPLOYMENT_SENTRY.md)
4. ✅ **Add Redis** - For better performance (optional)
5. ✅ **Go live** - Switch `EPAYCO_TEST_MODE=false` when ready
6. ✅ **Marketing** - Promote your bot to your audience

---

## Support Resources

### Documentation
- Railway: https://docs.railway.app
- Daimo Pay: https://paydocs.daimo.com
- Telegram Bot API: https://core.telegram.org/bots/api
- Firebase: https://firebase.google.com/docs

### This Project
- [QUICKSTART_CODER.md](./QUICKSTART_CODER.md) - Quick deploy guide
- [CODER_DEPLOYMENT_GUIDE.md](./CODER_DEPLOYMENT_GUIDE.md) - Full deployment guide
- [DAIMO_IMPLEMENTATION.md](./DAIMO_IMPLEMENTATION.md) - Daimo Pay setup
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Railway guide

### Get Help
1. Check logs: `railway logs`
2. Review documentation in this repo
3. Check Railway status: https://status.railway.app
4. Telegram Bot API status: https://core.telegram.org/bots/api

---

## Quick Command Reference

```bash
# Railway
railway login              # Login to Railway
railway init               # Create new project
railway link               # Link to existing project
railway up                 # Deploy
railway logs               # View logs
railway logs --follow      # Real-time logs
railway domain             # Get deployment URL
railway variables          # List variables
railway variables set      # Set variable
railway status             # Check status
railway rollback           # Rollback deployment

# Git
git pull origin main       # Pull latest changes
git add .                  # Stage changes
git commit -m "message"    # Commit changes
git push origin main       # Push to GitHub

# NPM
npm install                # Install dependencies
npm run dev                # Run in development
npm start                  # Run in production
npm run build              # Build payment app

# Testing
npm test                   # Run tests
npm run test:connection    # Test Firebase connection
```

---

Good luck with your deployment! 🚀
