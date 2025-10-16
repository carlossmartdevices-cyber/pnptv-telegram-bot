# ePayco Payment Integration Setup

## Overview
This bot uses ePayco as the payment gateway for processing subscriptions in Colombian Pesos (COP).

## What Was Fixed

### Problem 1: Access Denied Error
The payment links were generating "Access Denied" XML errors when clicked.

**Root Cause:**
- Initially tried using `epayco.charge.create()` - wrong method
- Then tried `epayco.bank.create()` and `epayco.cash.create()` - also caused errors
- The SDK methods require additional authentication and complex parameters

### Solution: Using ePayco SDK charge.create()
Changed to use **ePayco SDK `charge.create()` method** with all required fields:

```javascript
const response = await epayco.charge.create({
  name: "Product Name",
  description: "Description",
  invoice: "unique_invoice_id",
  amount: "60000",
  currency: "COP",
  tax_base: "0",
  tax: "0",
  country: "CO",
  lang: "ES",

  // Required customer fields
  name_billing: "Customer Name",
  address_billing: "Address",
  type_doc_billing: "CC",
  number_doc_billing: "1234567890",
  email_billing: "email@example.com",
  mobilephone_billing: "3000000000",

  // URLs
  url_response: "https://your-site.com/response",
  url_confirmation: "https://your-site.com/confirmation",

  // Tracking
  extra1: "userId",
  extra2: "planType",
  extra3: "timestamp"
});

// Returns: response.data.urlbanco - the payment URL
```

This method:
- ✅ Uses official ePayco SDK
- ✅ Returns proper `urlbanco` payment URL
- ✅ Includes all required fields
- ✅ Works in both test and production modes
- ✅ Properly authenticated with PUBLIC_KEY and PRIVATE_KEY

## Configuration Required

### 1. Environment Variables

Add these to your `.env` file:

```env
# ePayco Configuration
EPAYCO_PUBLIC_KEY=your_public_key_here
EPAYCO_PRIVATE_KEY=your_private_key_here
EPAYCO_TEST_MODE=true  # Set to 'false' for production

# Bot URL (required for webhooks)
BOT_URL=https://your-bot-domain.com

# Optional: Custom response URLs
EPAYCO_RESPONSE_URL=https://your-bot-domain.com/epayco/response
EPAYCO_CONFIRMATION_URL=https://your-bot-domain.com/epayco/confirmation
```

### 2. Getting ePayco Credentials

1. Go to [ePayco Dashboard](https://dashboard.epayco.co/)
2. Register or login to your account
3. Navigate to **Settings** → **API Keys**
4. Copy your:
   - **Public Key** (P_CUST_ID...)
   - **Private Key** (SECRET_KEY...)

### 3. Test Mode vs Production

**Test Mode (Sandbox):**
- Set `EPAYCO_TEST_MODE=true`
- Uses: `https://checkout.epayco.co/sandbox`
- Test cards: Available in ePayco documentation

**Production Mode:**
- Set `EPAYCO_TEST_MODE=false`
- Uses: `https://checkout.epayco.co`
- Real payments are processed

## How It Works

### Payment Flow

1. **User Initiates Payment**
   - User clicks "Subscribe Silver" or "Subscribe Golden"
   - Bot creates payment link with ePayco

2. **Payment Link Generation**
   ```javascript
   const paymentUrl = "https://checkout.epayco.co?
     public_key=YOUR_KEY&
     name=Plan+Name&
     amount=60000&
     currency=COP&
     ...other_params"
   ```

3. **User Pays**
   - User clicks the payment button
   - Redirected to ePayco Checkout
   - Completes payment

4. **Confirmation**
   - ePayco sends confirmation to your webhook
   - Bot activates membership
   - User receives confirmation

### Payment Link Structure

The payment link includes:
- **Product Info**: Name, description, amount, currency
- **Customer Info**: Email, name
- **Tracking**: User ID, plan type, timestamp
- **URLs**: Response and confirmation webhooks
- **Test Mode**: Indicator for sandbox/production

## Webhook Setup

### Response URL
Called when user completes/cancels payment (user is redirected here):
```
https://your-bot-domain.com/epayco/response
```

### Confirmation URL
Called by ePayco to confirm payment (server-to-server):
```
https://your-bot-domain.com/epayco/confirmation
```

**Important:** Make sure these URLs are publicly accessible!

## Testing

### Test in Development

1. Set `EPAYCO_TEST_MODE=true`
2. Use test credentials from ePayco
3. Click subscribe button
4. You should see a payment URL starting with:
   ```
   https://checkout.epayco.co/sandbox?public_key=...
   ```

### Test Cards (Sandbox)

```
Card Number: 4575623182290326
CVV: 123
Expiry: Any future date
```

## Troubleshooting

### Payment Link Not Generated

**Check:**
1. `EPAYCO_PUBLIC_KEY` is set in `.env`
2. No errors in logs about missing credentials
3. Plans are configured correctly in `src/config/plans.js`

**Logs to check:**
```javascript
Creating ePayco payment link for user X, plan: silver
Payment link created: https://checkout.epayco.co...
```

### Invalid Amount Errors

**Possible causes:**
- Amount is not a valid number
- Currency mismatch

**Solution:**
- Check `priceInCOP` in plans.js
- Should be full pesos (e.g., 60000 for $60,000 COP)

### Webhook Not Receiving Confirmation

**Check:**
1. `BOT_URL` is set correctly
2. URLs are HTTPS (required by ePayco)
3. Server is publicly accessible
4. Webhook endpoint is implemented

## Security Notes

1. **Never commit `.env` file**
   - Add to `.gitignore`
   - Use environment variables in production

2. **Validate Webhooks**
   - Verify ePayco signature
   - Check transaction status
   - Prevent replay attacks

3. **Use HTTPS**
   - Required for webhooks
   - Required for production

## Production Checklist

- [ ] Set `EPAYCO_TEST_MODE=false`
- [ ] Use production API keys
- [ ] Configure HTTPS webhooks
- [ ] Test with small amounts first
- [ ] Monitor logs for errors
- [ ] Set up error alerts

## Support

- **ePayco Documentation**: https://docs.epayco.co/
- **ePayco Support**: soporte@epayco.co
- **Dashboard**: https://dashboard.epayco.co/

## Example Payment Link

```
https://checkout.epayco.co?
  public_key=YOUR_PUBLIC_KEY&
  name=PNPtv+Silver&
  description=Silver+subscription+-+30+days&
  invoice=silver_123456789_1234567890&
  currency=COP&
  amount=60000&
  tax=0&
  tax_base=0&
  email=user@telegram.user&
  name_billing=John+Doe&
  country=CO&
  lang=es&
  external=false&
  response=https://your-bot.com/epayco/response&
  confirmation=https://your-bot.com/epayco/confirmation&
  extra1=123456789&
  extra2=silver&
  extra3=1234567890&
  test=true
```

## Monitoring

### Important Logs

```javascript
// Success
"Creating ePayco payment link for user..."
"Payment link created successfully..."

// Errors
"EPAYCO_PUBLIC_KEY not configured"
"Payment link creation failed"
"Error creating ePayco payment link"
```

### Metrics to Track

- Payment links created
- Successful payments
- Failed payments
- Webhook confirmations received
- Membership activations

## Next Steps

After fixing the payment links, you should:

1. **Implement Webhook Handler** (`src/web/epaycoWebhook.js`)
2. **Test Payment Flow** end-to-end
3. **Add Payment Status Tracking** in database
4. **Set Up Monitoring** and alerts
5. **Document User Flow** for support team
