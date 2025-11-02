# 🗺️ PNPtv Subscription Flow Map

**Complete navigation map of the subscription/payment system**

---

## 📊 Flow Overview

```
Entry Points → Plan Selection → Payment Method → Payment Processing → Activation
```

---

## 🚪 Entry Points (How Users Start)

### 1. Command Entry Points
```
/subscribe
  ↓
  handlers/subscribe.js → showPlans()
```

### 2. Callback Button Entry Points
```
show_subscription_plans
  ↓
  subscribeHandler(ctx)
  
upgrade_tier
  ↓
  subscribeHandler(ctx)
  
subscribe_prime
  ↓
  subscribeHandler(ctx)
```

### 3. Menu Button Entry Points
```
Main Menu → "💎 Subscribe to PRIME Channel"
  ↓
  callback_data: "show_subscription_plans"

Profile Menu → "💎 Upgrade Membership"
  ↓
  callback_data: "upgrade_tier"

Help Menu → "💎 View Premium Plans"
  ↓
  callback_data: "show_subscription_plans"
```

---

## 📋 Plan Selection Screen

**File:** `src/bot/handlers/subscribe.js`

**Display:**
```
🎥 Exclusive Channel Content

Become a member of PNPtv PRIME and enjoy the best amateur content...

[💎 PNP Member - $24.99 USD]
[💎 PNP Crystal Member - $49.99 USD]
[🔙 Back]
```

**Buttons:**
- Each plan button: `callback_data: daimo_plan_{planId}`
- Back button: `callback_data: back_to_main`

**Data Flow:**
```javascript
planService.listPlans()
  ↓
  plans.map(plan => ({
    text: `${plan.icon} ${plan.displayName} - $${plan.price} USD`,
    callback_data: `daimo_plan_${plan.id}`
  }))
```

---

## 💎 Plan Details Screen

**Triggered by:** `daimo_plan_{planId}` callback

**Handler:** `src/bot/index.js` → `handleDaimoPlanSelection(ctx)`

**Routing:**
```javascript
bot.action(/^daimo_plan_(.+)$/, async (ctx) => {
  await handleDaimoPlanSelection(ctx);
});
```

**This delegates to:**
```javascript
// src/bot/helpers/subscriptionHelpers.js
handleSubscription(ctx, planIdentifier, paymentMethod = null)
```

**Display Format:**
```
💎 PNP Member

💰 Price: $24.99 USDC
👤 Duration: month (30 days)
📃 Description: Most popular choice for regular users

✨ Features:
- Full access
- 1080p streaming
- Priority support

💎 Payment Options via Daimo Pay:
• 🏦 Coinbase / Binance
• 💵 Venmo / Cash App
• 💎 Crypto Wallets
• 📱 Direct Transfer

🔒 Secure & Instant:
✓ Blockchain verified payment
✓ Instant subscription activation
✓ Full refund protection guaranteed

Click below to choose your payment method:

[💰 Pay $24.99 USDC - Choose Method]
[❓ Help]
[« Back to Plans]
```

**Buttons:**
- Pay button: `callback_data: pay_daimo_{planId}`
- Help button: `callback_data: payment_help`
- Back button: `callback_data: show_subscription_plans`

---

## 🔐 Payment Processing Flow

### Step 1: Payment Method Selection

**Triggered by:** `pay_daimo_{planId}` callback

**Handler:**
```javascript
bot.action(/^pay_daimo_(.+)$/, async (ctx) => {
  const planId = ctx.match[1];
  await subscriptionHelpers.handleSubscription(ctx, planId, "daimo");
});
```

**Flow:**
```
User clicks "Pay" button
  ↓
pay_daimo_{planId} callback
  ↓
subscriptionHelpers.handleSubscription(ctx, planId, "daimo")
  ↓
handleDaimoPayment(ctx, plan, userId, lang)
```

---

### Step 2: Daimo Payment Request Creation

**File:** `src/bot/helpers/subscriptionHelpers.js` → `handleDaimoPayment()`

**Process:**
```javascript
1. Validate Daimo configuration
   ↓
2. Validate payment amount (min $0.01)
   ↓
3. Create payment request via daimo.createPaymentRequest()
   ↓
4. Receive payment URL
   ↓
5. Display payment screen with URL button
```

**Server-Side Payment Creation:**
```javascript
// src/config/daimo.js
daimo.createPaymentRequest({ amount, userId, plan })
  ↓
// src/services/daimoPaymentService.js
createPaymentLink({
  userId,
  planId,
  amount,
  destinationAddress,
  refundAddress,
  metadata
})
  ↓
// POST https://pay.daimo.com/api/payment
Headers: { 'API-Key': DAIMO_API_KEY }
Body: {
  display: {
    intent: 'Subscribe',
    preferredChains: [8453, 10], // Base + Optimism
    preferredTokens: [Base USDC, Optimism USDC],
    paymentOptions: ['AllExchanges', 'AllPaymentApps'],
    redirectUri: 'https://pnptv.app/payment/success?user={userId}&plan={planId}'
  },
  destination: {
    destinationAddress: TREASURY_ADDRESS,
    chainId: 8453, // Base
    tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
    amountUnits: '24.99'
  },
  refundAddress: REFUND_ADDRESS,
  metadata: { userId, planId }
}
  ↓
Response: {
  id: 'pmt_abc123',
  paymentUrl: 'https://pay.daimo.com/checkout?id=pmt_abc123'
}
```

---

### Step 3: Payment Screen Display

**Display:**
```
💎 PNP Member

Features:
- Full access
- 1080p streaming
- Priority support

💰 Price: $24.99 USDC
👤 Duration: month (30 days)

💎 Pay Easily with Daimo Pay:
Accepts payments from any exchange, wallet or app:

• 💵 Cash App (most popular in USA)
• 💸 Venmo (easy and fast)
• 🏦 Coinbase / Binance (exchanges)
• 💰 Zelle, Revolut, Wise (digital banks)
• 💎 Any Crypto Wallet (MetaMask, Trust, etc.)
• 📱 Direct USDC Transfer

🔒 100% Secure & Instant:
✓ Blockchain verification
✓ Automatic activation after payment
✓ Full refund protection guaranteed

🚀 Super easy! Just click and choose your favorite method:

[💳 Pay $24.99 USDC Now]
[« Back to Plans]
```

**Buttons:**
```javascript
[
  [{ 
    text: "💳 Pay $24.99 USDC Now",
    url: "https://pay.daimo.com/checkout?id=pmt_abc123"
  }],
  [{ 
    text: "« Back to Plans",
    callback_data: "show_subscription_plans"
  }]
]
```

---

## 🔔 Webhook Processing

**When user completes payment on Daimo:**

```
User pays on pay.daimo.com
  ↓
Daimo sends webhook
  ↓
POST https://pnptv.app/api/daimo/webhook
  ↓
src/api/daimo-routes.js → handleDaimoWebhook()
```

**Webhook Handler:**
```javascript
// src/api/daimo-routes.js
router.post('/api/daimo/webhook', async (req, res) => {
  // 1. Verify webhook signature (Basic Auth + HMAC)
  // 2. Parse event type
  // 3. Handle event
});
```

**Event Types:**
```
payment_succeeded
  ↓
  - Extract userId and planId from metadata
  - Calculate expiry date (now + plan.duration days)
  - Update Firestore: users/{userId}
    {
      tier: plan.tier,
      membershipExpiry: expiryDate,
      membershipIsPremium: true,
      membershipActive: true
    }
  - Send confirmation to user via Telegram

payment_failed
  ↓
  - Log error
  - Notify user

payment_refunded
  ↓
  - Revoke membership
  - Set tier to 'Free'
  - Notify user
```

---

## ✅ Activation Confirmation

**User receives Telegram message:**
```
✅ Payment Successful!

Your PNP Member plan is now active.
Expires on: December 1, 2025

Enjoy your premium access! 🔥
```

---

## ❓ Help Screen

**Triggered by:** `payment_help` callback

**Handler:** `src/bot/index.js` → payment_help action

**Display:**
```
💎 Payment Help - Daimo Pay

What is Daimo Pay?
Daimo Pay is a secure payment platform that accepts USDC 
(stable digital dollar) from multiple methods:

💵 Cash App - Most popular in USA
💸 Venmo - Fast and easy
🏦 Coinbase/Binance - Crypto exchanges
💰 Zelle, Revolut, Wise - Digital banks
💎 Crypto Wallets - MetaMask, Trust, etc.

🔒 Security Benefits:

✅ Guaranteed Refunds - 100% money-back protection
✅ Blockchain Verification - Transparent & immutable payments
✅ Instant Activation - Your plan activates automatically
✅ No Hidden Fees - What you see is what you pay
✅ Cancel Anytime - No contracts, no penalties

💡 How it works:
1. Click "Pay"
2. Choose your preferred method (Cash App, Venmo, etc.)
3. Complete payment in seconds
4. Your subscription activates automatically!

🆘 Need help?
Contact: support@pnptv.app

[« Back]
```

---

## 🔄 Navigation Map

```
┌─────────────────────────────────────────────────────────┐
│                    ENTRY POINTS                         │
├─────────────────────────────────────────────────────────┤
│  /subscribe  │  Main Menu  │  Profile  │  Help Menu    │
└──────┬──────────────┬───────────┬────────────┬──────────┘
       │              │           │            │
       └──────────────┴───────────┴────────────┘
                      │
                      ↓
       ┌──────────────────────────────┐
       │   PLAN SELECTION SCREEN      │
       │  (subscribe.js)              │
       │                              │
       │  [💎 Plan 1 - $24.99]       │
       │  [💎 Plan 2 - $49.99]       │
       │  [🔙 Back]                   │
       └──────────────┬───────────────┘
                      │
                      │ daimo_plan_{id}
                      ↓
       ┌──────────────────────────────┐
       │   PLAN DETAILS SCREEN        │
       │  (subscriptionHelpers.js)    │
       │                              │
       │  Features, Price, Benefits   │
       │                              │
       │  [💰 Pay - Choose Method]   │
       │  [❓ Help]                   │
       │  [« Back]                    │
       └──────────────┬───────────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
  pay_daimo_{id}  payment_help   show_subscription_plans
       │              │              │
       ↓              ↓              ↓
┌─────────────┐  ┌──────────┐  ┌─────────┐
│  PAYMENT    │  │   HELP   │  │  BACK   │
│  SCREEN     │  │  SCREEN  │  │  TO     │
│             │  └──────────┘  │  PLANS  │
│ [Pay Now]   │                └─────────┘
│ [« Back]    │
└──────┬──────┘
       │
       │ User clicks "Pay Now" (opens Daimo URL)
       ↓
┌──────────────────────────────┐
│   EXTERNAL: pay.daimo.com    │
│   User completes payment     │
└──────────────┬───────────────┘
               │
               │ Daimo webhook
               ↓
┌──────────────────────────────┐
│   WEBHOOK HANDLER            │
│   (daimo-routes.js)          │
│                              │
│   1. Verify signature        │
│   2. Update Firestore        │
│   3. Send confirmation       │
└──────────────┬───────────────┘
               │
               ↓
┌──────────────────────────────┐
│   ACTIVATION CONFIRMATION    │
│   Telegram message to user   │
│                              │
│   ✅ Payment Successful!     │
│   Your plan is now active    │
└──────────────────────────────┘
```

---

## 📁 File Structure

### Main Files
```
src/
├── bot/
│   ├── index.js
│   │   ├── bot.command('subscribe')
│   │   ├── bot.action('show_subscription_plans')
│   │   ├── bot.action(/^daimo_plan_(.+)$/)
│   │   ├── bot.action(/^pay_daimo_(.+)$/)
│   │   └── bot.action('payment_help')
│   │
│   ├── handlers/
│   │   ├── subscribe.js
│   │   │   └── showPlans() → Display plan selection
│   │   │
│   │   └── daimoSubscription.js
│   │       ├── showDaimoPlans()
│   │       └── handleDaimoPlanSelection()
│   │
│   └── helpers/
│       └── subscriptionHelpers.js
│           ├── handleSubscription() [MAIN ORCHESTRATOR]
│           ├── showPaymentMethodSelection()
│           ├── handleDaimoPayment()
│           ├── handleNequiPayment()
│           ├── buildPlanDetailsMessage()
│           ├── buildDaimoPaymentMessage()
│           ├── buildPaymentMethodKeyboard()
│           └── buildDaimoKeyboard()
│
├── services/
│   ├── planService.js
│   │   ├── listPlans()
│   │   ├── getPlanById()
│   │   └── getActivePlans()
│   │
│   └── daimoPaymentService.js
│       ├── createPaymentLink() [SERVER-SIDE API CALL]
│       ├── getPaymentStatus()
│       └── cancelPayment()
│
├── config/
│   └── daimo.js
│       └── createPaymentRequest() → Delegates to daimoPaymentService
│
└── api/
    └── daimo-routes.js
        ├── POST /api/daimo/create-payment
        ├── POST /api/daimo/webhook [RECEIVES PAYMENT EVENTS]
        ├── GET /api/daimo/health
        └── GET /api/plans/:planId
```

---

## 🔧 Configuration

### Environment Variables Required
```bash
# Daimo Pay API
DAIMO_API_KEY=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_APP_ID=pay-televisionlatina
DAIMO_API_URL=https://pay.daimo.com/api

# Wallet Addresses
NEXT_PUBLIC_TREASURY_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
NEXT_PUBLIC_REFUND_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0

# Bot URL
NEXT_PUBLIC_BOT_URL=https://pnptv.app
```

### Blockchain Configuration
```javascript
{
  preferredChains: [8453, 10], // Base (primary), Optimism (fallback)
  preferredTokens: [
    { chain: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }, // Base USDC
    { chain: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' }    // Optimism USDC
  ],
  paymentOptions: ['AllExchanges', 'AllPaymentApps']
}
```

---

## 🎯 Key Integration Points

### 1. Plan Data Source
```javascript
planService.listPlans()
  ↓
Firestore: /subscriptionPlans collection
  ↓
Returns: [{
  id: 'pnp-member',
  name: 'PNP Member',
  displayName: 'PNP Member',
  price: 24.99,
  duration: 30,
  tier: 'Premium',
  paymentMethod: 'daimo',
  features: ['Full access', '1080p streaming', 'Priority support']
}]
```

### 2. User State Management
```javascript
// Session data during flow
ctx.session = {
  language: 'en',
  selectedPlan: 'pnp-member',
  paymentMethod: 'daimo'
}

// Firestore after payment
users/{userId} = {
  tier: 'Premium',
  membershipExpiry: Timestamp,
  membershipIsPremium: true,
  membershipActive: true,
  lastPaymentDate: Timestamp,
  lastPaymentAmount: 24.99,
  lastPaymentPlan: 'pnp-member'
}
```

### 3. Payment Status Tracking
```javascript
// Optional: Store payment attempts (currently not implemented)
payments/{paymentId} = {
  userId: '123456789',
  planId: 'pnp-member',
  amount: 24.99,
  status: 'pending' | 'succeeded' | 'failed' | 'refunded',
  daimoPaymentId: 'pmt_abc123',
  createdAt: Timestamp,
  completedAt: Timestamp
}
```

---

## 🚨 Error Handling

### User-Facing Errors
```javascript
// Plan not found
⚠️ Plan not found. Please select another plan.

// Payment gateway error
⚠️ Payment system error. Please try again later.

// Daimo not configured
⚠️ Daimo Pay not available in local development
Requires HTTPS to work in Telegram.

// Amount too small
⚠️ Amount too small for Daimo: $0.00
Minimum is $0.01 USD
```

### Error Flow
```
Error occurs in handleDaimoPayment()
  ↓
handleSubscriptionError(ctx, error, planIdentifier)
  ↓
buildErrorMessage(error, lang)
  ↓
Display error with retry button
  [🔄 Try Again]
  [« Back to Plans]
```

---

## 📊 Analytics & Logging

### Key Events Logged
```javascript
logger.info('[Daimo] Creating payment link', { userId, planId, amount });
logger.info('[Daimo] Payment link created', { paymentId, paymentUrl });
logger.info('[Webhook] Payment succeeded', { userId, planId, amount });
logger.error('[Subscription] Error', { type, code, details, stack });
```

---

## 🎨 UI Components Summary

### Message Builders
```javascript
buildPlanDetailsMessage(plan, lang)      // Plan selection screen
buildDaimoPaymentMessage(plan, amount)   // Payment screen
buildNequiPaymentMessage(plan, lang)     // Nequi screen (legacy)
buildErrorMessage(error, lang)           // Error messages
```

### Keyboard Builders
```javascript
buildPaymentMethodKeyboard(plan, lang)   // [Pay] [Help] [Back]
buildDaimoKeyboard(paymentUrl, lang)     // [Pay Now] [Back]
buildNequiKeyboard(plan, lang)           // [Go to Nequi] [Back]
buildErrorKeyboard(planId, lang)         // [Try Again] [Back]
```

---

## 🔐 Security Features

1. **Webhook Verification**
   - Basic Auth header validation
   - HMAC signature verification
   - Request body validation

2. **Payment Verification**
   - Blockchain-verified transactions
   - Immutable payment records
   - Automated refund protection

3. **User Validation**
   - Onboarding completion check
   - Session state validation
   - Admin privilege checks

---

## 📈 Future Enhancements

- [ ] Payment history tracking in Firestore
- [ ] Subscription renewal reminders
- [ ] Failed payment retry logic
- [ ] Multi-currency support
- [ ] Subscription cancellation flow
- [ ] Refund request handling
- [ ] Payment analytics dashboard

---

**Last Updated:** November 1, 2025  
**Version:** 2.0  
**Status:** ✅ Production Active
