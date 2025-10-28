#!/bin/bash

##############################################
# PNPtv Bot - Quick Deploy to Hostinger
##############################################

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SERVER="srv1071867.hstgr.cloud"
USER="root"
REMOTE_DIR="/var/www/telegram-bot"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}PNPtv Bot - Hostinger Deployment${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

echo "Server: $SERVER"
echo "User: $USER"
echo "Remote Directory: $REMOTE_DIR"
echo ""

echo -e "${YELLOW}Step 1: Building for Production${NC}"
npm run build 2>/dev/null || echo "No build script found (skipping)"
echo ""

echo -e "${YELLOW}Step 2: Syncing Files to Server${NC}"
echo "Uploading files (excluding node_modules, .git, logs)..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    --exclude '.env' \
    --exclude '*.log' \
    --exclude 'sessions.json' \
    --exclude '.env.local' \
    ./ ${USER}@${SERVER}:${REMOTE_DIR}/

echo ""
echo -e "${YELLOW}Step 3: Copying Production Environment${NC}"
scp .env.production ${USER}@${SERVER}:${REMOTE_DIR}/.env

echo ""
echo -e "${YELLOW}Step 4: Installing Dependencies on Server${NC}"
ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && npm install --production"

echo ""
echo -e "${YELLOW}Step 5: Restarting Bot with PM2${NC}"
ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && pm2 restart pnptv-bot || pm2 start ecosystem.config.js --env production && pm2 save"

echo ""
echo -e "${YELLOW}Step 6: Checking Status${NC}"
ssh ${USER}@${SERVER} "pm2 status"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Your bot is now running at:"
echo "  - Website: https://pnptv.app"
echo "  - Bot: https://t.me/PNPtvBot"
echo ""
echo "Useful commands:"
echo "  - View logs: ssh ${USER}@${SERVER} \"pm2 logs pnptv-bot\""
echo "  - Restart: ssh ${USER}@${SERVER} \"pm2 restart pnptv-bot\""
echo "  - Stop: ssh ${USER}@${SERVER} \"pm2 stop pnptv-bot\""
echo "  - SSH into server: ssh ${USER}@${SERVER}"
echo ""
