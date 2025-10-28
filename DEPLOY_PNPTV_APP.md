# 🚀 Deploy PNPtv Bot to pnptv.app

Complete deployment guide for deploying PNPtv Telegram Bot to your VPS at **pnptv.app**.

## 📋 Prerequisites

- ✅ VPS server: **srv1071867.hstgr.cloud**
- ✅ Domain: **pnptv.app** (DNS configured)
- ✅ SSH access to VPS
- ✅ Git repository (local or GitHub)

## 🎯 Quick Deployment (Automated)

The fastest way to deploy is using the automated deployment script.

### Option 1: Deploy from Local Machine

```bash
# 1. SSH into your VPS
ssh root@srv1071867.hstgr.cloud

# 2. Navigate to web directory (or create it)
mkdir -p /var/www
cd /var/www

# 3. Clone your repository
git clone <your-repository-url> pnptv-bot
# Or if you're pushing from local:
# git clone https://github.com/yourusername/pnptv-bot.git pnptv-bot

# 4. Navigate to project
cd pnptv-bot

# 5. Run deployment script
sudo bash deploy-pnptv.app.sh
```

### Option 2: Push from Current Machine to VPS

```bash
# 1. Make sure you have committed all changes
git status
git add .
git commit -m "Prepare for production deployment"

# 2. Push to your git repository
git push origin main

# 3. SSH into VPS and pull changes
ssh root@srv1071867.hstgr.cloud "cd /var/www/pnptv-bot && git pull origin main && sudo bash deploy-pnptv.app.sh"
```

The automated script will:
- ✅ Update system packages
- ✅ Install Node.js 18+ (if needed)
- ✅ Install PM2 process manager
- ✅ Install Nginx web server
- ✅ Install Certbot for SSL
- ✅ Clone/update application code
- ✅ Install dependencies
- ✅ Setup production environment
- ✅ Configure Nginx reverse proxy
- ✅ Setup SSL certificate (HTTPS)
- ✅ Start application with PM2
- ✅ Configure firewall
- ✅ Verify deployment

## 📝 Manual Deployment (Step by Step)

If you prefer to deploy manually or the automated script fails, follow these steps.

### Step 1: Connect to VPS

```bash
ssh root@srv1071867.hstgr.cloud
```

### Step 2: Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Install Git
sudo apt install -y git
```

### Step 3: Clone Repository

```bash
# Create web directory
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone <your-repository-url> pnptv-bot

# Change ownership
sudo chown -R $USER:$USER /var/www/pnptv-bot

# Navigate to project
cd pnptv-bot
```

### Step 4: Install Dependencies

```bash
cd /var/www/pnptv-bot
npm install --production
```

### Step 5: Setup Environment Variables

```bash
# Copy production environment file
cp .env.production .env

# Set proper permissions
chmod 600 .env

# Verify environment variables (optional)
cat .env | grep TELEGRAM_BOT_TOKEN
cat .env | grep BOT_URL
```

**IMPORTANT**: The `.env.production` file has been created with all URLs pointing to `pnptv.app`. Verify that:
- `BOT_URL=https://pnptv.app`
- `WEBHOOK_URL=https://pnptv.app`
- `PAYMENT_PAGE_URL=https://pnptv.app/pay`
- `EPAYCO_TEST_MODE=false` (production mode)

### Step 6: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp nginx-pnptv.app.conf /etc/nginx/sites-available/pnptv-bot

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/

# Add rate limiting to nginx.conf
sudo nano /etc/nginx/nginx.conf
```

Add these lines inside the `http {` block:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=20r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
```

Save and exit (Ctrl+X, Y, Enter).

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: Setup SSL Certificate

```bash
# Obtain SSL certificate for pnptv.app
sudo certbot --nginx -d pnptv.app -d www.pnptv.app

# Follow prompts:
# - Enter your email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (Yes)
```

Certbot will automatically:
- Obtain SSL certificate from Let's Encrypt
- Modify Nginx configuration to use HTTPS
- Setup auto-renewal

### Step 8: Start Application with PM2

```bash
cd /var/www/pnptv-bot

# Start with PM2 using ecosystem config
pm2 start ecosystem.config.js

# Or start directly
pm2 start start-bot.js --name pnptv-bot

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command it outputs
```

### Step 9: Configure Firewall

```bash
# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 10: Verify Deployment

```bash
# Check PM2 status
pm2 status
pm2 logs pnptv-bot

# Check Nginx status
sudo systemctl status nginx

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Test application
curl http://localhost:3000/health
curl https://pnptv.app/health

# View logs
pm2 logs pnptv-bot
tail -f /var/log/nginx/pnptv-error.log
```

## ✅ Post-Deployment Checklist

After deployment, verify everything is working:

### 1. Application Status
```bash
pm2 status                          # Should show pnptv-bot running
pm2 logs pnptv-bot --lines 50      # Check for errors
```

### 2. Web Access
- [ ] Visit https://pnptv.app (should load without errors)
- [ ] Visit https://pnptv.app/health (should return OK)
- [ ] Verify SSL certificate (green padlock in browser)

### 3. Telegram Bot
- [ ] Open Telegram: https://t.me/PNPtvBot
- [ ] Send `/start` command
- [ ] Bot should respond
- [ ] Test subscription flow

### 4. Payment Integration
- [ ] Visit payment page: https://pnptv.app/pay
- [ ] Test Daimo payment flow
- [ ] Test ePayco payment flow
- [ ] Verify webhooks are working

### 5. Logs and Monitoring
```bash
# Application logs
pm2 logs pnptv-bot

# Nginx access logs
tail -f /var/log/nginx/pnptv-access.log

# Nginx error logs
tail -f /var/log/nginx/pnptv-error.log

# Application logs (if Winston is configured)
tail -f /var/www/pnptv-bot/logs/combined.log
tail -f /var/www/pnptv-bot/logs/error.log
```

## 🔄 Updating the Application

To update your application after making changes:

### Quick Update

```bash
ssh root@srv1071867.hstgr.cloud
cd /var/www/pnptv-bot
git pull origin main
npm install --production
pm2 restart pnptv-bot
pm2 logs pnptv-bot
```

### Using Script

Create an update script:

```bash
nano /var/www/pnptv-bot/update.sh
```

Add:

```bash
#!/bin/bash
cd /var/www/pnptv-bot
echo "Pulling latest changes..."
git pull origin main
echo "Installing dependencies..."
npm install --production
echo "Restarting application..."
pm2 restart pnptv-bot
echo "Viewing logs..."
pm2 logs pnptv-bot --lines 20
```

Make executable:

```bash
chmod +x /var/www/pnptv-bot/update.sh
```

Use it:

```bash
/var/www/pnptv-bot/update.sh
```

## 🛠 Useful Commands

### PM2 Commands

```bash
pm2 list                    # List all processes
pm2 logs pnptv-bot         # View logs
pm2 logs pnptv-bot --lines 100  # View last 100 lines
pm2 restart pnptv-bot      # Restart application
pm2 stop pnptv-bot         # Stop application
pm2 start pnptv-bot        # Start application
pm2 delete pnptv-bot       # Delete from PM2
pm2 monit                  # Monitor resources
pm2 save                   # Save current configuration
```

### Nginx Commands

```bash
sudo nginx -t                      # Test configuration
sudo systemctl status nginx        # Check status
sudo systemctl restart nginx       # Restart Nginx
sudo systemctl reload nginx        # Reload configuration
sudo tail -f /var/log/nginx/pnptv-error.log  # View errors
```

### SSL Certificate Commands

```bash
sudo certbot certificates          # List certificates
sudo certbot renew                 # Renew certificates
sudo certbot renew --dry-run      # Test renewal
```

### System Monitoring

```bash
htop                    # CPU and memory usage
df -h                   # Disk usage
free -m                 # Memory usage
pm2 monit              # PM2 monitoring
```

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs pnptv-bot --lines 100

# Check if port is in use
sudo netstat -tulpn | grep 3000

# Kill process on port 3000
sudo kill -9 $(sudo lsof -t -i:3000)

# Restart
pm2 restart pnptv-bot
```

### Nginx 502 Bad Gateway

```bash
# Check if application is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/pnptv-error.log

# Restart both
pm2 restart pnptv-bot
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo cat /etc/nginx/sites-available/pnptv-bot
```

### Telegram Bot Not Responding

```bash
# Check application logs
pm2 logs pnptv-bot

# Verify environment variables
cd /var/www/pnptv-bot
cat .env | grep TELEGRAM_BOT_TOKEN
cat .env | grep BOT_URL

# Restart application
pm2 restart pnptv-bot
```

### Payment Webhooks Not Working

```bash
# Check webhook URLs in .env
cat .env | grep WEBHOOK
cat .env | grep EPAYCO
cat .env | grep DAIMO

# Check Nginx webhook routing
sudo cat /etc/nginx/sites-available/pnptv-bot | grep webhook

# Test webhook endpoint
curl -X POST https://pnptv.app/epayco/confirmation

# Check logs
pm2 logs pnptv-bot | grep webhook
```

## 🔐 Security Best Practices

### 1. Restrict .env File Access

```bash
chmod 600 /var/www/pnptv-bot/.env
```

### 2. Setup Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular Updates

```bash
# Update system packages weekly
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies monthly
cd /var/www/pnptv-bot
npm update
pm2 restart pnptv-bot
```

### 4. Backup Database

Setup regular Firebase backups from Firebase Console.

## 📊 Monitoring

### Setup Monitoring with PM2 Plus (Optional)

```bash
pm2 link <secret> <public>  # Get keys from pm2.io
```

### Enable Sentry Error Tracking

Already configured in `.env.production`:
- Check errors at: https://sentry.io/

## 🎉 Success!

Your PNPtv Bot is now live at:

- **Website**: https://pnptv.app
- **Telegram Bot**: https://t.me/PNPtvBot
- **Payment Page**: https://pnptv.app/pay

## 📞 Support

If you encounter issues:

1. Check logs: `pm2 logs pnptv-bot`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/pnptv-error.log`
3. Review this troubleshooting guide
4. Check environment variables in `.env`

---

**Deployment Guide Version**: 1.0
**Last Updated**: October 2025
**Domain**: pnptv.app
