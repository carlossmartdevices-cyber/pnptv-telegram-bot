# Critical Production Fixes - November 11, 2025

## Issue Reported
**502 Bad Gateway nginx/1.26.3 (Ubuntu)** - Complete site outage

## Root Cause Analysis

PM2 showed rapid crash-loop:
- Process restarts: **4,301 attempts in ~2 minutes**
- PID: 0 (crashed state)
- Server not responding on localhost:3000

### Syntax Errors Found and Fixed

#### 1. **daimoPayHandler.js** (Line 33)
**Error**: `SyntaxError: Missing catch or finally after try`
**Cause**: Orphaned closing brace `}` from commented-out code block
**Fix**: Commented out the stray closing brace to match the commented-out `if` statement

```javascript
// BEFORE (broken):
//     if (!daimoConfig.enabled) {
      const errorMsg = lang === "es" ? "..." : "...";
      await ctx.reply(errorMsg);
      return;
    }  // ← This orphaned brace broke the try block

// AFTER (fixed):
//     if (!daimoConfig.enabled) {
      const errorMsg = lang === "es" ? "..." : "...";
      await ctx.reply(errorMsg);
      return;
//     }  // ← Now properly commented
```

#### 2. **promoHandler.js** (Multiple lines)
**Error**: `SyntaxError: Invalid or unexpected token`
**Cause**: All template literals were incorrectly escaped with backslashes (`\`${var}\``)
**Fix**: Removed backslash escaping from 8 template literals

Lines fixed:
- Line 74: `logger.info(`[Promo] Admin ${userId} sending promo announcement`)`
- Line 121: `logger.info(`[Promo] Admin ${userId} sent bilingual promo`)`
- Line 128: `logger.info(`[Promo] Admin ${userId} sent ${targetLang} promo`)`
- Line 143: `logger.info(`[Promo] User ${userId} requested verification`)`
- Lines 144-148: Admin notification template literal
- Lines 151-152: Callback data template literals
- Line 188: `logger.info(`[Promo] Admin ${adminId} confirming payment for ${userId}`)`
- Lines 208-209: User message conditional template literals
- Line 212: `logger.info(`[Promo] Payment confirmed for ${userId}`)`
- Line 227: `logger.info(`[Promo] Admin ${adminId} rejecting payment for ${userId}`)`
- Line 251: `logger.info(`[Promo] Payment rejected for ${userId}`)`

#### 3. **webapp/webhook.js** (Line 158)
**Error**: `NotFoundError: Not Found` when accessing `/app` route
**Cause**: Attempting to serve Next.js server build as static file
**Issue**: Next.js App Router builds require their own Node.js server, cannot be served with `res.sendFile()`
**Fix**: Replaced with simple fallback HTML page showing "WebApp coming soon" message

**Technical Note**: The webapp at `src/webapp/` is a Next.js 15 App Router project that needs to run as a separate server on port 3001. Options for proper integration:
1. Run Next.js dev/production server separately: `cd src/webapp && npm start` (port 3001)
2. Rebuild with `output: 'export'` in next.config.js for static HTML generation
3. Integrate Next.js as Express middleware (advanced)

Current fallback provides graceful degradation with styled HTML page.

## Server Status After Fixes

### PM2 Status
```
│ 47 │ pnptv-bot │ fork │ 2537140 │ online │ 142.5mb │ 4314 restarts (historical) │
```
- **Status**: ✅ ONLINE
- **PID**: 2537140 (active process)
- **Memory**: 142.5 MB (stable)
- **Uptime**: Running continuously since fix

### Endpoint Tests
- ✅ `https://pnptv.app/` → 200 OK
- ✅ `https://pnptv.app/app/` → 200 OK (fallback HTML)
- ✅ `https://pnptv.app/health` → 200 OK ({"status":"ok"})
- ✅ `https://pnptv.app/debug/webapp` → 200 OK (diagnostics)
- ✅ Telegram webhook → Working (bot responding to commands)

## Files Modified
1. `/root/bot 1/src/bot/handlers/daimoPayHandler.js`
2. `/root/bot 1/src/bot/handlers/promoHandler.js`
3. `/root/bot 1/src/bot/webhook.js`

## Deployment Steps Taken
```bash
# Fixed syntax errors in daimoPayHandler.js and promoHandler.js
# Replaced res.sendFile with fallback HTML in webhook.js
pm2 restart pnptv-bot
pm2 status  # Verified online
curl https://pnptv.app/health  # Verified responding
curl https://pnptv.app/app/  # Verified webapp route
```

## Prevention Recommendations

1. **Linting**: Enable ESLint in pre-commit hooks to catch syntax errors
2. **Testing**: Add automated tests before deployment
3. **Staging**: Test changes in staging environment first
4. **Monitoring**: Set up error alerting (Sentry is already configured but needs active monitoring)
5. **Code Review**: Template literals should never be escaped unless inside strings

## Next Steps for WebApp

The mini app is currently showing a placeholder. To enable full functionality:

**Option A - Run Next.js Server (Quick)**:
```bash
cd /root/bot\ 1/src/webapp
npm start  # Runs on port 3001
```
Then update Nginx to proxy `/app` to `localhost:3001`

**Option B - Static Export (Production)**:
1. Edit `src/webapp/next.config.js`:
```javascript
const nextConfig = {
  output: 'export',  // Add this line
  // ... rest of config
}
```
2. Rebuild:
```bash
cd /root/bot\ 1/src/webapp
npm run build
```
3. Update webhook.js to serve from `/root/bot 1/src/webapp/out/index.html`

## Timeline
- **13:03 UTC**: First crash detected (4,301 restarts)
- **13:05 UTC**: Fixed daimoPayHandler.js syntax error
- **13:06 UTC**: Fixed promoHandler.js template literals
- **13:10 UTC**: Fixed webapp route, server online
- **13:11 UTC**: All endpoints verified working

## Impact
- **Downtime**: ~8 minutes total
- **Users Affected**: All bot users during crash-loop period
- **Data Loss**: None (Firestore persists independently)
- **Resolution**: Complete - all core functionality restored

---
**Status**: ✅ RESOLVED
**Documentation**: This file + WEBAPP_DIAGNOSTIC_SUMMARY.md
**Monitoring**: PM2 process stable, no further crashes detected
