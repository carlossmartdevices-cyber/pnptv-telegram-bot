#!/bin/bash

##############################################
# PNPtv Bot - Automated Deployment
##############################################

set -e

# Configuration
SERVER="72.60.29.80"  # Using IP address for reliability
USER="root"
REMOTE_DIR="/var/www/telegram-bot"

echo "=========================================
PNPtv Bot - Deploying to Hostinger
========================================="
echo ""
echo "Server: $SERVER"
echo "Domain: https://pnptv.app"
echo ""

# Step 1: Create directories
echo "[1/9] Creating remote directories..."
ssh ${USER}@${SERVER} "mkdir -p ${REMOTE_DIR}/{src,logs,public}" || exit 1

# Step 2: Upload package files
echo "[2/9] Uploading package files..."
scp package.json package-lock.json ${USER}@${SERVER}:${REMOTE_DIR}/ || exit 1

# Step 3: Upload config
echo "[3/9] Uploading configuration..."
scp ecosystem.config.js ${USER}@${SERVER}:${REMOTE_DIR}/ || exit 1
scp start-bot.js ${USER}@${SERVER}:${REMOTE_DIR}/ 2>/dev/null || echo "  (start-bot.js not found, skipping)"

# Step 4: Upload source
echo "[4/9] Uploading source code..."
scp -r src/ ${USER}@${SERVER}:${REMOTE_DIR}/ || exit 1

# Step 5: Upload public files
echo "[5/9] Uploading public files..."
scp -r public/ ${USER}@${SERVER}:${REMOTE_DIR}/ 2>/dev/null || echo "  (public/ not found, skipping)"

# Step 6: Upload environment
echo "[6/9] Uploading environment configuration..."
scp .env.production ${USER}@${SERVER}:${REMOTE_DIR}/.env || exit 1

# Step 7: Install dependencies
echo "[7/9] Installing dependencies (this may take a minute)..."
ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && npm install --production --quiet" || exit 1

# Step 8: Restart bot
echo "[8/9] Restarting bot with PM2..."
ssh ${USER}@${SERVER} "cd ${REMOTE_DIR} && (pm2 restart pnptv-bot || pm2 start ecosystem.config.js --env production) && pm2 save" || exit 1

# Step 9: Check status
echo "[9/9] Checking bot status..."
ssh ${USER}@${SERVER} "pm2 status pnptv-bot"

echo ""
echo "========================================="
echo "✓ Deployment Complete!"
echo "========================================="
echo ""
echo "Your bot is running at:"
echo "  • https://pnptv.app"
echo "  • https://t.me/PNPtvBot"
echo ""
echo "Next steps:"
echo ""
echo "1. Set Telegram webhook:"
echo "   curl -F \"url=https://pnptv.app/webhook\" \\"
echo "        https://api.telegram.org/bot8499797477:AAGxHvVkK2DazymRAX0_iE1ioG4mrY1TRoc/setWebhook"
echo ""
echo "2. Test: Send /start to @PNPtvBot"
echo ""
echo "View logs: ssh ${USER}@${SERVER} \"pm2 logs pnptv-bot\""
echo ""
