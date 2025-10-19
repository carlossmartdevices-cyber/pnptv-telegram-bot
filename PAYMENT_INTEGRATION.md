# Payment Integration Guide

Complete guide for setting up and testing payment integrations in the PNPtv Telegram Bot.

## Table of Contents

- [Overview](#overview)
- [Payment Methods](#payment-methods)
- [Setup Instructions](#setup-instructions)
- [Webhook Configuration](#webhook-configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

The bot supports multiple payment methods for subscription payments:

1. **ePayco** - Colombian payment processor (COP payments)
2. **Daimo Pay** - USDC stablecoin payments (crypto)
3. **Nequi** - Manual activation (COP payments)

All automatic payment methods (ePayco, Daimo) have webhook handlers that automatically activate subscriptions when payment is confirmed.

---

## Payment Methods

### ePayco (Colombian Pesos - COP)

**Features:**
- ✅ Automatic subscription activation
- ✅ Signature verification
- ✅ Multiple payment methods (cards, PSE, cash)
- ✅ Test mode available
- ✅ User-friendly redirect pages

**Configuration:**
```bash
EPAYCO_PUBLIC_KEY=your_public_key
EPAYCO_PRIVATE_KEY=your_private_key
EPAYCO_P_CUST_ID=your_customer_id
EPAYCO_P_KEY=your_p_key
EPAYCO_TEST_MODE=true  # Set to false for production
EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false  # Security setting
```

**Get Credentials:**
1. Sign up at https://dashboard.epayco.co/
2. Go to Settings → API Keys
3. Copy Public Key, Private Key, P_CUST_ID, and P_KEY

### Daimo Pay (USDC Stablecoin)

**Features:**
- ✅ Automatic subscription activation
- ✅ Fast stablecoin deposits
- ✅ Multi-chain support (Base, Optimism, Arbitrum, Polygon)
- ✅ React payment page with SDK
- ✅ Webhook authentication

**Configuration:**
```bash
DAIMO_API_KEY=your_api_key
DAIMO_APP_ID=pnptv-bot
DAIMO_WEBHOOK_TOKEN=your_webhook_token

# Frontend configuration
NEXT_PUBLIC_DAIMO_APP_ID=pnptv-bot
NEXT_PUBLIC_TREASURY_ADDRESS=0xYourWalletAddress
NEXT_PUBLIC_REFUND_ADDRESS=0xYourWalletAddress
NEXT_PUBLIC_BOT_URL=https://your-app.herokuapp.com

# Payment page URL
PAYMENT_PAGE_URL=https://your-app.herokuapp.com/pay
```

**Get Credentials:**
1. Sign up at https://pay.daimo.com/dashboard
2. Create a new app
3. Copy API Key, App ID, and Webhook Token
4. Configure webhook URL: `https://your-app.herokuapp.com/daimo/webhook`

### Nequi (Manual Activation)

**Features:**
- Manual payment verification
- Admin activates subscription after payment proof
- No webhook required

**Configuration:**
Set `paymentMethod: "nequi"` in plan configuration with payment link.

---

## Setup Instructions

### 1. Install Dependencies

Already installed in package.json:
- `epayco-sdk-node` - ePayco integration
- `@daimo/pay` - Daimo Pay React SDK
- `ioredis` - Redis caching (optional but recommended)

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required for ePayco:**
```bash
EPAYCO_PUBLIC_KEY=881ddf8418549218fe2f227458f2f59c
EPAYCO_PRIVATE_KEY=80174d93a6f8d760f5cca2b2cc6ee48b
EPAYCO_P_CUST_ID=1555482
EPAYCO_P_KEY=e76ae8e9551df6e3b353434c4de34ef2dafa41bf
EPAYCO_TEST_MODE=true
BOT_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
```

**Required for Daimo:**
```bash
DAIMO_API_KEY=pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw
DAIMO_APP_ID=pnptv-bot
DAIMO_WEBHOOK_TOKEN=0x36f81c73d7cdbebe5380114a3589f3d3d710327d0c80fa223b451927fcc599e82a0f325d76e93113ee67f7a0d0899c7525abc61b59a4445dff2c790ee033a3e71c
NEXT_PUBLIC_TREASURY_ADDRESS=0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0
```

### 3. Webhook Configuration

#### ePayco Webhooks

**Endpoints:**
- Response URL (user redirect): `https://your-app.herokuapp.com/epayco/response`
- Confirmation URL (webhook): `https://your-app.herokuapp.com/epayco/confirmation`

**Configure in ePayco Dashboard:**
1. Go to https://dashboard.epayco.co/
2. Settings → Webhook Configuration
3. Set confirmation URL: `https://your-app.herokuapp.com/epayco/confirmation`

**Signature Verification:**
- Format: `x_cust_id_cliente^P_KEY^x_ref_payco^x_transaction_id^x_amount^x_currency_code`
- Algorithm: SHA256
- Automatically verified in webhook handler

#### Daimo Webhooks

**Endpoint:**
- Webhook URL: `https://your-app.herokuapp.com/daimo/webhook`

**Configure in Daimo Dashboard:**
1. Go to https://pay.daimo.com/dashboard
2. Settings → Webhooks
3. Set webhook URL and copy webhook token

**Authentication:**
- Uses `Authorization: Basic <DAIMO_WEBHOOK_TOKEN>` header
- Automatically verified in webhook handler

---

## Testing

### Test ePayco Integration

Run the test script:

```bash
node test-epayco.js
```

**Expected output:**
```
✓ All required environment variables are configured
✓ Credentials validation passed
✓ Payment parameters validation passed
✓ Payment link created successfully
✓ Test mode is ENABLED - Safe for testing
```

### Test Payment Flow (ePayco)

1. **Create a test plan** with `paymentMethod: "epayco"`
2. **User selects plan** in bot
3. **User clicks payment button** → redirected to ePayco
4. **User completes payment** (use test card: 4575623182290326)
5. **ePayco sends confirmation webhook** → bot activates subscription
6. **User receives Telegram notification**

**Test Cards (ePayco Test Mode):**
- Success: `4575623182290326` / CVV: 123 / Exp: 12/25
- Rejected: `4151611527583283` / CVV: 123 / Exp: 12/25

### Test Daimo Payment Flow

1. **Create a test plan** with `paymentMethod: "daimo"`
2. **User selects plan** in bot
3. **User clicks payment button** → redirected to payment page
4. **Payment page loads Daimo Pay SDK**
5. **User connects wallet and pays with USDC**
6. **Daimo sends webhook** → bot activates subscription
7. **User receives Telegram notification**

### Manual Testing Checklist

- [ ] ePayco payment link generation works
- [ ] ePayco response page displays correctly (success/failure)
- [ ] ePayco webhook activates subscription
- [ ] Daimo payment page loads correctly
- [ ] Daimo webhook activates subscription
- [ ] User receives Telegram confirmation message
- [ ] Subscription expiration date is correct
- [ ] Payment reference is stored in user document

---

## Deployment

### Railway Deployment

**1. Configure Environment Variables**

In Railway dashboard, set all required variables:

```bash
# Bot
TELEGRAM_TOKEN=your_bot_token
BOT_URL=https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com

# ePayco
EPAYCO_PUBLIC_KEY=...
EPAYCO_PRIVATE_KEY=...
EPAYCO_P_CUST_ID=...
EPAYCO_P_KEY=...
EPAYCO_TEST_MODE=false

# Daimo
DAIMO_API_KEY=...
DAIMO_APP_ID=pnptv-bot
DAIMO_WEBHOOK_TOKEN=...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
```

**2. Deploy Bot**

```bash
npm run railway:deploy
```

**3. Deploy Payment Page (Optional - Separate Service)**

The payment page can be deployed separately (Vercel/Netlify) or served from the same domain.

**Same Domain (Recommended):**
- Payment page served at `/pay` route
- No additional deployment needed
- Uses same environment variables

**Separate Deployment (Vercel):**
```bash
cd src/payment-page
vercel deploy --prod
```

Set environment variables in Vercel:
- `NEXT_PUBLIC_DAIMO_APP_ID`
- `NEXT_PUBLIC_TREASURY_ADDRESS`
- `NEXT_PUBLIC_REFUND_ADDRESS`
- `NEXT_PUBLIC_BOT_URL`

### Heroku Deployment

**1. Create Heroku App**

```bash
heroku create pnptv-telegram-bot
```

**2. Set Environment Variables**

```bash
heroku config:set TELEGRAM_TOKEN=your_token
heroku config:set BOT_URL=https://pnptv-telegram-bot.herokuapp.com
# ... (set all other variables)
```

**3. Deploy**

```bash
git push heroku main
```

**4. Verify Deployment**

```bash
heroku logs --tail
```

---

## Troubleshooting

### ePayco Issues

**Problem: Payment link not working**
- Check `EPAYCO_P_CUST_ID` and `EPAYCO_P_KEY` are correct
- Verify `BOT_URL` is set correctly
- Run `node test-epayco.js` to verify configuration

**Problem: Webhook not received**
- Check webhook URL in ePayco dashboard
- Verify bot is deployed and accessible
- Check logs: `railway logs` or `heroku logs`
- Test webhook endpoint: `curl -X POST https://your-app.herokuapp.com/epayco/confirmation`

**Problem: Signature verification failed**
- Ensure `EPAYCO_P_KEY` matches dashboard
- For testing: set `EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=true` (NOT for production!)
- Check webhook payload format

**Problem: Subscription not activated**
- Check plan exists in Firestore
- Verify user exists in Firestore
- Check invoice format: `planId_userId_timestamp`
- Review logs for error messages

### Daimo Issues

**Problem: Payment page not loading**
- Verify payment page is deployed
- Check `NEXT_PUBLIC_BOT_URL` is set correctly
- Verify `PAYMENT_PAGE_URL` is correct

**Problem: Webhook not authenticated**
- Check `DAIMO_WEBHOOK_TOKEN` matches dashboard
- Verify Authorization header format: `Basic <token>`
- Check Daimo dashboard webhook configuration

**Problem: USDC not received**
- Verify `NEXT_PUBLIC_TREASURY_ADDRESS` is correct
- Ensure address is valid on all supported chains
- Check transaction on block explorer

### General Issues

**Problem: User not receiving Telegram message**
- Check user has not blocked the bot
- Verify bot has permission to send messages
- Check Telegram API rate limits
- Review logs for error messages

**Problem: Database update failed**
- Check Firebase credentials
- Verify Firestore permissions
- Check network connectivity
- Review error logs

---

## File Structure

```
src/
├── config/
│   ├── epayco.js              # ePayco integration
│   ├── daimo.js               # Daimo Pay integration
│   └── firebase.js            # Firebase config
├── bot/
│   ├── webhook.js             # Webhook handlers (ePayco, Daimo, Telegram)
│   ├── api/
│   │   └── routes.js          # API routes for payment page
│   └── helpers/
│       └── subscriptionHelpers.js  # Payment flow logic
├── services/
│   ├── planService.js         # Plan management with caching
│   └── cacheService.js        # Redis caching
└── payment-page/
    ├── app/
    │   ├── page.tsx           # Payment page UI
    │   └── providers.tsx      # Daimo Pay provider
    └── next.config.js         # Next.js configuration
```

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Enable signature verification** in production (`EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false`)
3. **Use HTTPS** for all webhook URLs
4. **Validate webhook data** before processing
5. **Log all payment events** for audit trail
6. **Test in sandbox mode** before going live
7. **Monitor webhook failures** and set up alerts
8. **Use environment-specific credentials** (dev/staging/prod)

---

## Support

### ePayco Support
- Dashboard: https://dashboard.epayco.co/
- Documentation: https://docs.epayco.co/
- Support: soporte@epayco.co

### Daimo Support
- Dashboard: https://pay.daimo.com/dashboard
- Documentation: https://paydocs.daimo.com/
- Discord: https://discord.gg/daimo

### Bot Issues
- Check logs: `railway logs` or `heroku logs`
- Review error messages in Firestore
- Test with `node test-epayco.js`

---

## Changelog

### 2025-10-19
- ✅ Added ePayco webhook handlers (`/epayco/response`, `/epayco/confirmation`)
- ✅ Implemented signature verification for ePayco webhooks
- ✅ Added user-friendly redirect pages (success/failure/processing)
- ✅ Added comprehensive error handling and logging
- ✅ Configured Daimo Pay webhook handler
- ✅ Added payment integration testing script
- ✅ Created deployment documentation

---

## Next Steps

1. **Test payment flow** end-to-end in test mode
2. **Configure production credentials** for ePayco and Daimo
3. **Deploy to production** (Railway/Heroku)
4. **Configure webhooks** in provider dashboards
5. **Monitor logs** for first few transactions
6. **Set up alerts** for webhook failures
7. **Update user documentation** with payment instructions
