# Deploy to Hostinger VPS - Quick Guide

## 📦 Deployment Package Ready

**File**: `pnptv-bot-deploy.tar.gz` (21MB)
**Server**: 72.60.29.80 (srv1071867.hstgr.cloud)
**Domain**: pnptv.app

---

## 🚀 Deployment Steps

### Step 1: Upload Files to Hostinger

You have two options:

#### Option A: Using SCP (if you have password)
```bash
scp pnptv-bot-deploy.tar.gz root@72.60.29.80:/root/
```

#### Option B: Using Hostinger File Manager
1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com/)
2. Go to VPS → File Manager
3. Upload `pnptv-bot-deploy.tar.gz` to `/root/`

---

### Step 2: SSH into Your Server

```bash
ssh root@72.60.29.80
```

Or use the web-based terminal in Hostinger hPanel.

---

### Step 3: Run Deployment Commands

Copy and paste these commands into your server terminal:

```bash
# Navigate to root directory
cd /root

# Extract the deployment package
mkdir -p /var/www/telegram-bot
tar -xzf pnptv-bot-deploy.tar.gz -C /var/www/telegram-bot
cd /var/www/telegram-bot

# Make deployment script executable
chmod +x deploy-hostinger.sh

# Run the automated deployment
./deploy-hostinger.sh
```

The script will:
- ✅ Install Node.js 20.x
- ✅ Install PM2, Nginx, Certbot
- ✅ Configure firewall (UFW)
- ✅ Install npm dependencies
- ✅ Create .env file template
- ✅ Start the bot with PM2
- ✅ Configure Nginx

---

### Step 4: Configure Environment Variables

After the script runs, edit the `.env` file:

```bash
nano /var/www/telegram-bot/.env
```

**Update these values** (press Ctrl+X, then Y, then Enter to save):

```env
# Telegram
TELEGRAM_BOT_TOKEN=8499797477:AAGd98d3HuIGI3xefqB7OM8dKZ2Tc5DKmqc
CHANNEL_ID=-1002997324714
ADMIN_IDS=8365312597

# URLs (update with your domain)
BOT_URL=https://pnptv.app
WEBAPP_URL=https://pnptv.app
WEB_APP_URL=https://pnptv.app
RESPONSE_URL=https://pnptv.app/epayco/response
CONFIRMATION_URL=https://pnptv.app/epayco/confirmation
EPAYCO_RESPONSE_URL=https://pnptv.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv.app/epayco/confirmation
DAIMO_WEBHOOK_URL=https://pnptv.app/daimo/webhook
DAIMO_RETURN_URL=https://pnptv.app/payment/success
NEXT_PUBLIC_WEBAPP_URL=https://pnptv.app
NEXT_PUBLIC_BOT_URL=https://pnptv.app
WEBHOOK_URL=https://pnptv.app

# Firebase (already in .env.production)
FIREBASE_PROJECT_ID=pnptv-b8af8
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@pnptv-b8af8.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=pnptv-b8af8.appspot.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[YOUR_KEY_HERE]\n-----END PRIVATE KEY-----\n"

# ePayco (use production keys)
EPAYCO_PUBLIC_KEY=6d5c47f6a632c0bacd5bb31990d4e994
EPAYCO_PRIVATE_KEY=c3b7fa0d75e65dd28804fb9c18989693
EPAYCO_CUSTOMER_ID=1565511
EPAYCO_P_CUST_ID=1565511
EPAYCO_P_KEY=4ae1e189c9af6a730b71bc4f15546b78520ad338
EPAYCO_TEST=false
EPAYCO_TEST_MODE=false

# Daimo
DAIMO_API_KEY=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_APP_ID=pnptv-bot
DAIMO_WEBHOOK_TOKEN=0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c
NEXT_PUBLIC_TREASURY_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
NEXT_PUBLIC_REFUND_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0

# Other
JWT_SECRET=459c0de1110aa702fa9cca2a3f8d8e4c020853052245a6d034345e0f24214847fe23e7e7681abd211097c014006dfddb5f4a01468849b976a08c92587127e062
SENTRY_DSN=https://dab7b206e39473c2b1d706131f538f42@o4510204127870976.ingest.us.sentry.io/4510204133769216
```

**Or copy from your .env.production:**
```bash
cp /var/www/telegram-bot/.env.production /var/www/telegram-bot/.env
```

---

### Step 5: Restart the Bot

```bash
cd /var/www/telegram-bot
pm2 restart pnptv-bot
pm2 logs
```

---

### Step 6: Configure Domain and SSL

If you haven't already, point your domain to the server:

**DNS Settings (at your domain registrar):**
```
Type: A
Name: @
Value: 72.60.29.80
TTL: 3600

Type: A
Name: www
Value: 72.60.29.80
TTL: 3600
```

**After DNS propagation (5-10 minutes), install SSL:**

```bash
# Update deploy script with your domain
nano /var/www/telegram-bot/deploy-hostinger.sh
# Change DOMAIN="" to DOMAIN="pnptv.app"

# Or manually configure Nginx and SSL
sudo apt install -y certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/pnptv-bot
```

**Paste this Nginx configuration:**

```nginx
server {
    listen 80;
    server_name pnptv.app www.pnptv.app;

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

        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
    }

    location /webhook {
        proxy_pass http://localhost:3000/webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Enable site and install SSL:**

```bash
sudo ln -sf /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Install SSL certificate
sudo certbot --nginx -d pnptv.app -d www.pnptv.app
```

---

### Step 7: Set Telegram Webhook

```bash
# Set webhook to your domain
curl -F "url=https://pnptv.app/webhook" \
  https://api.telegram.org/bot8499797477:AAGd98d3HuIGI3xefqB7OM8dKZ2Tc5DKmqc/setWebhook

# Verify webhook is set
curl https://api.telegram.org/bot8499797477:AAGd98d3HuIGI3xefqB7OM8dKZ2Tc5DKmqc/getWebhookInfo
```

---

### Step 8: Configure Payment Webhooks

#### ePayco Dashboard
1. Go to https://dashboard.epayco.co/
2. Navigate to Settings → Webhooks
3. Set **Confirmation URL**: `https://pnptv.app/epayco/confirmation`
4. Set **Response URL**: `https://pnptv.app/epayco/response`
5. Save settings

#### Daimo Pay Dashboard
1. Go to https://pay.daimo.com/dashboard
2. Navigate to Webhooks settings
3. Set **Webhook URL**: `https://pnptv.app/daimo/webhook`
4. Save settings

---

## 📊 Monitoring Commands

```bash
# Check bot status
pm2 status

# View logs (real-time)
pm2 logs pnptv-bot

# View last 50 lines of logs
pm2 logs pnptv-bot --lines 50

# Restart bot
pm2 restart pnptv-bot

# Stop bot
pm2 stop pnptv-bot

# Check if app is responding
curl http://localhost:3000/health

# Check Nginx status
sudo systemctl status nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🔧 Troubleshooting

### Bot not starting?
```bash
pm2 logs pnptv-bot --lines 100
node /var/www/telegram-bot/src/bot/webhook.js
```

### Check port 3000
```bash
sudo lsof -i :3000
netstat -tlnp | grep 3000
```

### Restart everything
```bash
pm2 restart pnptv-bot
sudo systemctl restart nginx
```

### Check firewall
```bash
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
```

---

## ✅ Deployment Checklist

- [ ] Files uploaded to server
- [ ] Dependencies installed (`npm install --production`)
- [ ] `.env` file configured with production values
- [ ] PM2 bot running (`pm2 status`)
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Domain pointing to server IP
- [ ] Telegram webhook set
- [ ] ePayco webhooks configured
- [ ] Daimo webhooks configured
- [ ] Bot responding to commands in Telegram

---

## 🎉 Success!

Your PNPtv bot should now be live at:
- **Website**: https://pnptv.app
- **Bot**: https://t.me/PNPtvBot
- **Webhook**: https://pnptv.app/webhook

Test by sending `/start` to your bot on Telegram!
