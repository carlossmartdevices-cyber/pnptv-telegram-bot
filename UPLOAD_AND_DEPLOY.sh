#!/bin/bash
# Quick deployment commands for Windows/WSL

echo "=== PNPtv Bot - Upload and Deploy ==="
echo ""

# From your LOCAL machine (WSL/Linux terminal)
echo "Step 1: Upload deployment files..."
scp deploy-hostinger.sh ecosystem.config.js nginx-config.conf root@72.60.29.80:/root/

echo ""
echo "Step 2: Upload your entire project..."
tar -czf bot.tar.gz --exclude=node_modules --exclude=.git --exclude=.venv --exclude=*.pyc .
scp bot.tar.gz root@72.60.29.80:/root/

echo ""
echo "Step 3: Now SSH and deploy..."
ssh root@72.60.29.80

# THEN, on the VPS server, run these commands:
# cd /root
# chmod +x deploy-hostinger.sh
# ./deploy-hostinger.sh
