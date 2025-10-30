#!/bin/bash

##############################################
# PNPtv Bot - Server Setup Script
# Run this ON THE SERVER after uploading files
##############################################

set -e

echo "==========================================="
echo "PNPtv Bot - Server Setup"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/var/www/telegram-bot"
DOMAIN="pnptv.app"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing system dependencies...${NC}"
apt update
apt install -y curl git nginx certbot python3-certbot-nginx ufw

echo -e "${YELLOW}Step 2: Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}Node.js: $(node -v)${NC}"
echo -e "${GREEN}NPM: $(npm -v)${NC}"

echo -e "${YELLOW}Step 3: Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo -e "${GREEN}PM2: $(pm2 -v)${NC}"

echo -e "${YELLOW}Step 4: Configuring firewall...${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443
ufw allow 3000
echo -e "${GREEN}Firewall configured${NC}"

echo -e "${YELLOW}Step 5: Setting up application directory...${NC}"
cd ${APP_DIR}
mkdir -p logs

echo -e "${YELLOW}Step 6: Installing Node.js dependencies...${NC}"
npm install --production

echo -e "${YELLOW}Step 7: Checking .env file...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        echo -e "${GREEN}Copying .env.production to .env${NC}"
        cp .env.production .env
    else
        echo -e "${RED}ERROR: No .env or .env.production file found!${NC}"
        echo -e "${YELLOW}Please create .env file manually${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}.env file exists${NC}"
fi

echo -e "${YELLOW}Step 8: Starting bot with PM2...${NC}"
pm2 delete pnptv-bot 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -n 1 | bash || true

echo -e "${YELLOW}Step 9: Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/pnptv-bot << 'NGINX_EOF'
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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

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
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo -e "${YELLOW}Step 10: Installing SSL certificate...${NC}"
echo -e "${YELLOW}Make sure DNS is pointing to this server!${NC}"
read -p "Install SSL certificate now? (y/n): " install_ssl

if [ "$install_ssl" = "y" ]; then
    certbot --nginx -d pnptv.app -d www.pnptv.app --non-interactive --agree-tos --email admin@pnptv.app || {
        echo -e "${YELLOW}SSL installation failed. You can run it manually later:${NC}"
        echo "sudo certbot --nginx -d pnptv.app -d www.pnptv.app"
    }
else
    echo -e "${YELLOW}Skipping SSL installation. Run this later:${NC}"
    echo "sudo certbot --nginx -d pnptv.app -d www.pnptv.app"
fi

echo ""
echo -e "${GREEN}==========================================="
echo "✅ Deployment Complete!"
echo "===========================================${NC}"
echo ""
echo "🤖 Bot Status:"
pm2 status
echo ""
echo "📊 Monitoring Commands:"
echo "  pm2 logs pnptv-bot      - View logs"
echo "  pm2 restart pnptv-bot   - Restart bot"
echo "  pm2 status              - Check status"
echo ""
echo "🔗 Next Steps:"
echo "1. Set Telegram webhook:"
echo "   curl -F 'url=https://pnptv.app/webhook' \\"
echo "     https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook"
echo ""
echo "2. Configure ePayco webhooks at: https://dashboard.epayco.co/"
echo "   - Confirmation URL: https://pnptv.app/epayco/confirmation"
echo "   - Response URL: https://pnptv.app/epayco/response"
echo ""
echo "3. Configure Daimo webhooks at: https://pay.daimo.com/dashboard"
echo "   - Webhook URL: https://pnptv.app/daimo/webhook"
echo ""
echo -e "${GREEN}🎉 Your bot should now be live at: https://pnptv.app${NC}"
