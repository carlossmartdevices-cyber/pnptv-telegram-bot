# 🚂 Deploy PNPtv Bot to Railway

Railway is perfect for testing your Mini App! It's free, gives you HTTPS automatically, and takes about 10 minutes to set up.

## ✨ What You'll Get

- ✅ **Free HTTPS domain** (e.g., `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com`)
- ✅ **Both bot and web server** running
- ✅ **Mini App working in Telegram** (no ngrok needed!)
- ✅ **$5/month free credit** (enough for testing)
- ✅ **Automatic deployments** from Git

## 📋 Prerequisites

- Railway account (free): https://railway.app
- GitHub account
- Your code pushed to GitHub

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

First, make sure your code is on GitHub:

```bash
# If not already initialized
git init
git add .
git commit -m "Prepare for Railway deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/pnptv-bot.git
git branch -M main
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your `pnptv-bot` repository
5. Railway will detect it's a Node.js project

### Step 3: Configure Environment Variables

In Railway dashboard:

1. Click on your project
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**

Add these variables one by one:

```env
TELEGRAM_TOKEN=your_bot_token_here
FIREBASE_PROJECT_ID=your_firebase_project_id
ADMIN_IDS=your_telegram_user_id
WEB_PORT=3000
NODE_ENV=production
```

**Important:** Don't add `WEB_APP_URL` yet - we'll get it in the next step!

### Step 4: Generate Domain

1. In Railway dashboard, go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. You'll get a URL like: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com`
5. **Copy this URL!**

### Step 5: Add Web App URL

1. Go back to **"Variables"** tab
2. Add new variable:
   ```
   WEB_APP_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
   ```
3. Replace with YOUR actual Railway URL

### Step 6: Upload Firebase Credentials

Railway needs your Firebase service account key. There are two ways:

**Option A: Environment Variable (Easier)**

1. Open your `src/config/serviceAccountKey.json`
2. Copy the ENTIRE content (it's JSON)
3. In Railway Variables, add:
   ```
   FIREBASE_CREDENTIALS=<paste entire JSON here>
   ```

**Option B: Railway Volume (More Secure)**

1. In Railway, create a volume
2. Upload `serviceAccountKey.json`
3. Mount at `/app/src/config/`

For testing, **Option A is easier**.

### Step 7: Update Firebase Config (If Using Option A)

If you used environment variable for Firebase credentials, update the config:

Edit `src/config/firebase.js`:

```javascript
const admin = require("firebase-admin");
require("dotenv").config();
const logger = require("../utils/logger");

let db;

function initializeFirebase() {
  try {
    // Check if Firebase credentials are in environment variable
    if (process.env.FIREBASE_CREDENTIALS) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      // Use file (for local development)
      const serviceAccount = require("./serviceAccountKey.json");

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    db = admin.firestore();
    console.log("Firebase ha sido inicializado correctamente.");
    logger.info("Firebase initialized successfully");
  } catch (error) {
    console.error("Error inicializando Firebase:", error.message);
    logger.error("Failed to initialize Firebase:", error);
    throw error;
  }
}

// Initialize on module load
initializeFirebase();

module.exports = { db, admin };
```

### Step 8: Deploy!

Railway will automatically deploy when you:

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Configure for Railway"
   git push
   ```

2. Or click **"Deploy"** in Railway dashboard

### Step 9: Monitor Deployment

1. In Railway dashboard, click **"Deployments"** tab
2. Watch the build logs
3. Wait for status to show **"SUCCESS"** ✅

This usually takes 2-3 minutes.

### Step 10: Test Your Bot!

1. Open Telegram
2. Go to your bot (@PNPtvbot)
3. Send `/start`
4. Click **"🚀 Open Mini App"**
5. **IT SHOULD WORK!** 🎉

## 🎯 What's Working Now

✅ Bot running 24/7
✅ Web server with HTTPS
✅ Mini App opens in Telegram
✅ All API endpoints accessible
✅ Firebase connected
✅ No ngrok needed!

## 📊 Railway Dashboard Features

**View Logs:**
- Click "Deployments" → Select deployment → "View Logs"
- See real-time bot activity

**Metrics:**
- CPU usage
- Memory usage
- Network traffic

**Restart:**
- Settings → "Restart"

## 💰 Railway Pricing

**Free Tier:**
- $5/month credit
- ~500 hours runtime
- Perfect for testing!

If you exceed free tier:
- ~$5-10/month for small bot
- Can set spending limits

## 🔧 Common Issues

### Build Fails

**Error:** `Cannot find module`
```bash
# Make sure package.json is correct
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Firebase Error

**Error:** `PERMISSION_DENIED`
- Check `FIREBASE_CREDENTIALS` is valid JSON
- Verify Firebase project ID
- Ensure Firestore is enabled

### Bot Not Responding

**Check logs:**
1. Railway dashboard → Deployments → View Logs
2. Look for errors
3. Check `TELEGRAM_TOKEN` is correct

### Web Server Not Starting

**Error:** Port issues
- Railway sets `PORT` automatically
- Make sure your code uses `process.env.PORT || process.env.WEB_PORT || 3000`

### Mini App Still Shows HTTP Error

- Verify `WEB_APP_URL` is HTTPS (not HTTP)
- Check Railway domain is correct
- Restart bot: Settings → Restart

## 🎨 Update Your Code

If web server doesn't start, ensure `src/web/server.js` uses Railway's PORT:

```javascript
const PORT = process.env.PORT || process.env.WEB_PORT || 3000;
```

Railway sets `PORT` automatically, so this ensures compatibility.

## 🔄 Continuous Deployment

Every time you push to GitHub, Railway automatically:
1. Pulls latest code
2. Installs dependencies
3. Builds project
4. Restarts bot

**No manual deployment needed!**

## 📝 Important Files for Railway

Make sure these exist:

**`.gitignore`**
```
node_modules/
.env
*.log
logs/
sessions.json
src/config/serviceAccountKey.json
```

**`package.json`** - Must have start script:
```json
{
  "scripts": {
    "start": "node start-bot.js"
  }
}
```

## 🌐 Your URLs

After deployment, you have:

**Bot URL:**
```
https://t.me/PNPtvbot
```

**Mini App URL (for sharing):**
```
https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/demo.html
```

**API Endpoints:**
```
https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/api/profile/:userId
https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/api/map/nearby
https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/api/plans
```

## 🎉 Success Checklist

- [ ] Railway project created
- [ ] All environment variables added
- [ ] Domain generated
- [ ] `WEB_APP_URL` set to Railway domain
- [ ] Firebase credentials configured
- [ ] Code pushed to GitHub
- [ ] Deployment successful (green checkmark)
- [ ] Bot responds in Telegram
- [ ] Mini App opens with "🚀 Open Mini App" button
- [ ] Can access `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/demo.html`

## 🚀 Next Steps After Deployment

1. **Test thoroughly:**
   - All bot commands
   - Mini App features
   - API endpoints

2. **Monitor usage:**
   - Check Railway metrics
   - Watch for errors in logs
   - Monitor Firebase usage

3. **Optimize if needed:**
   - Add database indexes
   - Implement caching
   - Optimize API calls

## 💡 Pro Tips

**Keep Local Development:**
```bash
# Local: uses .env with localhost
npm start

# Production: Railway uses environment variables
```

**Multiple Environments:**
- Create separate Railway projects for staging/production
- Use different bot tokens
- Test before deploying to main bot

**Custom Domain (Optional):**
1. Buy domain (e.g., pnptv.com)
2. Railway Settings → Networking → Custom Domain
3. Add DNS records
4. Update `WEB_APP_URL`

## 🆘 Need Help?

**Railway Docs:**
https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com

**Railway Discord:**
https://discord.gg/railway

**Check Logs:**
Railway Dashboard → Deployments → View Logs

**Common Commands:**
```bash
# Redeploy
git commit --allow-empty -m "Redeploy"
git push

# Check status
# Use Railway dashboard

# View logs
# Use Railway dashboard → Deployments → Logs
```

---

## 🎊 Summary

**Railway Deployment:**
1. Push code to GitHub ✅
2. Create Railway project ✅
3. Add environment variables ✅
4. Generate domain ✅
5. Deploy ✅
6. Test Mini App in Telegram ✅

**Time:** ~10 minutes
**Cost:** Free (with $5 credit)
**Result:** Working Mini App with HTTPS!

**Your Mini App will be live at:**
`https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com`

---

Made with ❤️ for PNPtv
