#!/bin/bash

##############################################
# PNPtv Telegram Bot - Hostinger VPS Deployment
##############################################

set -e  # Exit on error

echo "========================================="
echo "PNPtv Bot Deployment Script"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="pnptv-bot"
APP_DIR="/var/www/telegram-bot"
REPO_URL="https://github.com/yourusername/your-repo.git"  # UPDATE THIS!
NODE_VERSION="20"
DOMAIN=""  # Set your domain if you have one

echo -e "${YELLOW}Step 1: System Update${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}Step 2: Installing Node.js ${NODE_VERSION}.x${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}Node.js version: $(node -v)${NC}"
echo -e "${GREEN}NPM version: $(npm -v)${NC}"

echo -e "${YELLOW}Step 3: Installing Required Packages${NC}"
apt install -y git nginx certbot python3-certbot-nginx ufw

echo -e "${YELLOW}Step 4: Installing PM2${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo -e "${GREEN}PM2 installed: $(pm2 -v)${NC}"

echo -e "${YELLOW}Step 5: Configuring Firewall${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443
ufw allow 3000
echo -e "${GREEN}Firewall configured${NC}"

echo -e "${YELLOW}Step 6: Creating Application Directory${NC}"
mkdir -p ${APP_DIR}
cd ${APP_DIR}

echo -e "${YELLOW}Step 7: Setting Up Application${NC}"
echo "Please choose deployment method:"
echo "1) Clone from Git"
echo "2) Files already uploaded (skip clone)"
read -p "Enter choice [1-2]: " deploy_choice

if [ "$deploy_choice" = "1" ]; then
    read -p "Enter your Git repository URL: " REPO_URL
    if [ -d ".git" ]; then
        echo "Pulling latest changes..."
        git pull
    else
        echo "Cloning repository..."
        git clone ${REPO_URL} .
    fi
fi

echo -e "${YELLOW}Step 8: Installing Dependencies${NC}"
npm install --production

echo -e "${YELLOW}Step 9: Setting Up Environment Variables${NC}"
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOL'
# ==================================
# PNPtv Bot Configuration - PRODUCTION
# ==================================

NODE_ENV=production

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
TELEGRAM_TOKEN=YOUR_BOT_TOKEN_HERE
CHANNEL_ID=YOUR_CHANNEL_ID_HERE
TELEGRAM_BOT_USERNAME=PNPtvBot

# Admin Configuration
ADMIN_IDS=YOUR_ADMIN_ID_HERE

# ==================================
# Firebase Configuration (NOT MONGODB!)
# ==================================
FIREBASE_PROJECT_ID=pnptv-b8af8
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@pnptv-b8af8.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=pnptv-b8af8.appspot.com
FIREBASE_PRIVATE_KEY="YOUR_FIREBASE_PRIVATE_KEY_HERE"

# ==================================
# ePayco Payment Gateway
# ==================================
EPAYCO_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
EPAYCO_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
EPAYCO_CUSTOMER_ID=YOUR_CUSTOMER_ID_HERE
EPAYCO_P_CUST_ID=YOUR_CUSTOMER_ID_HERE
EPAYCO_P_KEY=YOUR_P_KEY_HERE
EPAYCO_TEST=false
EPAYCO_TEST_MODE=false
EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false

# ==================================
# Daimo Pay (Stablecoin Payments)
# ==================================
DAIMO_API_KEY=YOUR_DAIMO_API_KEY_HERE
DAIMO_APP_ID=pnptv-bot
DAIMO_WEBHOOK_TOKEN=YOUR_WEBHOOK_TOKEN_HERE
NEXT_PUBLIC_TREASURY_ADDRESS=0xcaf17dbbccc0e9ac87dad1af1f2fe3ba3a4d0613
NEXT_PUBLIC_REFUND_ADDRESS=0xcaf17dbbccc0e9ac87dad1af1f2fe3ba3a4d0613

# ==================================
# URLs Configuration (UPDATE WITH YOUR DOMAIN/IP)
# ==================================
BOT_URL=https://yourdomain.com
WEBAPP_URL=https://yourdomain.com
WEB_APP_URL=https://yourdomain.com
NEXT_PUBLIC_WEBAPP_URL=https://yourdomain.com
NEXT_PUBLIC_BOT_URL=https://yourdomain.com
RESPONSE_URL=https://yourdomain.com/epayco/response
CONFIRMATION_URL=https://yourdomain.com/epayco/confirmation
EPAYCO_RESPONSE_URL=https://yourdomain.com/epayco/response
EPAYCO_CONFIRMATION_URL=https://yourdomain.com/epayco/confirmation
DAIMO_WEBHOOK_URL=https://yourdomain.com/daimo/webhook
DAIMO_RETURN_URL=https://yourdomain.com/payment/success

# ==================================
# Server Configuration
# ==================================
PORT=3000
WEB_PORT=3000

# ==================================
# Error Tracking & Monitoring
# ==================================
SENTRY_DSN=YOUR_SENTRY_DSN_HERE
SENTRY_ENABLE_IN_DEV=false

# ==================================
# WebApp Configuration
# ==================================
JWT_SECRET=YOUR_JWT_SECRET_HERE
EOL
    echo -e "${RED}IMPORTANT: Edit .env file with your actual credentials!${NC}"
    echo -e "${YELLOW}Run: nano ${APP_DIR}/.env${NC}"
    read -p "Press Enter after you've updated the .env file..."
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

echo -e "${YELLOW}Step 10: Starting Application with PM2${NC}"
pm2 delete ${APP_NAME} 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -n 1 | bash

echo -e "${YELLOW}Step 11: Configuring Nginx${NC}"
if [ -n "$DOMAIN" ]; then
    echo "Configuring Nginx for domain: $DOMAIN"
    cp /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-available/pnptv-bot.bak 2>/dev/null || true

    cat > /etc/nginx/sites-available/pnptv-bot << EOL
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

    ln -sf /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx

    echo -e "${YELLOW}Step 12: Installing SSL Certificate${NC}"
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} || echo "SSL setup failed, configure manually"
else
    echo -e "${YELLOW}No domain configured. Using IP-based configuration.${NC}"
    echo -e "${GREEN}Your bot is accessible at: http://72.60.29.80:3000${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Useful Commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs            - View application logs"
echo "  pm2 restart ${APP_NAME} - Restart application"
echo "  pm2 stop ${APP_NAME}    - Stop application"
echo "  nano ${APP_DIR}/.env    - Edit environment variables"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "1. Update .env file with your actual credentials"
echo "2. Update Telegram webhook to your domain/IP"
echo "3. Configure ePayco webhook URLs in their dashboard"
echo "4. Configure Daimo webhook URLs in their dashboard"
echo ""
echo -e "${GREEN}Happy coding!${NC}"
