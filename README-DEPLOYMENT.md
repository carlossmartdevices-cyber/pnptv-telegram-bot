# 🚀 PNPtv Bot Deployment

## Quick Links

- **Production Bot**: https://t.me/PNPtvBot
- **Production URL**: https://pnptv.app
- **Server**: srv1071867.hstgr.cloud (Hostinger VPS)
- **Documentation**: [Full Deployment Guide](./DEPLOYMENT-HOSTINGER.md)

## 📦 Deployment Options

### Option 1: Quick Deploy (Recommended)

**Using Git Bash (Windows):**
```bash
./deploy-quick.sh
```

**Using Command Prompt (Windows):**
```cmd
deploy-to-hostinger.bat
```

This will automatically:
- Build your project
- Upload files to the server
- Install dependencies
- Restart the bot with PM2
- Show status

### Option 2: Manual Deployment

Follow the complete guide: [DEPLOYMENT-HOSTINGER.md](./DEPLOYMENT-HOSTINGER.md)

### Option 3: First-Time Setup

If this is your first deployment to the server:

```bash
# SSH into your server
ssh root@srv1071867.hstgr.cloud

# Run the automated setup script
bash deploy-hostinger.sh
```

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] `.env.production` file is configured with correct values
- [ ] Domain `pnptv.app` points to server IP `72.60.29.80`
- [ ] You have SSH access to `srv1071867.hstgr.cloud`
- [ ] All API keys are production-ready (not test keys)
- [ ] Firebase credentials are correct
- [ ] ePayco is in production mode (`EPAYCO_TEST=false`)

## 🔧 Common Commands

### Local Development
```bash
npm start          # Start bot locally (polling mode)
npm test           # Run tests
```

### Deploy to Production
```bash
./deploy-quick.sh  # Quick deploy (Git Bash)
```

### Server Management
```bash
# SSH into server
ssh root@srv1071867.hstgr.cloud

# Check bot status
pm2 status

# View logs
pm2 logs pnptv-bot

# Restart bot
pm2 restart pnptv-bot

# Stop bot
pm2 stop pnptv-bot

# Check Nginx status
sudo systemctl status nginx

# View application logs
tail -f /var/www/telegram-bot/logs/pm2-out.log
```

## 🌐 URLs Configuration

Your production URLs:

```
BOT_URL=https://pnptv.app
WEBHOOK_URL=https://pnptv.app/webhook
PAYMENT_PAGE_URL=https://pnptv.app/pay
WEBAPP_URL=https://pnptv.app

# ePayco Webhooks
EPAYCO_RESPONSE_URL=https://pnptv.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv.app/epayco/confirmation

# Daimo Webhooks
DAIMO_WEBHOOK_URL=https://pnptv.app/daimo/webhook
DAIMO_RETURN_URL=https://pnptv.app/payment/success
```

## 📱 After Deployment

### 1. Set Telegram Webhook

```bash
curl -F "url=https://pnptv.app/webhook" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### 2. Verify Webhook
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

### 3. Configure Payment Gateway Webhooks

**ePayco Dashboard:**
- Go to: https://dashboard.epayco.co/
- Set Confirmation URL: `https://pnptv.app/epayco/confirmation`
- Set Response URL: `https://pnptv.app/epayco/response`

**Daimo Dashboard:**
- Go to: https://pay.daimo.com/dashboard
- Set Webhook URL: `https://pnptv.app/daimo/webhook`

### 4. Test the Bot

Send these commands to your bot:
```
/start
/admin (if you're an admin)
```

Test subscription flows and payment methods.

## 🐛 Troubleshooting

### Bot Not Responding

```bash
# Check if bot is running
ssh root@srv1071867.hstgr.cloud "pm2 status"

# Check logs
ssh root@srv1071867.hstgr.cloud "pm2 logs pnptv-bot --lines 50"

# Restart bot
ssh root@srv1071867.hstgr.cloud "pm2 restart pnptv-bot"
```

### Webhook Issues

```bash
# Check webhook status
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo

# Delete and reset webhook
curl -F "url=" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook
curl -F "url=https://pnptv.app/webhook" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### SSL Certificate Issues

```bash
# Renew certificate
ssh root@srv1071867.hstgr.cloud "sudo certbot renew"
```

### View Complete Logs

```bash
# Application logs
ssh root@srv1071867.hstgr.cloud "tail -f /var/www/telegram-bot/logs/pm2-out.log"

# Error logs
ssh root@srv1071867.hstgr.cloud "tail -f /var/www/telegram-bot/logs/pm2-error.log"

# Nginx access logs
ssh root@srv1071867.hstgr.cloud "sudo tail -f /var/log/nginx/access.log"

# Nginx error logs
ssh root@srv1071867.hstgr.cloud "sudo tail -f /var/log/nginx/error.log"
```

## 📊 Monitoring

### Check Bot Health

```bash
# PM2 monitoring dashboard
ssh root@srv1071867.hstgr.cloud "pm2 monit"

# Bot detailed info
ssh root@srv1071867.hstgr.cloud "pm2 info pnptv-bot"

# System resources
ssh root@srv1071867.hstgr.cloud "htop"
```

## 🔐 Security Notes

- Never commit `.env` or `.env.production` files to Git
- Use SSH keys instead of passwords
- Keep server updated: `sudo apt update && sudo apt upgrade`
- SSL certificates auto-renew via Let's Encrypt
- Firewall is configured to allow only necessary ports

## 📚 Documentation

- [Complete Deployment Guide](./DEPLOYMENT-HOSTINGER.md)
- [Ecosystem Config](./ecosystem.config.js)
- [Deployment Script](./deploy-hostinger.sh)

## 🎉 Success!

Once deployed, your bot will be live at:
- **Bot**: https://t.me/PNPtvBot
- **Website**: https://pnptv.app

Enjoy! 🚀
