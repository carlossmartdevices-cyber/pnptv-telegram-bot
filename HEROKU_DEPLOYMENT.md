# Heroku Deployment Guide

## Prerequisites

1. **Heroku Account**: Create one at https://signup.heroku.com/
2. **Heroku CLI**: Install from https://devcenter.heroku.com/articles/heroku-cli
3. **Git**: Already installed (you have it)

## Step 1: Install Heroku CLI

### Windows (using Git Bash):

```bash
# Download and run the installer
# https://devcenter.heroku.com/articles/heroku-cli#download-and-install

# Or using npm (if you have Node.js)
npm install -g heroku
```

### Verify Installation:

```bash
heroku --version
# Should show: heroku/8.x.x
```

## Step 2: Login to Heroku

```bash
heroku login
```

This will open a browser window for you to login.

## Step 3: Create Heroku App

```bash
# Navigate to your project directory
cd ~/Documents/Bots

# Create a new Heroku app
heroku create pnptv-telegram-bot

# Or let Heroku generate a random name
heroku create
```

## Step 4: Add Buildpack

```bash
# Set Node.js buildpack
heroku buildpacks:set heroku/nodejs
```

## Step 5: Configure Environment Variables

You need to set all environment variables in Heroku. You can do this via CLI or Dashboard.

### Option A: Via CLI (Recommended)

```bash
# Telegram Configuration
heroku config:set TELEGRAM_TOKEN=your_telegram_bot_token_here
heroku config:set ADMIN_IDS=your_telegram_user_id_here

# ePayco Configuration (YOUR CREDENTIALS)
heroku config:set EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c
heroku config:set EPAYCO_PRIVATE_KEY=80174d93a6f8d760f5cca2b2cc6ee48b
heroku config:set EPAYCO_P_CUST_ID=1555482
heroku config:set EPAYCO_P_KEY=e76ae8e9551df6e3b353434c4de34ef2dafa41bf
heroku config:set EPAYCO_TEST_MODE=true

# Webhook URLs (replace 'your-app-name' with your actual Heroku app name)
heroku config:set EPAYCO_RESPONSE_URL=https://your-app-name.herokuapp.com/epayco/response
heroku config:set EPAYCO_CONFIRMATION_URL=https://your-app-name.herokuapp.com/epayco/confirmation
heroku config:set BOT_URL=https://your-app-name.herokuapp.com
heroku config:set WEB_APP_URL=https://your-app-name.herokuapp.com

# Firebase Configuration (IMPORTANT: Must be single line JSON)
heroku config:set FIREBASE_PROJECT_ID=your_firebase_project_id
heroku config:set FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Server Configuration
heroku config:set PORT=3000
heroku config:set WEB_PORT=3000
```

### Option B: Via Heroku Dashboard

1. Go to: https://dashboard.heroku.com/apps/your-app-name/settings
2. Click **"Reveal Config Vars"**
3. Add each variable manually:

| Key | Value |
|-----|-------|
| TELEGRAM_TOKEN | your_telegram_bot_token_here |
| ADMIN_IDS | your_telegram_user_id_here |
| EPAYCO_PUBLIC_KEY | 881ddf8418549218fe2f227458f2f59c |
| EPAYCO_PRIVATE_KEY | 80174d93a6f8d760f5cca2b2cc6ee48b |
| EPAYCO_P_CUST_ID | 1555482 |
| EPAYCO_P_KEY | e76ae8e9551df6e3b353434c4de34ef2dafa41bf |
| EPAYCO_TEST_MODE | true |
| EPAYCO_RESPONSE_URL | https://your-app-name.herokuapp.com/epayco/response |
| EPAYCO_CONFIRMATION_URL | https://your-app-name.herokuapp.com/epayco/confirmation |
| BOT_URL | https://your-app-name.herokuapp.com |
| WEB_APP_URL | https://your-app-name.herokuapp.com |
| FIREBASE_PROJECT_ID | your_firebase_project_id |
| FIREBASE_CREDENTIALS | {"type":"service_account",...} |

## Step 6: Create Procfile

Heroku needs a `Procfile` to know how to start your app.

```bash
# Create Procfile in your project root
echo "web: node start-bot.js" > Procfile
```

### Verify Procfile:

```bash
cat Procfile
# Should show: web: node start-bot.js
```

## Step 7: Ensure package.json is Correct

Make sure your `package.json` has a start script:

```json
{
  "scripts": {
    "start": "node start-bot.js"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

## Step 8: Deploy to Heroku

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Heroku deployment"

# Push to Heroku
git push heroku main

# Or if your branch is called master:
git push heroku master
```

## Step 9: Scale Your App

```bash
# Make sure at least one web dyno is running
heroku ps:scale web=1
```

## Step 10: Check Logs

```bash
# View real-time logs
heroku logs --tail

# View last 100 lines
heroku logs -n 100
```

## Step 11: Verify Deployment

### Test Health Endpoint:

```bash
curl https://your-app-name.herokuapp.com/epayco/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "epayco-webhook",
  "timestamp": "2025-..."
}
```

### Test Bot:

1. Open Telegram
2. Send `/start` to your bot
3. Try subscribing to a plan

## Troubleshooting

### Issue: App Crashes on Startup

**Check logs:**
```bash
heroku logs --tail
```

**Common causes:**
- Missing environment variables
- Invalid FIREBASE_CREDENTIALS JSON
- Port binding issue

**Solution:**
```bash
# Verify all config vars are set
heroku config

# Restart app
heroku restart
```

### Issue: "Application Error"

**Cause:** App didn't start within 60 seconds

**Solution:**
```bash
# Check logs for errors
heroku logs --tail

# Verify Procfile exists
cat Procfile

# Restart
heroku restart
```

### Issue: Firebase Credentials Error

**Cause:** FIREBASE_CREDENTIALS is not valid JSON

**Solution:**
1. Get credentials from Firebase Console
2. Remove ALL line breaks (make it single line)
3. Validate at: https://jsonlint.com/
4. Set again:
```bash
heroku config:set FIREBASE_CREDENTIALS='{"type":"service_account",...}'
```

### Issue: Bot Not Responding

**Causes:**
- Wrong TELEGRAM_TOKEN
- App not running

**Solution:**
```bash
# Check if app is running
heroku ps

# If no dynos running:
heroku ps:scale web=1

# Check logs
heroku logs --tail
```

### Issue: Payment Links Give "Access Denied"

**Cause:** Wrong ePayco credentials or test mode mismatch

**Solution:**
```bash
# Verify credentials
heroku config:get EPAYCO_PUBLIC_KEY
heroku config:get EPAYCO_TEST_MODE

# Should show your credentials
# EPAYCO_TEST_MODE should be 'true' for testing
```

## Useful Heroku Commands

```bash
# View app info
heroku info

# View all config vars
heroku config

# Set a config var
heroku config:set VAR_NAME=value

# Unset a config var
heroku config:unset VAR_NAME

# Open app in browser
heroku open

# View logs
heroku logs --tail

# Restart app
heroku restart

# Run bash on Heroku
heroku run bash

# View dyno status
heroku ps

# Scale dynos
heroku ps:scale web=1

# View releases
heroku releases

# Rollback to previous release
heroku rollback
```

## Heroku vs Railway Comparison

| Feature | Heroku | Railway |
|---------|--------|---------|
| Free tier | Limited (550-1000 hours/month) | $5/month free credit |
| Sleeping | Yes (after 30 min inactivity) | No |
| Custom domain | Yes | Yes |
| Easy setup | Yes | Yes |
| Logs | Good | Excellent |
| Build time | Slower | Faster |
| Region | US, Europe | Global |

## Important Notes

### 1. Heroku Dynos Sleep

Free Heroku dynos sleep after 30 minutes of inactivity. This means:
- First request takes ~30 seconds to wake up
- Bot might be slow to respond initially

**Solutions:**
- Upgrade to paid dyno ($7/month - never sleeps)
- Use a cron service to ping your app every 25 minutes
- Use Railway instead (doesn't sleep)

### 2. Heroku Postgres (Optional)

If you want to use Heroku's built-in Postgres instead of Firebase:

```bash
# Add Postgres addon
heroku addons:create heroku-postgresql:mini

# This auto-sets DATABASE_URL config var
```

### 3. Keep Your Code Updated

```bash
# After making changes
git add .
git commit -m "Update bot"
git push heroku main

# Heroku will automatically rebuild and redeploy
```

### 4. Domain Name (Optional)

To use a custom domain:

```bash
# Add custom domain
heroku domains:add www.yourdomain.com

# Follow DNS instructions provided
```

## Cost Considerations

### Free Tier:
- 550 free dyno hours/month (without credit card)
- 1000 free dyno hours/month (with credit card)
- Dynos sleep after 30 min inactivity

### Paid Plans:
- **Hobby**: $7/month - Never sleeps, custom domains
- **Standard**: $25-50/month - More resources, metrics

## Alternative: Keep Using Railway

Railway is often better for Telegram bots because:
- ✅ Never sleeps
- ✅ Faster deployments
- ✅ Better logs
- ✅ Simpler config
- ✅ $5/month free credit

If Railway is working, I recommend staying there.

## Complete Deployment Script

Save this as `deploy-heroku.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying to Heroku..."

# Create Procfile if not exists
if [ ! -f Procfile ]; then
    echo "web: node start-bot.js" > Procfile
    echo "✅ Created Procfile"
fi

# Commit changes
git add .
git commit -m "Deploy to Heroku" || echo "No changes to commit"

# Push to Heroku
git push heroku main

# Scale web dyno
heroku ps:scale web=1

# Show logs
echo ""
echo "📊 Deployment complete! Showing logs..."
echo "Press Ctrl+C to stop viewing logs"
echo ""
heroku logs --tail
```

Make it executable:
```bash
chmod +x deploy-heroku.sh
```

Run it:
```bash
./deploy-heroku.sh
```

## Quick Start (TL;DR)

```bash
# 1. Install Heroku CLI
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create pnptv-telegram-bot

# 4. Add Procfile
echo "web: node start-bot.js" > Procfile

# 5. Set environment variables (use your actual values)
heroku config:set TELEGRAM_TOKEN=your_token
heroku config:set EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c
heroku config:set EPAYCO_PRIVATE_KEY=80174d93a6f8d760f5cca2b2cc6ee48b
heroku config:set EPAYCO_P_CUST_ID=1555482
heroku config:set EPAYCO_P_KEY=e76ae8e9551df6e3b353434c4de34ef2dafa41bf
heroku config:set EPAYCO_TEST_MODE=true
heroku config:set FIREBASE_CREDENTIALS='your_json_here'

# 6. Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# 7. Scale
heroku ps:scale web=1

# 8. Check logs
heroku logs --tail
```

## Next Steps After Deployment

1. ✅ Verify health endpoint works
2. ✅ Test bot in Telegram
3. ✅ Try making a test payment
4. ✅ Check webhook logs
5. ✅ Monitor for errors
6. ✅ When ready, set `EPAYCO_TEST_MODE=false`

## Support

If you encounter issues:

1. Check logs: `heroku logs --tail`
2. Verify config: `heroku config`
3. Check dyno status: `heroku ps`
4. Restart: `heroku restart`
5. Review error messages in logs

## Useful Links

- **Heroku Dashboard**: https://dashboard.heroku.com/
- **Heroku CLI Docs**: https://devcenter.heroku.com/articles/heroku-cli
- **Node.js on Heroku**: https://devcenter.heroku.com/articles/getting-started-with-nodejs
- **Heroku Config Vars**: https://devcenter.heroku.com/articles/config-vars
- **Heroku Logs**: https://devcenter.heroku.com/articles/logging

---

**Created for**: PNPTV Telegram Bot
**Last Updated**: 2025-01-16
**Status**: Ready to deploy
