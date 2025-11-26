#!/bin/bash
# Deployment script to fix AI chat i18n error on production server

echo "🚀 Deploying AI chat i18n fix to production..."
echo ""

# Step 1: Commit changes locally
echo "📝 Step 1: Committing changes..."
git add src/bot/handlers/aiChat.js
git commit -m "fix: Update aiChat.js to use utils/i18n module with t() method

- Changed import from config/i18n to utils/i18n
- Updated all 6 i18n method calls from getText() to t()
- Fixes TypeError: i18n.t is not a function runtime error

Resolves AI chat handler errors in production"

echo "✅ Changes committed"
echo ""

# Step 2: Push to repository
echo "📤 Step 2: Pushing to remote repository..."
git push origin daimo-2

echo "✅ Changes pushed to daimo-2 branch"
echo ""

# Step 3: Instructions for server deployment
echo "🖥️  Step 3: Deploy on production server"
echo ""
echo "Run these commands on your production server:"
echo ""
echo "  ssh your-server-user@your-server-ip"
echo "  cd /var/www/telegram-bot"
echo "  git pull origin daimo-2"
echo "  pm2 restart pnptv-bot"
echo ""
echo "Or if you're using the 'pnptv-b' process name:"
echo "  pm2 restart pnptv-b"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Verification steps:"
echo "  1. Check logs: pm2 logs pnptv-bot --lines 50"
echo "  2. Test in Telegram: send /aichat command"
echo "  3. Verify no 'i18n.t is not a function' errors"
echo ""
echo "✅ Deployment script complete!"
