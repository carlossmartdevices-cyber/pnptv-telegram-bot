# 🚀 VPS Deployment Guide - srv1071867.hstgr.cloud

Complete guide to deploy PNPtv Telegram Bot on your VPS server.

## 📋 Prerequisites

- VPS server: **srv1071867.hstgr.cloud**
- SSH access to the server
- Node.js 18+ installed on VPS
- Git installed on VPS
- Domain name (optional, but recommended for HTTPS)

## 🔐 Step 1: SSH Access Setup

### Connect to your VPS

```bash
# From your local machine (Windows PowerShell or CMD)
ssh root@srv1071867.hstgr.cloud
# Or if you have a specific user:
ssh your_username@srv1071867.hstgr.cloud
```

### Set up SSH key (recommended)

```bash
# On your local machine, generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy the public key to VPS
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@srv1071867.hstgr.cloud "cat >> ~/.ssh/authorized_keys"
```

## 🛠️ Step 2: Prepare VPS Environment

### Install Node.js (if not installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### Install Nginx (Web Server)

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Install Git (if not installed)

```bash
sudo apt install -y git
```

## 📦 Step 3: Deploy Application

### Clone Repository

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
sudo git clone https://github.com/your-username/your-repo.git pnptv-bot
# Or if using HTTPS with credentials:
# sudo git clone https://your-token@github.com/your-username/your-repo.git pnptv-bot

# Change ownership
sudo chown -R $USER:$USER /var/www/pnptv-bot

# Navigate to project
cd pnptv-bot
```

### Install Dependencies

```bash
# Install Node.js dependencies
npm install --production

# Or install all dependencies including dev
npm install
```

### Configure Environment Variables

```bash
# Create .env file
nano .env
```

Copy and paste your environment variables:

```env
# Bot Configuration
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
TELEGRAM_TOKEN=your_actual_bot_token_here
CHANNEL_ID=your_channel_id

# Admin Configuration
ADMIN_IDS=your_telegram_user_id

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"your-project-id"...}

# ePayco Configuration
EPAYCO_PUBLIC_KEY=your_epayco_public_key
EPAYCO_PRIVATE_KEY=your_epayco_private_key
EPAYCO_P_CUST_ID=your_customer_id
EPAYCO_P_KEY=your_p_key
EPAYCO_TEST_MODE=false
EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false

# URLs (Update with your VPS domain/IP)
BOT_URL=https://srv1071867.hstgr.cloud
WEB_APP_URL=https://srv1071867.hstgr.cloud
WEBAPP_URL=https://srv1071867.hstgr.cloud

# Server Configuration
PORT=3000
WEB_PORT=3000
NODE_ENV=production

# Sentry (Optional)
SENTRY_DSN=your_sentry_dsn
SENTRY_ENABLE_IN_DEV=false

# Daimo Pay (Optional)
DAIMO_API_KEY=your_daimo_api_key
DAIMO_APP_ID=your_daimo_app_id
```

Save and exit (Ctrl+X, then Y, then Enter)

### Create Required Directories

```bash
# Create logs directory
mkdir -p logs

# Set permissions
chmod 755 logs
```

## 🔄 Step 4: Start Application with PM2

### Create PM2 Ecosystem File

The project should already have `ecosystem.config.js`. If not, create it:

```bash
nano ecosystem.config.js
```

### Start Application

```bash
# Start the app with PM2
pm2 start ecosystem.config.js

# Or start directly
pm2 start start-bot.js --name pnptv-bot

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Follow the command it outputs (usually something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your_user --hp /home/your_user
```

### PM2 Commands

```bash
# View logs
pm2 logs pnptv-bot

# Monitor application
pm2 monit

# Restart application
pm2 restart pnptv-bot

# Stop application
pm2 stop pnptv-bot

# List all applications
pm2 list

# Delete from PM2
pm2 delete pnptv-bot
```

## 🌐 Step 5: Configure Nginx Reverse Proxy

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/pnptv-bot
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name srv1071867.hstgr.cloud;

    # Increase body size for file uploads
    client_max_body_size 10M;

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

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔒 Step 6: Setup SSL with Let's Encrypt (HTTPS)

**IMPORTANT**: Telegram Mini Apps require HTTPS. Follow these steps:

### Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificate

```bash
# Get certificate (replace with your domain)
sudo certbot --nginx -d srv1071867.hstgr.cloud

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### Auto-renewal Setup

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically adds a cron job for renewal
# You can verify with:
sudo systemctl status certbot.timer
```

## 📊 Step 7: Monitoring & Maintenance

### View Application Logs

```bash
# PM2 logs
pm2 logs pnptv-bot

# Application logs
tail -f /var/www/pnptv-bot/logs/combined.log
tail -f /var/www/pnptv-bot/logs/error.log

# Nginx logs
sudo tail -f /var/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check Application Status

```bash
# PM2 status
pm2 status

# Check if port 3000 is listening
sudo netstat -tulpn | grep 3000

# Check Nginx status
sudo systemctl status nginx

# Check application health
curl http://localhost:3000/health
```

### System Resources

```bash
# Check disk space
df -h

# Check memory usage
free -m

# Check CPU usage
top

# PM2 monitoring
pm2 monit
```

## 🔄 Step 8: Update/Redeploy

### Manual Update

```bash
# Navigate to project
cd /var/www/pnptv-bot

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install --production

# Restart application
pm2 restart pnptv-bot

# View logs to ensure everything is working
pm2 logs pnptv-bot
```

### Using Deployment Script

Create a deployment script:

```bash
nano /var/www/pnptv-bot/deploy.sh
```

Add the script content (see deploy.sh in project).

Make it executable:

```bash
chmod +x /var/www/pnptv-bot/deploy.sh
```

Then deploy with:

```bash
./deploy.sh
```

## 🔥 Step 9: Firewall Configuration

### Setup UFW Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT - Do this first!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status

# Allow specific IP (optional, for extra security)
# sudo ufw allow from YOUR_IP_ADDRESS to any port 22
```

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs pnptv-bot --lines 100

# Check if port is already in use
sudo netstat -tulpn | grep 3000

# Kill process on port 3000 if needed
sudo kill -9 $(sudo lsof -t -i:3000)

# Restart application
pm2 restart pnptv-bot
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Check Nginx SSL configuration
sudo cat /etc/nginx/sites-available/pnptv-bot
```

### Database Connection Issues

```bash
# Check if Firebase credentials are correct
cat /var/www/pnptv-bot/.env | grep FIREBASE

# Test connection
cd /var/www/pnptv-bot
node -e "require('./src/config/firebase')"
```

## 🔐 Security Best Practices

### 1. Update .env Permissions

```bash
# Restrict .env file access
chmod 600 /var/www/pnptv-bot/.env
```

### 2. Create Non-Root User

```bash
# Create application user
sudo adduser pnptv

# Add to sudo group (optional)
sudo usermod -aG sudo pnptv

# Change project ownership
sudo chown -R pnptv:pnptv /var/www/pnptv-bot
```

### 3. Setup Fail2Ban

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Configure for Nginx
sudo nano /etc/fail2ban/jail.local
```

Add:

```ini
[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true
```

Restart Fail2Ban:

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

## 📝 Quick Reference Commands

```bash
# Start application
pm2 start ecosystem.config.js

# View logs
pm2 logs pnptv-bot

# Restart
pm2 restart pnptv-bot

# Update application
cd /var/www/pnptv-bot && git pull && npm install && pm2 restart pnptv-bot

# View system resources
pm2 monit

# Nginx reload
sudo systemctl reload nginx

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] Application starts without errors: `pm2 logs pnptv-bot`
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] Port 3000 is listening: `sudo netstat -tulpn | grep 3000`
- [ ] HTTP works: `curl http://srv1071867.hstgr.cloud`
- [ ] HTTPS works: `curl https://srv1071867.hstgr.cloud`
- [ ] Telegram bot responds: Send `/start` to your bot
- [ ] Mini App loads: Click "PNPtv App" button
- [ ] Webhooks work: Test payment flow
- [ ] Logs are being written: `ls -la logs/`
- [ ] SSL certificate is valid: Check in browser
- [ ] Auto-start works: `sudo reboot` and verify bot starts

## 🎯 Next Steps

1. **Set up monitoring**: Install monitoring tools (optional)
2. **Configure backups**: Setup automated backups for database
3. **Add CI/CD**: Setup GitHub Actions for automated deployments
4. **Performance tuning**: Optimize Node.js and Nginx settings
5. **Load testing**: Test application under load

## 📞 Support

If you encounter issues:

1. Check logs: `pm2 logs pnptv-bot`
2. Check system resources: `pm2 monit`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Review this guide
5. Check the troubleshooting section

---

**Your VPS is ready! 🚀**

Access your application at: **https://srv1071867.hstgr.cloud**
