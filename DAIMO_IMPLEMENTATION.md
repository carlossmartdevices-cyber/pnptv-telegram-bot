# Daimo Pay Implementation Guide

## Overview

This bot now properly implements Daimo Pay according to the official SDK documentation at https://paydocs.daimo.com/

## Architecture

### Frontend (payment-app)
- **Technology**: React + Vite + `@daimo/pay` SDK
- **Component**: `DaimoPayButton` handles all payment UI
- **Location**: `/payment-app/src/components/CheckoutPage.jsx`

### Backend (src)
- **Webhook Handler**: `/src/bot/webhook.js` (POST `/daimo/webhook`)
- **Configuration**: `/src/config/daimo.js`
- **API Routes**: `/src/bot/api/routes.js`

## Payment Flow

```
1. User selects plan in Telegram bot
   ↓
2. Bot sends payment link: /pay?plan=X&user=Y&amount=Z
   ↓
3. React app loads with DaimoPayButton
   ↓
4. User clicks "Complete Payment"
   ↓
5. DaimoPayButton modal opens with payment options
   ↓
6. onPaymentStarted fires → Store intent in payment_intents collection
   ↓
7. User completes payment (USDC transfer)
   ↓
8. onPaymentCompleted fires → User redirected to success page
   ↓
9. Daimo webhook fires → Backend activates subscription + sends invite link
   ↓
10. User receives Telegram message with channel invite link
```

## Configuration

### Required Environment Variables

```bash
# Backend (.env)
DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_WEBHOOK_TOKEN=your_webhook_token_from_dashboard
BOT_URL=https://your-app.herokuapp.com

# Frontend (payment-app/.env or build-time)
VITE_DAIMO_APP_ID=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
VITE_TREASURY_ADDRESS=0xYourTreasuryWallet
VITE_REFUND_ADDRESS=0xYourRefundWallet  # MUST be valid on ALL networks
VITE_SETTLEMENT_CHAIN=10  # Optimism
VITE_SETTLEMENT_TOKEN=0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85  # USDC on Optimism
```

### DaimoPayButton Props

```jsx
<DaimoPayButton
  appId="pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw"
  intent="Pay"
  toAddress={getAddress('0xYourTreasuryAddress')}
  toChain={10}  // Optimism
  toToken={getAddress('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85')}  // USDC
  toUnits={amount.toFixed(2)}  // e.g., "5.00"
  refundAddress={getAddress('0xYourRefundAddress')}
  onPaymentStarted={handlePaymentStarted}
  onPaymentCompleted={handlePaymentCompleted}
  closeOnSuccess={true}
>
  Complete Payment
</DaimoPayButton>
```

### Supported Networks

Daimo Pay supports settlement to:
- **Optimism** (recommended, chain ID: 10)
- **Base** (chain ID: 8453)
- **Arbitrum** (chain ID: 42161)
- **Polygon** (chain ID: 137)
- **Ethereum** (not recommended due to high fees)
- **Scroll**, **Linea**, **World**, **Celo**, **BSC**

Users can pay from:
- Any of the above networks
- Major exchanges (Coinbase, Binance, etc.)
- Payment apps (Cash App, Zelle, Venmo, Revolut, Wise)
- Solana (USDC)
- Tron (USDT)

## Webhook Events

Daimo sends these webhook events (authenticate with `Authorization: Basic {WEBHOOK_TOKEN}`):

### payment_started
```json
{
  "type": "payment_started",
  "reference": "plan_user_timestamp",
  "amount": "5.00"
}
```
**Action**: Log event (user initiated payment)

### payment_completed
```json
{
  "type": "payment_completed",
  "reference": "plan_user_timestamp",
  "amount": "5.00"
}
```
**Action**:
1. Retrieve userId and planId from payment_intents collection
2. Activate subscription using `activateMembership()`
3. Generate unique channel invite link
4. Send confirmation message to user via Telegram

### payment_bounced
```json
{
  "type": "payment_bounced",
  "reference": "plan_user_timestamp",
  "reason": "destination_call_reverted"
}
```
**Action**: Log warning, notify user (payment failed, funds refunded)

### payment_refunded
```json
{
  "type": "payment_refunded",
  "reference": "plan_user_timestamp",
  "amount": "5.00"
}
```
**Action**: Log info (overpayment/duplicate refunded)

## Implementation Details

### 1. CheckoutPage.jsx (payment-app/src/components/CheckoutPage.jsx:119-132)

```jsx
<DaimoPayButton
  appId={import.meta.env.VITE_DAIMO_APP_ID || 'pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw'}
  intent="Pay"
  toAddress={getAddress(import.meta.env.VITE_TREASURY_ADDRESS || '0x...')}
  toChain={10}
  toToken={getAddress('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85')}
  toUnits={amount.toFixed(2)}
  refundAddress={getAddress(import.meta.env.VITE_REFUND_ADDRESS || '0x...')}
  onPaymentStarted={handlePaymentStarted}
  onPaymentCompleted={handlePaymentCompleted}
  closeOnSuccess={true}
>
  Complete Payment
</DaimoPayButton>
```

### 2. Webhook Handler (src/bot/webhook.js:863)

```javascript
app.post("/daimo/webhook", async (req, res) => {
  // Verify authentication
  const isValidAuth = daimo.verifyWebhookAuth(req.headers.authorization);
  if (!isValidAuth) return res.status(401).json({ error: 'Unauthorized' });

  const event = req.body;

  if (event.type === 'payment_completed') {
    // Retrieve payment intent
    const paymentIntent = await db.collection('payment_intents')
      .doc(reference).get();
    const { userId, planId } = paymentIntent.data();

    // Activate membership + generate invite link
    const result = await activateMembership(userId, tier, 'daimo_webhook',
      durationDays, bot);

    // Send confirmation with invite link
    await bot.telegram.sendMessage(userId,
      `✅ Payment confirmed!\n\n` +
      `Your subscription is active.\n\n` +
      `🔗 Join the channel:\n${result.inviteLink}`
    );
  }

  return res.json({ success: true });
});
```

### 3. Membership Manager (src/utils/membershipManager.js:37)

```javascript
async function activateMembership(userId, tier, activatedBy, durationDays, botInstance) {
  // ... activate subscription ...

  // Generate unique invite link
  if (botInstance && process.env.CHANNEL_ID) {
    const inviteLinkResponse = await botInstance.telegram.createChatInviteLink(
      process.env.CHANNEL_ID,
      {
        member_limit: 1,
        expire_date: Math.floor(expirationDate.getTime() / 1000)
      }
    );
    inviteLink = inviteLinkResponse.invite_link;
  }

  return { success: true, tier, expiresAt, inviteLink };
}
```

## Key Changes Made

### ✅ Fixed DaimoPayButton Props
- Changed `recipientAddress` → `toAddress`
- Changed `amount` → `toUnits` (with `.toFixed(2)`)
- Added required `appId`, `toChain`, `toToken`, `refundAddress`
- Changed `onSuccess` → `onPaymentCompleted`
- Removed non-existent `onError` prop

### ✅ Added Invite Link Generation
- Every payment (manual/automatic) generates unique channel invite link
- Link is single-use (`member_limit: 1`)
- Link expires when membership expires
- Sent in all confirmation messages (Spanish/English)

### ✅ Simplified daimo.js
- Removed incorrect API calls (Daimo uses SDK, not REST API)
- Added network configuration for Optimism
- Added payment origin verification
- Enhanced security with allowed origins list
- Kept only: link generation, webhook auth, config
- Updated validation to check `DAIMO_APP_ID` and `DAIMO_WEBHOOK_TOKEN`

### ✅ Updated Environment Variables
- Added `VITE_` prefixes for Vite frontend
- Added `VITE_REFUND_ADDRESS` (required by SDK)
- Documented settlement chain and token
- Removed obsolete `DAIMO_API_KEY`

### ✅ Enhanced Webhook Handler
- Uses `verifyWebhookAuth()` from config
- Verifies payment origin from allowed Daimo domains
- Enhanced payment metadata storage with network details
- Retrieves userId/planId from payment_intents
- Calls `activateMembership()` with bot instance
- Sends invite link in all confirmation messages

### ✅ Security Improvements
- Added payment origin verification
- Enhanced webhook authentication
- Comprehensive error handling
- Network validation checks
- Payment metadata verification

## Testing Checklist

- [ ] VITE_TREASURY_ADDRESS configured
- [ ] VITE_REFUND_ADDRESS configured (valid on all networks)
- [ ] DAIMO_APP_ID matches dashboard
- [ ] DAIMO_WEBHOOK_TOKEN from dashboard
- [ ] Webhook URL configured in Daimo dashboard
- [ ] CHANNEL_ID set for invite links
- [ ] Payment page loads at /pay?plan=X&user=Y&amount=Z
- [ ] DaimoPayButton renders and opens modal
- [ ] Payment completes and triggers webhook
- [ ] Subscription activates automatically
- [ ] User receives Telegram message with invite link
- [ ] Invite link works and is single-use

## Common Issues

### Issue: "refundAddress must be valid on all chains"
**Solution**: Use a wallet address you control (e.g., treasury address), never use exchange deposit addresses

### Issue: "toUnits has too many decimals"
**Solution**: Use `.toFixed(2)` to ensure exactly 2 decimal places (e.g., "5.00" not "5.0000")

### Issue: Webhook returns 401 Unauthorized
**Solution**: Check `DAIMO_WEBHOOK_TOKEN` matches the token from Daimo dashboard

### Issue: No invite link in messages
**Solution**: Ensure `CHANNEL_ID` is set and bot is admin in the channel

### Issue: Payment modal doesn't open
**Solution**: Check browser console for errors, verify all VITE_ env vars are set

## Resources

- **Official Docs**: https://paydocs.daimo.com/
- **Quickstart**: https://paydocs.daimo.com/quickstart
- **SDK Reference**: https://paydocs.daimo.com/sdk
- **Webhooks**: https://paydocs.daimo.com/webhooks
- **Dashboard**: https://pay.daimo.com/dashboard
- **Support**: founders@daimo.com

## Files Modified

1. `payment-app/src/components/CheckoutPage.jsx` - Fixed DaimoPayButton props
2. `src/config/daimo.js` - Simplified to webhook-only approach
3. `src/bot/webhook.js` - Updated webhook handler with invite links
4. `src/bot/handlers/admin.js` - Added invite links to manual activations
5. `src/utils/membershipManager.js` - Added invite link generation
6. `.env.example` - Updated with correct environment variables
