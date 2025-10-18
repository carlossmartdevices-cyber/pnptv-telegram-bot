# Daimo Pay Integration Analysis

## Overview
Analysis of the Daimo Pay integration in the PNPtv Telegram Bot against the official Daimo Pay LLM Guide (2025-09-03).

**Date:** 2025-10-18
**Status:** ⚠️ NEEDS MAJOR UPDATES

---

## Critical Issues Found

### ❌ 1. Wrong Integration Approach
**Current Implementation:** Backend API integration (Node.js)
**Required Implementation:** Frontend SDK integration (@daimo/pay with React/TypeScript)

**From Daimo Guide:**
> "Prefer TypeScript with React. Minimal runnable snippets."
> "Use @daimo/pay with wagmi, viem, and @tanstack/react-query."

**Issue:** The current implementation in `src/config/daimo.js` is trying to use Daimo as a backend API service, but Daimo Pay is designed as a frontend SDK for React applications.

**Impact:** 🔴 **CRITICAL** - Current implementation won't work with actual Daimo Pay

---

### ❌ 2. Non-Existent API Endpoints
**Current Code (Line 111):**
```javascript
const apiUrl = process.env.DAIMO_API_URL || "https://api.daimo.com/v1";
```

**Issue:** There is no Daimo backend API at `https://api.daimo.com/v1`. Daimo Pay works through:
- Frontend SDK (`@daimo/pay`)
- Smart contracts (intent addresses)
- Optional webhooks via their dashboard

**Impact:** 🔴 **CRITICAL** - API calls will fail

---

### ❌ 3. Missing Required Dependencies
**Current Dependencies:** None (should be in package.json)

**Required Dependencies (from guide):**
```json
{
  "@daimo/pay": "latest",
  "wagmi": "latest",
  "viem": "^2.22.0",
  "@tanstack/react-query": "latest"
}
```

**Impact:** 🔴 **CRITICAL** - Cannot use Daimo Pay SDK

---

### ❌ 4. Incorrect Payment Flow
**Current Flow:**
1. Backend creates payment request
2. Returns payment URL to user
3. User visits URL
4. Payment completes

**Correct Daimo Flow:**
1. Frontend renders `<DaimoPayButton>` component
2. User clicks button to open modal
3. User chooses payment method (wallet, exchange, payment app)
4. Daimo creates intent address
5. User sends funds to intent address
6. Settlement happens on destination chain
7. Optional webhook notifies your backend

**Impact:** 🔴 **CRITICAL** - Fundamental architecture mismatch

---

### ⚠️ 5. Missing Required Props
**Current Implementation:** Tries to pass `apiKey` and create payment URLs

**Required Props for DaimoPayButton:**
- ✅ `appId` - You have DAIMO_APP_ID
- ❌ `intent` - Visual label (e.g., "Deposit", "Pay")
- ❌ `refundAddress` - **REQUIRED** - Valid on all supported networks
- ❌ `toAddress` - Destination treasury/wallet address
- ❌ `toChain` - Destination chain ID (e.g., Optimism)
- ❌ `toToken` - Token address (or 0x0000... for native)
- ⚠️ `toUnits` - Optional but recommended for fixed-price plans

**Impact:** 🔴 **CRITICAL** - Cannot instantiate DaimoPayButton

---

### ⚠️ 6. Payment Webhook Implementation
**Current Status:** Placeholder webhook code exists but won't receive calls

**Correct Approach:**
1. Create webhook in Daimo dashboard
2. Get webhook token
3. Verify `Authorization: Basic <token>` on incoming webhooks
4. Handle events:
   - `payment_started`
   - `payment_completed` ✅ This is when you activate subscription
   - `payment_bounced`
   - `payment_refunded`

**Impact:** 🟡 **MEDIUM** - Webhooks won't work until properly configured

---

## What Works

### ✅ Configuration Structure
The environment variable setup is good:
- `DAIMO_APP_ID` ✅
- `DAIMO_API_KEY` (not used by SDK, but OK for webhooks)
- Webhook URL configuration ✅

### ✅ Validation Logic
Input validation and error handling patterns are solid

### ✅ Logging
Good logging for debugging

---

## Architecture Mismatch: Telegram Bot vs Web App

### The Core Problem
**Daimo Pay requires:**
- React frontend
- Browser-based wallet connections
- Web3 modal interactions

**Your bot is:**
- Telegram-based (no web frontend)
- Message and button interactions
- No browser environment

### Possible Solutions

#### Option 1: Add Web Frontend (RECOMMENDED)
Create a minimal React web app for payments:

```
/src/web-payment/
  ├── app.tsx                 # React app with DaimoPayProvider
  ├── components/
  │   └── PaymentPage.tsx    # DaimoPayButton integration
  └── server.js              # Express server to serve React app
```

**Flow:**
1. User chooses plan in Telegram
2. Bot sends them a web link: `https://your-app.com/pay?plan=silver&user=12345`
3. User opens link in browser (Telegram's in-app browser works)
4. React app renders DaimoPayButton
5. User completes payment in web interface
6. Webhook notifies bot backend
7. Bot activates subscription

**Pros:**
- ✅ Proper Daimo integration
- ✅ Best user experience
- ✅ Full feature support

**Cons:**
- ⚠️ Requires React development
- ⚠️ Adds web hosting complexity

---

#### Option 2: Use Payment Links (CURRENT APPROACH - WON'T WORK)
**Status:** ❌ Not supported by Daimo Pay

Daimo Pay does not provide simple payment link generation. It requires the full SDK integration.

---

#### Option 3: Use Alternative Payment Method
For pure Telegram bot experience, consider:
- ePayco ✅ Already integrated
- Nequi ✅ Already integrated
- Coinbase Commerce (has simple API)
- Stripe Payment Links
- Direct crypto wallet deposits

**Trade-off:** Lose Daimo's benefits (fast settlement, multi-chain support)

---

## Recommended Fix (Option 1 Implementation)

### Step 1: Install Dependencies
```bash
npm install @daimo/pay @daimo/pay-common wagmi viem@^2.22.0 @tanstack/react-query react react-dom next
```

### Step 2: Create React Payment Page

**File:** `src/web-payment/providers.tsx`
```typescript
'use client'
import { DaimoPayProvider, getDefaultConfig } from '@daimo/pay'
import { WagmiProvider, createConfig } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const wagmi = createConfig(getDefaultConfig({
  appName: 'PNPtv Subscription Payments'
}))
const qc = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmi}>
      <QueryClientProvider client={qc}>
        <DaimoPayProvider>{children}</DaimoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**File:** `src/web-payment/payment-page.tsx`
```typescript
'use client'
import { DaimoPayButton } from '@daimo/pay'
import { baseUSDC } from '@daimo/pay-common'
import { getAddress } from 'viem'
import { useSearchParams } from 'next/navigation'

export default function PaymentPage() {
  const params = useSearchParams()
  const planId = params.get('plan')
  const userId = params.get('user')
  const amount = params.get('amount') // e.g., "15.00"

  // Your treasury address (where you receive USDC)
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "0xYourAddress"

  // Refund address (CRITICAL - must be valid on all chains)
  const refundAddress = process.env.NEXT_PUBLIC_REFUND_ADDRESS || treasuryAddress

  return (
    <div className="payment-container">
      <h1>Subscribe to PNPtv {planId}</h1>
      <DaimoPayButton
        appId={process.env.NEXT_PUBLIC_DAIMO_APP_ID || "pnptv-bot"}
        intent="Subscribe"
        refundAddress={refundAddress}
        toAddress={treasuryAddress}
        toChain={baseUSDC.chainId}  // Base chain
        toToken={getAddress(baseUSDC.token)}  // USDC on Base
        toUnits={amount || "15.00"}  // Fixed amount
        onPaymentStarted={(payment) => {
          console.log('Payment started:', payment)
        }}
        onPaymentCompleted={(payment) => {
          console.log('Payment completed:', payment)
          // Show success message
          window.location.href = `/payment-success?ref=${payment.reference}`
        }}
      />
    </div>
  )
}
```

### Step 3: Update Telegram Bot Flow

**File:** `src/bot/helpers/subscriptionHelpers.js`
```javascript
// Handle Daimo Pay payment method
if (plan.paymentMethod === "daimo") {
  const paymentUrl = `${process.env.WEB_PAYMENT_URL}/pay?` +
    `plan=${encodeURIComponent(plan.id)}&` +
    `user=${encodeURIComponent(userId)}&` +
    `amount=${plan.price}`;

  await ctx.reply(
    lang === "es"
      ? `💎 **${plan.displayName || plan.name}**\n\n` +
        `Precio: $${plan.price} USD (USDC)\n` +
        `Duración: ${plan.durationDays} días\n\n` +
        `Haz clic en el botón de abajo para pagar con Daimo Pay.\n` +
        `Acepta pagos desde:\n` +
        `• Billeteras Web3\n` +
        `• Coinbase, Binance\n` +
        `• Apps de pago\n\n` +
        `El pago se procesará automáticamente.`
      : `💎 **${plan.displayName || plan.name}**\n\n` +
        `Price: $${plan.price} USD (USDC)\n` +
        `Duration: ${plan.durationDays} days\n\n` +
        `Click the button below to pay with Daimo Pay.\n` +
        `Accepts payments from:\n` +
        `• Web3 wallets\n` +
        `• Coinbase, Binance\n` +
        `• Payment apps\n\n` +
        `Payment will be processed automatically.`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "💳 Pagar con Daimo" : "💳 Pay with Daimo",
              url: paymentUrl,
            },
          ],
          [
            {
              text: lang === "es" ? "🔙 Volver" : "🔙 Back",
              callback_data: "back_to_main",
            },
          ],
        ],
      },
    }
  );
  return;
}
```

### Step 4: Setup Webhooks

1. Go to Daimo dashboard
2. Create webhook pointing to `https://your-app.com/daimo/webhook`
3. Save the webhook token
4. Add to `.env`:
```bash
DAIMO_WEBHOOK_TOKEN=your_webhook_token_here
```

**File:** `src/bot/webhook.js` (add webhook handler)
```javascript
// Daimo webhook handler
app.post('/daimo/webhook', async (req, res) => {
  try {
    // Verify webhook authentication
    const authHeader = req.headers.authorization;
    const expectedAuth = `Basic ${process.env.DAIMO_WEBHOOK_TOKEN}`;

    if (authHeader !== expectedAuth) {
      logger.warn('Invalid Daimo webhook authentication');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = req.body;
    logger.info('Daimo webhook received:', event);

    // Handle payment_completed event
    if (event.type === 'payment_completed') {
      const { reference, metadata } = event;
      const userId = metadata?.userId;
      const planId = metadata?.plan;

      if (userId && planId) {
        // Activate subscription
        await activateUserSubscription(userId, planId);

        // Notify user in Telegram
        await bot.telegram.sendMessage(
          userId,
          '✅ Payment confirmed! Your subscription is now active.'
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Daimo webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Environment Variables Needed

Update `.env`:
```bash
# Daimo Pay Configuration
DAIMO_APP_ID=pnptv-bot  # Get from Daimo dashboard
DAIMO_WEBHOOK_TOKEN=your_webhook_token  # Get from Daimo dashboard

# Frontend Configuration
NEXT_PUBLIC_DAIMO_APP_ID=pnptv-bot
NEXT_PUBLIC_TREASURY_ADDRESS=0xYourTreasuryAddress  # Where you receive USDC
NEXT_PUBLIC_REFUND_ADDRESS=0xYourRefundAddress  # MUST be valid on all chains
WEB_PAYMENT_URL=https://your-app.com  # Your payment page URL
```

---

## Settlement Configuration

### Recommended Setup
**Chain:** Base (low fees, fast finality)
**Token:** USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` on Base)

**Why Base?**
- ✅ Low transaction fees (~$0.01)
- ✅ Fast finality (~2 seconds)
- ✅ Supported by Daimo Pay
- ✅ Good USDC liquidity

**Alternative:** Optimism (also good choice)

**DON'T use Ethereum mainnet** - High fees and slow finality (as noted in guide)

---

## Testing Checklist

Before going live:

### Configuration
- [ ] DAIMO_APP_ID set correctly
- [ ] TREASURY_ADDRESS is a wallet you control
- [ ] REFUND_ADDRESS is valid on ALL supported networks
- [ ] WEBHOOK_TOKEN matches Daimo dashboard
- [ ] Web payment page is accessible

### Functional Tests
- [ ] DaimoPayButton renders correctly
- [ ] Modal opens when button clicked
- [ ] Can connect wallet
- [ ] Can select payment method
- [ ] Payment completes successfully
- [ ] Webhook received and verified
- [ ] Subscription activated in database
- [ ] User notified in Telegram

### Edge Cases
- [ ] Duplicate payments refunded correctly
- [ ] Failed payments bounced to refund address
- [ ] Overpayments handled correctly
- [ ] Webhook authentication rejects invalid tokens

---

## Cost Estimate

### Development Time
- React payment page: 4-6 hours
- Webhook integration: 2-3 hours
- Testing: 2-3 hours
- **Total: 8-12 hours**

### Infrastructure Costs
- Web hosting (Vercel/Netlify): Free tier OK
- Domain (optional): $10/year
- Gas fees for testing: ~$5 in ETH/USDC

---

## Current Code Assessment

### What to Keep
✅ `src/services/planService.js` - Plan management is good
✅ `src/bot/handlers/admin/planManager.js` - Admin interface works
✅ Environment variable structure
✅ Logging and error handling patterns

### What to Replace
❌ `src/config/daimo.js` - Lines 83-186 (fake API integration)
❌ Payment URL generation - Doesn't work with Daimo
❌ Backend payment creation flow

### What to Add
➕ React payment page with SDK
➕ Proper webhook verification
➕ Intent address handling
➕ Multi-chain refund address setup

---

## Alternative: Simpler Payment Solutions

If React integration is too complex:

### Option A: Coinbase Commerce
- Simple API
- Payment links generation
- Webhook support
- No frontend SDK needed

### Option B: Continue with ePayco + Nequi
Your current ePayco and Nequi integrations work well for the Telegram bot architecture.

### Option C: Direct Crypto Deposits
- Generate unique deposit address per user
- Monitor blockchain for deposits
- Simpler but requires blockchain monitoring service

---

## Conclusion

**Current Status:** ❌ Not Production Ready

**Recommendation:** Implement Option 1 (React payment page) for proper Daimo integration, OR stick with ePayco/Nequi for simpler bot-native experience.

**If using Daimo is required:**
- Budget 8-12 hours for proper implementation
- Set up React/Next.js payment page
- Configure webhooks through Daimo dashboard
- Use Base chain for settlements

**If NOT required:**
- Your existing ePayco integration is solid
- Nequi works well for Colombian users
- Consider adding Coinbase Commerce for crypto payments

---

## Resources

- Daimo Pay Quickstart: https://paydocs.daimo.com/quickstart
- Daimo SDK Reference: https://paydocs.daimo.com/sdk
- Supported Networks: https://paydocs.daimo.com/networks
- Webhooks Guide: https://paydocs.daimo.com/webhooks
- Contact: founders@daimo.com

---

**Next Steps:**
1. Decide if Daimo integration is worth the React development
2. If yes, follow "Recommended Fix" section above
3. If no, remove Daimo code and document ePayco/Nequi as primary methods
4. Update documentation to reflect actual payment options

