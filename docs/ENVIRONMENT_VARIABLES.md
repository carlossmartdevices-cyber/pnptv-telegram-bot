# Environment Variables Configuration Guide

Complete reference for all environment variables used in the PNPtv Telegram Bot.

## Table of Contents
- [Quick Start](#quick-start)
- [Critical Variables](#critical-variables)
- [Important Variables](#important-variables)
- [Optional Variables](#optional-variables)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

1. Copy the example file:
```bash
cp .env.example .env
```

2. Edit `.env` and configure at minimum:
   - `TELEGRAM_BOT_TOKEN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `ADMIN_IDS`

3. Start the application:
```bash
npm start
```

The bot will automatically validate your configuration on startup.

---

## Critical Variables

These variables are **required** for the bot to function. The application will not start without them.

### `TELEGRAM_BOT_TOKEN`
- **Type:** String
- **Required:** ✅ Yes
- **Description:** Your Telegram bot token from [@BotFather](https://t.me/botfather)
- **Format:** `<bot_id>:<auth_token>`
- **Example:** `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- **How to get:**
  1. Open Telegram and search for @BotFather
  2. Send `/newbot` or `/token` if bot exists
  3. Follow instructions
  4. Copy the token provided

**⚠️ Security:** Never commit this token to version control or share it publicly.

### `TELEGRAM_TOKEN`
- **Type:** String
- **Required:** ✅ Yes (legacy support)
- **Description:** Same as `TELEGRAM_BOT_TOKEN` (for backward compatibility)
- **Example:** Same as above
- **Note:** Can be the same value as `TELEGRAM_BOT_TOKEN`

### `FIREBASE_PROJECT_ID`
- **Type:** String
- **Required:** ✅ Yes
- **Description:** Your Firebase project identifier
- **Example:** `pnptv-bot-production`
- **How to get:**
  1. Go to [Firebase Console](https://console.firebase.google.com/)
  2. Select your project
  3. Click gear icon → Project settings
  4. Copy "Project ID"

### `FIREBASE_CLIENT_EMAIL`
- **Type:** String (Email)
- **Required:** ✅ Yes
- **Description:** Service account email for Firebase Admin SDK
- **Format:** `firebase-adminsdk-xxxxx@<project-id>.iam.gserviceaccount.com`
- **Example:** `firebase-adminsdk-abc123@pnptv-bot.iam.gserviceaccount.com`
- **How to get:**
  1. Firebase Console → Project settings → Service accounts
  2. Click "Generate new private key"
  3. Open downloaded JSON file
  4. Copy `client_email` value

### `FIREBASE_PRIVATE_KEY`
- **Type:** String (PEM format)
- **Required:** ✅ Yes
- **Description:** Private key for Firebase service account
- **Format:** Multi-line PEM string with `\n` escaped newlines
- **Example:** `"-----BEGIN PRIVATE KEY-----\nMIIE...ABCD\n-----END PRIVATE KEY-----\n"`
- **How to get:**
  1. Same as `FIREBASE_CLIENT_EMAIL` above
  2. Copy `private_key` value from JSON
  3. Ensure newlines are escaped as `\n`

**⚠️ Security:** This is extremely sensitive. Never expose this key.

### `ADMIN_IDS`
- **Type:** String (comma-separated integers)
- **Required:** ✅ Yes
- **Description:** Telegram user IDs with admin privileges
- **Format:** `<user_id>[,<user_id>...]`
- **Example:** `123456789` or `123456789,987654321,555555555`
- **How to get your user ID:**
  1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
  2. Or use [@raw_data_bot](https://t.me/raw_data_bot)
  3. Copy your user ID

---

## Important Variables

These variables are strongly recommended. The bot will show warnings if they're missing.

### `NODE_ENV`
- **Type:** String (enum)
- **Required:** ⚠️ Important
- **Default:** `development`
- **Values:** `development`, `production`, `test`
- **Description:** Application environment mode
- **Effects:**
  - `development`: Detailed logs, permissive security
  - `production`: Optimized logs, strict security
  - `test`: Testing mode, isolated data

**Example:**
```env
NODE_ENV=production
```

### `PORT`
- **Type:** Integer
- **Required:** ⚠️ Important
- **Default:** `3000`
- **Description:** Port for the web server (Mini App API)
- **Note:** Heroku/Railway set this automatically

**Example:**
```env
PORT=3000
```

### `BOT_URL`
- **Type:** String (URL)
- **Required:** ⚠️ Important for webhooks
- **Format:** `https://<domain>`
- **Description:** Public HTTPS URL where your bot is hosted
- **Used for:** Webhook URLs, Mini App links
- **Example:** `https://pnptv-bot.herokuapp.com`

**⚠️ Important:** Must be HTTPS in production (Telegram requirement)

### `WEB_APP_URL`
- **Type:** String (URL)
- **Required:** ⚠️ Important for Mini App
- **Format:** `https://<domain>`
- **Description:** Public URL for the Telegram Mini App
- **Example:** `https://pnptv-bot.herokuapp.com`
- **Note:** Usually same as `BOT_URL`

---

## Optional Variables

### Payment Integration (ePayco)

#### `EPAYCO_PUBLIC_KEY`
- **Type:** String
- **Required:** ❌ Optional (required for payments)
- **Description:** ePayco public API key
- **Example:** `a1b2c3d4e5f6g7h8i9j0`
- **How to get:** [ePayco Dashboard](https://dashboard.epayco.co/) → Settings → API Keys

#### `EPAYCO_PRIVATE_KEY`
- **Type:** String
- **Required:** ❌ Optional (required for payments)
- **Description:** ePayco private API key
- **Example:** `z9y8x7w6v5u4t3s2r1q0`
- **⚠️ Security:** Keep this secret

#### `EPAYCO_P_CUST_ID`
- **Type:** String
- **Required:** ❌ Optional (required for payments)
- **Description:** ePayco customer/merchant ID
- **Example:** `1555482`

#### `EPAYCO_P_KEY`
- **Type:** String
- **Required:** ❌ Optional (required for webhook validation)
- **Description:** ePayco P Key for signature validation
- **Example:** `e76ae8e9551df6e3b353434c4de34ef2dafa41bf`
- **⚠️ Security:** Critical for webhook security

#### `EPAYCO_TEST_MODE`
- **Type:** Boolean (string)
- **Required:** ❌ Optional
- **Default:** `false`
- **Values:** `true`, `false`
- **Description:** Enable test mode for ePayco integration
- **Effects:**
  - `true`: Uses test API, transactions don't charge real money
  - `false`: Production mode, real transactions

**Example:**
```env
EPAYCO_TEST_MODE=true  # Development
EPAYCO_TEST_MODE=false  # Production
```

#### `EPAYCO_ALLOW_UNSIGNED_WEBHOOKS`
- **Type:** Boolean (string)
- **Required:** ❌ Optional
- **Default:** `false`
- **Values:** `true`, `false`
- **Description:** Allow webhooks without valid signatures
- **⚠️ CRITICAL:** **MUST BE `false` IN PRODUCTION**
- **Use case:** Only for local development/debugging

**Example:**
```env
EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false  # Always in production!
```

#### `EPAYCO_RESPONSE_URL`
- **Type:** String (URL)
- **Required:** ❌ Optional (auto-generated)
- **Description:** URL where users are redirected after payment
- **Auto-generated from:** `${BOT_URL}/epayco/response`
- **Override only if:** Using custom domain/path

#### `EPAYCO_CONFIRMATION_URL`
- **Type:** String (URL)
- **Required:** ❌ Optional (auto-generated)
- **Description:** URL where ePayco sends payment confirmations
- **Auto-generated from:** `${BOT_URL}/epayco/confirmation`
- **Override only if:** Using custom webhook URL

#### `EPAYCO_WEBHOOK_IPS`
- **Type:** String (comma-separated IPs)
- **Required:** ❌ Optional
- **Description:** IP whitelist for webhook requests
- **Example:** `192.168.1.1,192.168.1.2`
- **Note:** Currently logs only, doesn't block

### Monitoring & Logging

#### `SENTRY_DSN`
- **Type:** String (URL)
- **Required:** ❌ Optional
- **Description:** Sentry Data Source Name for error tracking
- **Example:** `https://abc123@o123456.ingest.sentry.io/789012`
- **How to get:**
  1. Create account at [sentry.io](https://sentry.io/)
  2. Create project
  3. Copy DSN from project settings

#### `CHANNEL_ID`
- **Type:** String (integer with - prefix)
- **Required:** ❌ Optional
- **Description:** Telegram channel ID for announcements
- **Format:** `-100<channel_id>`
- **Example:** `-1001234567890`
- **How to get:**
  1. Add bot to channel as admin
  2. Forward message from channel to [@userinfobot](https://t.me/userinfobot)
  3. Copy channel ID

---

## Security Best Practices

### ✅ Do's

1. **Use strong, unique credentials:**
   ```env
   ✅ TELEGRAM_BOT_TOKEN=8499797477:AAFo--MV4tUfIhv_Al2MaLMFzvi2TbI1eso
   ❌ TELEGRAM_BOT_TOKEN=123:ABC
   ```

2. **Keep production and development separate:**
   ```env
   # .env.production
   EPAYCO_TEST_MODE=false
   NODE_ENV=production

   # .env.development
   EPAYCO_TEST_MODE=true
   NODE_ENV=development
   ```

3. **Use HTTPS URLs in production:**
   ```env
   ✅ BOT_URL=https://mybot.herokuapp.com
   ❌ BOT_URL=http://mybot.herokuapp.com  # HTTP not allowed by Telegram
   ```

4. **Validate on startup:**
   ```bash
   npm start  # Bot auto-validates configuration
   ```

### ❌ Don'ts

1. **Never commit `.env` to git:**
   ```bash
   # Check .gitignore
   cat .gitignore | grep .env
   # Should show: .env, .env.*, *.env
   ```

2. **Never use placeholder values in production:**
   ```env
   ❌ TELEGRAM_BOT_TOKEN=your_token_here  # Placeholder
   ❌ FIREBASE_PROJECT_ID=test  # Invalid
   ```

3. **Never allow unsigned webhooks in production:**
   ```env
   ❌ EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=true  # DANGEROUS
   ```

4. **Never share credentials:**
   - Don't post in Discord/Slack
   - Don't email without encryption
   - Don't screenshot containing tokens

---

## Troubleshooting

### Error: "Missing critical environment variables"

**Cause:** Required variables not set

**Solution:**
```bash
# Check which variables are missing
npm start
# Read error message, e.g., "Missing: TELEGRAM_BOT_TOKEN, FIREBASE_PROJECT_ID"

# Add missing variables to .env
echo 'TELEGRAM_BOT_TOKEN=your_token' >> .env
```

### Error: "Invalid Telegram token"

**Cause:** Malformed or revoked token

**Solution:**
1. Verify token format: `<numbers>:<alphanumeric>`
2. Test token:
   ```bash
   curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
   ```
3. If invalid, generate new token from @BotFather

### Error: "Firebase authentication failed"

**Cause:** Invalid Firebase credentials

**Solution:**
1. Verify JSON format:
   ```bash
   # Check private key has correct escaping
   cat .env | grep FIREBASE_PRIVATE_KEY
   # Should show: \n instead of actual newlines
   ```

2. Regenerate service account:
   - Firebase Console → Project settings → Service accounts
   - Generate new private key
   - Update `.env`

### Warning: "ePayco credentials not configured"

**Cause:** Payment integration not set up

**Solution:**
- **If payments not needed:** Ignore warning (optional feature)
- **If payments needed:**
  1. Get credentials from [ePayco Dashboard](https://dashboard.epayco.co/)
  2. Add to `.env`:
     ```env
     EPAYCO_PUBLIC_KEY=...
     EPAYCO_PRIVATE_KEY=...
     EPAYCO_P_CUST_ID=...
     EPAYCO_P_KEY=...
     ```

### Validation Script

Create `scripts/validate-env.js`:
```javascript
const { validateEnv } = require('../src/config/env');

const result = validateEnv({ throwOnMissing: false, logWarnings: true });

console.log('\n=== Environment Validation Results ===\n');
console.log(`Valid: ${result.valid ? '✅ YES' : '❌ NO'}`);
console.log(`Warnings: ${result.hasWarnings ? '⚠️ YES' : '✅ NO'}`);

if (!result.valid) {
  console.log('\n❌ Missing critical variables:');
  result.missing.critical.forEach(v => console.log(`  - ${v}`));
  process.exit(1);
}

if (result.hasWarnings) {
  console.log('\n⚠️ Missing important variables:');
  result.missing.important.forEach(v => console.log(`  - ${v}`));
}

console.log('\n✅ Configuration is valid!\n');
```

Run:
```bash
node scripts/validate-env.js
```

---

## Environment-Specific Configurations

### Development

`.env.development`:
```env
NODE_ENV=development
PORT=3000
BOT_URL=https://abc123.ngrok.io
WEB_APP_URL=https://abc123.ngrok.io
EPAYCO_TEST_MODE=true
EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=true  # OK for local dev only
```

### Production

`.env.production`:
```env
NODE_ENV=production
BOT_URL=https://your-bot.herokuapp.com
WEB_APP_URL=https://your-bot.herokuapp.com
EPAYCO_TEST_MODE=false
EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false  # CRITICAL
```

### Testing

`.env.test`:
```env
NODE_ENV=test
TELEGRAM_BOT_TOKEN=test_token
FIREBASE_PROJECT_ID=test-project
# Use test Firebase project, not production!
```

---

## Additional Resources

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [ePayco API Docs](https://docs.epayco.co/)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Sentry Documentation](https://docs.sentry.io/)

---

**Last Updated:** 2025-01-17
**Version:** 2.1.0
