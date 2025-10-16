# ⚡ Railway Quick Start (5 Minutes)

Deploy your PNPtv bot to Railway in 5 minutes! Get HTTPS and test your Mini App instantly.

## 🚀 Super Fast Deploy

### 1. Push to GitHub (2 min)

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push
```

### 2. Create Railway Project (1 min)

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select **pnptv-bot**
4. Click **"Deploy Now"**

### 3. Add Environment Variables (2 min)

Click **"Variables"** tab and add:

```env
TELEGRAM_TOKEN=your_bot_token
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS={"type":"service_account"...}
ADMIN_IDS=your_telegram_user_id
NODE_ENV=production
```

**Get FIREBASE_CREDENTIALS:**
```bash
# Open your serviceAccountKey.json
# Copy ENTIRE content (all the JSON)
# Paste as the value for FIREBASE_CREDENTIALS
```

### 4. Generate Domain & Add URL (30 sec)

1. **Settings** tab → **Networking** → **Generate Domain**
2. Copy URL (e.g., `https://pnptv-production.up.railway.app`)
3. **Variables** tab → Add:
   ```
   WEB_APP_URL=https://pnptv-production.up.railway.app
   ```

### 5. Test! (Instant)

1. Open Telegram → @PNPtvbot
2. Send `/start`
3. Click **"🚀 Open Mini App"**
4. **Works!** 🎉

## ✅ That's It!

Your bot is now:
- ✅ Live 24/7
- ✅ Has HTTPS
- ✅ Mini App works in Telegram
- ✅ Free tier ($5/month credit)

## 🔍 Check Deployment

**View Logs:**
Railway → Deployments → Latest → **View Logs**

**Check Status:**
Look for:
```
✅ PNPtv Bot is running!
🌐 Mini App available at: http://localhost:3000
```

## 🎯 Your URLs

**Mini App:**
```
https://your-app.up.railway.app
```

**Demo Page:**
```
https://your-app.up.railway.app/demo.html
```

**API:**
```
https://your-app.up.railway.app/api/plans
```

## 🔄 Update Code

Every time you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push
```

Railway automatically redeploys! ⚡

## 🆘 Quick Fixes

**Bot not starting?**
- Check logs in Railway dashboard
- Verify all env vars are set
- Check TELEGRAM_TOKEN is correct

**Mini App not working?**
- Verify WEB_APP_URL is HTTPS
- Check it matches your Railway domain
- Restart: Settings → Restart

**Firebase errors?**
- Check FIREBASE_CREDENTIALS is valid JSON
- Verify FIREBASE_PROJECT_ID is correct
- Ensure Firestore is enabled

## 💰 Cost

**Free Tier:**
- $5/month credit
- Perfect for testing
- ~500 hours runtime

## 📚 Full Guide

See [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md) for:
- Detailed instructions
- Troubleshooting
- Advanced configuration
- Optimization tips

---

**That's it! Your Mini App is live with HTTPS!** 🚀

Test now: https://t.me/PNPtvbot → `/start` → "🚀 Open Mini App"
