#!/bin/bash
##############################################
# Quick Deploy to Hostinger VPS
##############################################

echo "========================================="
echo "Deploying PNPtv Bot to pnptv.app"
echo "========================================="

# VPS Details
VPS_HOST="72.60.29.80"
VPS_USER="root"
VPS_PATH="/var/www/telegram-bot"

echo "Uploading updated files to VPS..."

# Upload .env file
echo "→ Uploading .env..."
scp .env ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

# Upload ecosystem.config.js
echo "→ Uploading ecosystem.config.js..."
scp ecosystem.config.js ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

echo ""
echo "Files uploaded successfully!"
echo ""
echo "Now SSH into VPS and restart bot:"
echo "  ssh ${VPS_USER}@${VPS_HOST}"
echo "  cd ${VPS_PATH}"
echo "  pm2 restart ecosystem.config.js --env production --update-env"
echo "  pm2 logs pnptv-bot"
echo ""
