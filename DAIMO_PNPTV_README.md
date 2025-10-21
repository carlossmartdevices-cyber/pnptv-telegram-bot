# PNPtv Daimo Pay Integration

Complete Daimo crypto payments integration for PNPtv Telegram bot with React landing page.

## Overview

This monorepo contains:

- **`server/`** - Node.js/Express API backend with Daimo webhook handling and Firestore integration
- **`web/`** - React/Vite frontend landing page with DaimoPayButton integration

## Features

- Daimo Pay SDK integration for USDC payments on Optimism/Base
- Webhook endpoint with Bearer token authentication
- Automatic Firestore subscription activation on payment completion
- Branded payment landing page with deep linking from Telegram bot
- Mock plan API (easily replaceable with real database)
- TypeScript throughout with strict mode
- Tailwind CSS with custom PNPtv branding

## Architecture

```
User in Telegram → Bot sends payment link → React landing page → Daimo payment modal
                                                                         ↓
                                                              Payment completed
                                                                         ↓
                                              Daimo webhook → Server API → Firestore update
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project with Firestore enabled
- Daimo account (use `pay-demo` for testing)

### 1. Server Setup

```bash
cd server

# Copy and configure environment
cp .env.example .env
# Edit .env with your values (see Environment Configuration below)

# Install dependencies
npm install

# Run development server
npm run dev
# Server runs on http://localhost:8080
```

### 2. Web Setup

```bash
cd web

# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Install dependencies
npm install

# Run development server
npm run dev
# Web app runs on http://localhost:5173
```

### 3. Test Locally

Visit: `http://localhost:5173/?plan=silver-week&userId=test-user-123`

You should see:
- Branded PNPtv payment page
- Plan details (Silver, $14.99/week)
- Daimo Pay button

## Environment Configuration

### Server `.env`

```bash
# Daimo credentials (use pay-demo for testing)
DAIMO_APP_ID=pay-demo
DAIMO_API_KEY=pay-demo

# Webhook security token (generate a long random string for production)
DAIMO_WEBHOOK_TOKEN=your-secret-webhook-token-here

# Crypto wallet addresses (must be valid on supported networks)
DAIMO_TREASURY_ADDRESS=0xYourTreasuryWalletAddress
DAIMO_REFUND_ADDRESS=0xYourRefundWalletAddress

# Your web app public URL
WEB_APP_URL=https://pay.pnptv.app

# Firebase credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Server port
PORT=8080
```

### Web `.env`

```bash
VITE_DAIMO_APP_ID=pay-demo
VITE_DAIMO_TREASURY_ADDRESS=0xYourTreasuryWalletAddress
VITE_DAIMO_REFUND_ADDRESS=0xYourRefundWalletAddress
VITE_WEB_APP_URL=https://pay.pnptv.app
VITE_API_BASE=http://localhost:8080
```

**Important:** Never commit real API keys or private keys to version control.

## Telegram Bot Integration

Add this snippet to your Telegram bot to generate payment deep links:

```javascript
// In your plan selection handler
const paymentLink = `https://pay.pnptv.app?plan=${encodeURIComponent(plan.id)}&userId=${encodeURIComponent(userId)}`;
await bot.sendMessage(chatId, `Pay with crypto: ${paymentLink}`);
```

Available plan IDs:
- `silver-week` - $14.99/week
- `silver-month` - $24.99/month
- `gold-6m` - $49.99/6 months
- `gold-year` - $99.99/year

## API Endpoints

### `GET /api/plans/:planId`

Returns plan details.

**Example:**
```bash
curl http://localhost:8080/api/plans/silver-week
```

**Response:**
```json
{
  "id": "silver-week",
  "name": "Silver",
  "price": "14.99",
  "description": "7 days access",
  "periodLabel": "week"
}
```

### `POST /api/daimo/webhook`

Receives Daimo payment webhooks.

**Headers:**
```
Content-Type: application/json
Authorization: Basic <DAIMO_WEBHOOK_TOKEN>
```

**Example payload:**
```json
{
  "type": "payment_completed",
  "payment": {
    "id": "pay_abc123",
    "status": "payment_completed",
    "metadata": {
      "userId": "telegram-user-123",
      "planId": "silver-week"
    }
  }
}
```

**Actions on `payment_completed`:**
1. Updates `users/{userId}` in Firestore:
   - `tier`: planId
   - `subscriptionActive`: true
   - `subscriptionEndsAt`: Date (30 days from now)
   - `lastPaymentId`: payment.id
   - `lastPaymentAt`: timestamp

2. Creates `payments/{paymentId}` document with full payment details

## Testing

### Test Plan API

```bash
curl http://localhost:8080/api/plans/silver-week
```

### Test Webhook (Local)

```bash
curl -X POST http://localhost:8080/api/daimo/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic your-webhook-token" \
  -d '{
    "type": "payment_completed",
    "payment": {
      "id": "pay_test_1",
      "status": "payment_completed",
      "metadata": {
        "userId": "test-user-123",
        "planId": "silver-week"
      }
    }
  }'
```

Check Firestore console to verify:
- Document created at `users/test-user-123`
- Document created at `payments/pay_test_1`

### End-to-End Test

1. Use real Daimo credentials (not pay-demo)
2. Set real wallet addresses in `.env`
3. Visit payment page with test parameters
4. Complete small payment ($1-2) using Daimo wallet
5. Verify webhook received and Firestore updated

## Production Deployment

### Server (Railway/Render/Heroku)

1. **Build the server:**
   ```bash
   cd server
   npm run build
   ```

2. **Set environment variables** in your hosting platform dashboard

3. **Deploy** and note the public URL (e.g., `https://api.pnptv.app`)

4. **Register webhook URL** in Daimo dashboard:
   ```
   https://api.pnptv.app/api/daimo/webhook
   ```

### Web (Vercel/Netlify)

1. **Update production environment variables:**
   ```bash
   VITE_DAIMO_APP_ID=<your-real-app-id>
   VITE_DAIMO_TREASURY_ADDRESS=<your-treasury-wallet>
   VITE_DAIMO_REFUND_ADDRESS=<your-refund-wallet>
   VITE_WEB_APP_URL=https://pay.pnptv.app
   VITE_API_BASE=https://api.pnptv.app
   ```

2. **Build:**
   ```bash
   cd web
   npm run build
   ```

3. **Deploy** `web/dist/` folder

### DNS Configuration

- Point `pay.pnptv.app` to web deployment
- Point `api.pnptv.app` to server deployment
- Enable HTTPS (most platforms auto-provision SSL)

### Firestore Security Rules

Allow server SDK to write (service account already has permissions), but add user read rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only server SDK can write
    }
    match /payments/{paymentId} {
      allow read: if false; // Admin/server only
      allow write: if false;
    }
  }
}
```

## Production Checklist

- [ ] Replace `pay-demo` with real Daimo App ID and API key
- [ ] Generate secure random `DAIMO_WEBHOOK_TOKEN` (32+ chars)
- [ ] Set real treasury and refund wallet addresses
- [ ] Configure Firebase service account credentials
- [ ] Register webhook URL in Daimo dashboard
- [ ] Set up proper Firestore security rules
- [ ] Configure DNS: `pay.pnptv.app` and `api.pnptv.app`
- [ ] Enable HTTPS on both domains
- [ ] Test end-to-end payment flow with small amount
- [ ] Monitor webhook logs for errors
- [ ] Set up error alerting (Sentry, etc.)

## Troubleshooting

### Webhook returns 401 Unauthorized

- Ensure `Authorization: Basic <token>` header matches `DAIMO_WEBHOOK_TOKEN`
- Check for extra spaces or newlines in token
- Verify token is set correctly in server environment

### Daimo button not opening

- Check browser console for errors
- Verify `DaimoPayProvider` wraps the entire app
- Ensure wallet addresses are valid checksummed addresses
- Check that `@daimo/pay` SDK is loaded correctly

### Invalid address error

- Run addresses through `getAddress()` from viem to checksum
- Addresses must be valid on the target network (Optimism/Base)
- Verify addresses in `.env` have `0x` prefix

### CORS errors

- Ensure `cors({ origin: true })` is enabled in server
- Check that `VITE_API_BASE` points to correct server URL
- Verify server is running and accessible

### Firestore write fails

- Verify Firebase credentials are correct
- Check service account has Firestore permissions
- Ensure private key newlines are escaped: `\\n`

## Style Guide

The web app uses PNPtv brand colors:

- **Primary Purple:** `#6A40A7`
- **Accent Magenta:** `#DF00FF`
- **Dark Gray:** `#28282B`
- **Lighter Dark:** `#3A3A3E`
- **Card Background:** `#4A4A4E`

Fonts:
- **Headings:** Space Grotesk (bold, 700 & medium, 500)
- **Body:** Inter (regular, 400 & semibold, 600)
- **Code:** Source Code Pro (regular, 400)

## Support

For Daimo-specific issues:
- [Daimo Pay Documentation](https://pay.daimo.com/docs)
- [Daimo Discord](https://discord.gg/daimo)

For PNPtv integration issues:
- Check this README
- Review server logs
- Test webhook with curl
- Verify Firestore permissions

## License

MIT
