# 🎉 Railway Deployment - Ready to Deploy!

## ✅ What's Been Prepared

I've updated your code to work perfectly with Railway! Here's what changed:

### 🔧 Code Updates

1. **Firebase Config** (`src/config/firebase.js`) ✅
   - Now supports environment variable credentials
   - Works with Railway's `FIREBASE_CREDENTIALS` env var
   - Falls back to local file for development

2. **Web Server** (`src/web/server.js`) ✅
   - Uses Railway's `PORT` environment variable
   - Falls back to `WEB_PORT` or 3000
   - Fully Railway-compatible

3. **Documentation Created** ✅
   - `DEPLOY_RAILWAY.md` - Complete deployment guide
   - `RAILWAY_QUICKSTART.md` - 5-minute quick start
   - Updated `README.md` with Railway section

## 🚀 Deploy Now (5 Minutes)

Follow this super quick guide: **[RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md)**

### Quick Steps:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push
   ```

2. **Create Railway Project**
   - Go to https://railway.app/new
   - Deploy from GitHub repo
   - Select `pnptv-bot`

3. **Add Environment Variables** (in Railway dashboard)
   ```env
   TELEGRAM_TOKEN=your_token
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CREDENTIALS={"type":"service_account",...}
   ADMIN_IDS=your_user_id
   NODE_ENV=production
   ```

4. **Generate Domain**
   - Settings → Networking → Generate Domain
   - Copy URL (e.g., `https://pnptv-production.up.railway.app`)

5. **Add Web App URL**
   ```env
   WEB_APP_URL=https://your-app.up.railway.app
   ```

6. **Deploy!**
   - Railway auto-deploys
   - Wait 2-3 minutes
   - Bot is live!

## 🎯 What You Get

✅ **Free HTTPS Domain**
- No more ngrok needed!
- Permanent URL (until you delete project)
- Professional domain

✅ **24/7 Uptime**
- Bot runs continuously
- Automatic restarts on crashes
- Always available

✅ **Automatic Deployments**
- Push to GitHub → Auto-deploy
- No manual deployment
- Instant updates

✅ **Free Tier**
- $5/month credit
- ~500 hours runtime
- Perfect for testing

✅ **Mini App Works in Telegram**
- HTTPS enabled
- "🚀 Open Mini App" button works
- Full functionality

## 📚 Documentation

**Quick Start (5 min):**
- [RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md)

**Complete Guide:**
- [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)

**Other Guides:**
- [MINI_APP_SETUP.md](MINI_APP_SETUP.md) - Mini App overview
- [SETUP_NGROK.md](SETUP_NGROK.md) - Alternative (ngrok)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Fix issues
- [QUICKSTART.md](QUICKSTART.md) - Local development

## 🔑 Important Environment Variables

### Required:
- `TELEGRAM_TOKEN` - Your bot token
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CREDENTIALS` - Full JSON credentials
- `WEB_APP_URL` - Your Railway HTTPS URL

### Optional but Recommended:
- `ADMIN_IDS` - Admin user IDs
- `NODE_ENV` - Set to "production"

## 🎨 Testing After Deployment

### 1. Check Deployment Status
Railway Dashboard → Deployments → Latest

Look for:
- ✅ Status: SUCCESS
- ✅ Build completed
- ✅ Deployment active

### 2. View Logs
Deployments → View Logs

Should see:
```
✅ PNPtv Bot is running!
🌐 Mini App available at: http://localhost:3000
Firebase ha sido inicializado correctamente
```

### 3. Test Bot in Telegram
1. Open Telegram
2. Find @PNPtvbot
3. Send `/start`
4. Click "🚀 Open Mini App"
5. Should open inside Telegram! 🎉

### 4. Test Demo Page
Visit: `https://your-app.up.railway.app/demo.html`

### 5. Test API
```bash
curl https://your-app.up.railway.app/api/plans
```

## 🔄 How to Update

Every time you make changes:

```bash
git add .
git commit -m "Update feature"
git push
```

Railway automatically:
1. Detects push
2. Pulls latest code
3. Installs dependencies
4. Deploys
5. Restarts bot

**Takes ~2 minutes!**

## 🆘 Common Issues

### Build Fails
**Check logs** in Railway dashboard

Common fixes:
- Verify all env vars are set
- Check `package.json` has correct start script
- Ensure dependencies are in `package.json`

### Firebase Errors
- Check `FIREBASE_CREDENTIALS` is valid JSON (entire content)
- Verify `FIREBASE_PROJECT_ID` matches your project
- Ensure Firestore is enabled in Firebase Console

### Bot Not Responding
- Check `TELEGRAM_TOKEN` is correct
- View logs for errors
- Try Settings → Restart in Railway

### Mini App Button Not Working
- Verify `WEB_APP_URL` is HTTPS (not HTTP)
- Check URL matches your Railway domain
- Ensure no trailing slash in URL

## 💰 Cost

**Free Tier:**
- $5/month credit (automatically applied)
- ~500 hours of runtime
- More than enough for testing

**If you exceed:**
- ~$5-10/month for typical bot usage
- Can set spending limits
- Railway notifies you

## 🎊 Success Checklist

Before deploying, make sure:

- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] All env vars prepared (including FIREBASE_CREDENTIALS JSON)
- [ ] `.gitignore` includes sensitive files
- [ ] Tested locally with `npm start`

After deploying:

- [ ] Railway shows "SUCCESS" status
- [ ] Logs show bot started
- [ ] Bot responds in Telegram
- [ ] `/start` command works
- [ ] "🚀 Open Mini App" button appears
- [ ] Mini App opens in Telegram
- [ ] Demo page accessible at Railway URL

## 🚀 Ready to Deploy?

**Follow the quick guide:**
[RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md)

**Or full guide:**
[DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)

**Your bot will be live at:**
```
https://your-app.up.railway.app
```

**Mini App will work in Telegram with HTTPS!** 🎉

---

## 📊 What Happens on Railway

```
You push to GitHub
       ↓
Railway detects push
       ↓
Pulls latest code
       ↓
Runs: npm install
       ↓
Runs: npm start
       ↓
Bot starts
       ↓
Web server starts on PORT
       ↓
✅ Live at your-app.up.railway.app
```

## 🎯 Next Steps

1. **Deploy** - Follow RAILWAY_QUICKSTART.md
2. **Test** - Try Mini App in Telegram
3. **Monitor** - Check logs in Railway dashboard
4. **Share** - Send bot link to users!

---

Made with ❤️ for PNPtv • Ready for Railway Deployment! 🚂
