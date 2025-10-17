# Nearby Users Mini App - Quick Start

## 🌐 Your Mini App URLs

### Main Mini App
```
https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/
```

### Nearby Users Mini App (NEW!)
```
https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/nearby
```

## 🚀 Deployment Steps

### 1. Deploy to Heroku

```bash
# Commit your changes
git add .
git commit -m "Add nearby users mini app with freemium model"

# Push to Heroku
git push heroku main
```

### 2. Set Telegram Bot Menu Button (Optional)

You can add a menu button in BotFather to make the mini app easily accessible:

1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/mybots`
3. Select your bot
4. Choose "Bot Settings" → "Menu Button"
5. Send "Edit Menu Button URL"
6. Send: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/`
7. Send button text: "Open App" or "Abrir App"

### 3. Configure Web App in BotFather (If not done)

1. Open [@BotFather](https://t.me/BotFather)
2. Send `/mybots`
3. Select your bot
4. Choose "Bot Settings" → "Web App"
5. Send the URL: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com/`

## 📱 How Users Access the Mini App

### Method 1: Bot Commands

Users can type these commands in your Telegram bot:

```
/nearby          - Opens the Nearby Users mini app
/map             - Opens the map view in bot
/start           - Shows main menu with mini app button
```

### Method 2: Text Messages

Users can also send text messages:
- "nearby"
- "cercano" (Spanish)
- "cerca" (Spanish)

### Method 3: Menu Button

If configured, users can tap the menu button (≡) next to the message input field.

### Method 4: Inline Button

When users send `/start`, they'll see an inline button to open the mini app.

## 🎯 Features

### Nearby Users Mini App

**Free Features:**
- ✨ Search nearby users within 5km - 50km
- 👥 View user profiles (username, bio, XP, tier, distance)
- 💬 **Chat with first 3 users for FREE**

**Premium Features:**
- 🔓 Unlimited chats with all nearby users
- ⭐ All other premium benefits

## 🧪 Testing

### Test the Mini App

1. **Open your bot** on Telegram
2. **Send** `/nearby`
3. **Tap** the "Open Nearby Users App" button
4. **Allow** location permissions
5. **Search** for nearby users
6. **Tap** on a user card to view their profile
7. **Test** the freemium model:
   - Unlock 3 users (free)
   - Try to unlock a 4th user (should show upgrade prompt)

### Test Chat Functionality

1. Open a user profile in the nearby app
2. If user is unlocked, tap "Start Chat"
3. Should redirect to Telegram chat with that user

### Test Premium Access

1. Subscribe to a plan via `/subscribe`
2. Complete payment (test mode if enabled)
3. Open nearby app again
4. All users should be unlocked
5. Stats should show "Unlimited" instead of "3/3"

## 🔧 Troubleshooting

### Mini App Not Opening

**Check:**
- Is `WEB_APP_URL` set correctly on Heroku?
  ```bash
  heroku config:get WEB_APP_URL
  ```
- Does it use HTTPS (not HTTP)?
- Is the bot deployed to Heroku?

**Fix:**
```bash
heroku config:set WEB_APP_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
git push heroku main
```

### Location Not Working

**In Telegram:**
- Telegram WebApp automatically provides location
- User must grant permission when prompted

**In Browser:**
- Browser will request location permission
- User must allow location access
- Only works on HTTPS (not localhost HTTP)

### Users Not Appearing

**Check:**
1. Do other users have location data in Firebase?
2. Are users within the selected radius?
3. Check Heroku logs:
   ```bash
   heroku logs --tail
   ```

### Chat Not Opening

**Possible causes:**
- User doesn't have a username (need to use user ID instead)
- Telegram app not installed
- User blocked the bot

**Check logs:**
```bash
heroku logs --tail --source app
```

## 📊 Monitoring

### Check Logs

```bash
# Real-time logs
heroku logs --tail

# Recent logs
heroku logs -n 200

# Search for errors
heroku logs --tail | findstr ERROR
```

### Check App Status

```bash
heroku ps
```

### Monitor Usage

Access your Heroku dashboard:
```
https://dashboard.heroku.com/apps/pnptv-telegram-bot
```

## 🔐 Security Notes

### Current Config (Production URLs)

Your app is configured with production URLs:
- ✅ BOT_URL: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com`
- ✅ WEB_APP_URL: `https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com`
- ⚠️ WEBAPP_URL: `https://pnptv-telegram-bot.herokuapp.com` (different!)

Note: `WEBAPP_URL` points to a different domain. If this is intentional, ignore. Otherwise, update it:

```bash
heroku config:set WEBAPP_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
```

### Location Privacy

- User locations are stored with geohash for privacy
- Only approximate locations shown to other users
- No exact coordinates displayed in UI

### Chat Tracking

- Free chat unlocks stored in browser localStorage
- No server-side tracking of who chats with whom
- Premium users bypass all restrictions

## 📈 Next Steps

### 1. Deploy Now

```bash
git add .
git commit -m "Add nearby users mini app"
git push heroku main
```

### 2. Test on Telegram

Open your bot and send `/nearby`

### 3. Configure BotFather

Set up menu button for easy access

### 4. Promote to Users

Let your users know about the new feature!

## 🎨 Customization

### Change Free Chat Limit

Edit `src/web/public/nearby.js`:

```javascript
const FREE_CHAT_LIMIT = 3; // Change to 5, 10, etc.
```

### Modify Default Radius

Edit `src/web/public/nearby.js`:

```javascript
state.selectedRadius = 10; // Change to 5, 25, 50, etc.
```

### Update Styling

Edit `src/web/public/nearby.css` to match your brand colors.

## 📚 Documentation

Full documentation available at:
- **Nearby App**: `docs/NEARBY_MINIAPP.md`
- **Main App Testing**: `docs/PRUEBAS_LOCALES_MINIAPP.md`
- **Deployment**: `docs/DESPLIEGUE_PRODUCCION.md`
- **Configuration**: `docs/CONFIGURACION_EPAYCO.md`

## 🆘 Support

If you encounter issues:

1. Check Heroku logs: `heroku logs --tail`
2. Review documentation in `docs/` folder
3. Check environment variables: `heroku config`
4. Verify bot is running: `heroku ps`

---

## 🎉 You're All Set!

Your nearby users mini app is ready to deploy. Just push to Heroku and start testing!

```bash
git push heroku main
```

Then open your Telegram bot and send `/nearby` to see it in action! 🚀
