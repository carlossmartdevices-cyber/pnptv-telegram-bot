# 🚀 Ubuntu VPS Deployment Guide - srv1071867.hstgr.cloud

Complete guide to deploy PNPtv Telegram Bot on Ubuntu VPS from your Ubuntu machine.

## 📋 Prerequisites

- Ubuntu VPS server: **srv1071867.hstgr.cloud**
- SSH access credentials
- Ubuntu local machine (your computer)
- Git repository URL

## 🔐 Step 1: Setup SSH Access from Ubuntu

### Generate SSH Key (if you don't have one)

```bash
# Check if you already have an SSH key
ls -la ~/.ssh/

# If no id_rsa.pub exists, generate a new key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Press Enter to accept default location (~/.ssh/id_rsa)
# Optionally set a passphrase or press Enter for no passphrase
```

### Copy SSH Key to VPS

```bash
# Method 1: Using ssh-copy-id (easiest)
ssh-copy-id root@srv1071867.hstgr.cloud

# Method 2: Manual copy
cat ~/.ssh/id_rsa.pub | ssh root@srv1071867.hstgr.cloud "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Method 3: If you get permission errors
cat ~/.ssh/id_rsa.pub
# Then manually paste the output into the VPS
```

### Test SSH Connection

```bash
# Connect to VPS
ssh root@srv1071867.hstgr.cloud

# If successful, you should be logged into the VPS
# Type 'exit' to return to your local machine
```

### Add to known_hosts (if asked)

When you connect for the first time, you'll see:
```
The authenticity of host 'srv1071867.hstgr.cloud' can't be established.
Are you sure you want to continue connecting (yes/no)?
```
Type: **yes**

## 🛠️ Step 2: Prepare VPS Environment

### Connect to VPS

```bash
ssh root@srv1071867.hstgr.cloud
```

### Update System

```bash
# Update package list
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential curl git
```

### Install Node.js 18.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version    # Should show v18.x.x
npm --version     # Should show 9.x.x or higher
```

### Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version

# Optional: Set up PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx

# Check if Nginx is running
curl http://localhost
```

## 📦 Step 3: Deploy Application

### Clone Repository

```bash
# Create web directory
sudo mkdir -p /var/www

# Navigate to directory
cd /var/www

# Clone your repository (replace with your actual repo URL)
sudo git clone https://github.com/your-username/pnptv-bot.git pnptv-bot

# If repository is private, you'll need to authenticate:
# Option 1: Use HTTPS with Personal Access Token
sudo git clone https://YOUR_GITHUB_TOKEN@github.com/your-username/pnptv-bot.git pnptv-bot

# Option 2: Use SSH (requires SSH key added to GitHub)
sudo git clone git@github.com:your-username/pnptv-bot.git pnptv-bot

# Change ownership to your user
sudo chown -R $USER:$USER /var/www/pnptv-bot

# Navigate to project
cd /var/www/pnptv-bot
```

### Install Dependencies

```bash
# Install production dependencies
npm install --production

# Or install all dependencies (including dev)
npm install
```

### Create Required Directories

```bash
# Create logs directory
mkdir -p logs

# Create backup directory
sudo mkdir -p /var/backups/pnptv-bot

# Set permissions
chmod 755 logs
sudo chmod 755 /var/backups/pnptv-bot
```

### Configure Environment Variables

```bash
# Create .env file
nano .env
```

**Copy this template and fill with your actual values:**

```env
# Bot Configuration
TELEGRAM_BOT_TOKEN=your_actual_bot_token_from_botfather
TELEGRAM_TOKEN=your_actual_bot_token_from_botfather
CHANNEL_ID=your_channel_id

# Admin Configuration (comma-separated for multiple admins)
ADMIN_IDS=your_telegram_user_id

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}

# ePayco Payment Gateway (Colombia)
EPAYCO_PUBLIC_KEY=your_epayco_public_key
EPAYCO_PRIVATE_KEY=your_epayco_private_key
EPAYCO_P_CUST_ID=your_customer_id
EPAYCO_P_KEY=your_p_key
EPAYCO_TEST_MODE=false
EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false

# Bot URLs (MUST be HTTPS for Telegram Mini Apps)
BOT_URL=https://srv1071867.hstgr.cloud
WEB_APP_URL=https://srv1071867.hstgr.cloud
WEBAPP_URL=https://srv1071867.hstgr.cloud
EPAYCO_RESPONSE_URL=https://srv1071867.hstgr.cloud/epayco/response
EPAYCO_CONFIRMATION_URL=https://srv1071867.hstgr.cloud/epayco/confirmation

# Server Configuration
PORT=3000
WEB_PORT=3000
NODE_ENV=production

# Error Tracking & Monitoring
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENABLE_IN_DEV=false

# Daimo Pay (Optional - Stablecoin Payments)
DAIMO_API_KEY=your_daimo_api_key
DAIMO_APP_ID=your_daimo_app_id
DAIMO_WEBHOOK_URL=https://srv1071867.hstgr.cloud/daimo/webhook
DAIMO_RETURN_URL=https://srv1071867.hstgr.cloud/payment/success
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

### Secure the .env file

```bash
# Restrict access to .env file
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (only owner can read/write)
```

## 🔄 Step 4: Start Application with PM2

### Copy ecosystem.config.js to VPS

If you haven't cloned it yet, create the ecosystem.config.js:

```bash
# The file should already exist in your repo
# If not, copy it from your local machine:
# From local machine:
scp ecosystem.config.js root@srv1071867.hstgr.cloud:/var/www/pnptv-bot/
```

### Start Application

```bash
# Make sure you're in the project directory
cd /var/www/pnptv-bot

# Start the application
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs pnptv-bot
```

### Setup Auto-Start on Boot

```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup systemd

# This will output a command like:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

# Copy and run that command
# Example (your command will be different):
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

# Save again to ensure it persists
pm2 save
```

### PM2 Useful Commands

```bash
# View logs in real-time
pm2 logs pnptv-bot

# View last 100 lines
pm2 logs pnptv-bot --lines 100

# Monitor resources
pm2 monit

# Restart application
pm2 restart pnptv-bot

# Stop application
pm2 stop pnptv-bot

# Delete from PM2
pm2 delete pnptv-bot

# List all processes
pm2 list

# Show detailed info
pm2 show pnptv-bot
```

## 🌐 Step 5: Configure Nginx

### Copy Nginx Configuration

```bash
# Copy the nginx config file to sites-available
sudo cp /var/www/pnptv-bot/nginx-vps.conf /etc/nginx/sites-available/pnptv-bot

# Or create it manually
sudo nano /etc/nginx/sites-available/pnptv-bot
```

If creating manually, use the content from `nginx-vps.conf` file.

### Configure Rate Limiting

```bash
# Edit main Nginx configuration
sudo nano /etc/nginx/nginx.conf
```

Add these lines inside the `http` block (before the `include` lines):

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=20r/s;

# Connection limiting
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 10;
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

### Enable Site Configuration

```bash
# Create symbolic link to sites-enabled
sudo ln -s /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

## 🔒 Step 6: Setup SSL with Let's Encrypt (REQUIRED)

**IMPORTANT:** Telegram Mini Apps require HTTPS. This step is mandatory!

### Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### Obtain SSL Certificate

```bash
# Get certificate (Certbot will auto-configure Nginx)
sudo certbot --nginx -d srv1071867.hstgr.cloud

# Follow the prompts:
# 1. Enter your email address
# 2. Agree to Terms of Service (Y)
# 3. Share email with EFF (optional - Y or N)
# 4. Redirect HTTP to HTTPS? Choose: 2 (Redirect)
```

### Verify SSL

```bash
# Check certificate
sudo certbot certificates

# Test renewal (dry run)
sudo certbot renew --dry-run

# Check auto-renewal timer
sudo systemctl status certbot.timer
```

### Manual Certificate Renewal (if needed)

```bash
# Renew certificates
sudo certbot renew

# Reload Nginx after renewal
sudo systemctl reload nginx
```

## 🔥 Step 7: Configure Firewall (UFW)

```bash
# Check if UFW is installed
sudo ufw --version

# If not installed
sudo apt install -y ufw

# IMPORTANT: Allow SSH first (otherwise you'll lock yourself out!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose

# You should see:
# To                         Action      From
# --                         ------      ----
# 22/tcp                     ALLOW       Anywhere
# 80/tcp                     ALLOW       Anywhere
# 443/tcp                    ALLOW       Anywhere
```

## ✅ Step 8: Verification

### Check All Services

```bash
# 1. Check PM2 status
pm2 status

# 2. Check if Node.js is listening on port 3000
sudo netstat -tulpn | grep 3000
# or
sudo ss -tlnp | grep 3000

# 3. Check Nginx status
sudo systemctl status nginx

# 4. Test HTTP endpoint
curl http://localhost:3000

# 5. Test Nginx proxy
curl http://localhost

# 6. Test HTTPS (from local machine)
curl https://srv1071867.hstgr.cloud
```

### Check Logs

```bash
# PM2 logs
pm2 logs pnptv-bot

# Application logs
tail -f /var/www/pnptv-bot/logs/combined.log
tail -f /var/www/pnptv-bot/logs/error.log

# Nginx access logs
sudo tail -f /var/log/nginx/pnptv-bot-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/pnptv-bot-error.log

# System logs
sudo journalctl -u nginx -f
```

### Test Telegram Bot

1. Open Telegram and find your bot
2. Send: `/start`
3. Bot should respond with onboarding
4. Click "PNPtv App" button
5. Mini App should load over HTTPS

## 🔄 Step 9: Update/Redeploy Application

### Make deploy script executable

```bash
cd /var/www/pnptv-bot
chmod +x deploy-vps.sh
```

### Manual Update

```bash
# Navigate to project
cd /var/www/pnptv-bot

# Pull latest changes
git pull origin main

# Install new dependencies
npm install --production

# Restart application
pm2 restart pnptv-bot

# Check logs
pm2 logs pnptv-bot
```

### Using Deployment Script

```bash
cd /var/www/pnptv-bot

# First time setup
./deploy-vps.sh --setup

# Quick update (default)
./deploy-vps.sh

# Full deployment
./deploy-vps.sh --full

# Check status
./deploy-vps.sh --status

# View logs
./deploy-vps.sh --logs

# Rollback to previous version
./deploy-vps.sh --rollback
```

## 📊 Step 10: Monitoring & Maintenance

### System Monitoring

```bash
# Check disk space
df -h

# Check memory usage
free -m

# Check CPU usage
top
# Press 'q' to quit

# Check system load
uptime

# Check running processes
ps aux | grep node
```

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process info
pm2 info pnptv-bot

# Show environment variables
pm2 env 0
```

### Log Rotation

```bash
# PM2 log rotation is already configured
# Check log rotation status
pm2 conf pm2-logrotate

# Manually clear logs
pm2 flush
```

## 🐛 Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs pnptv-bot --lines 100

# Check if port 3000 is in use
sudo lsof -i :3000

# Kill process on port 3000
sudo kill -9 $(sudo lsof -t -i:3000)

# Restart application
pm2 restart pnptv-bot
```

### Nginx Not Working

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo cat /etc/nginx/sites-available/pnptv-bot | grep ssl
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/pnptv-bot

# Fix .env permissions
chmod 600 /var/www/pnptv-bot/.env

# Fix log directory permissions
chmod 755 /var/www/pnptv-bot/logs
```

### Git Issues

```bash
# Reset local changes
cd /var/www/pnptv-bot
git reset --hard HEAD

# Update from remote
git fetch origin
git pull origin main

# Check git status
git status
```

## 🔐 Security Best Practices

### 1. Secure SSH Access

```bash
# On VPS: Edit SSH config
sudo nano /etc/ssh/sshd_config

# Change these settings:
PermitRootLogin no  # Disable root login
PasswordAuthentication no  # Only allow SSH keys
Port 2222  # Change SSH port (optional)

# Restart SSH
sudo systemctl restart sshd
```

### 2. Install Fail2Ban

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Copy default config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local

# Enable Nginx protection
# Find [nginx-http-auth] and set: enabled = true

# Restart Fail2Ban
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status
```

### 3. Regular Updates

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /var/www/pnptv-bot
npm update

# Update PM2
sudo npm update -g pm2
```

## 📝 Quick Command Reference

```bash
# SSH to VPS
ssh root@srv1071867.hstgr.cloud

# Go to project
cd /var/www/pnptv-bot

# View logs
pm2 logs pnptv-bot

# Restart app
pm2 restart pnptv-bot

# Update app
git pull && npm install --production && pm2 restart pnptv-bot

# Reload Nginx
sudo systemctl reload nginx

# View Nginx logs
sudo tail -f /var/log/nginx/pnptv-bot-error.log

# Check status
pm2 status && sudo systemctl status nginx
```

## ✅ Final Checklist

- [ ] SSH key configured and working
- [ ] Node.js 18+ installed
- [ ] PM2 installed and configured
- [ ] Nginx installed and running
- [ ] Repository cloned to /var/www/pnptv-bot
- [ ] Dependencies installed
- [ ] .env file configured with production values
- [ ] Application started with PM2
- [ ] PM2 auto-start configured
- [ ] Nginx configured and enabled
- [ ] SSL certificate obtained and working
- [ ] Firewall configured (UFW)
- [ ] All services running
- [ ] Bot responds in Telegram
- [ ] Mini App opens over HTTPS
- [ ] Webhooks working
- [ ] Logs being written

## 🎯 Your URLs

After successful deployment:

- **Bot URL:** https://srv1071867.hstgr.cloud
- **Mini App:** https://srv1071867.hstgr.cloud (opened via Telegram)
- **Health Check:** https://srv1071867.hstgr.cloud/health

## 📞 Need Help?

If you encounter issues:

1. Check PM2 logs: `pm2 logs pnptv-bot`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check application logs: `tail -f /var/www/pnptv-bot/logs/error.log`
4. Verify all services running: `pm2 status && sudo systemctl status nginx`
5. Test connectivity: `curl http://localhost:3000`

---

**¡Listo para producción! 🚀**

Your bot is now deployed on: **https://srv1071867.hstgr.cloud**
