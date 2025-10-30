# Coder.com Deployment Guide

## What is Coder?

**Coder.com** is a **Cloud Development Environment (CDE)** platform - it provides cloud-based workspaces for development, not production hosting. Think of it like VS Code in the cloud.

## Deployment Options

You have two main approaches when using Coder:

### Option 1: Develop in Coder → Deploy to Production Platform (Recommended)
Use Coder as your development environment, then deploy to a production platform like Railway, Heroku, or a VPS.

### Option 2: Run Bot in Coder Workspace (Development/Testing Only)
Run the bot directly in your Coder workspace for development and testing. **Not recommended for production.**

---

## Option 1: Develop in Coder → Deploy to Production

### Step 1: Set Up Your Coder Workspace

1. **Create a New Workspace** on Coder.com
   - Template: Ubuntu/Debian
   - Resources: 2 CPU, 4GB RAM minimum

2. **Clone Your Repository**
   ```bash
   git clone https://github.com/yourusername/pnptv-telegram-bot.git
   cd pnptv-telegram-bot
   ```

3. **Install Dependencies**
   ```bash
   # Install Node.js 18+ if not available
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install project dependencies
   npm install

   # Install payment-app dependencies
   cd payment-app
   npm install
   cd ..
   ```

### Step 2: Configure Environment Variables

Create `.env` file in your Coder workspace:

```bash
cp .env.example .env
nano .env  # or use Coder's file editor
```

**Required Variables:**
```env
# Bot Configuration
TELEGRAM_TOKEN=your_bot_token_from_@BotFather
ADMIN_IDS=your_telegram_user_id

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS={"type":"service_account",...}

# Channel
CHANNEL_ID=-1002997324714  # Your channel ID

# Daimo Pay
DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_WEBHOOK_TOKEN=your_webhook_token_from_dashboard
VITE_DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
VITE_TREASURY_ADDRESS=0xYourTreasuryWallet
VITE_REFUND_ADDRESS=0xYourRefundWallet

# ePayco (optional)
EPAYCO_PUBLIC_KEY=your_public_key
EPAYCO_PRIVATE_KEY=your_private_key
EPAYCO_TEST_MODE=true
```

### Step 3: Test Locally in Coder

```bash
# Run bot in development mode
npm run dev
```

The bot should start, but webhooks won't work without a public URL.

### Step 4: Deploy to Production Platform

Choose your preferred platform:

#### A. Deploy to Railway (Recommended)

1. **Install Railway CLI in Coder:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Railway Project:**
   ```bash
   railway init
   railway link
   ```

3. **Set Environment Variables:**
   ```bash
   # Copy all your .env variables to Railway
   railway variables set TELEGRAM_TOKEN=your_token
   railway variables set ADMIN_IDS=your_id
   railway variables set FIREBASE_PROJECT_ID=your_project_id
   # ... set all other variables
   ```

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Deploy from Coder"
   railway up
   ```

5. **Get Your Deployment URL:**
   ```bash
   railway domain
   ```

6. **Update Webhook URLs:**
   ```bash
   # Update BOT_URL with your Railway domain
   railway variables set BOT_URL=https://your-app.up.railway.app
   railway variables set VITE_BOT_URL=https://your-app.up.railway.app
   ```

#### B. Deploy to Heroku

1. **Install Heroku CLI in Coder:**
   ```bash
   curl https://cli-assets.heroku.com/install.sh | sh
   heroku login -i
   ```

2. **Create Heroku App:**
   ```bash
   heroku create your-bot-name
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set TELEGRAM_TOKEN=your_token
   heroku config:set ADMIN_IDS=your_id
   # ... set all other variables
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

5. **Get Your App URL:**
   ```bash
   heroku info
   # Update BOT_URL in Heroku config
   heroku config:set BOT_URL=https://your-app.herokuapp.com
   ```

#### C. Deploy to VPS (DigitalOcean, Linode, etc.)

See [VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## Option 2: Run Bot in Coder Workspace (Development Only)

**⚠️ Warning**: This is only for development/testing. Coder workspaces can be paused/stopped, which will stop your bot.

### Step 1: Set Up Ngrok for Webhooks

Since your Coder workspace doesn't have a public URL, use ngrok for testing:

1. **Install Ngrok:**
   ```bash
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
     sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
     echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
     sudo tee /etc/apt/sources.list.d/ngrok.list && \
     sudo apt update && sudo apt install ngrok
   ```

2. **Sign up and authenticate:**
   ```bash
   ngrok config add-authtoken your_ngrok_token
   ```

3. **Start Ngrok in a separate terminal:**
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 2: Update Environment Variables

```bash
# Update .env with your ngrok URL
BOT_URL=https://abc123.ngrok.io
PAYMENT_PAGE_URL=https://abc123.ngrok.io/pay
```

### Step 3: Run the Bot

```bash
# Install dependencies
npm install
cd payment-app && npm install && cd ..

# Build payment app
cd payment-app && npm run build && cd ..

# Start bot
npm start
```

### Step 4: Set Telegram Webhook

```bash
# Use curl to set the webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://abc123.ngrok.io/bot<YOUR_BOT_TOKEN>"
```

**Limitations:**
- ⚠️ Ngrok URL changes every restart (unless you have a paid plan)
- ⚠️ Workspace stops when you close Coder
- ⚠️ Not suitable for production
- ⚠️ Need to reset webhook URL every time ngrok restarts

---

## Recommended Workflow

### For Development:

1. **Code in Coder** - Use Coder as your development environment
2. **Test locally with ngrok** - For quick testing of webhooks
3. **Commit changes** - Push to GitHub from Coder
4. **Deploy to Railway** - Use Railway for staging/testing
5. **Deploy to production** - Use Railway, Heroku, or VPS

### For Production:

**DO NOT use Coder workspaces for production** - they are not designed for 24/7 uptime.

Use these platforms instead:
- ✅ **Railway** - Easiest, recommended ([RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md))
- ✅ **Heroku** - Good for startups ([HEROKU_DEPLOYMENT.md](./HEROKU_DEPLOYMENT.md))
- ✅ **VPS** - Full control, requires Linux knowledge ([VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md))
- ✅ **DigitalOcean App Platform** - Easy container deployment
- ✅ **AWS/GCP/Azure** - Enterprise scale

---

## Quick Deploy from Coder to Railway

This is the fastest way to get your bot running in production from Coder:

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create new project
railway init

# 4. Set environment variables (copy from .env)
railway variables set TELEGRAM_TOKEN=$TELEGRAM_TOKEN
railway variables set ADMIN_IDS=$ADMIN_IDS
railway variables set FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
railway variables set FIREBASE_CREDENTIALS="$FIREBASE_CREDENTIALS"
railway variables set CHANNEL_ID=$CHANNEL_ID
railway variables set DAIMO_APP_ID=$DAIMO_APP_ID
railway variables set DAIMO_WEBHOOK_TOKEN=$DAIMO_WEBHOOK_TOKEN
railway variables set VITE_DAIMO_APP_ID=$VITE_DAIMO_APP_ID
railway variables set VITE_TREASURY_ADDRESS=$VITE_TREASURY_ADDRESS
railway variables set VITE_REFUND_ADDRESS=$VITE_REFUND_ADDRESS
railway variables set EPAYCO_PUBLIC_KEY=$EPAYCO_PUBLIC_KEY
railway variables set EPAYCO_PRIVATE_KEY=$EPAYCO_PRIVATE_KEY
railway variables set EPAYCO_TEST_MODE=true

# 5. Deploy
railway up

# 6. Get your URL
railway domain

# 7. Update BOT_URL with your Railway domain
railway variables set BOT_URL=https://your-app.up.railway.app
railway variables set PAYMENT_PAGE_URL=https://your-app.up.railway.app/pay

# 8. Redeploy with updated URL
railway up
```

---

## Environment Setup Checklist

### Required Services

- [ ] **Telegram Bot** - Create via @BotFather
- [ ] **Firebase Project** - For database (firestore)
- [ ] **Daimo Account** - Get APP_ID and WEBHOOK_TOKEN
- [ ] **ePayco Account** - For payment processing (optional)
- [ ] **Telegram Channel** - Create channel and get CHANNEL_ID
- [ ] **Production Platform** - Railway, Heroku, or VPS

### Required Environment Variables

- [ ] `TELEGRAM_TOKEN` - From @BotFather
- [ ] `ADMIN_IDS` - Your Telegram user ID
- [ ] `FIREBASE_PROJECT_ID` - From Firebase console
- [ ] `FIREBASE_CREDENTIALS` - Service account JSON
- [ ] `CHANNEL_ID` - Your channel ID (negative number)
- [ ] `BOT_URL` - Your deployment URL
- [ ] `DAIMO_APP_ID` - From Daimo dashboard
- [ ] `DAIMO_WEBHOOK_TOKEN` - From Daimo dashboard
- [ ] `VITE_TREASURY_ADDRESS` - Your USDC wallet
- [ ] `VITE_REFUND_ADDRESS` - Refund wallet (valid on all chains)

---

## Building Payment App

The payment app (Vite React) needs to be built before deployment:

```bash
# In Coder workspace
cd payment-app
npm install
npm run build
cd ..
```

The build output will be in `payment-app/dist/` and will be served by the Express server.

---

## Troubleshooting

### Issue: "Module not found" errors
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
cd payment-app
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Issue: Ngrok URL keeps changing
**Solution:**
- Get a paid ngrok plan for static URLs, or
- Deploy to Railway/Heroku instead

### Issue: Bot doesn't respond to commands
**Solution:**
1. Check if webhook is set correctly
2. Check Railway/Heroku logs
3. Verify TELEGRAM_TOKEN is correct
4. Verify BOT_URL is correct

### Issue: Payment page not loading
**Solution:**
1. Check if payment-app was built: `ls payment-app/dist`
2. Rebuild: `cd payment-app && npm run build`
3. Check VITE_ environment variables are set

### Issue: Firebase permission denied
**Solution:**
1. Verify FIREBASE_CREDENTIALS is valid JSON
2. Check service account has Firestore permissions
3. Check Firebase rules allow authenticated access

---

## Next Steps After Deployment

1. **Test the bot** - Send commands in Telegram
2. **Test payment flow** - Try subscribing to a plan
3. **Check logs** - Monitor for errors
4. **Set up monitoring** - Use Sentry for error tracking
5. **Set up webhooks** - Configure Daimo webhook in dashboard
6. **Add your channel** - Make bot admin in your channel

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Heroku Docs**: https://devcenter.heroku.com
- **Daimo Docs**: https://paydocs.daimo.com
- **Telegram Bot API**: https://core.telegram.org/bots/api

For more detailed guides, see:
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- [HEROKU_DEPLOYMENT.md](./HEROKU_DEPLOYMENT.md)
- [VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md)
- [DAIMO_IMPLEMENTATION.md](./DAIMO_IMPLEMENTATION.md)
