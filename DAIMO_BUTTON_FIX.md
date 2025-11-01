# Daimo Pay Button - FIXED ✅

## Changes Made

### 1. Added Button to Main Menu (`src/bot/handlers/start.js`)
- Added "💰 Pagar con Daimo" / "💰 Pay with Daimo" button to main menu
- Callback: `daimo_show_plans`
- Button appears between "Subscribe" and "Profile" options

### 2. Fixed Handler Signatures (`src/bot/handlers/daimoSubscription.js`)
- Updated `showDaimoPlans()` to accept Telegraf context directly
- Updated `handleDaimoPlanSelection()` to work with ctx parameter
- Updated `handleShowPlansCallback()` to accept context
- All functions now properly handle Telegraf's `ctx.reply()`, `ctx.editMessageText()`, `ctx.answerCbQuery()`

### 3. Fixed Callback Registration (`src/bot/index.js`)
- Updated `daimo_show_plans` action to call `handleShowPlansCallback(ctx)`
- Updated `daimo_plan_*` regex action to call `handleDaimoPlanSelection(ctx)`
- Both now pass Telegraf context correctly

## How It Works Now

1. **User clicks "💰 Pay with Daimo"** from main menu
2. **Bot shows payment plans** with 4 options:
   - Trial Week - $14.99 (7 days)
   - PNP Member - $24.99 (30 days)
   - PNP Crystal - $49.99 (120 days)
   - PNP Diamond - $99.99 (365 days)
3. **User clicks a plan**
4. **Bot shows plan details** with:
   - Plan name, price, duration
   - Feature list
   - "💳 Secure Payment" button linking to payment page
5. **User clicks "Secure Payment"**
6. **Redirected to payment page** with:
   - Plan ID, user ID, amount
   - HMAC-SHA256 signature for verification
   - Daimo Pay integration

## Technical Details

### Handler Flow
```
Start Menu → daimo_show_plans callback
    ↓
handleShowPlansCallback(ctx)
    ↓
showDaimoPlans(ctx) - displays all plans
    ↓
User clicks plan → daimo_plan_* callback
    ↓
handleDaimoPlanSelection(ctx) - shows selected plan with payment button
    ↓
User clicks payment button → redirects to payment URL with signature
```

### Security
- Signature generation using crypto.createHmac('sha256')
- Format: `hmac_sha256('${userId}:${planId}:${timestamp}', secret)`
- Verified on payment backend

### Supported Plans
All 4 plans have:
- Icon indicator
- Description
- Feature list
- Price in USD
- Duration label
- USDC payment support

## Testing

To test:
1. Start bot: `pm2 restart pnptv-bot`
2. Open Telegram bot
3. Type `/start`
4. Click "💰 Pay with Daimo" button
5. Select a plan
6. Review details and click "💳 Secure Payment"
7. Payment page should open with pre-filled data

## Files Modified
- `src/bot/handlers/start.js` - Added button to menu
- `src/bot/handlers/daimoSubscription.js` - Fixed all handler signatures
- `src/bot/index.js` - Fixed callback registrations

## Status
✅ Bot restarted successfully
✅ All syntax validated
✅ Ready for production testing
