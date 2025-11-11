# PNPtv Bot - Hostinger VPS Deployment Guide

## 🚀 Quick Start

This guide will help you deploy your PNPtv Telegram bot to your Hostinger VPS server with domain **pnptv.app**.

## 📋 Prerequisites

Before starting, make sure you have:

1. ✅ Hostinger VPS access credentials
2. ✅ Domain pnptv.app pointed to your Hostinger VPS IP
3. ✅ SSH access to your server (srv1071867.hstgr.cloud)
4. ✅ All API keys and tokens ready:
   - Telegram Bot Token
   - Firebase credentials
   - ePayco credentials
   - Daimo Pay credentials

## 🌐 Server Information

- **Server**: srv1071867.hstgr.cloud
- **IP**: 72.60.29.80
- **Domain**: pnptv.app
- **OS**: Ubuntu/Debian
- **Node.js**: v20.x
- **Process Manager**: PM2

## 📦 Deployment Methods

### Method 1: Automated Deployment (Recommended)

#### Step 1: Prepare Your Local Environment

```bash
# Make sure you're in the project directory
cd c:\Users\carlo\Documents\Bots

# Backup your production environment file
copy .env.production .env.production.backup

# Verify your .env.production file has all required settings
type .env.production
```

#### Step 2: Connect to Your Server

```bash
# SSH into your Hostinger VPS
ssh root@srv1071867.hstgr.cloud

# Or using the IP
ssh root@72.60.29.80
```

#### Step 3: Run the Deployment Script

```bash
# On your server, download and run the deployment script
curl -o deploy.sh https://raw.githubusercontent.com/YOUR_REPO/main/deploy-hostinger.sh
chmod +x deploy.sh
bash deploy.sh
```

**Or** if you're already uploaded the files:

```bash
cd /var/www/telegram-bot
bash deploy-hostinger.sh
```

### Method 2: Manual Deployment

#### Step 1: Connect to Server

```bash
ssh root@srv1071867.hstgr.cloud
```

#### Step 2: Install Node.js and PM2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node -v
npm -v
pm2 -v
```

#### Step 3: Create Application Directory

```bash
# Create directory
sudo mkdir -p /var/www/telegram-bot
cd /var/www/telegram-bot
```

#### Step 4: Upload Your Files

You can upload files via:
- **FTP/SFTP** using FileZilla or WinSCP
- **Git** (clone your repository)
- **rsync** from your local machine

**Using rsync from Windows:**
```bash
# From your local machine (Git Bash)
rsync -avz --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'logs' \
  --include '.env.production' \
  c:/Users/carlo/Documents/Bots/ \
  root@srv1071867.hstgr.cloud:/var/www/telegram-bot/
```

**Using Git:**
```bash
# On the server
cd /var/www/telegram-bot
git clone https://github.com/YOUR_REPO/pnptv-bot.git .
```

#### Step 5: Install Dependencies

```bash
cd /var/www/telegram-bot
npm install --production
```

#### Step 6: Configure Environment Variables

```bash
# Copy the production environment file
cp .env.production .env

# Or edit the .env file if needed
nano /var/www/telegram-bot/.env
```

**Your `.env.production` file should already contain the correct values:**

```env
# ==================================
# PNPtv Bot Configuration - PRODUCTION
# ==================================

NODE_ENV=production

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=<YOUR_BOT_TOKEN>
TELEGRAM_TOKEN=<YOUR_BOT_TOKEN>
CHANNEL_ID=-1002997324714
TELEGRAM_BOT_USERNAME=PNPtvBot
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=PNPtvBot

# Admin Configuration
ADMIN_IDS=8365312597

# ==================================
# Firebase Configuration
# ==================================
FIREBASE_PROJECT_ID=pnptv-b8af8
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@pnptv-b8af8.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=pnptv-b8af8.appspot.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_FIREBASE_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# ==================================
# ePayco Payment Gateway (Colombia) - PRODUCTION
# ==================================
EPAYCO_PUBLIC_KEY=6d5c47f6a632c0bacd5bb31990d4e994
EPAYCO_PRIVATE_KEY=c3b7fa0d75e65dd28804fb9c18989693
EPAYCO_CUSTOMER_ID=1565511
EPAYCO_P_CUST_ID=1565511
EPAYCO_P_KEY=4ae1e189c9af6a730b71bc4f15546b78520ad338
EPAYCO_TEST=false
EPAYCO_TEST_MODE=false
EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false

# ==================================
# Daimo Pay (Stablecoin Payments)
# ==================================
DAIMO_API_KEY=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_APP_ID=pnptv-bot
NEXT_PUBLIC_DAIMO_APP_ID=pnptv-bot
DAIMO_WEBHOOK_TOKEN=0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c
NEXT_PUBLIC_TREASURY_ADDRESS=0xcaf17dbbccc0e9ac87dad1af1f2fe3ba3a4d0613
NEXT_PUBLIC_REFUND_ADDRESS=0xcaf17dbbccc0e9ac87dad1af1f2fe3ba3a4d0613

# ==================================
# URLs Configuration - PRODUCTION (pnptv.app)
# ==================================
BOT_URL=https://pnptv.app
PAYMENT_PAGE_URL=https://pnptv.app/pay
WEBAPP_URL=https://pnptv.app
WEB_APP_URL=https://pnptv.app
WEBHOOK_URL=https://pnptv.app
RESPONSE_URL=https://pnptv.app/epayco/response
CONFIRMATION_URL=https://pnptv.app/epayco/confirmation
EPAYCO_RESPONSE_URL=https://pnptv.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv.app/epayco/confirmation
DAIMO_WEBHOOK_URL=https://pnptv-payment-9lx3oqtgp-pnptvbots-projects.vercel.app/api/webhook
DAIMO_RETURN_URL=https://pnptv.app/payment/success
NEXT_PUBLIC_WEBAPP_URL=https://pnptv.app
NEXT_PUBLIC_BOT_URL=https://pnptv.app

# ==================================
# Server Configuration
# ==================================
PORT=3000
WEB_PORT=3000

# ==================================
# Error Tracking & Monitoring
# ==================================
SENTRY_DSN=https://dab7b206e39473c2b1d706131f538f42@o4510204127870976.ingest.us.sentry.io/4510204133769216
SENTRY_ENABLE_IN_DEV=false

# ==================================
# WebApp Configuration
# ==================================
JWT_SECRET=459c0de1110aa702fa9cca2a3f8d8e4c020853052245a6d034345e0f24214847fe23e7e7681abd211097c014006dfddb5f4a01468849b976a08c92587127e062
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

#### Step 7: Create Logs Directory

```bash
mkdir -p /var/www/telegram-bot/logs
```

#### Step 8: Start with PM2

```bash
cd /var/www/telegram-bot

# Start the bot
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Copy and run the command that PM2 outputs
```

#### Step 9: Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/pnptv-bot
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name pnptv.app www.pnptv.app;

    # Redirect to HTTPS (will be configured by Certbot)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for long-polling
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
    }

    # Telegram webhook endpoint
    location /webhook {
        proxy_pass http://localhost:3000/webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Payment webhooks
    location /epayco {
        proxy_pass http://localhost:3000/epayco;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /daimo {
        proxy_pass http://localhost:3000/daimo;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files (if any)
    location /static {
        alias /var/www/telegram-bot/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### Step 10: Install SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d pnptv.app -d www.pnptv.app

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

#### Step 11: Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

#### Step 12: Set Telegram Webhook

```bash
# Set the webhook URL (replace with your bot token)
curl -F "url=https://pnptv.app/webhook" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook

# Verify webhook is set
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

## 🔧 Post-Deployment Configuration

### 1. Configure ePayco Webhooks

Go to https://dashboard.epayco.co/

1. Navigate to **Settings** → **Webhooks**
2. Set **Confirmation URL**: `https://pnptv.app/epayco/confirmation`
3. Set **Response URL**: `https://pnptv.app/epayco/response`
4. Save settings

### 2. Configure Daimo Webhooks

Go to https://pay.daimo.com/dashboard

1. Navigate to **Settings** → **Webhooks**
2. Set **Webhook URL**: `https://pnptv.app/daimo/webhook`
3. Copy your webhook token and add it to `.env`
4. Save settings

## 📊 Monitoring & Management

### PM2 Commands

```bash
# View all processes
pm2 status

# View logs
pm2 logs pnptv-bot

# View only error logs
pm2 logs pnptv-bot --err

# Restart bot
pm2 restart pnptv-bot

# Stop bot
pm2 stop pnptv-bot

# Delete from PM2
pm2 delete pnptv-bot

# Monitor in real-time
pm2 monit

# View detailed info
pm2 info pnptv-bot
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### Application Logs

```bash
# View application logs
tail -f /var/www/telegram-bot/logs/pm2-out.log

# View error logs
tail -f /var/www/telegram-bot/logs/pm2-error.log
```

## 🔄 Updating the Bot

### Quick Update

```bash
# SSH into server
ssh root@srv1071867.hstgr.cloud

# Navigate to app directory
cd /var/www/telegram-bot

# Pull latest changes (if using Git)
git pull

# Or upload new files via SFTP

# Install new dependencies
npm install --production

# Restart the bot
pm2 restart pnptv-bot
```

### Full Restart

```bash
# Stop the bot
pm2 stop pnptv-bot

# Delete from PM2
pm2 delete pnptv-bot

# Start fresh
pm2 start ecosystem.config.js --env production

# Save
pm2 save
```

## 🐛 Troubleshooting

### Bot Not Starting

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs pnptv-bot --lines 100

# Check if port 3000 is in use
sudo lsof -i :3000

# Test bot manually
cd /var/www/telegram-bot
node src/bot/webhook.js
```

### Webhook Issues

```bash
# Check webhook status
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Delete webhook
curl -F "url=" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook

# Set webhook again
curl -F "url=https://pnptv.app/webhook" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check if Nginx is running
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```

### Database Connection Issues

```bash
# Check if Firebase credentials are correct
cat /var/www/telegram-bot/.env | grep FIREBASE

# Test connection manually
cd /var/www/telegram-bot
node -e "require('./src/config/firebase'); console.log('Firebase connected')"
```

## 🔐 Security Checklist

- [ ] Change default SSH port (optional but recommended)
- [ ] Set up SSH key authentication (disable password auth)
- [ ] Configure UFW firewall
- [ ] Keep system updated: `sudo apt update && sudo apt upgrade`
- [ ] Use environment variables for secrets (never commit to Git)
- [ ] Enable HTTPS with Let's Encrypt SSL
- [ ] Set up automatic SSL renewal
- [ ] Configure fail2ban to prevent brute force attacks
- [ ] Regular backups of `.env` file and database

## 📱 Testing

After deployment, test these features:

1. **Bot Commands**
   - Send `/start` to your bot
   - Test subscription plans
   - Test payment flows

2. **Webhooks**
   - Make a test payment with ePayco
   - Make a test payment with Daimo
   - Verify webhooks are received

3. **Admin Panel**
   - Test admin commands
   - Verify user management works
   - Check statistics

## 📞 Support

If you encounter issues:

1. Check logs: `pm2 logs pnptv-bot`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify webhook status
4. Check environment variables

## 🎉 Deployment Complete!

Your PNPtv bot is now running at:
- **Website**: https://pnptv.app
- **Bot**: https://t.me/PNPtvBot
- **Webhook**: https://pnptv.app/webhook

Enjoy! 🚀
