# ⚡ Quick Start Guide

Get your PNPtv bot and Mini App running in 5 minutes!

## 🎯 What You'll Get

- ✅ Telegram bot running
- ✅ Web server with API
- ✅ Mini App accessible in browser
- ✅ Demo mode ready to test

## 📋 Prerequisites

- ✅ Node.js 18+ installed
- ✅ npm installed
- ✅ Telegram bot token (from [@BotFather](https://t.me/BotFather))
- ✅ Firebase project created

## 🚀 Steps

### 1. Fix Port Conflict (If Running)

If you're seeing "address already in use" error:

```bash
# Press Ctrl+C to stop the bot
```

### 2. Verify .env Configuration

Make sure your `.env` file has:

```env
TELEGRAM_TOKEN=your_bot_token_here
FIREBASE_PROJECT_ID=your_project_id
WEB_PORT=3000
WEB_APP_URL=http://localhost:3000
```

### 3. Start the Bot

```bash
npm start
```

You should see:
```
✅ PNPtv Bot is running!
📱 Bot username: @PNPtvbot
🌐 Mini App available at: http://localhost:3000
```

### 4. Test Demo Mode (No Telegram Needed!)

Open in your browser:
```
http://localhost:3000/demo.html
```

**What you'll see:**
- ✅ Profile page with demo user
- ✅ Map with 5 nearby demo users
- ✅ Premium plans (Free, Silver, Golden)
- ✅ Live streams placeholder
- ✅ Bottom navigation

**Try it now!** Click around, change radius, view plans - all working!

### 5. Test in Telegram (Optional)

For now, the bot works but Mini App won't open without HTTPS. To test:

**Quick test (bot commands only):**
```
1. Open Telegram
2. Search for @PNPtvbot
3. Send /start
4. Try commands: /profile, /map, /help
```

**Full Mini App test (requires ngrok):**
See [MINI_APP_SETUP.md](MINI_APP_SETUP.md) for ngrok setup.

## 🎨 What to Try in Demo Mode

### Profile Page
- View profile information
- See XP and badges
- Read bio and location

### Map Page
- Click "Load Demo Users" button
- See 5 nearby users with distances
- Try different radius buttons (5km, 10km, 25km, 50km)
- Notice user tier badges (🥇 Golden, 🥈 Silver, ⚪ Free)

### Premium Page
- Browse three subscription tiers
- See feature lists
- Click subscribe buttons (will show alert in demo)

### Navigation
- Tap bottom navigation icons
- Switch between pages smoothly
- Notice Telegram-like design

## 📱 Bot Commands Available Now

Open Telegram and try:

| Command | What it does |
|---------|--------------|
| `/start` | Start bot and see main menu |
| `/profile` | View your profile |
| `/map` | Find nearby users |
| `/live` | View live streams (coming soon) |
| `/subscribe` | View premium plans |
| `/help` | Get help |

## 🎯 Next Steps

### Immediate (Working Now)
1. ✅ Test demo mode at `http://localhost:3000/demo.html`
2. ✅ Test bot commands in Telegram
3. ✅ Check keyboard menu buttons work

### Short-term (Requires Setup)
1. Setup ngrok for full Mini App testing in Telegram
2. Configure production domain
3. Add real users and test geolocation

### Long-term (Future Features)
1. Implement live streaming
2. Add photo serving
3. Enable in-app payments
4. Build user-to-user chat

## 🔧 Common Issues

### Port 3000 already in use
```bash
# Stop the bot with Ctrl+C
# OR kill the process:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Demo page doesn't load
- Check URL: `http://localhost:3000/demo.html` (not .com!)
- Verify bot is running
- Look for "🌐 Mini App available at..." message

### Bot doesn't respond in Telegram
- Verify TELEGRAM_TOKEN in .env
- Check bot is running (look for "✅ PNPtv Bot is running!")
- Try `/start` command

### Mini App button doesn't work
- This is expected for local testing
- Telegram requires HTTPS for Mini Apps
- Use demo mode instead: `http://localhost:3000/demo.html`
- Or setup ngrok (see MINI_APP_SETUP.md)

## 📚 More Info

- **Full Setup Guide:** [MINI_APP_SETUP.md](MINI_APP_SETUP.md)
- **Implementation Details:** [MINI_APP_COMPLETE.md](MINI_APP_COMPLETE.md)
- **Project Overview:** [README.md](README.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## ✅ Quick Health Check

Your setup is working if you see:

```bash
npm start
```

Output shows:
- ✅ "Firebase ha sido inicializado correctamente"
- ✅ "Bot started successfully"
- ✅ "PNPtv Bot is running..."
- ✅ "Web server running on port 3000"
- ✅ "Mini App available at: http://localhost:3000"

And browser shows:
- ✅ Demo page loads at `http://localhost:3000/demo.html`
- ✅ All 4 pages work (Profile, Map, Live, Premium)
- ✅ Navigation switches between pages
- ✅ Demo users load on map

## 🎉 Success!

If you can:
1. ✅ Start the bot without errors
2. ✅ Open demo page in browser
3. ✅ See and click around the interface
4. ✅ Send bot commands in Telegram

**You're all set!** Everything is working correctly.

---

**Pro Tip:** Bookmark the demo page (`http://localhost:3000/demo.html`) for quick testing without opening Telegram!

## 🆘 Still Stuck?

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Read error messages in console
3. Look at `logs/error.log`
4. Ensure all prerequisites are met

**Remember:** The demo mode works right now without any additional setup! Try it:
```
http://localhost:3000/demo.html
```
