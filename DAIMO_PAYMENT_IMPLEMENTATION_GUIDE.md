# ⚠️ CRITICAL: Daimo Payment Implementation Issue

**Date:** November 1, 2025  
**Status:** BLOCKER - Payment not working correctly  
**Root Cause:** Using simple URL redirect instead of Daimo Pay React SDK

---

## Current Implementation (❌ WRONG)

```html
<!-- payment-simple.html -->
<script>
  const daimoPayUrl = `https://pay.daimo.com/?recipient=...&appId=...`;
  window.location.href = daimoPayUrl; // Simple redirect
</script>
```

**Problems:**
1. ❌ No React SDK integration - just URL redirect
2. ❌ Can't handle dynamic updates after mount
3. ❌ Missing webhook authentication
4. ❌ No refund handling
5. ❌ No payment status tracking
6. ❌ 404 because redirect URL format is wrong

---

## What Daimo Pay Actually Requires

According to official docs at https://paydocs.daimo.com:

### 1. React SDK Components
```jsx
import { DaimoPayProvider, DaimoPayButton, useDaimoPayUI } from '@daimo/pay';

<DaimoPayProvider appId="your-app-id">
  <DaimoPayButton
    toToken="USDC"
    toChain="base"
    toAddress="0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0"
    toUnits="24.99"
  />
</DaimoPayProvider>
```

### 2. Webhook Authentication
```javascript
// Webhook signature verification
const auth = req.headers.authorization; // "Authorization: Basic <token>"
// Must validate with token from Daimo dashboard
```

### 3. Network Configuration
- **Supported chains:** Arbitrum, Base ✅, BSC, Celo, Ethereum, Linea, Optimism, Polygon, Scroll, World
- **Your setup:** Base network ✅
- **Token:** USDC ✅

### 4. Webhook Events
```
- payment_started: Source transaction seen
- payment_completed: Destination confirmed ✅ (activate membership)
- payment_bounced: Refund triggered
- payment_refunded: Refund sent
```

### 5. Dynamic Updates
```javascript
// Can't change after mount - must use resetPayment
useDaimoPayUI().resetPayment({
  toUnits: "29.99",
  toToken: "USDC",
  toChain: "base",
  toAddress: "0x98a1b6fd...",
  // Omitted fields keep previous values
});
```

---

## Quick Fix Options

### Option A: Use Daimo's hosted embed (SIMPLEST)
Just use the URL format that Daimo provides in their SDK examples:
```
https://pay.daimo.com/...
```

### Option B: Create React component (RECOMMENDED)
Replace `payment-simple.html` with a Next.js page that uses DaimoPayButton component.

### Option C: Use payment API (if URL-based is required)
Use Daimo's Payments API endpoint instead of simple redirect.

---

## Immediate Action Required

**Your current setup tries to use option "redirect to Daimo URL" but:**
1. The URL format appears to be incorrect (404 error)
2. You already have `@daimo/pay` package.json installed
3. You have a Next.js setup (`next dev src/payment-page`)

**Decision:** Should we implement a proper React component instead of simple HTML redirect?

---

## Files That Need Review

1. `/public/payment-simple.html` - Current redirect approach (NOT WORKING)
2. `/src/config/daimo.js` - Configuration
3. `/src/api/daimo-routes.js` - Webhook handling
4. `package.json` - Has @daimo/pay already installed

---

## Configuration Checklist

- [ ] Daimo App ID: `pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw` ✅
- [ ] Recipient address: `0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0` ✅
- [ ] Network: Base ✅
- [ ] Token: USDC ✅
- [ ] Webhook URL: `https://pnptv.app/daimo/webhook` ✅
- [ ] Webhook authentication: ❓ (need token from dashboard)
- [ ] React SDK integration: ❌ (missing - using plain redirect instead)

---

## Recommendation

**Use Daimo's Embedded Hosted Payment Page:**

Instead of redirecting to `pay.daimo.com`, use their official embed URL format from the quickstart guide.

**Or migrate to React component** if you want full control over the payment flow.

Which approach would you prefer?

