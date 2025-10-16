# Heroku Deployment Guide for PNPtv Bot

Complete step-by-step guide to deploy your improved PNPtv Telegram Bot to Heroku.

## Prerequisites

1. **Heroku Account**: Sign up at [heroku.com](https://heroku.com)
2. **Heroku CLI**: Install from [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
3. **Git**: Ensure Git is installed
4. **Telegram Bot Token**: From [@BotFather](https://t.me/BotFather)
5. **Firebase Project**: Active Firebase project with Firestore
6. **ePayco Account**: Colombian payment gateway credentials

---

## Quick Start (5 Minutes)

### 1. Install Heroku CLI

**Windows (PowerShell):**
```powershell
winget install Heroku.HerokuCLI
```

**macOS:**
```bash
brew tap heroku/brew && brew install heroku
```

**Linux:**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

### 2. Login to Heroku

```bash
heroku login
```

This will open your browser for authentication.

### 3. Create Heroku App

```bash
# Navigate to your project directory
cd "C:\Users\carlo\Documents\Bots"

# Create Heroku app (replace 'your-app-name' with desired name)
heroku create your-pnptv-bot

# Or let Heroku generate a name
heroku create
```

**Important**: Note the app URL (e.g., `https://your-pnptv-bot.herokuapp.com`)

### 4. Set Environment Variables

```bash
# Telegram Bot
heroku config:set TELEGRAM_BOT_TOKEN="your_bot_token_here"

# Firebase Configuration
heroku config:set FIREBASE_PROJECT_ID="your-project-id"
heroku config:set FIREBASE_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
heroku config:set FIREBASE_STORAGE_BUCKET="your-project.appspot.com"

# Firebase Private Key (IMPORTANT: Handle newlines correctly)
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nMultiline\nKey\nHere\n-----END PRIVATE KEY-----\n"

# ePayco Configuration
heroku config:set EPAYCO_PUBLIC_KEY="your_epayco_public_key"
heroku config:set EPAYCO_PRIVATE_KEY="your_epayco_private_key"
heroku config:set EPAYCO_CUSTOMER_ID="your_customer_id"
heroku config:set EPAYCO_TEST="false"

# URLs (replace with your Heroku app URL)
heroku config:set WEBAPP_URL="https://your-pnptv-bot.herokuapp.com"
heroku config:set RESPONSE_URL="https://your-pnptv-bot.herokuapp.com"
heroku config:set CONFIRMATION_URL="https://your-pnptv-bot.herokuapp.com/epayco/confirmation"

# Environment
heroku config:set NODE_ENV="production"
```

### 5. Deploy to Heroku

```bash
# Initialize Git (if not already)
git init
git add .
git commit -m "Initial deployment with improvements"

# Add Heroku remote
heroku git:remote -a your-pnptv-bot

# Push to Heroku (use your branch name: main or master)
git push heroku main
```

### 6. Scale Dynos

```bash
# Start one web dyno
heroku ps:scale web=1
```

### 7. Check Logs

```bash
# View real-time logs
heroku logs --tail
```

---

## Common Issues & Solutions

### Issue 1: "Application Error" on Heroku

**Symptoms**: H10 (App crashed) or H14 (No web dynos running) errors

**Solutions**:
```bash
# Check logs
heroku logs --tail

# Ensure dyno is running
heroku ps:scale web=1

# Restart app
heroku restart
```

### Issue 2: Firebase Authentication Failed

**Symptoms**: "FIREBASE_PRIVATE_KEY is invalid" or authentication errors

**Solution**:
```bash
# Re-set private key with proper escaping
# If you have jq installed:
heroku config:set FIREBASE_PRIVATE_KEY="$(cat firebase-credentials.json | jq -r '.private_key')"

# Or use Heroku Dashboard to paste the key directly
```

### Issue 3: Bot Not Responding

**Symptoms**: Bot online but doesn't respond to commands

**Solutions**:
```bash
# Check webhook status
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"

# Set correct webhook
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-app.herokuapp.com/webhook"

# Or delete webhook to use polling
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook"
```

### Issue 4: Payment Links Not Working

**Solutions**:
```bash
# Verify ePayco config
heroku config | grep EPAYCO

# Check logs for ePayco errors
heroku logs --tail | grep -i epayco
```

---

## Monitoring Commands

```bash
# Real-time logs
heroku logs --tail

# Filter by error
heroku logs --tail | grep -i error

# Dyno status
heroku ps

# App info
heroku info

# Config vars
heroku config

# Restart app
heroku restart
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables set in Heroku
- [ ] Firebase credentials ready
- [ ] ePayco credentials (production keys, not test)
- [ ] Git repository initialized with all changes committed
- [ ] `.env` file NOT committed (should be in `.gitignore`)

### Post-Deployment
- [ ] Heroku app created and deployed successfully
- [ ] Bot responds to `/start` command in Telegram
- [ ] Mini App loads at `https://your-app.herokuapp.com`
- [ ] Location sharing works
- [ ] Premium subscription payment links work
- [ ] Admin panel accessible to authorized users
- [ ] Logs show no errors: `heroku logs --tail`

---

## Cost Estimation

### Free Tier (Hobby Dyno)
- **Cost**: $0/month
- **Limitations**: Sleeps after 30 min inactivity, 550 dyno hours/month
- **RAM**: 512MB
- **Best for**: Development, testing

### Basic Dyno (Recommended for Production)
- **Cost**: $7/month
- **Benefits**: Never sleeps, custom domain
- **RAM**: 512MB
- **Best for**: Small production apps

### Standard Dynos
- **Cost**: $25-$50/month
- **Features**: Better performance, more RAM (1GB-2GB)
- **Best for**: Production apps with high traffic

```bash
# Upgrade to Basic
heroku ps:type basic

# Upgrade to Standard-1X
heroku ps:type standard-1x
```

---

## Updating Your Deployment

### After Making Changes

```bash
# Commit changes
git add .
git commit -m "Description of changes"

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Rollback to Previous Version

```bash
# List releases
heroku releases

# Rollback to previous release
heroku rollback

# Rollback to specific version
heroku rollback v123
```

---

## Quick Reference Commands

| Command | Description |
|---------|-------------|
| `heroku create` | Create new app |
| `heroku config:set KEY=value` | Set environment variable |
| `git push heroku main` | Deploy app |
| `heroku logs --tail` | View live logs |
| `heroku ps` | Check dyno status |
| `heroku restart` | Restart app |
| `heroku run bash` | Access dyno shell |
| `heroku releases` | View deployment history |

---

## Testing Your Deployment

### 1. Test Bot Commands

In Telegram, send to your bot:
```
/start
/help
/profile
/map
/subscribe
```

### 2. Test Mini App

Open in browser:
```
https://your-pnptv-bot.herokuapp.com
```

### 3. Test API Endpoints

```bash
# Health check
curl https://your-pnptv-bot.herokuapp.com

# Plans endpoint
curl https://your-pnptv-bot.herokuapp.com/api/plans
```

---

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use Heroku Config Vars** - All secrets stored securely
3. **Enable 2FA** on Heroku account
4. **Rotate API keys** periodically
5. **Monitor logs** for suspicious activity
6. **Use production credentials** (not test keys)
7. **Keep dependencies updated**: `npm audit fix`

---

## Next Steps After Deployment

1. ✅ Test all bot features thoroughly
2. ✅ Monitor logs for first 24 hours
3. ✅ Set up automated Firebase backups
4. ✅ Configure custom domain (optional)
5. ✅ Share bot link with users
6. ✅ Monitor payment transactions

---

## Need Help?

- **Heroku Issues**: [help.heroku.com](https://help.heroku.com)
- **Bot Issues**: Check logs with `heroku logs --tail`
- **Payment Issues**: Contact ePayco support
- **Firebase Issues**: [Firebase Support](https://firebase.google.com/support)

---

**Deployment Date**: 2025-10-16
**Last Updated**: 2025-10-16
**Version**: 2.0.0 (With all improvements implemented)

Good luck with your deployment! 🚀
