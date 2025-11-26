#!/bin/bash
cd "/root/bot 1"

# Comment out the daimoPayService import in daimoPayHandler.js
sed -i '4s/^/\/\/ /' src/bot/handlers/daimoPayHandler.js
sed -i '25,26s/^/\/\/ /' src/bot/handlers/daimoPayHandler.js

echo "✅ Fixed daimoPayHandler"

# Now add promo handler to bot index.js
# First, check if it's already there
if ! grep -q "promoHandler" src/bot/index.js; then
  # Find the line with daimoPayHandler import
  LINE=$(grep -n "daimoPayHandler" src/bot/index.js | head -1 | cut -d: -f1)
  
  # Add promoHandler import after daimoPayHandler
  sed -i "${LINE}a\\
const {\\
  sendPromoAnnouncement,\\
  executePromoSend,\\
  handlePaymentVerification,\\
  handleAdminConfirmation,\\
  handleAdminRejection,\\
  handlePromoCancel\\
} = require(\"./handlers/promoHandler\");" src/bot/index.js

  # Find the line with admin commands and add sendpromo
  ADMIN_LINE=$(grep -n 'bot.command("admin"' src/bot/index.js | head -1 | cut -d: -f1)
  sed -i "${ADMIN_LINE}a\\
bot.command(\"sendpromo\", adminMiddleware(), sendPromoAnnouncement);" src/bot/index.js

  # Find the callback actions section and add promo callbacks
  CALLBACK_LINE=$(grep -n 'bot.action.*admin_back' src/bot/index.js | head -1 | cut -d: -f1)
  if [ -n "$CALLBACK_LINE" ]; then
    sed -i "${CALLBACK_LINE}a\\
\\
// Promo callbacks\\
bot.action(/^promo_send_(es|en|both)$/, async (ctx) => {\\
  const lang = ctx.match[1];\\
  await executePromoSend(ctx, lang);\\
});\\
bot.action(\"promo_verify_payment\", handlePaymentVerification);\\
bot.action(/^promo_confirm_(.+)$/, async (ctx) => {\\
  const userId = ctx.match[1];\\
  await handleAdminConfirmation(ctx, userId);\\
});\\
bot.action(/^promo_reject_(.+)$/, async (ctx) => {\\
  const userId = ctx.match[1];\\
  await handleAdminRejection(ctx, userId);\\
});\\
bot.action(\"promo_cancel\", handlePromoCancel);" src/bot/index.js
  fi

  echo "✅ Added promo handler to bot index"
else
  echo "⚠️  Promo handler already in bot index"
fi

# Restart bot
pm2 restart pnptv-bot
pm2 logs pnptv-bot --lines 20

