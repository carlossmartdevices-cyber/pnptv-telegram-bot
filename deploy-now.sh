#!/bin/bash

##############################################
# PNPtv Bot - Interactive Deployment to Hostinger
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

clear
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   PNPtv Bot Deployment Wizard${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "This script will deploy your bot to:"
echo -e "  Server: ${GREEN}$SERVER${NC}"
echo -e "  Domain: ${GREEN}https://pnptv.app${NC}"
echo ""

# Check if SSH connection works
echo -e "${YELLOW}Step 1: Testing SSH connection...${NC}"
if ssh -o ConnectTimeout=5 -o BatchMode=yes ${USER}@${SERVER} exit 2>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to server${NC}"
    echo ""
    echo "Please make sure:"
    echo "1. You have SSH access to the server"
    echo "2. Run: ssh ${USER}@${SERVER}"
    echo "3. Accept the host key if prompted"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Checking if server is set up...${NC}"
if ssh ${USER}@${SERVER} "[ -d ${REMOTE_DIR} ]" 2>/dev/null; then
    echo -e "${GREEN}✓ Application directory exists${NC}"
    FIRST_TIME=false
else
    echo -e "${YELLOW}! First time deployment${NC}"
    FIRST_TIME=true
    echo ""
    read -p "Do you want to set up the server now? (y/n): " SETUP
    if [ "$SETUP" = "y" ]; then
        echo ""
        echo -e "${YELLOW}Setting up server...${NC}"
        ssh ${USER}@${SERVER} "mkdir -p ${REMOTE_DIR}"
        echo -e "${GREEN}✓ Created application directory${NC}"
    else
        echo ""
        echo "Please run the full setup first:"
        echo "  ssh ${USER}@${SERVER}"
        echo "  bash deploy-hostinger.sh"
        exit 0
    fi
fi

echo ""
echo -e "${YELLOW}Step 3: Checking .env.production file...${NC}"
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✓ .env.production found${NC}"

    # Check if it has the correct domain
    if grep -q "pnptv.app" .env.production; then
        echo -e "${GREEN}✓ Contains pnptv.app domain${NC}"
    else
        echo -e "${RED}✗ WARNING: .env.production doesn't contain pnptv.app${NC}"
        read -p "Continue anyway? (y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ]; then
            exit 1
        fi
    fi
else
    echo -e "${RED}✗ .env.production not found${NC}"
    echo ""
    echo "Please create .env.production with your production settings"
    exit 1
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Ready to Deploy${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "This will:"
echo "  1. Upload files to the server"
echo "  2. Install dependencies"
echo "  3. Copy .env.production as .env"
echo "  4. Restart the bot with PM2"
echo ""
read -p "Continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}Step 4: Uploading files...${NC}"
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '*.log' \
    --exclude 'sessions.json' \
    ./ ${USER}@${SERVER}:${REMOTE_DIR}/ || {
    echo -e "${RED}✗ Failed to upload files${NC}"
    exit 1
}
echo -e "${GREEN}✓ Files uploaded${NC}"

echo ""
echo -e "${YELLOW}Step 5: Copying environment file...${NC}"
scp .env.production ${USER}@${SERVER}:${REMOTE_DIR}/.env || {
    echo -e "${RED}✗ Failed to copy .env file${NC}"
    exit 1
}
echo -e "${GREEN}✓ Environment configured${NC}"

echo ""
echo -e "${YELLOW}Step 6: Installing dependencies...${NC}"
ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && npm install --production" || {
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
}
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Step 7: Creating logs directory...${NC}"
ssh ${USER}@${SERVER} "mkdir -p ${REMOTE_DIR}/logs"
echo -e "${GREEN}✓ Logs directory ready${NC}"

echo ""
echo -e "${YELLOW}Step 8: Starting/Restarting bot...${NC}"
ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && pm2 restart pnptv-bot || pm2 start ecosystem.config.js --env production" || {
    echo -e "${RED}✗ Failed to start bot${NC}"
    echo ""
    echo "Trying to get more info..."
    ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && pm2 logs pnptv-bot --lines 20 --nostream"
    exit 1
}

echo ""
echo -e "${YELLOW}Step 9: Saving PM2 configuration...${NC}"
ssh ${USER}@${SERVER} "pm2 save"

echo ""
echo -e "${YELLOW}Step 10: Checking status...${NC}"
ssh ${USER}@${SERVER} "pm2 status"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Deployment Complete! 🎉${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Your bot is now running at:"
echo -e "  ${BLUE}https://pnptv.app${NC}"
echo -e "  ${BLUE}https://t.me/PNPtvBot${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. ${YELLOW}Set Telegram webhook:${NC}"
echo "   curl -F \"url=https://pnptv.app/webhook\" \\"
echo "        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook"
echo ""
echo "2. ${YELLOW}Configure ePayco webhooks:${NC}"
echo "   https://dashboard.epayco.co/"
echo "   - Confirmation URL: https://pnptv.app/epayco/confirmation"
echo "   - Response URL: https://pnptv.app/epayco/response"
echo ""
echo "3. ${YELLOW}Configure Daimo webhooks:${NC}"
echo "   https://pay.daimo.com/dashboard"
echo "   - Webhook URL: https://pnptv.app/daimo/webhook"
echo ""
echo "4. ${YELLOW}Test your bot:${NC}"
echo "   - Send /start to @PNPtvBot"
echo "   - Test subscription plans"
echo "   - Test payment flows"
echo ""
echo "Useful commands:"
echo "  View logs: ssh ${USER}@${SERVER} \"pm2 logs pnptv-bot\""
echo "  Restart:   ssh ${USER}@${SERVER} \"pm2 restart pnptv-bot\""
echo "  Stop:      ssh ${USER}@${SERVER} \"pm2 stop pnptv-bot\""
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
