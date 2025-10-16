# ePayco Webhook Testing Guide

## Overview

This guide helps you test the ePayco payment webhooks locally and in production.

## Webhook Endpoints

Your bot has three ePayco endpoints:

1. **Confirmation Webhook** (GET): `https://pnptv-telegram-bot-production.up.railway.app/epayco/confirmation`
   - Called by ePayco when payment is confirmed
   - Server-to-server callback
   - Must respond with HTTP 200

2. **Confirmation Webhook** (POST): `https://pnptv-telegram-bot-production.up.railway.app/epayco/confirmation`
   - Alternative endpoint if ePayco sends POST instead of GET
   - Same functionality as GET endpoint

3. **Response Page** (GET): `https://pnptv-telegram-bot-production.up.railway.app/epayco/response`
   - User is redirected here after payment
   - Shows success/failure page
   - Provides visual feedback

4. **Health Check**: `https://pnptv-telegram-bot-production.up.railway.app/epayco/health`
   - Check if webhook service is running
   - Returns: `{"status":"ok","service":"epayco-webhook","timestamp":"..."}`

## Testing Locally

### 1. Start the Bot Locally

```bash
npm start
```

The web server will start on port 3000 (or PORT from .env).

### 2. Expose Local Server with ngrok

```bash
# Install ngrok if you haven't
npm install -g ngrok

# Expose port 3000
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

### 3. Update Environment Variables

Temporarily update your `.env` file:

```env
EPAYCO_RESPONSE_URL=https://abc123.ngrok.io/epayco/response
EPAYCO_CONFIRMATION_URL=https://abc123.ngrok.io/epayco/confirmation
```

### 4. Test Payment Flow

1. Start bot: `/start`
2. Click Subscribe button
3. Choose a plan (Silver or Golden)
4. Click the payment button
5. You'll be redirected to ePayco checkout
6. Use test card:
   - **Card Number**: `4575623182290326`
   - **CVV**: `123`
   - **Expiry**: Any future date
   - **Name**: Test User

### 5. Monitor Logs

Watch your console for webhook logs:

```
[WEBHOOK] ePayco confirmation received
[WEBHOOK] Verifying transaction with ePayco: ref_123
[WEBHOOK] Transaction verified
[WEBHOOK] Processing payment for user 123456
[WEBHOOK] Payment recorded: abc123
[WEBHOOK] Activating membership for user 123456
[WEBHOOK] Membership activated successfully
[WEBHOOK] Payment confirmation sent to user 123456
[WEBHOOK] Payment processed successfully in 1234ms
```

## Testing in Production (Railway)

### 1. Check Webhook URLs

Verify in Railway dashboard that these are set:

```env
EPAYCO_RESPONSE_URL=https://pnptv-telegram-bot-production.up.railway.app/epayco/response
EPAYCO_CONFIRMATION_URL=https://pnptv-telegram-bot-production.up.railway.app/epayco/confirmation
```

### 2. Test Health Check

```bash
curl https://pnptv-telegram-bot-production.up.railway.app/epayco/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "epayco-webhook",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### 3. Monitor Railway Logs

In Railway dashboard:
1. Go to your service
2. Click **Logs** tab
3. Filter for `[WEBHOOK]` to see webhook activity

### 4. Test End-to-End Payment

1. Open Telegram bot
2. Start subscription flow
3. Complete payment with test card
4. Check Railway logs for webhook calls
5. Verify membership was activated
6. Check you received Telegram notification

## Manual Webhook Testing

### Test Confirmation Endpoint (GET)

```bash
curl "https://pnptv-telegram-bot-production.up.railway.app/epayco/confirmation?ref_payco=TEST123&x_cod_response=1&x_response=Aceptada"
```

**Note**: This will fail verification because `TEST123` is not a real transaction. You need a real `ref_payco` from ePayco.

### Test Confirmation Endpoint (POST)

```bash
curl -X POST https://pnptv-telegram-bot-production.up.railway.app/epayco/confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "ref_payco": "TEST123",
    "x_cod_response": "1",
    "x_response": "Aceptada"
  }'
```

### Test Response Page

Open in browser:
```
https://pnptv-telegram-bot-production.up.railway.app/epayco/response?ref_payco=TEST123&x_cod_response=1&x_response=Aceptada
```

## Webhook Flow Diagram

```
User clicks "Pay"
    ↓
Bot creates payment link via ePayco SDK
    ↓
User redirected to ePayco checkout
    ↓
User enters payment details
    ↓
ePayco processes payment
    ↓
    ├─→ [Response URL] User redirected to success/failure page
    │   └─→ Shows visual confirmation
    │
    └─→ [Confirmation URL] ePayco calls webhook
        ├─→ Verify transaction with ePayco API
        ├─→ Check if already processed (idempotency)
        ├─→ Save payment to database
        ├─→ Activate membership
        └─→ Send Telegram notification
```

## Expected Log Messages

### Successful Payment

```
[WEBHOOK] ePayco confirmation received {
  ref_payco: 'abc123',
  x_transaction_id: '123456',
  x_response: 'Aceptada',
  x_cod_response: '1'
}
[WEBHOOK] Verifying transaction with ePayco: abc123
[WEBHOOK] Transaction verified {
  reference: 'abc123',
  status: 'Aceptada',
  approved: true,
  amount: '60000',
  currency: 'COP'
}
[WEBHOOK] Processing payment for user 123456 { plan: 'silver' }
[WEBHOOK] Plan found: Silver Plan { tier: 'Silver', duration: 30, price: 20 }
[WEBHOOK] User found: @username
[WEBHOOK] Recording payment in database
[WEBHOOK] Payment recorded: xyz789
[WEBHOOK] Activating membership for user 123456 { tier: 'Silver', duration: 30 }
[WEBHOOK] Membership activated successfully {
  userId: '123456',
  tier: 'Silver',
  expiresAt: 2025-02-14T...
}
[WEBHOOK] Payment confirmation sent to user 123456
[WEBHOOK] Payment processed successfully in 1234ms {
  reference: 'abc123',
  userId: '123456',
  plan: 'silver'
}
```

### Failed/Rejected Payment

```
[WEBHOOK] ePayco confirmation received { ref_payco: 'abc123', x_cod_response: '2' }
[WEBHOOK] Transaction verified {
  approved: false,
  status: 'Rechazada',
  cod_response: '2',
  response_reason: 'Fondos insuficientes'
}
[WEBHOOK] Transaction not approved: abc123 {
  status: 'Rechazada',
  cod_response: '2',
  response_reason: 'Fondos insuficientes'
}
```

### Duplicate Webhook (Idempotency)

```
[WEBHOOK] ePayco confirmation received { ref_payco: 'abc123' }
[WEBHOOK] Transaction verified { approved: true }
[WEBHOOK] Processing payment for user 123456
[WEBHOOK] Payment already processed: abc123 {
  processedAt: 2025-01-15T10:30:00.000Z,
  status: 'completed'
}
```

## Common Issues

### Issue 1: Webhook Not Called

**Symptoms**: Payment completes but no webhook call in logs

**Causes**:
- Webhook URL not configured in ePayco dashboard
- Webhook URL is not publicly accessible
- SSL certificate issue
- Firewall blocking ePayco servers

**Solutions**:
1. Verify webhook URLs in Railway are correct
2. Test health endpoint: `/epayco/health`
3. Check ePayco dashboard → Integration → Webhooks
4. Ensure Railway URL is HTTPS (it should be by default)

### Issue 2: Webhook Returns 500 Error

**Symptoms**: Webhook is called but returns 500

**Causes**:
- Firebase credentials not configured
- Missing environment variables
- Database connection error

**Solutions**:
1. Check Railway logs for error details
2. Verify all environment variables are set
3. Test Firebase connection

### Issue 3: Payment Recorded but Membership Not Activated

**Symptoms**: Payment saved to database but user still has Free tier

**Causes**:
- Error in membership activation
- Timestamp conversion error

**Solutions**:
1. Check Railway logs for activation errors
2. Manually activate user via admin panel
3. Check user document in Firebase for `tier` and `membershipExpiresAt`

### Issue 4: User Not Receiving Telegram Notification

**Symptoms**: Webhook succeeds but user doesn't get message

**Causes**:
- Bot blocked by user
- Invalid user ID
- Telegram API error

**Solutions**:
1. Check logs for notification error
2. Verify user can receive messages from bot
3. Check bot token is valid

## Testing Checklist

### Before Going Live

- [ ] Test health check endpoint works
- [ ] Test payment flow with test card
- [ ] Verify webhook is called after payment
- [ ] Confirm payment is saved to database
- [ ] Confirm membership is activated
- [ ] Confirm user receives Telegram notification
- [ ] Test duplicate webhook (idempotency)
- [ ] Test rejected payment
- [ ] Test pending payment
- [ ] Monitor Railway logs for errors

### Production Readiness

- [ ] All environment variables set in Railway
- [ ] EPAYCO_TEST_MODE=true for initial testing
- [ ] Webhook URLs use production Railway domain
- [ ] SSL/HTTPS enabled (Railway does this automatically)
- [ ] Firebase credentials are valid
- [ ] Test at least 5 successful payments
- [ ] Test at least 2 failed payments
- [ ] Verify no duplicate activations
- [ ] Set up alerting for webhook failures

### Going Live

- [ ] Complete all testing in sandbox mode
- [ ] Review all logs for errors
- [ ] Set EPAYCO_TEST_MODE=false
- [ ] Test with one small real payment
- [ ] Monitor closely for 24 hours
- [ ] Set up payment monitoring dashboard
- [ ] Document any issues found

## Webhook Verification

ePayco doesn't provide signature verification in their standard webhooks, but you can verify transactions by:

1. **Always call `verifyTransaction(ref_payco)`** - Don't trust webhook data alone
2. **Check transaction status from ePayco API** - Verify `x_cod_response === 1`
3. **Implement idempotency** - Don't process same payment twice
4. **Log all webhook calls** - Keep audit trail

## Security Best Practices

1. **Always verify transactions** with ePayco API
2. **Use HTTPS** for all webhook URLs (Railway provides this)
3. **Log all webhook attempts** with IP addresses
4. **Implement rate limiting** if receiving too many requests
5. **Validate all input data** before processing
6. **Return 200 quickly** to prevent retries
7. **Process asynchronously** if operation takes > 5 seconds

## Monitoring

### Key Metrics to Track

- **Webhook calls per hour**
- **Successful payments per day**
- **Failed payments per day**
- **Average processing time**
- **Duplicate webhook calls**
- **Membership activations**
- **Notification failures**

### Alerting

Set up alerts for:
- Webhook returning 500 errors
- Payment processed but membership not activated
- Duplicate payments for same user
- Unusual spike in failed payments
- Webhook processing time > 10 seconds

## Support

If webhooks are not working:

1. Check Railway logs: `https://railway.app/project/your-project`
2. Check ePayco dashboard: `https://dashboard.epayco.co/`
3. Test health endpoint: `/epayco/health`
4. Review this guide's troubleshooting section
5. Check ePayco API status: `https://status.epayco.co/`

## Additional Resources

- **ePayco Webhooks Docs**: https://docs.epayco.co/tools/webhooks
- **ePayco Test Cards**: https://docs.epayco.co/tools/test-cards
- **Railway Logs**: https://railway.app/project/your-project
- **Firebase Console**: https://console.firebase.google.com/
