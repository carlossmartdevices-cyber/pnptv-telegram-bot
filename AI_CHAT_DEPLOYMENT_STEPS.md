# 🤖 AI Chat Fix - Deployment Instructions

## Problem Summary
The AI chat support feature was not working due to:
1. Missing `t()` method in `config/i18n.js`
2. Incorrect i18n module import in `aiChat.js`
3. Missing message length handling for long responses

## Solution Applied
All fixes have been committed to the `daimo-2` branch:

### Commits:
- `e833a7b` - Restore AI chat to use config/i18n (ROOT FIX)
- `d63dc4e` - Add message length handling
- `49965c3` - Update AI prompt with Daimo Pay info

### Files Modified:
1. **src/config/i18n.js**
   - Added `t()` method as alias for `getText()`
   - Updated all AI chat messages (EN + ES)

2. **src/bot/handlers/aiChat.js**
   - Changed import to use `config/i18n`
   - Added message chunking for long responses
   - Reduced maxTokens to 300
   - Updated system prompt with Daimo Pay details

---

## 🚀 Deployment Steps for Production

### Option 1: Git Pull (Recommended)

```bash
# 1. SSH to your server
ssh your-user@your-server-ip

# 2. Navigate to bot directory
cd /var/www/telegram-bot

# 3. Backup current files (IMPORTANT!)
cp src/bot/handlers/aiChat.js src/bot/handlers/aiChat.js.backup
cp src/config/i18n.js src/config/i18n.js.backup

# 4. Pull latest changes from daimo-2 branch
git fetch origin
git pull origin daimo-2

# 5. Verify the changes were applied
head -1 src/bot/handlers/aiChat.js
# Should output: const i18n = require("../../config/i18n");

grep "t: function" src/config/i18n.js
# Should output: t: function (language, key) {

# 6. Restart the bot
pm2 restart pnptv-bot
# OR if your process is named differently:
pm2 restart pnptv-b

# 7. Monitor logs
pm2 logs pnptv-bot --lines 100
```

### Option 2: Manual File Update (if git pull fails)

```bash
# 1. SSH to your server
ssh your-user@your-server-ip

# 2. Navigate to bot directory
cd /var/www/telegram-bot

# 3. Backup files
cp src/bot/handlers/aiChat.js src/bot/handlers/aiChat.js.backup
cp src/config/i18n.js src/config/i18n.js.backup

# 4. Edit src/config/i18n.js
nano src/config/i18n.js

# Add this method before the closing }; (around line 43):
#   // Alias for compatibility
#   t: function (language, key) {
#     return this.getText(language, key);
#   },

# Save: Ctrl+O, Exit: Ctrl+X

# 5. Edit src/bot/handlers/aiChat.js
nano src/bot/handlers/aiChat.js

# Change line 1 from:
#   const i18n = require("../../utils/i18n");
# To:
#   const i18n = require("../../config/i18n");

# Save: Ctrl+O, Exit: Ctrl+X

# 6. Restart bot
pm2 restart pnptv-bot

# 7. Check logs
pm2 logs pnptv-bot --lines 100
```

---

## ✅ Verification Steps

### 1. Check Logs
```bash
pm2 logs pnptv-bot --lines 50
```

**Good signs:**
- No `TypeError: i18n.t is not a function` errors
- No `Bad Request: message is too long` errors
- Bot starts without errors

### 2. Test in Telegram

Open your bot and try:

```
You: /aichat
Bot: 🤖 **Hello! Welcome to PNPtv Support** [... full welcome message]

You: How can I subscribe?
Bot: [Should mention Daimo Pay and /subscribe command]

You: What are your plans?
Bot: [Should list all membership tiers with prices]

You: /endchat
Bot: ✅ Chat ended. Returning to main menu...
```

### 3. Verify Files on Server

```bash
# Check i18n module has t() method
grep -A 3 "t: function" /var/www/telegram-bot/src/config/i18n.js

# Check aiChat uses correct import
head -5 /var/www/telegram-bot/src/bot/handlers/aiChat.js
```

---

## 🔴 Troubleshooting

### Still Getting "i18n.t is not a function"?

**Check 1:** Verify import in aiChat.js
```bash
head -1 /var/www/telegram-bot/src/bot/handlers/aiChat.js
```
Should show: `const i18n = require("../../config/i18n");`

**Check 2:** Verify t() method exists
```bash
grep "t: function" /var/www/telegram-bot/src/config/i18n.js
```
Should show the t() method definition

**Check 3:** Hard restart
```bash
pm2 delete pnptv-bot
pm2 start ecosystem.config.js  # or however you normally start it
```

### Still Getting "message is too long"?

Check if the message chunking code is present:
```bash
grep -A 5 "MAX_MESSAGE_LENGTH" /var/www/telegram-bot/src/bot/handlers/aiChat.js
```

If not found, you need to pull the latest changes again.

### AI Chat Not Responding?

**Check 1:** Verify MISTRAL_API_KEY is set
```bash
grep MISTRAL_API_KEY /var/www/telegram-bot/.env
```

**Check 2:** Check if Mistral package is installed
```bash
cd /var/www/telegram-bot
npm list @mistralai/mistralai
```

**Check 3:** Test manually
```bash
node -e "const i18n = require('./src/config/i18n'); console.log(i18n.t('en', 'aiChatWelcome').substring(0, 50));"
```

---

## 🔄 Rollback Instructions

If something goes wrong, restore the backups:

```bash
cd /var/www/telegram-bot

# Restore backups
cp src/bot/handlers/aiChat.js.backup src/bot/handlers/aiChat.js
cp src/config/i18n.js.backup src/config/i18n.js

# Restart
pm2 restart pnptv-bot

# Verify
pm2 logs pnptv-bot
```

---

## 📊 What Was Fixed

### Before (Broken):
- ❌ Used `require("../../utils/i18n")` in aiChat.js
- ❌ Called `i18n.t()` but config/i18n didn't have `t()` method
- ❌ No message length handling
- ❌ Long AI responses crashed with "message too long"

### After (Fixed):
- ✅ Uses `require("../../config/i18n")` (original working setup)
- ✅ config/i18n has `t()` method as alias
- ✅ Messages automatically split if > 4000 chars
- ✅ Reduced maxTokens to 300 to prevent huge responses
- ✅ Updated system prompt with Daimo Pay info
- ✅ Improved error logging

---

## 📝 Summary

The AI chat is now fully functional with:
- ✅ Correct i18n module usage
- ✅ Message length handling
- ✅ Daimo Pay recommendations
- ✅ Multi-language support (EN/ES)
- ✅ Professional customer support prompts
- ✅ Rate limiting (3 seconds between messages)
- ✅ Conversation history management

**Total Commits:** 3 commits fixing all issues
**Branch:** daimo-2
**Status:** ✅ READY FOR PRODUCTION
