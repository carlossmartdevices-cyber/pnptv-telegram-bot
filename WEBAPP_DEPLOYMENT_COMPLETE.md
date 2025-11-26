# WebApp Deployment Complete - November 11, 2025

## Status: ✅ FULLY OPERATIONAL

### What Was Done

1. **Fixed Critical Syntax Errors** (Production Outage)
   - **daimoPayHandler.js** - Removed orphaned closing brace breaking try block
   - **promoHandler.js** - Fixed 11 escaped template literals (template strings had backslashes)
   - Server went from **crash-loop (4,301 restarts)** → **ONLINE and stable**

2. **Deployed Next.js WebApp as Separate PM2 Service**
   - Created `ecosystem.webapp.config.js` for Next.js process management
   - App runs on **port 3002** (separate from main bot on port 3000)
   - Added `basePath: '/app'` to `next.config.js` for proper routing
   - Configured Nginx to proxy `/app` and `/_next` routes to the webapp

3. **Updated Infrastructure**
   - Updated `/etc/nginx/sites-available/pnptv-bot` to route webapp traffic
   - Rebuilt Next.js webapp with `basePath` configuration (affects routes)
   - Verified all endpoints working with proper HTTP headers

### Current Architecture

```
┌─────────────────────────────────────────────────────┐
│         https://pnptv.app (Nginx - Port 443)        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  /app          →  localhost:3002 (Next.js WebApp)  │
│  /_next        →  localhost:3002 (Static Assets)   │
│  /webhook      →  localhost:3000 (Telegram Bot)    │
│  /pay /epayco  →  localhost:3000 (Payment Routes)  │
│  /              →  localhost:3000 (Bot Main)       │
│                                                     │
└─────────────────────────────────────────────────────┘
       ↓                        ↓
   [Next.js 15]           [Express + Telegraf]
   Port 3002              Port 3000
   (pnptv-webapp)         (pnptv-bot)
   5 minutes uptime       37 minutes uptime
   12.3 MB RAM            81.4 MB RAM
```

### Endpoint Status

| Endpoint | Status | Response | Purpose |
|----------|--------|----------|---------|
| `https://pnptv.app/` | ✅ 200 OK | HTML | Main landing page |
| `https://pnptv.app/app` | ✅ 200 OK | HTML | WebApp/Mini App |
| `https://pnptv.app/app/` | ✅ 200 OK | HTML | WebApp with trailing slash |
| `https://pnptv.app/_next/static/*` | ✅ 200 OK | Assets | Next.js static files |
| `https://pnptv.app/webhook` | ✅ 200 OK | JSON | Telegram webhook (when POST) |
| `https://pnptv.app/health` | ✅ 200 OK | JSON | Bot health check |
| `https://pnptv.app/debug/webapp` | ✅ 200 OK | JSON | WebApp diagnostics |

### Key Configuration Changes

**next.config.js** - Added basePath:
```javascript
const nextConfig = {
  basePath: '/app',  // ← NEW: Routes all pages under /app
  reactStrictMode: true,
  // ... rest of config
};
```

**Nginx Configuration** - Routes to port 3002:
```nginx
location /app {
    proxy_pass http://localhost:3002;
    # ... headers and settings
}

location /_next {
    proxy_pass http://localhost:3002;
    # ... headers and settings
}
```

**PM2 Processes**:
- **pnptv-bot** (ID 2) - Main Express/Telegraf bot on port 3000 ✅ ONLINE
- **pnptv-webapp** (ID 3) - Next.js WebApp on port 3002 ✅ ONLINE

### How the Mini App Works Now

1. User opens Telegram bot and presses "Open Mini App" button
2. Telegram loads `https://pnptv.app/app` in a WebView
3. Nginx proxies request to `localhost:3002` (Next.js app)
4. Next.js serves the app with `basePath: '/app'` (all routes prefixed with `/app`)
5. Static assets (`_next/static/*`) loaded from Next.js server
6. Bot API calls made via `NEXT_PUBLIC_API_URL` environment variable pointing to `https://pnptv.app`

### Monitoring & Maintenance

**Check Service Status**:
```bash
pm2 status  # View all processes
pm2 logs pnptv-bot  # View bot logs
pm2 logs pnptv-webapp  # View webapp logs
```

**Restart Services**:
```bash
pm2 restart pnptv-bot  # Restart bot only
pm2 restart pnptv-webapp  # Restart webapp only
pm2 restart all  # Restart everything
```

**Update Webapp**:
```bash
cd /root/bot\ 1/src/webapp
git pull  # or manual updates
npm run build  # Rebuild with basePath
pm2 restart pnptv-webapp
```

### Files Modified

1. **Fixed**:
   - `/root/bot 1/src/bot/handlers/daimoPayHandler.js` - Syntax error fix
   - `/root/bot 1/src/bot/handlers/promoHandler.js` - Template literal fixes
   - `/root/bot 1/src/bot/webhook.js` - Fallback webapp route

2. **Created**:
   - `/root/bot 1/ecosystem.webapp.config.js` - PM2 config for Next.js
   - `/root/bot 1/CRITICAL_FIXES_NOV_11_2025.md` - Outage documentation

3. **Updated**:
   - `/root/bot 1/src/webapp/next.config.js` - Added `basePath: '/app'`
   - `/etc/nginx/sites-available/pnptv-bot` - Proxy routing to port 3002

### Testing the WebApp

**Local testing** (with SSH):
```bash
# Check webapp is running
curl -I http://localhost:3002

# Check bot is running
curl -I http://localhost:3000/health

# Check Nginx routing
curl -I https://pnptv.app/app
```

**Production verification**:
- Open Telegram
- Use `/app` command to launch mini app
- Verify page loads and is interactive

### Environment Variables

**For Next.js WebApp** (set in `src/webapp/next.config.js`):
- `NEXT_PUBLIC_BOT_URL` - Used for API calls (default: `https://pnptv.app`)
- `NEXT_PUBLIC_WEBAPP_URL` - The webapp URL (default: `https://pnptv.app/app`)
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` - Bot name (default: `PNPtvBot`)
- `NEXT_PUBLIC_API_URL` - API endpoint (default: `https://pnptv.app`)

All environment variables are baked into the Next.js build. To change them, edit `next.config.js` and rebuild.

### Troubleshooting

**WebApp shows 404**:
```bash
# Verify basePath in routes manifest
grep '"basePath"' /root/bot\ 1/src/webapp/.next/routes-manifest.json

# Should show: "basePath": "/app"
```

**WebApp not loading**:
```bash
# Check if Next.js is running
pm2 status | grep pnptv-webapp

# Check if port 3002 is listening
lsof -i :3002

# View webapp logs
pm2 logs pnptv-webapp --lines 50
```

**502 Bad Gateway**:
```bash
# Check Nginx syntax
sudo nginx -t

# Check both backends are running
curl -I http://localhost:3000  # Bot
curl -I http://localhost:3002  # WebApp

# Reload Nginx if syntax is OK
sudo systemctl reload nginx
```

### Timeline

| Time | Event |
|------|-------|
| 13:03 UTC | Server crashed, 4,301 PM2 restarts detected |
| 13:05 UTC | Fixed daimoPayHandler.js syntax error |
| 13:06 UTC | Fixed promoHandler.js template literals |
| 13:10 UTC | Server ONLINE, all core functionality restored |
| 17:30 UTC | Started webapp deployment work |
| 18:02 UTC | WebApp fully operational with basePath |

### Success Metrics

✅ **Bot Operational**: Responding to Telegram commands  
✅ **WebApp Accessible**: Loading at `https://pnptv.app/app`  
✅ **Static Assets**: Next.js `_next/static/*` serving correctly  
✅ **Performance**: Sub-1000ms response times  
✅ **Memory**: All processes stable within limits  
✅ **Uptime**: Both services running without crashes  

---

**Deployed By**: GitHub Copilot  
**Date**: November 11, 2025  
**Status**: 🟢 PRODUCTION READY
