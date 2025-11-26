# Environment Variables - Quick Reference

## Minimum Required (Must Set)

```
TELEGRAM_TOKEN=xxx
FIREBASE_CREDENTIALS={...}
FIREBASE_PROJECT_ID=xxx
NODE_ENV=production
```

## Highly Recommended

```
CHANNEL_ID=-1002997324714              # Premium channel
FREE_CHANNEL_ID=-1003159260496        # Free tier channel
FREE_GROUP_ID=-1003291737499          # Community group
ADMIN_IDS=8365312597                  # Comma-separated admin IDs
WEBHOOK_URL=https://pnptv.app         # For webhooks
```

## Payment Processing

```
# Daimo (Crypto)
DAIMO_WEBHOOK_TOKEN=xxx
DAIMO_WEBHOOK_URL=https://pnptv.app/daimo/webhook
DAIMO_DESTINATION_ADDRESS=0x...
DAIMO_REFUND_ADDRESS=0x...

# COP Card (Colombian Peso)
COP_CARD_PAYMENT_LINK=https://checkout.nequi.wompi.co/...
COP_CARD_MERCHANT_NAME=PNPtv
COP_CARD_ADMIN_NOTIFICATION_CHAT_ID=xxx
```

## Server Configuration

```
PORT=3000
LOG_LEVEL=info
NODE_ENV=production
SENTRY_DSN=https://...    # Error tracking (optional)
```

## Redis Caching (Optional)

```
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
# OR individual:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

## Firebase Details (Usually in FIREBASE_CREDENTIALS)

```
FIREBASE_STORAGE_BUCKET=projectid.appspot.com
FIREBASE_CLIENT_EMAIL=xxx@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

## Third-Party Integrations

```
# AI Chat
MISTRAL_API_KEY=xxx
MISTRAL_AGENT_ID=xxx

# Zoom
ZOOM_ACCOUNT_ID=xxx
ZOOM_CLIENT_ID=xxx
ZOOM_CLIENT_SECRET=xxx
```

## URLs & Frontend

```
WEBAPP_URL=https://pnptv.app/app
BOT_URL=https://pnptv.app
TELEGRAM_BOT_USERNAME=PNPtvBot
NEXT_PUBLIC_BOT_URL=https://pnptv.app
NEXT_PUBLIC_DAIMO_APP_ID=xxx
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_REFUND_ADDRESS=0x...
```

## Feature Flags

```
AUTO_ACTIVATE_FREE_USERS=false
```

---

## Files to Check for Complete Details

- **Full Catalog**: `ENVIRONMENT_CATALOG.md`
- **JSON Reference**: `ENV_VARIABLES_REFERENCE.json`
- **Config Code**: `src/config/env.js`
- **Firebase Config**: `src/config/firebase.js`
- **Plan Details**: `src/config/plans.js`

---

## Default Values Used in Code

| Variable | Default |
|----------|---------|
| CHANNEL_ID | -1002997324714 |
| FREE_CHANNEL_ID | -1003159260496 |
| FREE_GROUP_ID | -1003291737499 |
| ADMIN_IDS | [8365312597] |
| PORT | 3000 |
| LOG_LEVEL | info |
| NODE_ENV | development |
| TELEGRAM_BOT_USERNAME | PNPtvBot |
| WEBAPP_URL | https://pnptv.app/app |
| WEBHOOK_URL | https://pnptv.app |
| COP_CARD_MERCHANT_NAME | PNPtv |
| REDIS_ENABLED | false |
| REDIS_HOST | 127.0.0.1 |
| REDIS_PORT | 6379 |
| REDIS_DB | 0 |
| REDIS_ENABLED | false |
| AUTO_ACTIVATE_FREE_USERS | false |

---

## Validation & Security

- Sensitive variables are masked in logs (patterns: token, key, secret, password, credential, private)
- Firebase credentials support multiple formats: raw JSON, base64, or individual env vars
- Admin IDs are validated and converted to integers
- Environment variables are validated on startup with helpful error messages

---

## Tips

1. Use `.env` file for local development (never commit)
2. Use platform env vars for production (Vercel, Railway, etc.)
3. Firebase credentials can be base64 encoded to avoid JSON formatting issues
4. Payment webhooks require WEBHOOK_URL to be publicly accessible
5. Redis is optional but recommended for scaling
6. Sentry DSN is optional but highly recommended for production
7. Channel IDs must be negative numbers (Telegram group/channel IDs)

