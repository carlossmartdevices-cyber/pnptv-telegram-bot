#!/bin/bash
# Deploy PNPtv WebApp as PM2 Service
# Run this script to enable the Telegram mini app

set -e

echo "🚀 Deploying PNPtv WebApp..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Please run as root (sudo)${NC}"
  exit 1
fi

cd /root/bot\ 1

echo -e "\n${YELLOW}Step 1: Checking webapp build...${NC}"
if [ ! -d "src/webapp/.next" ]; then
  echo -e "${YELLOW}⚠️  No build found. Building webapp...${NC}"
  cd src/webapp
  npm install
  npm run build
  cd ../..
else
  echo -e "${GREEN}✅ Build exists${NC}"
fi

echo -e "\n${YELLOW}Step 2: Starting webapp with PM2...${NC}"
pm2 start ecosystem.webapp.config.js

echo -e "\n${YELLOW}Step 3: Updating Nginx configuration...${NC}"
cp /etc/nginx/sites-available/pnptv-bot /etc/nginx/sites-available/pnptv-bot.backup
cp nginx-webapp.conf /etc/nginx/sites-available/pnptv-bot

echo -e "\n${YELLOW}Step 4: Testing Nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Nginx config valid${NC}"
  
  echo -e "\n${YELLOW}Step 5: Reloading Nginx...${NC}"
  systemctl reload nginx
  
  echo -e "\n${YELLOW}Step 6: Saving PM2 configuration...${NC}"
  pm2 save
  
  echo -e "\n${GREEN}✅ Deployment complete!${NC}"
  echo ""
  echo "Services running:"
  pm2 list | grep -E "pnptv-bot|pnptv-webapp"
  
  echo ""
  echo -e "${GREEN}🎉 WebApp is now live at:${NC}"
  echo "   https://pnptv.app/app"
  echo ""
  echo "Test it:"
  echo "   curl -I https://pnptv.app/app"
  echo ""
  echo "View logs:"
  echo "   pm2 logs pnptv-webapp"
  echo ""
  
else
  echo -e "${RED}❌ Nginx config test failed. Restoring backup...${NC}"
  cp /etc/nginx/sites-available/pnptv-bot.backup /etc/nginx/sites-available/pnptv-bot
  exit 1
fi
