# Quick Start: Deploy from Coder.com

## TL;DR

```bash
# 1. Clone and install
git clone https://github.com/yourusername/pnptv-telegram-bot.git
cd pnptv-telegram-bot
npm install

# 2. Configure
cp .env.example .env
nano .env  # Add your credentials

# 3. Deploy to Railway (one command!)
./deploy-from-coder.sh
```

That's it! 🎉

---

## What is Coder?

**Coder.com** is a cloud development environment - it's like VS Code in the cloud. It's **NOT** a production hosting platform.

### Use Coder For:
- ✅ Writing and testing code
- ✅ Development environment
- ✅ Deploying to production platforms

### Don't Use Coder For:
- ❌ Running bots 24/7 (workspaces can pause)
- ❌ Production hosting

---

## Option 1: One-Command Deploy (Recommended)

### Step 1: Set Up Environment

In your Coder workspace terminal:

```bash
# Clone the repo
git clone <your-repo-url>
cd pnptv-telegram-bot

# Install dependencies
npm install
```

### Step 2: Configure Variables

```bash
# Copy example and edit
cp .env.example .env
nano .env
```

**Minimum required variables:**
```env
TELEGRAM_TOKEN=<from @BotFather>
ADMIN_IDS=<your telegram user ID>
FIREBASE_PROJECT_ID=<your firebase project>
FIREBASE_CREDENTIALS={"type":"service_account",...}
CHANNEL_ID=<your channel ID>
DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_WEBHOOK_TOKEN=<from Daimo dashboard>
VITE_TREASURY_ADDRESS=0x<your wallet>
VITE_REFUND_ADDRESS=0x<your wallet>
```

### Step 3: Deploy

```bash
./deploy-from-coder.sh
```

This script will:
1. ✅ Install Railway CLI
2. ✅ Build payment app
3. ✅ Set all environment variables
4. ✅ Deploy to Railway
5. ✅ Configure webhook URLs
6. ✅ Show you the deployment URL

**Done!** Your bot is now live on Railway.

---

## Option 2: Manual Railway Deploy

If you prefer to do it manually:

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Build payment app
cd payment-app && npm run build && cd ..

# 5. Set variables (from your .env)
railway variables set TELEGRAM_TOKEN=your_token
railway variables set ADMIN_IDS=your_id
# ... set all other variables

# 6. Deploy
railway up

# 7. Get URL
railway domain

# 8. Update BOT_URL
railway variables set BOT_URL=https://your-app.up.railway.app

# 9. Redeploy
railway up
```

---

## Option 3: Deploy to Heroku

```bash
# 1. Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# 2. Login
heroku login -i

# 3. Create app
heroku create your-bot-name

# 4. Set variables
heroku config:set TELEGRAM_TOKEN=your_token
# ... set all variables

# 5. Deploy
git push heroku main

# 6. Update BOT_URL
heroku config:set BOT_URL=https://your-bot-name.herokuapp.com
```

---

## Option 4: Test in Coder (Development Only)

**⚠️ Only for testing - not for production!**

### With Ngrok (for webhooks):

```bash
# 1. Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# 2. Authenticate
ngrok config add-authtoken <your_token>

# 3. Start ngrok (in separate terminal)
ngrok http 3000

# 4. Copy ngrok URL and update .env
BOT_URL=https://abc123.ngrok.io

# 5. Start bot
npm start
```

---

## After Deployment Checklist

Once deployed, complete these steps:

### 1. Test the Bot
```bash
# Send message in Telegram
/start
```

### 2. Configure Webhooks

**Daimo Webhook:**
1. Go to https://pay.daimo.com/dashboard
2. Add webhook: `https://your-app.up.railway.app/daimo/webhook`
3. Copy webhook token
4. Update in Railway: `railway variables set DAIMO_WEBHOOK_TOKEN=<token>`

**ePayco Webhooks** (if using):
1. Go to ePayco dashboard
2. Set Response URL: `https://your-app.up.railway.app/epayco/response`
3. Set Confirmation URL: `https://your-app.up.railway.app/epayco/confirmation`

### 3. Add Bot to Channel
1. Make bot admin in your channel (CHANNEL_ID)
2. Give permission to post and invite users

### 4. Test Payment Flow
1. Send `/start` to bot
2. Browse plans
3. Try subscribing to a plan
4. Complete payment (test mode)
5. Verify you receive invite link

### 5. Monitor Logs

**Railway:**
```bash
railway logs
```

**Heroku:**
```bash
heroku logs --tail
```

---

## Common Issues

### "Module not found" Error
```bash
rm -rf node_modules package-lock.json
npm install
cd payment-app
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Bot Not Responding
1. Check logs: `railway logs`
2. Verify TELEGRAM_TOKEN is correct
3. Verify BOT_URL matches your deployment
4. Check webhook: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

### Payment Page 404
1. Build payment app: `cd payment-app && npm run build`
2. Check `payment-app/dist` exists
3. Redeploy: `railway up`

### Firebase Permission Denied
1. Verify FIREBASE_CREDENTIALS is valid JSON
2. Check service account has Firestore Admin role
3. Check Firestore rules allow authenticated access

---

## Environment Variables Reference

### Required
| Variable | Where to Get | Example |
|----------|--------------|---------|
| `TELEGRAM_TOKEN` | @BotFather | `1234567890:ABCdef...` |
| `ADMIN_IDS` | @userinfobot | `123456789` |
| `FIREBASE_PROJECT_ID` | Firebase Console | `my-project-id` |
| `FIREBASE_CREDENTIALS` | Firebase Console → Service Accounts | `{"type":"service_account",...}` |
| `CHANNEL_ID` | @userinfobot (forward channel message) | `-1001234567890` |

### Daimo Pay
| Variable | Where to Get | Example |
|----------|--------------|---------|
| `DAIMO_APP_ID` | Daimo Dashboard | `pay-yourapp-xyz` |
| `DAIMO_WEBHOOK_TOKEN` | Daimo Dashboard (webhook settings) | `your_token` |
| `VITE_TREASURY_ADDRESS` | Your wallet | `0xYour...Address` |
| `VITE_REFUND_ADDRESS` | Your wallet (valid on all chains) | `0xYour...Address` |

### Optional (ePayco)
| Variable | Where to Get |
|----------|--------------|
| `EPAYCO_PUBLIC_KEY` | ePayco Dashboard |
| `EPAYCO_PRIVATE_KEY` | ePayco Dashboard |
| `EPAYCO_TEST_MODE` | Set to `true` for testing |

---

## Cost Estimates

### Railway (Recommended)
- **Free Trial**: $5 credit/month
- **Hobby Plan**: $5/month (includes $5 credit)
- **Pro Plan**: $20/month (includes $20 credit)
- **Usage**: ~$5-10/month for small bot

### Heroku
- **Free Tier**: Removed in 2022
- **Eco Plan**: $5/month (sleeps after inactivity)
- **Basic Plan**: $7/month (always on)

### VPS (DigitalOcean, Linode)
- **Basic Droplet**: $4-6/month
- **Full control**: Requires Linux knowledge

---

## Support & Resources

- **Full Deployment Guide**: [CODER_DEPLOYMENT_GUIDE.md](./CODER_DEPLOYMENT_GUIDE.md)
- **Railway Guide**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Daimo Implementation**: [DAIMO_IMPLEMENTATION.md](./DAIMO_IMPLEMENTATION.md)
- **VPS Guide**: [VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md)

### Documentation
- Railway: https://docs.railway.app
- Daimo: https://paydocs.daimo.com
- Telegram Bot API: https://core.telegram.org/bots/api

### Need Help?
1. Check logs: `railway logs` or `heroku logs --tail`
2. Review deployment guides in this repo
3. Check Telegram Bot API status
4. Verify all environment variables are set

---

## What's Next?

After successful deployment:

1. ✅ **Customize Plans** - Edit subscription plans in Firebase
2. ✅ **Add Content** - Set up your premium channel content
3. ✅ **Test Payments** - Use test mode to verify payment flows
4. ✅ **Monitor** - Set up Sentry for error tracking
5. ✅ **Scale** - Upgrade Railway plan if needed
6. ✅ **Go Live** - Switch `EPAYCO_TEST_MODE=false` when ready

Happy coding! 🚀
