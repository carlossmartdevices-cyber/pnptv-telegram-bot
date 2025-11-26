# PNPtv Telegram Bot - Hostinger VPS Deployment Guide

Complete guide for deploying your Telegram bot to Hostinger VPS with Firebase (not MongoDB), ePayco, and Daimo Pay integration.

## Server Information

- **IP Address**: 72.60.29.80
- **Hostname**: srv1071867.hstgr.cloud
- **Plan**: KVM 2 (2 CPUs, 8GB RAM, 100GB disk)
- **OS**: Ubuntu 25.04
- **Status**: Running

---

## Prerequisites

1. SSH access to your VPS (root password from Hostinger panel)
2. Domain name (optional but recommended for HTTPS)
3. All your credentials ready:
   - Telegram Bot Token
   - Firebase credentials
   - ePayco API keys
   - Daimo Pay API keys

---

## Option 1: Automated Deployment (Recommended)

### Step 1: Upload Files to VPS

First, copy the deployment files to your VPS:

```bash
# From your local machine
scp deploy-hostinger.sh ecosystem.config.js nginx-config.conf root@72.60.29.80:/root/
```

### Step 2: Run Deployment Script

SSH into your VPS and run the script:

```bash
ssh root@72.60.29.80

# Make script executable
chmod +x /root/deploy-hostinger.sh

# Run deployment script
./deploy-hostinger.sh
```

The script will:
- Install Node.js 20.x
- Install PM2, Nginx, Certbot
- Configure firewall
- Set up application directory
- Create .env template
- Start the bot with PM2
- Configure Nginx (optional SSL)

### Step 3: Configure Environment Variables

Edit the .env file created by the script:

```bash
nano /var/www/telegram-bot/.env
```

**IMPORTANT**: Update all `YOUR_*_HERE` placeholders with your actual credentials!

Key variables to update:
```bash
# Telegram
TELEGRAM_BOT_TOKEN=<YOUR_BOT_TOKEN>
CHANNEL_ID=-1002997324714
ADMIN_IDS=8365312597

# Firebase (NOT MongoDB!)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ePayco
EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c
EPAYCO_PRIVATE_KEY=80174d93a6f8d760f5cca2b2cc6ee48b
EPAYCO_P_KEY=e76ae8e9551df6e3b353434c4de34ef2dafa41bf
EPAYCO_TEST=false  # Set to false for production!

# URLs (replace with your domain or IP)
BOT_URL=https://yourdomain.com
# or for IP: BOT_URL=http://72.60.29.80
```

### Step 4: Restart Application

After updating .env:

```bash
cd /var/www/telegram-bot
pm2 restart pnptv-bot
pm2 logs  # Check logs
```

---

## Option 2: Manual Step-by-Step Deployment

### 1. SSH Into Your VPS

```bash
ssh root@72.60.29.80
```

### 2. Update System

```bash
apt update && apt upgrade -y
```

### 3. Install Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # Verify: should show v20.x
npm -v   # Verify npm installation
```

### 4. Install Global Dependencies

```bash
npm install -g pm2
apt install -y git nginx certbot python3-certbot-nginx ufw
```

### 5. Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443
ufw allow 3000
ufw enable
ufw status  # Verify rules
```

### 6. Set Up Application

#### Option A: Clone from Git

```bash
mkdir -p /var/www/telegram-bot
cd /var/www/telegram-bot
git clone https://github.com/yourusername/your-repo.git .
```

#### Option B: Upload Files via SCP

From your local machine:

```bash
# Compress your project (exclude node_modules)
tar -czf bot.tar.gz --exclude=node_modules --exclude=.git .

# Upload to server
scp bot.tar.gz root@72.60.29.80:/var/www/

# On server: extract
ssh root@72.60.29.80
cd /var/www/telegram-bot
tar -xzf /var/www/bot.tar.gz
```

### 7. Install Dependencies

```bash
cd /var/www/telegram-bot
npm install --production
```

### 8. Create .env File

```bash
nano .env
```

Copy your entire .env file content here, then update URLs:

```bash
# Update these URLs to use your domain or IP
BOT_URL=https://yourdomain.com
WEBAPP_URL=https://yourdomain.com
WEB_APP_URL=https://yourdomain.com
EPAYCO_RESPONSE_URL=https://yourdomain.com/epayco/response
EPAYCO_CONFIRMATION_URL=https://yourdomain.com/epayco/confirmation
DAIMO_WEBHOOK_URL=https://yourdomain.com/daimo/webhook

# For production, set:
EPAYCO_TEST=false
EPAYCO_TEST_MODE=false
NODE_ENV=production
```

### 9. Create Logs Directory

```bash
mkdir -p /var/www/telegram-bot/logs
```

### 10. Start with PM2

```bash
# Copy ecosystem.config.js to the server (if not already there)
cd /var/www/telegram-bot

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Enable PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
```

### 11. Verify Application is Running

```bash
pm2 status
pm2 logs pnptv-bot
curl http://localhost:3000/health  # Should return health status
```

---

## Option 3: With Domain and SSL (Production)

### 1. Point Domain to VPS

In your domain registrar (GoDaddy, Namecheap, etc.), create an A record:

```
Type: A
Name: @ (or subdomain like 'bot')
Value: 72.60.29.80
TTL: 3600
```

Wait 5-10 minutes for DNS propagation.

### 2. Configure Nginx

```bash
# Copy nginx configuration
cp /root/nginx-config.conf /etc/nginx/sites-available/pnptv-bot

# Edit to set your domain
nano /etc/nginx/sites-available/pnptv-bot

# Replace 'yourdomain.com' with your actual domain
# Example: bot.pnptv.com

# Enable site
ln -sf /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 3. Install SSL Certificate

```bash
# Replace with your domain and email
certbot --nginx -d yourdomain.com -d www.yourdomain.com --email your@email.com --agree-tos --no-eff-email

# Verify auto-renewal
certbot renew --dry-run
```

SSL certificates auto-renew every 90 days.

### 4. Update .env with HTTPS URLs

```bash
nano /var/www/telegram-bot/.env

# Update all URLs to use HTTPS and your domain:
BOT_URL=https://yourdomain.com
WEBAPP_URL=https://yourdomain.com
EPAYCO_RESPONSE_URL=https://yourdomain.com/epayco/response
EPAYCO_CONFIRMATION_URL=https://yourdomain.com/epayco/confirmation
DAIMO_WEBHOOK_URL=https://yourdomain.com/daimo/webhook

# Restart bot
pm2 restart pnptv-bot
```

---

## Option 4: Without Domain (IP Only - Testing)

If you don't have a domain yet, you can use the IP address:

### 1. Simple Nginx Configuration

```bash
cat > /etc/nginx/sites-available/pnptv-bot << 'EOF'
server {
    listen 80;
    server_name 72.60.29.80;

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
    }
}
EOF

ln -sf /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 2. Update .env for IP Access

```bash
BOT_URL=http://72.60.29.80
WEBAPP_URL=http://72.60.29.80
# ... update all URLs to use http://72.60.29.80
```

**Note**: HTTP (not HTTPS) may have limitations with Telegram Mini Apps!

---

## Post-Deployment Configuration

### 1. Update Telegram Webhook

```bash
# Set webhook to your domain/IP
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://yourdomain.com/webhook"

# Verify webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### 2. Configure ePayco Webhooks

1. Go to [ePayco Dashboard](https://dashboard.epayco.co/)
2. Navigate to: Settings → API → Webhooks
3. Set confirmation URL: `https://yourdomain.com/epayco/confirmation`
4. Set response URL: `https://yourdomain.com/epayco/response`
5. Enable webhooks and save

### 3. Configure Daimo Pay Webhooks

1. Go to [Daimo Pay Dashboard](https://pay.daimo.com/dashboard)
2. Navigate to Webhooks settings
3. Set webhook URL: `https://yourdomain.com/daimo/webhook`
4. Copy the webhook token to your .env file
5. Save changes

### 4. Test Payment Flow

#### Test ePayco:
```bash
# On server
cd /var/www/telegram-bot
node test-payment-webhooks.js
```

#### Test Daimo:
```bash
node test-daimo.js
```

---

## Useful PM2 Commands

```bash
# Status
pm2 status

# Logs (real-time)
pm2 logs pnptv-bot
pm2 logs pnptv-bot --lines 100

# Restart
pm2 restart pnptv-bot

# Stop
pm2 stop pnptv-bot

# Start
pm2 start pnptv-bot

# Reload (zero-downtime)
pm2 reload pnptv-bot

# Delete from PM2
pm2 delete pnptv-bot

# Monitor
pm2 monit

# Save current process list
pm2 save

# Startup script
pm2 startup
```

---

## Monitoring & Maintenance

### Check Application Health

```bash
# Via curl
curl https://yourdomain.com/health

# Check logs
tail -f /var/www/telegram-bot/logs/pm2-out.log
tail -f /var/www/telegram-bot/logs/pm2-error.log

# Nginx logs
tail -f /var/log/nginx/pnptv-bot-access.log
tail -f /var/log/nginx/pnptv-bot-error.log
```

### System Resources

```bash
# CPU/Memory usage
htop

# Disk usage
df -h

# PM2 resource usage
pm2 monit
```

### Daily Restart (Optional)

Add cron job to restart bot daily at 3 AM:

```bash
crontab -e

# Add this line:
0 3 * * * /usr/local/bin/pm2 restart pnptv-bot
```

---

## Updating Your Bot

### Method 1: Git Pull

```bash
cd /var/www/telegram-bot
git pull
npm install --production
pm2 restart pnptv-bot
```

### Method 2: Manual Upload

```bash
# On local machine
tar -czf bot-update.tar.gz --exclude=node_modules --exclude=.git .
scp bot-update.tar.gz root@72.60.29.80:/var/www/

# On server
cd /var/www/telegram-bot
tar -xzf /var/www/bot-update.tar.gz
npm install --production
pm2 restart pnptv-bot
```

### Method 3: PM2 Deploy (Advanced)

From your local machine:

```bash
# First time setup
pm2 deploy ecosystem.config.js production setup

# Updates
pm2 deploy ecosystem.config.js production update
```

---

## Troubleshooting

### Bot Not Responding

```bash
# Check if app is running
pm2 status

# Check logs
pm2 logs pnptv-bot --lines 50

# Restart
pm2 restart pnptv-bot

# Check if port 3000 is listening
netstat -tlnp | grep 3000
```

### Nginx Issues

```bash
# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Check status
systemctl status nginx

# Check error logs
tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues

```bash
# Renew manually
certbot renew

# Check certificate status
certbot certificates

# Test auto-renewal
certbot renew --dry-run
```

### Webhook Not Working

```bash
# Check webhook info
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Test endpoint
curl https://yourdomain.com/health

# Check firewall
ufw status

# Check if Nginx is proxying
curl -I http://localhost:3000/health
```

### Out of Memory

```bash
# Check memory
free -h

# Restart application
pm2 restart pnptv-bot

# Increase PM2 memory limit in ecosystem.config.js:
# max_memory_restart: '1G'
```

### Firebase Connection Issues

```bash
# Verify Firebase credentials in .env
nano /var/www/telegram-bot/.env

# Check if FIREBASE_PRIVATE_KEY has proper newlines (\n)
# Check logs for Firebase errors
pm2 logs pnptv-bot | grep -i firebase
```

---

## Security Best Practices

1. **Never commit .env to Git**
   ```bash
   # Ensure .gitignore includes:
   .env
   .env.*
   ```

2. **Keep system updated**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Use strong root password**
   ```bash
   passwd  # Change root password
   ```

4. **Set up SSH key authentication** (disable password login)
   ```bash
   # On local machine, generate key:
   ssh-keygen -t ed25519

   # Copy to server:
   ssh-copy-id root@72.60.29.80

   # Disable password authentication:
   nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   systemctl restart sshd
   ```

5. **Enable automatic security updates**
   ```bash
   apt install unattended-upgrades
   dpkg-reconfigure -plow unattended-upgrades
   ```

6. **Monitor logs regularly**
   ```bash
   pm2 logs
   tail -f /var/log/nginx/pnptv-bot-error.log
   ```

---

## Backup Strategy

### Backup .env File

```bash
# Create secure backup
cp /var/www/telegram-bot/.env /root/.env.backup
chmod 600 /root/.env.backup
```

### Backup Entire Application

```bash
# Create backup
tar -czf /root/backup-$(date +%Y%m%d).tar.gz /var/www/telegram-bot --exclude=node_modules

# Download to local machine
scp root@72.60.29.80:/root/backup-*.tar.gz ./
```

---

## Quick Reference

### Important Files & Locations

- **Application**: `/var/www/telegram-bot/`
- **Environment**: `/var/www/telegram-bot/.env`
- **PM2 Config**: `/var/www/telegram-bot/ecosystem.config.js`
- **Nginx Config**: `/etc/nginx/sites-available/pnptv-bot`
- **Logs**: `/var/www/telegram-bot/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **SSL Certs**: `/etc/letsencrypt/live/yourdomain.com/`

### Important URLs

- **Health Check**: `https://yourdomain.com/health`
- **ePayco Response**: `https://yourdomain.com/epayco/response`
- **ePayco Confirmation**: `https://yourdomain.com/epayco/confirmation`
- **Daimo Webhook**: `https://yourdomain.com/daimo/webhook`

### Environment

- **Database**: Firebase (NOT MongoDB)
- **Payment Gateways**: ePayco (Colombia), Daimo Pay (USDC)
- **Runtime**: Node.js 20.x
- **Process Manager**: PM2
- **Web Server**: Nginx
- **SSL**: Let's Encrypt (Certbot)

---

## Support

### Hostinger VPS API

Your VPS can be managed via API:

```bash
curl -X GET "https://developers.hostinger.com/api/vps/v1/virtual-machines" \
  -H "Authorization: Bearer gQJbTDbuR9U8VveSJA9nWDZNpxoT9U4LAQSCZnld67d1e569" \
  -H "Content-Type: application/json"
```

### Useful Links

- Hostinger VPS Panel: https://hpanel.hostinger.com/
- Telegram Bot API: https://core.telegram.org/bots/api
- ePayco Dashboard: https://dashboard.epayco.co/
- Daimo Pay Dashboard: https://pay.daimo.com/dashboard
- PM2 Documentation: https://pm2.keymetrics.io/docs/
- Nginx Documentation: https://nginx.org/en/docs/

---

## Need Help?

If you encounter issues:

1. Check logs: `pm2 logs pnptv-bot`
2. Verify .env configuration
3. Test endpoints with curl
4. Check firewall rules: `ufw status`
5. Review Nginx config: `nginx -t`

**Remember**:
- You're using Firebase (not MongoDB)
- ePayco webhooks need HTTPS
- Telegram Mini Apps require HTTPS
- Keep credentials secure and never commit to Git!

---

**Last Updated**: 2025-10-19
**Server IP**: 72.60.29.80
**Server Hostname**: srv1071867.hstgr.cloud
