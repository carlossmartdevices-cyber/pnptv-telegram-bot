#!/bin/bash

# PNPtv Bot - Sync to Hostinger VPS Script
# This script syncs all repository files to root@srv1071867.hstgr.cloud:~/bot 1/

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="srv1071867.hstgr.cloud"
VPS_USER="root"
VPS_PATH="~/bot 1"
LOCAL_PATH="/root/bot 1/"

echo -e "${BLUE}🚀 PNPtv Bot - Hostinger VPS Sync${NC}"
echo "=================================="
echo -e "Source: ${YELLOW}${LOCAL_PATH}${NC}"
echo -e "Target: ${YELLOW}${VPS_USER}@${VPS_HOST}:${VPS_PATH}/${NC}"
echo ""

# Check if we can connect to the server
echo -e "${BLUE}📡 Testing connection to VPS...${NC}"
if ssh -o ConnectTimeout=10 -o BatchMode=yes "${VPS_USER}@${VPS_HOST}" exit 2>/dev/null; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${RED}❌ Cannot connect to VPS. Please check:${NC}"
    echo "   - SSH key is set up"
    echo "   - Server is accessible"
    echo "   - Hostname is correct: ${VPS_HOST}"
    exit 1
fi

# Create the target directory on the server if it doesn't exist
echo -e "${BLUE}📁 Creating target directory on VPS...${NC}"
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p '${VPS_PATH}'"

# Sync files using rsync
echo -e "${BLUE}🔄 Syncing files to VPS...${NC}"
echo "This may take a few minutes depending on file size and connection speed..."
echo ""

rsync -avz \
    --progress \
    --delete \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='logs/' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    --exclude='*.tmp' \
    --exclude='*.temp' \
    --include='.env*' \
    --include='.gitignore' \
    "${LOCAL_PATH}" \
    "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Sync completed successfully!${NC}"
    echo ""
    
    # Show summary
    echo -e "${BLUE}📊 Sync Summary:${NC}"
    echo "--------------------------------"
    ssh "${VPS_USER}@${VPS_HOST}" "cd '${VPS_PATH}' && echo 'Files synced to: $(pwd)' && echo 'Total files: $(find . -type f | wc -l)' && echo 'Total size: $(du -sh . | cut -f1)'"
    
    echo ""
    echo -e "${BLUE}🎯 Next Steps:${NC}"
    echo "1. SSH into your VPS: ssh ${VPS_USER}@${VPS_HOST}"
    echo "2. Navigate to: cd '${VPS_PATH}'"
    echo "3. Install dependencies: npm install --production"
    echo "4. Configure environment: cp .env.production .env"
    echo "5. Start with PM2: pm2 start ecosystem.config.js --env production"
    echo ""
    echo -e "${GREEN}🚀 Repository successfully synced to Hostinger VPS!${NC}"
else
    echo -e "${RED}❌ Sync failed!${NC}"
    echo "Please check the error messages above and try again."
    exit 1
fi