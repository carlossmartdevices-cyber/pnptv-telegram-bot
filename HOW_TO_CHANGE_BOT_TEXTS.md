# 📝 How to Change Bot Texts

## Overview

Your PNPtv bot uses a **translation system** that allows you to easily change all text messages in both **English** and **Spanish** without touching the code.

All bot texts are stored in **2 JSON files**:
- `src/locales/en.json` - English translations
- `src/locales/es.json` - Spanish translations

---

## 🎯 Quick Start: Change a Text

### Example: Change the Welcome Message

1. **Open the translation file:**
   ```bash
   # For English
   Open: src/locales/en.json

   # For Spanish
   Open: src/locales/es.json
   ```

2. **Find the key you want to change:**
   ```json
   {
     "welcome": "💫 **Welcome to PNPtv!**\n\nBienvenidos a PNPtv!"
   }
   ```

3. **Edit the text:**
   ```json
   {
     "welcome": "💫 **Welcome to the Party!**\n\n¡Bienvenido a la Fiesta!"
   }
   ```

4. **Save the file**

5. **Restart the bot:**
   ```bash
   npm start
   ```

That's it! The new text will appear immediately.

---

## 📋 Complete List of Text Keys

Here are all the text keys you can customize:

### Onboarding & Welcome
- `welcome` - First welcome message
- `languagePrompt` - Language selection prompt
- `languageEnglish` - English language button
- `languageSpanish` - Spanish language button
- `ageVerification` - Age verification message
- `confirmAge` - Age confirmation button
- `terms` - Terms & conditions message
- `privacy` - Privacy policy message
- `accept` - Accept button
- `decline` - Decline button
- `termsDeclined` - Terms declined message
- `privacyDeclined` - Privacy declined message
- `profileCreated` - Profile creation success
- `onboardingReward` - Onboarding reward message
- `mainMenuIntro` - Main menu introduction

### Profile & User Info
- `profileInfo` - Profile display template
- `editBio` - Edit bio button
- `editLocation` - Edit location button
- `enterBio` - Bio editing prompt
- `bioUpdated` - Bio update confirmation
- `enterLocation` - Location editing prompt
- `locationUpdated` - Location update confirmation

### Plans & Subscriptions
- `selectPlan` - Plan selection prompt
- `silverFeatures` - Silver plan features
- `goldenFeatures` - Golden plan features
- `paymentRedirect` - Payment redirect message
- `paymentButton` - Payment button text
- `subscriptionSuccess` - Subscription success message
- `subscriptionError` - Subscription error message
- `membershipExpires` - Membership expiration info
- `membershipExpired` - Expired membership info
- `membershipActivatedAdmin` - Admin activation notification

### Map & Location
- `mapInfo` - Map feature description
- `viewMap` - View map button
- `shareLocation` - Share location button
- `searchNearby` - Search nearby button

### Live Streaming
- `liveInfo` - Live streaming description
- `startLive` - Start live button
- `viewLives` - View lives button
- `liveComingSoon` - Coming soon message

### Admin Panel
- `adminPanel` - Admin panel title
- `adminUsers` - Manage users button
- `adminPlans` - Manage plans button
- `adminMenus` - Configure menus button
- `adminBroadcast` - Send broadcast button
- `adminStats` - View stats button
- `adminExpiringSoon` - Expiring soon button
- `adminExpireCheck` - Check expirations button
- `userStats` - User statistics template
- `broadcastPrompt` - Broadcast prompt
- `broadcastSent` - Broadcast sent confirmation

### General
- `error` - Generic error message
- `invalidInput` - Invalid input message
- `pleaseCompleteOnboarding` - Onboarding incomplete message
- `helpInfo` - Help menu content

---

## 🔧 Advanced: Using Variables in Texts

Some texts use **variables** (placeholders) that get replaced with actual data. Variables are wrapped in `{curly braces}`.

### Example with Variables:

```json
{
  "profileInfo": "👤 **Your PNPtv Profile**\n\n🆔 ID: `{userId}`\n💋 Username: @{username}\n⭐ XP: {xp}\n🏆 Badges: {badges}\n💎 Tier: {tier}"
}
```

**Available variables:**
- `{userId}` - User's Telegram ID
- `{username}` - User's username
- `{xp}` - User's XP points
- `{tier}` - User's membership tier
- `{date}` - Expiration date
- `{daysRemaining}` - Days until expiration
- `{plan}` - Plan name
- `{count}` - Count of items
- `{badge}` - Badge name

**⚠️ Important:** Don't remove the `{variable}` placeholders - only change the text around them!

---

## ✍️ Formatting Guide

### Markdown Formatting

The bot supports **Markdown** formatting:

```
**Bold text** - Use double asterisks
*Italic text* - Use single asterisks
`Code/ID` - Use backticks
\n - New line
\n\n - Paragraph break
```

### Emojis

You can use any emoji in your texts. Just copy and paste them:
```json
{
  "welcome": "🎉 Welcome! 🔥"
}
```

---

## 🌍 Adding a New Language

To add a new language (e.g., Portuguese):

1. **Create a new file:**
   ```bash
   src/locales/pt.json
   ```

2. **Copy the English file:**
   ```bash
   # Copy en.json content to pt.json
   ```

3. **Translate all texts to Portuguese**

4. **The system will automatically detect it!**

No code changes needed - the bot auto-loads all `.json` files from `src/locales/`.

---

## 🆕 Adding New Text Keys

If you need to add a completely new text that doesn't exist:

1. **Add it to BOTH language files:**

   **src/locales/en.json:**
   ```json
   {
     "newFeature": "🎯 Check out our new feature!"
   }
   ```

   **src/locales/es.json:**
   ```json
   {
     "newFeature": "🎯 ¡Mira nuestra nueva función!"
   }
   ```

2. **Use it in your code:**
   ```javascript
   const { t } = require("./utils/i18n");

   await ctx.reply(t("newFeature", lang));
   ```

---

## 🔍 Finding Where a Text is Used

If you want to find where a specific text key is used in the code:

1. **Search for the key:**
   ```bash
   # In your project directory
   grep -r "welcome" src/
   ```

2. **Or use your code editor's search** (Ctrl+Shift+F in VS Code)

---

## ✅ Checklist Before Deploying Text Changes

- [ ] Changed text in **BOTH** `en.json` and `es.json`
- [ ] Kept all `{variables}` intact
- [ ] Tested with `npm start` locally
- [ ] No JSON syntax errors (use a JSON validator if unsure)
- [ ] Emojis display correctly
- [ ] Line breaks (`\n`) are in the right places

---

## 🚀 Quick Commands

```bash
# Edit English texts
code src/locales/en.json

# Edit Spanish texts
code src/locales/es.json

# Test changes locally
npm start

# Deploy changes to Heroku
git add src/locales/
git commit -m "Update bot texts"
git push heroku main
```

---

## 📱 Common Use Cases

### Change the Bot Name
Search for "PNPtv" in both files and replace with your new name.

### Update Payment Prices
Edit `silverFeatures` and `goldenFeatures` keys.

### Change Welcome Flow
Edit keys: `welcome`, `ageVerification`, `terms`, `privacy`, `profileCreated`

### Customize Admin Messages
Edit all keys starting with `admin*`

---

## ❓ Troubleshooting

### "Bot shows the key name instead of text"
- **Cause:** Key doesn't exist in the translation file
- **Fix:** Add the key to both `en.json` and `es.json`

### "JSON syntax error when starting bot"
- **Cause:** Invalid JSON format (missing comma, bracket, etc.)
- **Fix:** Validate your JSON at https://jsonlint.com/

### "Text doesn't change after editing"
- **Cause:** Bot wasn't restarted
- **Fix:** Stop and restart: `npm start`

### "Variables show as {userId} instead of actual ID"
- **Cause:** Variable name might be misspelled in the code
- **Fix:** Check that variable names match exactly

---

## 🎨 Pro Tips

1. **Keep it consistent** - Use the same style of emojis and formatting throughout
2. **Test both languages** - Make sure changes work in both English and Spanish
3. **Use descriptive keys** - If adding new texts, use clear key names
4. **Back up before major changes** - Copy the files before making big edits
5. **Use a JSON validator** - Validate changes at https://jsonlint.com/ before deploying

---

## 📞 Need Help?

If you're stuck or need to add custom functionality:
1. Check existing keys in the translation files
2. Look at how they're used in the code (`grep -r "keyName"`)
3. Test locally before deploying to production

---

**Happy customizing! 🎉**
