# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### ❌ "EADDRINUSE: address already in use :::3000"

**Problem:** Port 3000 is already in use by another process.

**Solutions:**

#### Option 1: Stop the existing process (Recommended)
```bash
# Press Ctrl+C in the terminal where the bot is running
```

#### Option 2: Kill the process using port 3000
**Windows:**
```bash
# Find the process
netstat -ano | findstr :3000

# Kill it (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
```

#### Option 3: Use a different port
Edit `.env`:
```env
WEB_PORT=3001
```

Then restart:
```bash
npm start
```

### ❌ Mini App button doesn't open

**Problem:** The Mini App URL is not HTTPS or is incorrect.

**Solutions:**

1. **For local testing**, use ngrok:
   ```bash
   # Install ngrok
   choco install ngrok

   # Start tunnel
   ngrok http 3000

   # Update .env with the HTTPS URL
   WEB_APP_URL=https://abc123.ngrok.io
   ```

2. **For production**, ensure you have:
   - Valid HTTPS domain
   - SSL certificate installed
   - WEB_APP_URL set to production domain

### ❌ Bot doesn't respond

**Problem:** Bot token is invalid or bot is not running.

**Solutions:**

1. Check bot token in `.env`:
   ```env
   TELEGRAM_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
   ```

2. Verify bot is running:
   ```bash
   npm start
   ```
   Look for: `✅ PNPtv Bot is running!`

3. Check logs:
   ```bash
   cat logs/error.log
   ```

### ❌ Firebase errors

**Problem:** Firebase credentials are missing or invalid.

**Solutions:**

1. Verify `serviceAccountKey.json` exists in `src/config/`
2. Check Firebase project ID in `.env`:
   ```env
   FIREBASE_PROJECT_ID=your_project_id
   ```
3. Ensure Firestore is enabled in Firebase Console

### ❌ API returns 404

**Problem:** Web server is not running or routes are misconfigured.

**Solutions:**

1. Check that web server started:
   ```
   🌐 Mini App available at: http://localhost:3000
   ```

2. Test API endpoint:
   ```bash
   curl http://localhost:3000/api/plans
   ```

3. Check server logs for errors

### ❌ Demo mode doesn't load

**Problem:** Static files are not being served.

**Solutions:**

1. Verify files exist:
   - `src/web/public/demo.html`
   - `src/web/public/styles.css`
   - `src/web/public/app.js`

2. Check browser console for errors (F12)

3. Clear browser cache (Ctrl+F5)

### ❌ Location/Map features don't work

**Problem:** User hasn't shared location or geolocation utils are missing.

**Solutions:**

1. Users must share location via bot first:
   ```
   /map → Share Location
   ```

2. Verify `src/utils/geolocation.js` exists

3. Check Firebase has location data:
   - Collection: `users`
   - Field: `location` with `latitude` and `longitude`

### ❌ Payments not working

**Problem:** ePayco API credentials are invalid or missing.

**Solutions:**

1. Check ePayco credentials in `.env`:
   ```env
   ```

2. Verify ePayco API is accessible
3. Check logs for ePayco API errors

### ❌ Sessions lost after restart

**Problem:** Session file was deleted or is not writable.

**Solutions:**

1. Check `sessions.json` exists and has correct permissions
2. Verify directory is writable
3. Sessions are stored in memory by default - use persistent storage for production

### ❌ Rate limiting blocking users

**Problem:** Rate limit is too strict.

**Solutions:**

Edit `src/bot/middleware/rateLimit.js`:
```javascript
const MAX_REQUESTS = 30; // Increase this
const WINDOW_MS = 60000; // Or increase time window
```

### ❌ Admin commands not working

**Problem:** User ID is not in admin list.

**Solutions:**

1. Get your Telegram user ID from [@userinfobot](https://t.me/userinfobot)

2. Add to `.env`:
   ```env
   ADMIN_IDS=123456789,987654321
   ```

3. Or edit `src/config/admin.js`

4. Restart bot

## 🔍 Debugging Tips

### Check logs
```bash
# View error log
cat logs/error.log

# View all logs
cat logs/combined.log

# Follow logs in real-time
tail -f logs/combined.log
```

### Test API endpoints
```bash
# Test plans endpoint
curl http://localhost:3000/api/plans

# Test profile endpoint (replace USER_ID)
curl http://localhost:3000/api/profile/123456789
```

### Verify environment variables
```bash
# Print all env vars (be careful with secrets!)
node -e "require('dotenv').config(); console.log(process.env)"
```

### Check Firebase connection
```bash
npm run test:connection
```

### Restart bot cleanly
```bash
# Stop all processes
pkill -f "node.*bot"

# Clear sessions (optional)
rm sessions.json

# Start fresh
npm start
```

## 📞 Still Having Issues?

1. **Check documentation:**
   - [README.md](README.md)
   - [MINI_APP_SETUP.md](MINI_APP_SETUP.md)
   - [MINI_APP_COMPLETE.md](MINI_APP_COMPLETE.md)

2. **Review logs:**
   - `logs/error.log`
   - `logs/combined.log`
   - Browser console (F12)

3. **Test incrementally:**
   - Start with demo mode
   - Then test bot commands
   - Then test Mini App
   - Finally test with real users

4. **Common checklist:**
   - [ ] Bot token is valid
   - [ ] Firebase is configured
   - [ ] .env file exists and is filled out
   - [ ] Dependencies are installed (`npm install`)
   - [ ] Port 3000 is available
   - [ ] Node.js version is 18+

## 🆘 Emergency Reset

If nothing works, try a complete reset:

```bash
# Stop all processes
pkill -f node

# Remove dependencies
rm -rf node_modules package-lock.json

# Clear sessions
rm sessions.json

# Clear logs
rm -rf logs/*

# Reinstall
npm install

# Restart
npm start
```

---

For more help, open an issue on GitHub or contact support through the bot.

