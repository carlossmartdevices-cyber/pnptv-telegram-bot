# 🚀 Complete Deployment Guide

Choose your hosting platform and follow the steps below.

## Quick Comparison

| Platform | Difficulty | Free Tier | Best For |
|----------|-----------|-----------|----------|
| **Railway** | ⭐ Easy | Yes (limited) | Beginners |
| **Render** | ⭐ Easy | Yes | Free hosting |
| **Heroku** | ⭐⭐ Medium | No (paid only) | Established apps |
| **VPS** | ⭐⭐⭐ Advanced | Varies | Full control |
| **PebbleHost** | ⭐⭐ Medium | No | Budget hosting |

---

## 🌟 Option 1: Railway (Recommended)

**Best for: Beginners, free tier available**

### Step 1: Prepare Repository

```bash
# Initialize git if not done
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
gh repo create SantinoBot --public --source=. --remote=origin --push
# OR manually create repo on GitHub and:
git remote add origin https://github.com/YOUR_USERNAME/SantinoBot.git
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select your repository
5. Railway will auto-detect Node.js

### Step 3: Set Environment Variables

In Railway dashboard:
- Click on your project
- Go to **"Variables"** tab
- Add each variable:

```
BOT_TOKEN=your_bot_token_here
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=your_email@project.iam.gserviceaccount.com
GROUP_ID=-1001234567890
NODE_ENV=production
LOG_LEVEL=info
```

⚠️ **Important**: Don't use quotes around values in Railway!

### Step 4: Deploy

- Click **"Deploy"**
- Wait for build to complete
- Check logs to verify bot is running

✅ **Done!** Your bot is now live on Railway.

---

## 🎨 Option 2: Render (Free Tier)

**Best for: Free hosting with auto-deploy**

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Deploy to Render"
git remote add origin https://github.com/YOUR_USERNAME/SantinoBot.git
git push -u origin main
```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up (free account)
3. Connect your GitHub

### Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your repository
3. Configure:
   - **Name**: `santino-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 4: Add Environment Variables

In Render dashboard, add:

```
BOT_TOKEN=your_token
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY=your_key_with_\n_preserved
FIREBASE_CLIENT_EMAIL=your_email
GROUP_ID=-1001234567890
NODE_ENV=production
```

### Step 5: Deploy

- Click **"Create Web Service"**
- Render will auto-deploy
- Monitor logs for startup

✅ **Free tier includes:** 750 hours/month, auto-sleep after inactivity

---

## 📦 Option 3: VPS (DigitalOcean, Linode, etc.)

**Best for: Full control, 24/7 uptime**

### Step 1: Get a VPS

- [DigitalOcean](https://digitalocean.com) - $6/month
- [Linode](https://linode.com) - $5/month
- [Vultr](https://vultr.com) - $5/month

Choose: **Ubuntu 22.04 LTS**

### Step 2: Connect to VPS

```bash
ssh root@your_vps_ip
```

### Step 3: Install Node.js

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify
node --version
npm --version
```

### Step 4: Clone Repository

```bash
# Install git
apt install -y git

# Clone your bot
cd /opt
git clone https://github.com/YOUR_USERNAME/SantinoBot.git
cd SantinoBot

# Install dependencies
npm install --production
```

### Step 5: Configure Environment

```bash
# Create .env file
nano .env
```

Paste your configuration:
```env
BOT_TOKEN=your_token
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_email
GROUP_ID=-1001234567890
NODE_ENV=production
LOG_LEVEL=info
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 6: Install PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start src/bot.js --name santino-bot

# Auto-start on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs santino-bot
```

### Step 7: Setup Firewall (Optional but Recommended)

```bash
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
```

✅ **Your bot is now running 24/7!**

**Useful PM2 Commands:**
```bash
pm2 status              # Check status
pm2 logs santino-bot    # View logs
pm2 restart santino-bot # Restart bot
pm2 stop santino-bot    # Stop bot
pm2 delete santino-bot  # Remove from PM2
```

---

## 🐳 Option 4: Docker Deployment

**Best for: Containerized deployments**

### Step 1: Build Docker Image

```bash
# Build image
docker build -t santino-bot .

# Or use docker-compose
docker-compose up -d
```

### Step 2: Run Container

```bash
docker run -d \
  --name santino-bot \
  --restart unless-stopped \
  -e BOT_TOKEN=your_token \
  -e FIREBASE_PROJECT_ID=your_project \
  -e FIREBASE_PRIVATE_KEY="your_key" \
  -e FIREBASE_CLIENT_EMAIL=your_email \
  -e GROUP_ID=-1001234567890 \
  santino-bot
```

### Step 3: Check Logs

```bash
docker logs -f santino-bot
```

---

## 🔧 Post-Deployment Checklist

After deploying to any platform:

- [ ] Bot is online (check logs)
- [ ] Bot responds to `/status` in group
- [ ] Free users can send text ✅
- [ ] Free users' media is deleted ✅
- [ ] Premium users can send media ✅
- [ ] Welcome messages appear for new members
- [ ] Logs are being written correctly
- [ ] Environment variables are loaded

## 🐛 Troubleshooting Deployment

### Bot crashes immediately

**Check logs for:**
- Missing environment variables
- Firebase connection errors
- Invalid bot token

**Fix:**
```bash
# Verify all env vars are set
# Check logs for specific error
# Validate with: npm run check-config (locally)
```

### Bot starts but doesn't respond

**Possible causes:**
1. Wrong GROUP_ID in .env
2. Bot not added to group as admin
3. Bot token incorrect

**Fix:**
- Remove GROUP_ID (allows all groups)
- Check bot is admin with Delete & Restrict permissions
- Get new token from @BotFather

### Firebase errors

**Error: "Permission denied"**
- Check Firebase credentials are correct
- Verify service account has Firestore access
- Ensure private key includes `\n` characters

### Memory issues on free tier

**If bot crashes due to memory:**
- Use webhook mode (set WEBHOOK_URL)
- Reduce LOG_LEVEL to 'error'
- Deploy to VPS with more RAM

## 📊 Monitoring Your Bot

### Railway
- View logs in dashboard
- Monitor CPU/Memory usage
- Set up alerts

### Render
- Check deployment logs
- View metrics
- Enable auto-deploy from GitHub

### VPS with PM2
```bash
pm2 monit              # Real-time monitoring
pm2 logs --lines 100   # View last 100 log lines
```

## 🔄 Updating Your Bot

### Railway/Render (GitHub connected)
```bash
git add .
git commit -m "Update bot"
git push
# Auto-deploys!
```

### VPS
```bash
ssh root@your_vps_ip
cd /opt/SantinoBot
git pull
npm install
pm2 restart santino-bot
```

## 💰 Cost Comparison

| Platform | Free Tier | Paid Plans | Notes |
|----------|-----------|------------|-------|
| Railway | $5 credit/month | $5+/month | Credit expires |
| Render | 750 hrs/month | $7+/month | Auto-sleep |
| Heroku | None | $7+/month | No free tier anymore |
| DigitalOcean | None | $6/month | Full VPS |
| PebbleHost | None | $1-3/month | Budget option |

## 🎯 Recommended Setup

**For Beginners:**
- Start with Railway (free tier)
- Learn how it works
- Upgrade if needed

**For Production:**
- VPS with PM2
- Full control
- 24/7 uptime
- ~$5-6/month

**For Budget:**
- Render free tier
- Good for small groups
- Auto-sleep acceptable

---

## Need Help?

- 📚 See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 🚀 See [GETTING_STARTED.md](GETTING_STARTED.md)
- 💬 Check logs for errors
- 🔍 Validate config: `npm run check-config`

**Your bot should now be deployed and running! 🎉**
