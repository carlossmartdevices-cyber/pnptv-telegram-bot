#!/bin/bash

##############################################
# PNPtv Bot - Windows Deployment (SCP-based)
##############################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER="srv1071867.hstgr.cloud"
USER="root"
REMOTE_DIR="/var/www/telegram-bot"
LOCAL_DIR="."

clear
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   PNPtv Bot Deployment (Windows)${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "Deploying to:"
echo -e "  Server: ${GREEN}$SERVER${NC}"
echo -e "  Domain: ${GREEN}https://pnptv.app${NC}"
echo ""

# Test SSH
echo -e "${YELLOW}Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 ${USER}@${SERVER} "echo 'Connected'" &>/dev/null; then
    echo -e "${RED}✗ Cannot connect to server${NC}"
    echo "Please check your SSH connection"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection OK${NC}"
echo ""

# Check .env.production
if [ ! -f ".env.production" ]; then
    echo -e "${RED}✗ .env.production not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ .env.production found${NC}"
echo ""

read -p "Continue deployment? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 1: Creating remote directory...${NC}"
ssh ${USER}@${SERVER} "mkdir -p ${REMOTE_DIR}/{src,logs,public}"
echo -e "${GREEN}✓ Directory structure ready${NC}"

echo ""
echo -e "${YELLOW}Step 2: Uploading package files...${NC}"
scp package.json package-lock.json ${USER}@${SERVER}:${REMOTE_DIR}/
echo -e "${GREEN}✓ Package files uploaded${NC}"

echo ""
echo -e "${YELLOW}Step 3: Uploading ecosystem config...${NC}"
scp ecosystem.config.js ${USER}@${SERVER}:${REMOTE_DIR}/
echo -e "${GREEN}✓ Ecosystem config uploaded${NC}"

echo ""
echo -e "${YELLOW}Step 4: Uploading start script...${NC}"
scp start-bot.js ${USER}@${SERVER}:${REMOTE_DIR}/ 2>/dev/null || echo "No start-bot.js"
echo -e "${GREEN}✓ Start script uploaded${NC}"

echo ""
echo -e "${YELLOW}Step 5: Uploading source files...${NC}"
echo "Uploading src/ directory..."
scp -r src/ ${USER}@${SERVER}:${REMOTE_DIR}/
echo -e "${GREEN}✓ Source files uploaded${NC}"

echo ""
echo -e "${YELLOW}Step 6: Uploading public files...${NC}"
scp -r public/ ${USER}@${SERVER}:${REMOTE_DIR}/ 2>/dev/null || echo "No public directory"
echo -e "${GREEN}✓ Public files uploaded${NC}"

echo ""
echo -e "${YELLOW}Step 7: Uploading environment file...${NC}"
scp .env.production ${USER}@${SERVER}:${REMOTE_DIR}/.env
echo -e "${GREEN}✓ Environment configured${NC}"

echo ""
echo -e "${YELLOW}Step 8: Installing dependencies on server...${NC}"
ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && npm install --production"
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Step 9: Restarting bot with PM2...${NC}"
ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && pm2 restart pnptv-bot || pm2 start ecosystem.config.js --env production && pm2 save"
echo -e "${GREEN}✓ Bot restarted${NC}"

echo ""
echo -e "${YELLOW}Step 10: Checking status...${NC}"
ssh ${USER}@${SERVER} "pm2 status"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Deployment Complete! 🎉${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Your bot is running at:"
echo -e "  ${BLUE}https://pnptv.app${NC}"
echo -e "  ${BLUE}https://t.me/PNPtvBot${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Set Telegram webhook:"
echo "   curl -F \"url=https://pnptv.app/webhook\" \\"
echo "        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook"
echo ""
echo "2. Test your bot: Send /start to @PNPtvBot"
echo ""
echo "View logs: ssh ${USER}@${SERVER} \"pm2 logs pnptv-bot\""
echo ""
