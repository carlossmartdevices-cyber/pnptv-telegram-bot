#!/bin/bash
# AI Chat Fix - Complete Deployment Script
# This script deploys all AI chat fixes to production server

echo "════════════════════════════════════════════════════════════════"
echo "   🤖 AI CHAT FIX - PRODUCTION DEPLOYMENT"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Recent AI Chat Commits:${NC}"
echo ""
git log --oneline --graph -5 | grep -E "ai|chat|i18n|Mistral" || git log --oneline -5
echo ""

echo -e "${YELLOW}📦 Files that will be deployed:${NC}"
echo ""
echo "  ✓ src/config/i18n.js       - Added t() method + updated messages"
echo "  ✓ src/bot/handlers/aiChat.js - Fixed imports + message handling + Daimo Pay info"
echo ""

read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]:${NC} )" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   DEPLOYMENT INSTRUCTIONS FOR PRODUCTION SERVER${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Run these commands on your production server:"
echo ""
echo -e "${YELLOW}1. SSH to your server:${NC}"
echo "   ssh your-user@your-server-ip"
echo ""

echo -e "${YELLOW}2. Navigate to bot directory:${NC}"
echo "   cd /var/www/telegram-bot"
echo ""

echo -e "${YELLOW}3. Backup current files (IMPORTANT):${NC}"
echo "   cp src/bot/handlers/aiChat.js src/bot/handlers/aiChat.js.backup"
echo "   cp src/config/i18n.js src/config/i18n.js.backup"
echo ""

echo -e "${YELLOW}4. Pull latest changes:${NC}"
echo "   git pull origin daimo-2"
echo ""

echo -e "${YELLOW}5. Verify the changes:${NC}"
echo "   # Check i18n has t() method"
echo "   grep \"t: function\" src/config/i18n.js"
echo ""
echo "   # Check aiChat uses config/i18n"
echo "   head -1 src/bot/handlers/aiChat.js"
echo ""
echo "   # Should show: const i18n = require(\"../../config/i18n\");"
echo ""

echo -e "${YELLOW}6. Restart the bot:${NC}"
echo "   pm2 restart pnptv-bot"
echo "   # OR"
echo "   pm2 restart pnptv-b"
echo ""

echo -e "${YELLOW}7. Monitor logs for errors:${NC}"
echo "   pm2 logs pnptv-bot --lines 100"
echo ""

echo -e "${YELLOW}8. Test in Telegram:${NC}"
echo "   • Send: /aichat"
echo "   • Should see: Welcome message"
echo "   • Ask: \"How can I subscribe?\""
echo "   • AI should mention Daimo Pay"
echo "   • Send: /endchat"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   SUCCESS INDICATORS${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}✅ You SHOULD see:${NC}"
echo "   • AI chat welcome message appears"
echo "   • AI responds to questions in user's language"
echo "   • AI mentions Daimo Pay for payment questions"
echo "   • No errors in pm2 logs"
echo ""

echo -e "${RED}❌ You should NOT see:${NC}"
echo "   • TypeError: i18n.t is not a function"
echo "   • Bad Request: message is too long"
echo "   • Error handling text message"
echo ""

echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   ROLLBACK INSTRUCTIONS (if needed)${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "If something goes wrong:"
echo ""
echo "   cd /var/www/telegram-bot"
echo "   cp src/bot/handlers/aiChat.js.backup src/bot/handlers/aiChat.js"
echo "   cp src/config/i18n.js.backup src/config/i18n.js"
echo "   pm2 restart pnptv-bot"
echo ""

echo -e "${GREEN}✅ Deployment guide ready!${NC}"
echo ""
