# Daimo Pay Integration - Complete Setup Guide

## Overview
Your PNPtv Telegram bot now has a fully functional Daimo Pay integration! This guide will walk you through the complete setup process.

**Status:** ✅ Implementation Complete
**Created:** 2025-10-18

---

## What Was Built

### 1. React Payment Page (`src/payment-page/`)
- **Framework:** Next.js 15 with React 19
- **SDK:** @daimo/pay with wagmi and viem
- **Features:**
  - DaimoPayButton with full configuration
  - Plan display with features
  - Payment methods support (wallets, exchanges, payment apps)
  - Success/error handling
  - Telegram WebApp integration

### 2. Backend Integration
- **API Routes:** `/api/plans/:planId`, `/api/payments/started`, `/api/payments/completed`
- **Webhook Handler:** `/daimo/webhook` with authentication
- **Payment Link Generation:** Updated `src/config/daimo.js`
- **Auto-Activation:** Subscription activation on webhook confirmation

### 3. Telegram Bot Updates
- Generates payment links to React page
- Handles Daimo payment method
- Sends notifications on payment completion

---

## Prerequisites

Before you start, you need:

### 1. Crypto Wallet Setup
- [ ] **Treasury Wallet** - Where you receive USDC payments
  - Supports: Base, Optimism, Arbitrum, Polygon
  - **Recommended:** Use Base chain (lowest fees)
  - Example: MetaMask, Coinbase Wallet, etc.

- [ ] **Refund Wallet** - For refunds and bounced payments
  - **CRITICAL:** Must be valid on ALL supported chains
  - Can be same as treasury wallet

### 2. Daimo Account
- [ ] Sign up at https://pay.daimo.com/dashboard
- [ ] Create new app or use existing

---

## Step-by-Step Setup

### Step 1: Configure Environment Variables

Update your `.env` file with these new variables:

```bash
# Daimo Pay Configuration
DAIMO_APP_ID=pnptv-bot  # Your app ID from Daimo dashboard
DAIMO_WEBHOOK_TOKEN=  # Will get this in Step 2

# Frontend Configuration
NEXT_PUBLIC_DAIMO_APP_ID=pnptv-bot
NEXT_PUBLIC_TREASURY_ADDRESS=0xYourTreasuryWalletAddress
NEXT_PUBLIC_REFUND_ADDRESS=0xYourRefundWalletAddress  # Same as treasury is OK
NEXT_PUBLIC_BOT_URL=https://your-app.herokuapp.com

# Payment Page URL
PAYMENT_PAGE_URL=https://your-app.herokuapp.com/pay
```

**Important Wallet Address Notes:**
- Use checksummed addresses (with capital letters)
- Verify addresses multiple times before deploying
- Test with small amounts first

---

### Step 2: Set Up Daimo Dashboard Webhook

1. **Go to Daimo Dashboard:**
   ```
   https://pay.daimo.com/dashboard
   ```

2. **Create Webhook:**
   - URL: `https://your-app.herokuapp.com/daimo/webhook`
   - Events: Select all (payment_started, payment_completed, payment_bounced, payment_refunded)
   - Click "Create Webhook"

3. **Copy Webhook Token:**
   - Dashboard will show you a token like: `daimowh_abc123...`
   - Add to `.env`:
   ```bash
   DAIMO_WEBHOOK_TOKEN=daimowh_abc123...
   ```

---

### Step 3: Build Payment Page

```bash
# Build the Next.js payment page
npm run build:payment
```

This creates optimized production build in `src/payment-page/.next/`

---

### Step 4: Deploy to Production

#### Option A: Deploy to Heroku (Your Current Setup)

1. **Update Procfile:**
   ```
   web: npm start
   payment: npm run start:payment
   ```

2. **Set environment variables in Heroku:**
   ```bash
   heroku config:set DAIMO_APP_ID=pnptv-bot
   heroku config:set DAIMO_WEBHOOK_TOKEN=your_token_here
   heroku config:set NEXT_PUBLIC_TREASURY_ADDRESS=0xYourAddress
   heroku config:set NEXT_PUBLIC_REFUND_ADDRESS=0xYourAddress
   heroku config:set NEXT_PUBLIC_BOT_URL=https://your-app.herokuapp.com
   heroku config:set PAYMENT_PAGE_URL=https://your-app.herokuapp.com/pay
   ```

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Add Daimo Pay integration"
   git push heroku main
   ```

#### Option B: Deploy to Railway

Update `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "payment-page"
command = "npm run start:payment"
```

---

### Step 5: Test the Integration

#### 5.1 Test Payment Page Access

Visit: `https://your-app.herokuapp.com/pay?plan=test&user=123&amount=1.00`

You should see:
- ✅ PNPtv branding
- ✅ Plan details loading error (expected - test plan doesn't exist)
- ✅ Page loads without crashes

#### 5.2 Create a Test Plan

In Telegram bot, as admin:
1. Click "💰 Plan Management"
2. Click "➕ Create Plan"
3. Create a low-price test plan (e.g., $1.00)
4. Choose payment method: "daimo"

#### 5.3 Test Full Payment Flow

1. **Start payment as regular user:**
   - Click "💎 Subscribe to PNPtv PRIME!"
   - Select your test plan
   - Click "💳 Pay with Daimo"

2. **Payment page should open:**
   - Shows plan details
   - Shows DaimoPayButton
   - Click the button

3. **Daimo modal opens:**
   - Choose payment method (wallet, exchange, etc.)
   - Complete payment with test amount

4. **Verify completion:**
   - Payment page shows success message
   - Telegram bot sends confirmation
   - Check Firebase: user should have active subscription

#### 5.4 Check Logs

```bash
heroku logs --tail
```

Look for:
```
Daimo Pay payment link created
API: Fetching plan details for...
Daimo payment completed
Subscription activated via Daimo webhook
```

---

### Step 6: Configure Daimo Supported Chains

Your payment page is configured to settle on **Base** chain by default.

To change settlement chain, edit `src/payment-page/app/page.tsx`:

```typescript
// Change from Base to Optimism
import { optimismUSDC } from '@daimo/pay-common'

<DaimoPayButton
  toChain={optimismUSDC.chainId}  // Optimism
  toToken={getAddress(optimismUSDC.token)}
  // ... other props
/>
```

**Supported chains:**
- `baseUSDC` - Base (Recommended - lowest fees)
- `optimismUSDC` - Optimism
- `arbitrumUSDC` - Arbitrum
- `polygonUSDC` - Polygon

**NOT recommended:**
- Ethereum mainnet (high fees, slow)

---

## How It Works

### Payment Flow

```
1. User clicks "Pay with Daimo" in Telegram
   ↓
2. Bot generates payment link:
   https://your-app.herokuapp.com/pay?plan=XYZ&user=123&amount=15.00
   ↓
3. User opens link (Telegram in-app browser)
   ↓
4. React payment page loads
   ├─ Fetches plan details from /api/plans/:planId
   └─ Renders DaimoPayButton
   ↓
5. User clicks DaimoPayButton
   ↓
6. Daimo modal opens
   ├─ User selects payment method (wallet/exchange/app)
   ├─ Daimo generates intent address
   └─ User sends USDC to intent address
   ↓
7. Daimo processes payment
   ├─ Liquidity provider accelerates (or permissionless finalization)
   └─ Settles to your treasury on Base chain
   ↓
8. Daimo sends webhook to /daimo/webhook
   ├─ Bot verifies webhook authentication
   ├─ Activates user subscription in Firebase
   └─ Sends Telegram notification to user
   ↓
9. User receives confirmation
   └─ Can return to Telegram and use premium features
```

### Security

**Webhook Authentication:**
- All webhooks verified with `DAIMO_WEBHOOK_TOKEN`
- Unauthenticated requests rejected with 401

**Client Callbacks:**
- `onPaymentStarted` and `onPaymentCompleted` are client-side
- NOT trusted for activation (can be spoofed)
- Only webhook confirmation activates subscriptions

**Payment Intents:**
- Stored in Firebase for tracking
- Reference ID format: `{planId}_{userId}_{timestamp}`

---

## Troubleshooting

### Issue: Payment page shows "Configuration Error"

**Cause:** `NEXT_PUBLIC_TREASURY_ADDRESS` not set

**Fix:**
```bash
heroku config:set NEXT_PUBLIC_TREASURY_ADDRESS=0xYourAddress
```

### Issue: DaimoPayButton doesn't render

**Cause:** Missing dependencies or build error

**Fix:**
```bash
npm install
npm run build:payment
```

### Issue: Webhook not received

**Cause:** Wrong webhook URL or token

**Fix:**
1. Check Daimo dashboard webhook URL matches exactly
2. Verify `DAIMO_WEBHOOK_TOKEN` matches dashboard
3. Check Heroku logs for authentication errors

### Issue: Subscription not activated after payment

**Cause:** Webhook handler error

**Fix:**
1. Check logs: `heroku logs --tail --source app`
2. Look for errors in webhook handler
3. Verify Firebase permissions
4. Check plan exists in database

### Issue: Refund address invalid

**Cause:** Address not valid on all chains

**Fix:**
- Use same address as treasury
- Verify address exists on Base, Optimism, Arbitrum, Polygon
- Never use exchange deposit addresses

---

## Testing Checklist

Before going live with real payments:

### Configuration
- [ ] `DAIMO_APP_ID` matches dashboard
- [ ] `DAIMO_WEBHOOK_TOKEN` set and matches
- [ ] `NEXT_PUBLIC_TREASURY_ADDRESS` is your wallet
- [ ] `NEXT_PUBLIC_REFUND_ADDRESS` valid on all chains
- [ ] `PAYMENT_PAGE_URL` points to your deployed app

### Functionality
- [ ] Payment page loads without errors
- [ ] Plan details fetch correctly
- [ ] DaimoPayButton renders
- [ ] Modal opens when clicked
- [ ] Can connect wallet
- [ ] Payment completes successfully
- [ ] Webhook received and authenticated
- [ ] Subscription activated in Firebase
- [ ] User notified in Telegram

### Edge Cases
- [ ] Test with $1-2 to minimize risk
- [ ] Verify refunds work (overpayment)
- [ ] Test expired intent handling
- [ ] Check duplicate payment protection

---

## Cost Analysis

### Development Costs
- ✅ **$0** - All open source software

### Transaction Costs
- **Gas fees:** ~$0.01-0.10 per transaction on Base
- **Daimo fees:** Check dashboard (typically <1%)
- **Total:** ~1-2% including all fees

### Infrastructure Costs
- **Heroku/Railway:** Your existing plan
- **No additional costs** for payment page (runs on same dyno)

---

## Monitoring

### Key Metrics to Track

1. **Payment Success Rate:**
   ```
   Completed Webhooks / Started Payments
   ```

2. **Average Payment Time:**
   ```
   Time from payment_started to payment_completed
   ```

3. **Failed Payments:**
   - Check logs for `payment_bounced` events
   - Monitor refund transactions

### Logs to Watch

```bash
# Real-time monitoring
heroku logs --tail | grep -i daimo

# Payment completions
heroku logs --tail | grep "payment completed"

# Errors only
heroku logs --tail | grep -i error
```

---

## Next Steps

### Immediate (Before Launch)
1. [ ] Set up production wallet addresses
2. [ ] Configure webhook in Daimo dashboard
3. [ ] Test with small real payment ($1-2)
4. [ ] Verify subscription activation works
5. [ ] Update .env with production values

### Short Term (First Week)
1. [ ] Monitor payment success rates
2. [ ] Watch for webhook errors
3. [ ] Collect user feedback
4. [ ] Optimize payment page UX

### Long Term (Future Enhancements)
1. [ ] Add payment history dashboard
2. [ ] Implement payment analytics
3. [ ] Support multiple settlement chains
4. [ ] Add automatic currency conversion

---

## Files Created/Modified

### New Files
```
src/payment-page/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main payment page
│   ├── providers.tsx       # Daimo/Wagmi providers
│   └── globals.css         # Styles
src/bot/api/routes.js       # API endpoints
next.config.js              # Next.js configuration
DAIMO_PAY_SETUP_GUIDE.md    # This file
```

### Modified Files
```
package.json                # Added scripts and dependencies
.env.example                # Updated Daimo configuration
src/config/daimo.js         # Payment link generation
src/bot/webhook.js          # Webhook handler
src/bot/helpers/subscriptionHelpers.js  # Already had Daimo support
```

---

## Support Resources

- **Daimo Docs:** https://paydocs.daimo.com
- **Daimo Discord:** Contact founders@daimo.com for invite
- **Next.js Docs:** https://nextjs.org/docs
- **Wagmi Docs:** https://wagmi.sh

---

## Important Reminders

⚠️ **Security:**
- Never commit private keys or wallet seeds
- Keep `DAIMO_WEBHOOK_TOKEN` secret
- Use environment variables for all sensitive data

⚠️ **Wallet Safety:**
- Test with small amounts first
- Verify addresses multiple times
- Keep treasury wallet secure (hardware wallet recommended)

⚠️ **User Experience:**
- Payment page works in Telegram's in-app browser
- Mobile-responsive design included
- Clear error messages for users

---

**Status:** ✅ Ready for Testing
**Next Action:** Configure environment variables and test with small payment

Good luck with your Daimo Pay integration! 🚀
