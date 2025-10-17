# Fix Mini App Wrong Site Issue

## Problem
The Mini App button is opening the wrong website instead of your PNPtv Mini App.

## Root Cause
The Mini App URL needs to be configured in BotFather to point to your web server.

## Solution

### Step 1: Get Your Bot URL

First, determine your bot's public URL:

**Local Development:**
```bash
# Use ngrok to expose local server
ngrok http 3000

# Your URL will be something like:
# https://abc123.ngrok.io
```

**Production (Railway/Heroku/VPS):**
- Use your deployed URL (e.g., `https://yourdomain.com`)
- Or Railway provides: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com`

### Step 2: Configure Mini App in BotFather

1. Open Telegram and search for @BotFather
2. Send `/mybots`
3. Select your bot (PNPtvbot)
4. Click "Bot Settings"
5. Click "Menu Button"
6. Click "Configure Menu Button"
7. Click "Edit Menu Button URL"
8. Enter your URL: `https://yourdomain.com` or `https://abc123.ngrok.io`
9. Done!

### Step 3: Update Environment Variables

Add to your `.env` file:

```bash
# Your deployed/ngrok URL
BOT_URL=https://yourdomain.com
WEB_APP_URL=https://yourdomain.com

# For ePayco webhooks
EPAYCO_RESPONSE_URL=https://yourdomain.com/epayco/response
EPAYCO_CONFIRMATION_URL=https://yourdomain.com/epayco/confirmation
```

### Step 4: Restart Bot

```bash
# Stop bot (Ctrl+C)
# Start bot
npm start
```

### Step 5: Test

1. Open your bot in Telegram
2. Click "🌐 Open Mini App" button
3. Should now open YOUR Mini App, not a wrong site

## Alternative: Remove Mini App Button

If you don't want the Mini App button, remove it from the keyboard:

Edit `src/config/menus.js`:

```javascript
keyboard: [
  ["👤 Profile", "🗺️ Map"],
  ["📡 Live", "💎 Subscribe"],
  ["❓ Help"], // Removed Mini App button
],
```

## For Production Deployment

### Railway

1. Deploy your bot to Railway
2. Get your Railway URL: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com`
3. Set in BotFather as explained above
4. Add environment variables in Railway dashboard

### Heroku

1. Deploy to Heroku
2. Get Heroku URL: `https://your-app.herokuapp.com`
3. Configure in BotFather
4. Set Config Vars in Heroku

### VPS (with Domain)

1. Point your domain to VPS
2. Set up HTTPS (use Let's Encrypt)
3. Use `https://yourdomain.com` in BotFather
4. Update .env file

## Troubleshooting

### Mini App still shows wrong site

**Solutions:**
1. Clear Telegram cache (Settings → Data and Storage → Clear Cache)
2. Wait 5-10 minutes for BotFather changes to propagate
3. Restart Telegram app
4. Try on different device to confirm

### Mini App doesn't load

**Check:**
1. Web server is running (`npm start`)
2. Port 3000 is accessible
3. If using ngrok, it's active
4. URL in BotFather is correct (no trailing slash)
5. HTTPS is working (required for Mini Apps)

### "This site can't be reached"

**Solutions:**
1. Server must be publicly accessible
2. Use ngrok for local testing
3. Check firewall allows port 3000
4. Verify bot is running

## Quick Fix for Local Testing

```bash
# Terminal 1: Start bot
npm start

# Terminal 2: Start ngrok
ngrok http 3000

# Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)
# Set this URL in BotFather
# Test in Telegram
```

## Complete Setup Checklist

- [ ] Bot is running
- [ ] Web server is running (port 3000)
- [ ] Public URL obtained (ngrok or deployed)
- [ ] URL set in BotFather Menu Button
- [ ] Environment variables updated
- [ ] Bot restarted
- [ ] Telegram cache cleared
- [ ] Tested on mobile device

## Important Notes

- **HTTPS Required**: Mini Apps only work with HTTPS URLs
- **No Trailing Slash**: Use `https://yourdomain.com` not `https://yourdomain.com/`
- **Propagation Time**: BotFather changes may take 5-10 minutes
- **Cache**: Clear Telegram cache if changes don't appear

## Current Status

Your Mini App HTML is correct (`src/web/public/index.html`)
Your web server is configured correctly (`src/web/server.js`)

**The only issue**: The Mini App URL in BotFather needs to be updated to point to YOUR server instead of the wrong site.

Follow the steps above to fix it! 🎉

