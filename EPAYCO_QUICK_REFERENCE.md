# ePayco Quick Reference Guide

## Quick Setup

### 1. Configure Environment Variables

Add to your `.env` file:

```env
# ePayco Credentials (Get from https://dashboard.epayco.co/)
EPAYCO_PUBLIC_KEY=your_public_key_here
EPAYCO_PRIVATE_KEY=your_private_key_here
EPAYCO_P_CUST_ID=your_customer_id_here
EPAYCO_P_KEY=your_p_key_here

# Test Mode (true for testing, false for production)
EPAYCO_TEST_MODE=true

# Bot URL (Required for webhooks)
BOT_URL=https://your-app.railway.app

# Optional: Override webhook URLs
EPAYCO_RESPONSE_URL=https://your-app.railway.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://your-app.railway.app/epayco/confirmation
```

### 2. Verify Configuration

```bash
# Run automated tests
node test-epayco.js

# Or visit debug endpoint
curl http://localhost:3000/debug/test-payment
```

## Quick Test Commands

### Test Configuration Loading
```bash
node -e "require('./src/config/epayco'); console.log('✓ Config loaded')"
```

### Run Full Test Suite
```bash
node test-epayco.js
```

### Test Server Startup
```bash
npm start
```

## API Endpoints

### Debug Endpoint
- **URL:** `/debug/test-payment`
- **Method:** GET
- **Purpose:** Test ePayco integration and get diagnostics
- **Response:** Detailed diagnostics and test payment link

### Payment Creation
- **URL:** `/api/payment/create`
- **Method:** POST
- **Auth:** Required (Telegram user authentication)
- **Body:**
  ```json
  {
    "userId": "123456789",
    "planId": "plan_id_or_slug"
  }
  ```

### Webhook Endpoints
- **Confirmation:** `/epayco/confirmation` (GET/POST)
- **Response:** `/epayco/response` (GET)
- **Health Check:** `/epayco/health` (GET)

## Code Usage Examples

### Validate Credentials
```javascript
const { validateCredentials } = require('./src/config/epayco');

try {
  validateCredentials();
  console.log('✓ Credentials valid');
} catch (error) {
  console.error('✗ Credentials invalid:', error.message);
}
```

### Create Payment Link
```javascript
const { createPaymentLink } = require('./src/config/epayco');

const paymentData = await createPaymentLink({
  name: 'Premium Plan',
  description: 'Premium subscription - 30 days',
  amount: 50000, // Amount in COP
  currency: 'COP',
  userId: '123456789',
  userEmail: 'user@telegram.user',
  userName: 'John Doe',
  plan: 'premium'
});

console.log('Payment URL:', paymentData.paymentUrl);
console.log('Reference:', paymentData.reference);
```

### Validate Payment Parameters
```javascript
const { validatePaymentParams } = require('./src/config/epayco');

try {
  validatePaymentParams({
    name: 'Test Plan',
    description: 'Test description',
    amount: 50000,
    currency: 'COP',
    userId: '123',
    userEmail: 'test@test.com',
    userName: 'Test',
    plan: 'test'
  });
  console.log('✓ Parameters valid');
} catch (error) {
  console.error('✗ Parameters invalid:', error.message);
}
```

## Test Credit Cards (Test Mode Only)

### Approved Transaction
- **Card:** 4575623182290326
- **CVV:** 123
- **Expiry:** Any future date

### Rejected Transaction
- **Card:** 4151611527583283
- **CVV:** 123
- **Expiry:** Any future date

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing ePayco credentials" | Environment variables not set | Check `.env` file and restart app |
| "Invalid payment parameters" | Missing or invalid parameter | Verify all required params are provided |
| "Payment gateway not configured" | Credentials not loaded | Ensure `.env` is in project root |
| "Invalid amount" | Amount is not positive number | Check amount is > 0 |
| "Invalid currency" | Currency not COP or USD | Use "COP" or "USD" |

## Troubleshooting Steps

### 1. Check Environment Variables
```bash
node -e "console.log('EPAYCO_PUBLIC_KEY:', process.env.EPAYCO_PUBLIC_KEY ? 'Set' : 'Missing')"
```

### 2. Run Diagnostics
```bash
curl http://localhost:3000/debug/test-payment | json_pp
```

### 3. Check Logs
```bash
# Look for ePayco-related errors
heroku logs --tail | grep -i epayco

# Or for Railway
railway logs
```

### 4. Verify Webhook URLs
```bash
# Test confirmation endpoint
curl https://your-app.railway.app/epayco/health
```

### 5. Test Payment Flow
1. Visit `/debug/test-payment`
2. Copy payment URL from response
3. Open URL in browser
4. Complete test payment
5. Check logs for webhook confirmation

## Environment-Specific Configuration

### Development
```env
EPAYCO_TEST_MODE=true
BOT_URL=http://localhost:3000
```

### Staging
```env
EPAYCO_TEST_MODE=true
BOT_URL=https://your-app-staging.railway.app
```

### Production
```env
EPAYCO_TEST_MODE=false
BOT_URL=https://your-app.railway.app
```

## Security Checklist

- [ ] Credentials stored in environment variables (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] Test mode enabled for testing
- [ ] Webhook signature validation enabled
- [ ] HTTPS enabled for production
- [ ] BOT_URL points to correct domain

## Quick Links

- **ePayco Dashboard:** https://dashboard.epayco.co/
- **API Documentation:** https://docs.epayco.co/
- **Test Environment:** https://secure.payco.co/checkout.php
- **Support:** https://epayco.co/contacto

## File Locations

- **Configuration:** `src/config/epayco.js`
- **Webhook Handler:** `src/web/epaycoWebhook.js`
- **Server:** `src/web/server.js`
- **Test Suite:** `test-epayco.js`
- **Environment:** `.env`

## Validation Functions

### `validateCredentials()`
**Purpose:** Validates all required ePayco credentials are configured

**Checks:**
- EPAYCO_PUBLIC_KEY
- EPAYCO_PRIVATE_KEY
- EPAYCO_P_CUST_ID
- EPAYCO_P_KEY

**Throws:** Error with list of missing credentials

### `validatePaymentParams(params)`
**Purpose:** Validates payment link parameters

**Checks:**
- All required parameters present
- Amount is positive number
- Currency is valid (COP or USD)

**Throws:** Error with specific validation failure

## Response Codes

### ePayco Transaction States
- **1** = Approved (Aceptada)
- **2** = Rejected (Rechazada)
- **3** = Pending (Pendiente)
- **4** = Failed (Fallida)

### HTTP Status Codes
- **200** = Success
- **400** = Bad Request (invalid parameters)
- **401** = Unauthorized (invalid credentials)
- **404** = Not Found (user/plan not found)
- **500** = Server Error

## Next Steps After Setup

1. Run test suite: `node test-epayco.js`
2. Visit debug endpoint: `/debug/test-payment`
3. Create test payment link
4. Complete test transaction
5. Verify webhook receives confirmation
6. Check user membership activation
7. Review logs for any issues
8. Update test mode for production

## Support

For issues or questions:
1. Check this guide
2. Review `EPAYCO_FIX_SUMMARY.md`
3. Check application logs
4. Visit ePayco dashboard
5. Contact ePayco support
