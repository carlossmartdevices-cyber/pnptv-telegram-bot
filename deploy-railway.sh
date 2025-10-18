#!/bin/bash
# Railway Deployment Script
# Optimized deployment script for PNPtv Telegram Bot

set -e  # Exit on error

echo "🚀 Railway Deployment Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Please install it first:"
    echo "  npm install -g @railway/cli"
    echo "  or"
    echo "  brew install railway"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI detected${NC}"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    echo "Logging in..."
    railway login
fi

echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Check if linked to project
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not linked to a Railway project${NC}"
    echo "Please link to your project:"
    echo "  1. Link existing project: railway link"
    echo "  2. Or create new project: railway init"
    exit 1
fi

echo -e "${GREEN}✅ Project linked${NC}"
echo ""

# Show current status
echo -e "${BLUE}📊 Current Status:${NC}"
railway status
echo ""

# Ask for confirmation
read -p "Deploy to Railway? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Pre-deployment checks
echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"

# Check for required files
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi

if [ ! -f "start-bot.js" ]; then
    echo -e "${RED}❌ start-bot.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Required files present${NC}"

# Check for uncommitted changes (optional warning)
if [ -d ".git" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
        echo "Consider committing them before deploying"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled"
            exit 0
        fi
    fi
fi

# Deploy
echo ""
echo -e "${BLUE}🚀 Deploying to Railway...${NC}"
echo ""

railway up

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "  1. Check logs: railway logs"
    echo "  2. Check status: railway status"
    echo "  3. Open dashboard: railway open"
    echo ""
    echo -e "${YELLOW}⚠️  Important: Update your environment variables if needed${NC}"
    echo "  - BOT_URL: Your Railway public URL"
    echo "  - WEBHOOK_URL: Your Railway public URL"
    echo "  - EPAYCO_RESPONSE_URL: Update with Railway URL"
    echo "  - EPAYCO_CONFIRMATION_URL: Update with Railway URL"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the error messages above"
    echo "Or view logs with: railway logs"
    exit 1
fi
