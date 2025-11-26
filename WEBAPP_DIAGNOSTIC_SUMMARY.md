# WebApp Mini App Diagnostic Summary

**Date:** November 11, 2025  
**Issue:** Mini app not showing when users try to access it via bot  
**Status:** ✅ Root cause identified and fixes applied

---

## 🔍 Investigation Results

### Build Status
- ✅ **Next.js build EXISTS** at `src/webapp/.next`
- ✅ Build date: November 10, 2024 12:19
- ✅ Contains all required files:
  - `server/app/index.html` (entry point)
  - `static/chunks/` (JavaScript assets)
  - `static/css/` (stylesheets)

### Server Configuration

#### Express Routes (src/bot/webhook.js)
✅ **FIXED** - Added webapp static serving:
- `GET /app` → serves `src/webapp/.next/server/app/index.html`
- `GET /app/*` → client-side routing fallback
- `/_next/static/*` → serves built static assets
- `/_next/*` → serves other Next.js assets

#### PM2 Process Manager
- **Process:** `pnptv-bot`
- **Script:** `src/bot/webhook.js`
- **Port:** 3000
- **Status:** Production webhook mode

#### Nginx Reverse Proxy
- **Config:** `/etc/nginx/sites-available/pnptv-bot`
- **Domain:** pnptv.app (with SSL)
- **Proxy:** All requests to `localhost:3000`
- ✅ Catch-all `location /` properly forwards `/app` and `/_next` to Node server

### Environment Variables

#### BEFORE (❌ Issue)
```bash
WEB_APP_URL=https://pnptv.app/app          # ✓ Correct (used by bot)
NEXT_PUBLIC_WEBAPP_URL=https://pnptv.app   # ✗ Missing /app path
```

#### AFTER (✅ Fixed)
```bash
WEB_APP_URL=https://pnptv.app/app          # ✓ Correct (used by bot)
NEXT_PUBLIC_WEBAPP_URL=https://pnptv.app/app # ✓ Fixed - now includes /app
```

**Impact:** The `NEXT_PUBLIC_WEBAPP_URL` env var is baked into the Next.js build and used by client-side code for internal navigation and API calls. The mismatch caused routing issues.

---

## 🛠️ Changes Made

### 1. Fixed Express Server (`src/bot/webhook.js`)
**Added static file serving for the built Next.js app:**
```javascript
// Serve _next static assets
app.use('/_next/static', express.static(path.join(__dirname, '../webapp/.next/static')));
app.use('/_next', express.static(path.join(__dirname, '../webapp/.next')));

// Serve webapp public files
app.use('/app', express.static(path.join(__dirname, '../webapp/public')));

// Serve webapp entry point for /app and /app/*
app.get('/app', (req, res) => res.sendFile(serverIndex));
app.get('/app/*', (req, res) => res.sendFile(serverIndex));
```

### 2. Added Diagnostic Endpoints
**GET /debug/webapp**
- Returns build status, env vars, and mounted routes
- Provides sample asset URL for testing

**GET /debug/webapp/verify-assets**
- Lists sample _next assets and verifies they exist on disk
- Shows file paths and sizes for debugging

### 3. Fixed Environment Variable (`.env.production`)
```diff
- NEXT_PUBLIC_WEBAPP_URL=https://pnptv.app
+ NEXT_PUBLIC_WEBAPP_URL=https://pnptv.app/app
```

### 4. Created Test Script
**File:** `test-webapp-diagnostic.sh`
- Automated test script for all diagnostic endpoints
- Checks /app accessibility and _next asset serving
- Provides color-coded pass/fail output

---

## ✅ How to Verify the Fix

### Option 1: Run Diagnostic Script (Recommended)
```bash
# On the server (or locally if testing)
./test-webapp-diagnostic.sh

# Or test against production
./test-webapp-diagnostic.sh https://pnptv.app
```

### Option 2: Manual Tests
```bash
# Test diagnostic endpoint
curl -s https://pnptv.app/debug/webapp | jq .

# Test webapp entry point
curl -I https://pnptv.app/app

# Test asset verification
curl -s https://pnptv.app/debug/webapp/verify-assets | jq .

# Test a sample static asset (get URL from diagnostic first)
curl -I https://pnptv.app/_next/static/chunks/main-app-024c5fa89d925c3a.js
```

### Option 3: Test in Telegram
1. Open bot: @PNPtvBot
2. Send `/app` command or tap "PNPtv App" button
3. Tap "🚀 Abrir App" / "🚀 Open App"
4. Mini app should load with the PNPtv interface

---

## 🚀 Deployment Steps

### 1. Rebuild Webapp (if env var changed after build)
The `NEXT_PUBLIC_WEBAPP_URL` is embedded during build. Since we changed it, rebuild:

```bash
cd /root/bot\ 1/src/webapp
npm ci
npm run build
```

### 2. Restart PM2 Process
```bash
pm2 restart pnptv-bot

# Or reload for zero-downtime
pm2 reload pnptv-bot
```

### 3. Verify Deployment
```bash
# Check PM2 status
pm2 status pnptv-bot

# Check logs for webapp mount message
pm2 logs pnptv-bot --lines 50 | grep -i "webapp"

# Should see: "✅ WebApp static mount: /app -> src/webapp/.next/server/app/index.html"
```

### 4. Test Endpoints
```bash
# Run the diagnostic script
./test-webapp-diagnostic.sh https://pnptv.app
```

---

## 📊 Expected Diagnostic Output

### Successful Output
```json
{
  "ok": true,
  "exists": {
    "webappRoot": true,
    "nextStatic": true,
    "serverIndex": true,
    "webappPublic": true
  },
  "env": {
    "WEB_APP_URL": "https://pnptv.app/app",
    "WEBAPP_URL": "https://pnptv.app/app",
    "NEXT_PUBLIC_WEBAPP_URL": "https://pnptv.app/app",
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "routes": [
    "GET /",
    "GET /health",
    "GET /ready",
    "<router> /api",
    "<router> /kyrrex",
    "<router> /daimo",
    "<static> /_next/static",
    "<static> /_next",
    "GET /app",
    "GET /app/*",
    "GET /debug/webapp",
    "GET /debug/webapp/verify-assets"
  ],
  "sampleAsset": "/_next/static/chunks/main-app-024c5fa89d925c3a.js"
}
```

---

## 🔧 Troubleshooting

### Issue: 404 on /app
**Cause:** Express routes not mounted or PM2 not restarted  
**Fix:**
```bash
pm2 restart pnptv-bot
pm2 logs pnptv-bot --lines 20
```

### Issue: Blank page or loading spinner
**Cause:** _next assets not loading (404 on static files)  
**Check:**
```bash
# Test a static asset
curl -I https://pnptv.app/_next/static/chunks/main-app-024c5fa89d925c3a.js

# Should return HTTP 200 with content-type: application/javascript
```

### Issue: Incorrect API calls or routing
**Cause:** Old NEXT_PUBLIC_WEBAPP_URL still baked into build  
**Fix:** Rebuild webapp (see Deployment Steps #1)

### Issue: Nginx 404
**Cause:** Nginx config not reloaded  
**Fix:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📝 Summary

### Root Cause
1. **Missing Express routes** - Webapp build existed but wasn't served by the Node server
2. **Environment variable mismatch** - `NEXT_PUBLIC_WEBAPP_URL` pointed to root instead of `/app`

### Solution
1. ✅ Added Express static middleware for `/_next` assets and `/app` route
2. ✅ Fixed `NEXT_PUBLIC_WEBAPP_URL` in `.env.production`
3. ✅ Added diagnostic endpoints for verification
4. ✅ Created automated test script

### Next Steps
1. Rebuild webapp (if not done yet): `cd src/webapp && npm run build`
2. Restart PM2: `pm2 restart pnptv-bot`
3. Run diagnostic: `./test-webapp-diagnostic.sh https://pnptv.app`
4. Test in Telegram bot

---

## 📚 Related Files

- **Server:** `src/bot/webhook.js` (Express routes)
- **Handler:** `src/bot/handlers/app.js` (bot /app command)
- **Build:** `src/webapp/.next/` (compiled Next.js)
- **Config:** `.env.production` (environment variables)
- **Nginx:** `/etc/nginx/sites-available/pnptv-bot`
- **PM2:** `ecosystem.config.js`
- **Test:** `test-webapp-diagnostic.sh`

---

**Status:** Ready for deployment and testing 🚀
