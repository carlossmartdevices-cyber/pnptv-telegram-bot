# Daimo Pay Integration Guide

## Overview

Daimo Pay has been successfully integrated into the PNPtv Telegram Bot as an additional payment method alongside ePayco and Nequi. Daimo Pay enables fast, frictionless stablecoin (USDC) deposits from any major exchange, wallet, or payment app.

## Key Features

- **Fast Deposits**: Accept USDC payments in seconds
- **Low Fees**: Minimal transaction costs compared to traditional payment processors
- **Global Reach**: Accept payments from anywhere in the world
- **Automatic Activation**: Subscriptions are activated automatically upon payment confirmation
- **Multi-Currency Support**: Display prices in both USD and local currency (COP)

## Architecture

### Components Added

1. **Configuration Module** (`src/config/daimo.js`)
   - Payment request creation
   - Payment verification
   - Webhook processing
   - Credential validation

2. **Webhook Handler** (`src/bot/webhook.js`)
   - `/daimo/webhook` - Handles payment notifications
   - `/payment/success` - Success page after payment

3. **Plan Manager Updates** (`src/bot/handlers/admin/planManager.js`)
   - Support for "daimo" payment method
   - Optional Daimo App ID configuration per plan

4. **Subscription Helper Updates** (`src/bot/helpers/subscriptionHelpers.js`)
   - Daimo payment flow
   - Automatic currency conversion (COP to USD)
   - User-friendly payment messages

5. **Plan Service Updates** (`src/services/planService.js`)
   - Payment method validation for "daimo"
   - USDC/USD currency handling

## Setup Instructions

### 1. Get Daimo Pay Credentials

1. Visit [pay.daimo.com/dashboard](https://pay.daimo.com/dashboard)
2. Sign up or log in to your account
3. Navigate to API Settings
4. Copy your:
   - API Key
   - App ID

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Daimo Pay Configuration
DAIMO_API_KEY=your_api_key_here
DAIMO_APP_ID=your_app_id_here

# Optional: Custom endpoints
DAIMO_API_URL=https://api.daimo.com/v1
DAIMO_WEBHOOK_URL=https://your-app.herokuapp.com/daimo/webhook
DAIMO_RETURN_URL=https://your-app.herokuapp.com/payment/success
```

### 3. Configure Webhook URL

In your Daimo Pay dashboard, set the webhook URL to:
```
https://your-app.herokuapp.com/daimo/webhook
```

### 4. Create a Plan with Daimo Payment

As an admin in the bot:

1. Send `/admin` to access the admin panel
2. Select "Manage Plans"
3. Click "Create Plan"
4. Follow the prompts and select **daimo** when asked for payment method
5. Optionally provide a custom Daimo App ID or skip to use the default from `.env`

## Payment Flow

### User Journey

1. **User Selects Plan**
   - User browses available subscription plans
   - Clicks on a plan with Daimo as payment method

2. **Payment Information Displayed**
   - Plan details shown (name, price, duration)
   - Price shown in both USD (USDC) and COP
   - Payment method: "Daimo Pay (USDC Stablecoin)"

3. **Payment Processing**
   - User clicks "Pay with USDC"
   - Redirected to Daimo Pay checkout
   - Completes payment with USDC from their wallet/exchange

4. **Webhook Confirmation**
   - Daimo sends webhook to `/daimo/webhook`
   - Bot verifies payment and activates subscription
   - User receives confirmation message in Telegram

5. **Subscription Active**
   - User's tier is updated
   - Membership expiration date set
   - Access to premium features enabled

### Technical Flow

```
User → Plan Selection → Daimo Payment Request
  ↓
Daimo Checkout (USDC Payment)
  ↓
Webhook Notification → Payment Verification
  ↓
Database Update → User Notification → Subscription Active
```

## API Reference

### Creating Payment Request

```javascript
const daimo = require('./src/config/daimo');

const paymentData = await daimo.createPaymentRequest({
  amount: 10.00,          // Amount in USD
  userId: "123456789",    // Telegram user ID
  userEmail: "user@example.com",
  userName: "John Doe",
  plan: "plan_id_here",
  description: "Silver subscription - 30 days"
});

// Returns:
// {
//   success: true,
//   paymentUrl: "https://pay.daimo.com/checkout?ref=...",
//   reference: "silver_123456789_1234567890",
//   data: { ... }
// }
```

### Verifying Payment

```javascript
const verification = await daimo.verifyPayment(referenceId);

// Returns:
// {
//   success: true,
//   status: "completed", // pending, completed, failed, expired
//   reference: "silver_123456789_1234567890",
//   data: { ... }
// }
```

### Processing Webhook

```javascript
const webhookResult = await daimo.processWebhook(webhookData);

// Returns:
// {
//   success: true,
//   reference: "silver_123456789_1234567890",
//   status: "completed",
//   amount: 10.00,
//   userId: "123456789",
//   plan: "plan_id_here",
//   timestamp: 1234567890
// }
```

## Currency Conversion

Daimo Pay uses USDC (stablecoin pegged to USD). The bot automatically converts COP prices to USD for display and payment processing:

```javascript
// Simple conversion (adjust exchange rate as needed)
const amountUSD = plan.currency === "USD"
  ? plan.price
  : plan.price / 4000; // COP to USD conversion
```

**Note**: Update the conversion rate based on current market rates or integrate with a currency API for real-time rates.

## Security Considerations

1. **Environment Variables**: Never commit `.env` file with real credentials
2. **Webhook Validation**: Implement webhook signature verification (TODO)
3. **HTTPS Only**: Daimo webhooks require HTTPS endpoints
4. **Rate Limiting**: Consider adding rate limiting to webhook endpoint
5. **Error Handling**: All payment operations include comprehensive error logging

## Testing

### Test Mode

For development/testing, use test credentials from Daimo Pay:
- API Key: `pay-demo`
- App ID: `pay-demo`

### Manual Testing

1. Create a test plan with Daimo payment method
2. Attempt to subscribe as a regular user
3. Complete payment in Daimo Pay checkout
4. Verify webhook is received and processed
5. Confirm subscription is activated

### Webhook Testing

Use tools like [webhook.site](https://webhook.site) or [ngrok](https://ngrok.com) to test webhook delivery during local development.

## Troubleshooting

### Common Issues

1. **"Daimo Pay not configured" error**
   - Ensure `DAIMO_API_KEY` and `DAIMO_APP_ID` are set in `.env`
   - Check credentials are valid

2. **Webhook not received**
   - Verify webhook URL is set in Daimo dashboard
   - Ensure URL is publicly accessible (HTTPS)
   - Check firewall/network settings

3. **Payment not activating subscription**
   - Check bot logs for webhook processing errors
   - Verify user and plan exist in database
   - Ensure webhook status is "completed"

4. **Currency conversion issues**
   - Update COP to USD conversion rate in code
   - Consider integrating currency API for real-time rates

### Debug Logging

Enable debug logging to troubleshoot issues:

```javascript
// In src/config/daimo.js
logger.debug("Daimo payment request:", paymentData);
logger.debug("Webhook received:", webhookData);
```

## Monitoring

### Key Metrics to Track

- Payment success rate
- Average payment processing time
- Webhook delivery success rate
- Failed payments and reasons
- Currency conversion accuracy

### Logs to Monitor

- Payment request creations
- Webhook deliveries
- Subscription activations
- Failed payments
- Database updates

## Future Enhancements

1. **Webhook Signature Verification**: Implement cryptographic verification of Daimo webhooks
2. **Real-time Currency Conversion**: Integrate with forex API for accurate COP↔USD conversion
3. **Payment Analytics Dashboard**: Track Daimo payment metrics
4. **Subscription Auto-renewal**: Support recurring USDC payments
5. **Refund Handling**: Implement refund processing via Daimo API
6. **Multi-chain Support**: Support USDC on different blockchains (Ethereum, Polygon, Base)

## Resources

- **Daimo Pay Documentation**: [paydocs.daimo.com](https://paydocs.daimo.com/)
- **Quickstart Guide**: [paydocs.daimo.com/quickstart](https://paydocs.daimo.com/quickstart)
- **SDK Reference**: [paydocs.daimo.com/sdk](https://paydocs.daimo.com/sdk)
- **Webhook Guide**: [paydocs.daimo.com/webhooks](https://paydocs.daimo.com/webhooks)
- **NPM Package**: [@daimo/pay](https://www.npmjs.com/package/@daimo/pay)

## Support

For issues or questions:
1. Check Daimo Pay documentation
2. Review bot logs for error details
3. Contact Daimo Pay support for API-related issues
4. Open an issue in the bot repository for integration bugs

---

**Version**: 1.0.0
**Last Updated**: 2025-10-18
**Status**: Production Ready ✅
