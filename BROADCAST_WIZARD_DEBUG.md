# Broadcast Wizard Diagnostic Test

## Current Status - November 2, 2025

### ✅ What's Working:
- Admin panel access (`/admin` command) ✅
- User management features ✅ 
- Admin statistics ✅
- Broadcast wizard initialization ✅

### ❓ Issue: Broadcast Wizard Flow

**Problem**: Broadcast wizard starts but doesn't continue past language selection

**Evidence from Logs**:
```
20:52:49 - Admin 8365312597 initiated enhanced broadcast wizard
```
But no follow-up logs for language selection callback handling.

## Diagnostic Steps

### 1. Test Language Selection Flow
- Admin clicks "📢 Send Broadcast" 
- Wizard shows language options (All/English/Spanish)
- **Expected**: Language selection triggers `bcast_lang_*` callback
- **Current**: No logs showing callback processing

### 2. Callback Flow Analysis

**Current Setup**:
1. `bot.action(/^bcast_/, handleAdminCallback);` - Should capture `bcast_lang_*`
2. `handleAdminCallback` routes to `handleBroadcastWizard(ctx, action)`
3. `handleBroadcastWizard` processes `bcast_lang_*` callbacks

**Potential Issues**:
1. **Callback Conflict**: `lang_` regex still interfering despite fixes
2. **Session State**: Broadcast wizard session not persisting
3. **Handler Order**: Callback handlers being processed in wrong order

### 3. Debug Solution

**Add Debug Logging**: Insert debug logs in `handleAdminCallback` to track callback routing:

```javascript
async function handleAdminCallback(ctx) {
  const action = ctx.callbackQuery.data;
  console.log("=== ADMIN CALLBACK DEBUG ===");
  console.log("Action:", action);
  console.log("User ID:", ctx.from.id);
  
  if (action.startsWith("bcast_")) {
    console.log(">>> BROADCAST CALLBACK DETECTED");
    // ... existing broadcast logic
  }
}
```

### 4. Test Commands

**Real-time Log Monitoring**:
```bash
cd /var/www/telegram-bot && pm2 logs pnptv-bot --lines 0
# Then test broadcast in Telegram bot
```

**Check Callback Pattern**:
```bash
cd /var/www/telegram-bot && pm2 logs pnptv-bot --lines 50 | grep -i "callback\|action\|bcast"
```

## Expected Flow

1. **Step 1**: Admin clicks "📢 Send Broadcast"
   - Log: `Admin X initiated enhanced broadcast wizard`
   - Action: Show language selection menu

2. **Step 2**: Admin clicks language (e.g., "🇺🇸 English")
   - Callback: `bcast_lang_en`
   - Expected Log: Should show language selection processing
   - Action: Show user status selection

3. **Step 3**: Continue wizard flow...

## Quick Fix Options

### Option 1: Debug Handler Priority
Ensure broadcast handlers are processed before onboarding:

```javascript
// In index.js - move bcast handler to top
bot.action(/^bcast_/, handleAdminCallback);  // First priority
bot.action(/^admin_/, handleAdminCallback);
bot.action(/lang_(.+)/, (ctx) => { /* onboarding */ }); // Last
```

### Option 2: More Specific Callback Check
Make the onboarding regex even more specific:

```javascript
bot.action(/^(?!bcast_)lang_(.+)/, (ctx) => {
  // Only handle non-broadcast lang callbacks
});
```

### Option 3: Add Explicit Debug Route
```javascript
bot.action(/^bcast_lang_/, (ctx) => {
  console.log("BROADCAST LANG CALLBACK:", ctx.callbackQuery.data);
  return handleAdminCallback(ctx);
});
```

## Next Steps

1. **Test**: Have admin try broadcast wizard and monitor logs
2. **Identify**: Where exactly the callback flow breaks
3. **Fix**: Apply targeted solution based on findings
4. **Verify**: Complete broadcast flow works end-to-end

**Status**: Ready for real-time testing and debugging