# ePayco Payment Integration Guide

## Overview

Your bot now integrates with ePayco, Colombias leading payment gateway, for processing subscription payments.

## Features

✅ One-time payment links for subscriptions
✅ Automatic membership activation on payment
✅ Webhook confirmation handling
✅ Test and production modes
✅ Colombian Peso (COP) support
✅ Payment status tracking

## Setup Instructions

### 1. Create ePayco Account

1. Go to [https://dashboard.epayco.com/signup](https://dashboard.epayco.com/signup)
2. Create a merchant account
3. Complete verification process
4. Access your dashboard

### 2. Get API Credentials

1. Login to [ePayco Dashboard](https://dashboard.epayco.com/)
2. Go to **Integración** → **Llaves API**
3. Copy your:
   - **P_CUST_ID_CLIENTE** (Public Key)
   - **P_KEY** (Private Key)

### 3. Configure Environment Variables

Add to your `.env` file:

```bash
# ePayco Configuration
EPAYCO_PUBLIC_KEY=your_public_key_here
EPAYCO_PRIVATE_KEY=your_private_key_here
EPAYCO_TEST_MODE=true

# Webhook URLs (use your deployed URL)
BOT_URL=https://yourdomain.com
EPAYCO_RESPONSE_URL=https://yourdomain.com/epayco/response
EPAYCO_CONFIRMATION_URL=https://yourdomain.com/epayco/confirmation
```

### 4. Set Up Webhooks in ePayco

1. Go to ePayco Dashboard → **Integración** → **URLs de Respuesta**
2. Set **URL de Confirmación**: `https://yourdomain.com/epayco/confirmation`
3. Set **URL de Respuesta**: `https://yourdomain.com/epayco/response`
4. Save changes

## Testing

### Test Mode

Set `EPAYCO_TEST_MODE=true` to use test environment.

**Test Cards:**
- **Card**: 4575 6231 8229 0326
- **Expiry**: 12/2025
- **CVV**: 123
- **Status**: Approved

### Test Flow

1. User clicks Subscribe in bot
2. Gets payment link from ePayco
3. Completes payment with test card
4. Webhook confirms payment
5. Membership activated automatically

## Payment Flow

```
User → /subscribe
  ↓
Bot creates ePayco payment link
  ↓
User opens link → ePayco checkout
  ↓
User completes payment
  ↓
ePayco sends confirmation webhook
  ↓
Bot verifies transaction
  ↓
Membership activated
  ↓
User receives confirmation
```

## Pricing

Prices are in Colombian Pesos (COP):

- **Silver**: $60,000 COP (~$15 USD)
- **Golden**: $100,000 COP (~$25 USD)

Update in `src/config/plans.js` if needed.

## Webhook Endpoints

### Confirmation Webhook
**URL**: `/epayco/confirmation`
**Method**: GET or POST
**Purpose**: Processes payment and activates membership

**Parameters**:
- `ref_payco` - ePayco reference ID
- `x_transaction_id` - Transaction ID
- `x_response` - Response status
- `x_cod_response` - Response code (1 = approved)

### Response Page
**URL**: `/epayco/response`
**Method**: GET
**Purpose**: User redirect page after payment

Shows success/failure message and link back to bot.

## Database

### Payments Collection

Each successful payment creates a document:

```javascript
{
  userId: string,
  reference: string, // ePayco ref_payco
  transactionId: string,
  amount: number,
  currency: string,
  plan: string, // "silver" or "golden"
  tier: string, // "Silver" or "Golden"
  status: string, // "completed"
  provider: string, // "epayco"
  createdAt: timestamp,
  transactionData: object // full ePayco response
}
```

## Troubleshooting

### Issue: Payment not activating membership

**Solutions:**
1. Check webhook URL is accessible (use ngrok for local dev)
2. Verify `BOT_URL` environment variable
3. Check logs for webhook errors
4. Ensure Firebase connection is active

### Issue: Invalid API credentials

**Solutions:**
1. Verify keys in .env match ePayco dashboard
2. Check test vs production keys
3. Regenerate keys if needed

### Issue: Webhook not receiving calls

**Solutions:**
1. Confirm webhook URL in ePayco dashboard
2. Use HTTPS (required by ePayco)
3. Check firewall allows epayco.com
4. Test with ngrok: `ngrok http 3000`

## Going Live

### Production Checklist

- [ ] Get production API keys from ePayco
- [ ] Set `EPAYCO_TEST_MODE=false`
- [ ] Update webhook URLs with production domain
- [ ] Configure HTTPS
- [ ] Test with real small amount
- [ ] Monitor logs for 24 hours
- [ ] Set up payment notifications

### Security

✅ All keys in environment variables
✅ Webhook verifies transactions with ePayco
✅ Duplicate payment prevention
✅ Database logging for audit
✅ User notifications for transparency

## Support

- **ePayco Docs**: https://docs.epayco.com/
- **ePayco Support**: soporte@epayco.com
- **Dashboard**: https://dashboard.epayco.com/

## Files

**Configuration:**
- `src/config/epayco.js` - ePayco client configuration
- `src/config/plans.js` - Subscription plans with COP pricing

**Webhook:**
- `src/web/epaycoWebhook.js` - Webhook handler
- `src/web/server.js` - Routes configuration

**Bot:**
- `src/bot/index.js` - Subscription flow

## Examples

### Manual Payment Link Creation

```javascript
const { createPaymentLink } = require("./src/config/epayco");

const payment = await createPaymentLink({
  name: "PNPtv Silver",
  description: "Monthly subscription",
  amount: 60000, // COP
  currency: "COP",
  userId: "123456",
  userEmail: "user@example.com",
  userName: "John Doe",
  plan: "silver"
});

console.log(payment.paymentUrl); // Send this to user
```

### Verify Transaction

```javascript
const { verifyTransaction } = require("./src/config/epayco");

const transaction = await verifyTransaction("ref_payco_id");

if (transaction.approved) {
  console.log("Payment approved!");
  console.log("User ID:", transaction.extra1);
  console.log("Plan:", transaction.extra2);
}
```

## Migration Notes

The codebase now uses ePayco exclusively for subscription payments. Any legacy references to other gateways have been removed. If you're upgrading from an older deployment:

1. Redeploy with the new code
2. Remove old payment gateway webhooks or dashboard configurations
3. Ensure the new ePayco environment variables are set

---

**Status**: ✅ ePayco integration complete and ready for testing!
