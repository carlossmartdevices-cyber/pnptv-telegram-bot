# PNPtv Telegram Bot - Environment Variables & Configuration Catalog

## 1. ENVIRONMENT VARIABLES (process.env)

### 1.1 Critical/Required Environment Variables

#### Telegram Configuration
- **TELEGRAM_TOKEN** (or TELEGRAM_BOT_TOKEN)
  - Description: Telegram bot API token for authentication
  - Usage: Initializing Telegraf bot instance and webhook endpoints
  - Format: String (Bearer token from @BotFather)
  - Location: `/src/bot/index.js`, `/src/bot/webhook.js`
  - Required: YES

- **TELEGRAM_BOT_USERNAME**
  - Description: Username of the Telegram bot (without @)
  - Usage: Creating links to open private chat with bot
  - Example: 'PNPtvBot'
  - Location: `/src/webapp/next.config.js`, `/src/bot/handlers/groupMenu.js`
  - Required: NO (defaults to 'PNPtvBot')

#### Firebase Configuration
- **FIREBASE_CREDENTIALS**
  - Description: Complete Firebase service account JSON (base64 encoded or raw JSON)
  - Usage: Authenticating with Firebase Admin SDK
  - Format: JSON string with type, project_id, private_key, client_email, etc.
  - Location: `/src/config/firebase.js`
  - Required: YES (critical)
  - Supported Formats: Raw JSON, Base64 encoded, or individual FIREBASE_* variables

- **FIREBASE_PROJECT_ID**
  - Description: Firebase project ID from Google Cloud Console
  - Usage: Initializing Firebase app
  - Format: String
  - Location: `/src/config/firebase.js`
  - Required: YES (important)

#### Optional Firebase Details (extracted from FIREBASE_CREDENTIALS)
- **FIREBASE_CLIENT_EMAIL**: Service account email
- **FIREBASE_PRIVATE_KEY**: Private key for authentication
- **FIREBASE_PRIVATE_KEY_ID**: Private key ID
- **FIREBASE_CLIENT_ID**: Client ID
- **FIREBASE_TYPE**: Service account type (default: 'service_account')
- **FIREBASE_AUTH_URI**: OAuth2 auth endpoint (default: https://accounts.google.com/o/oauth2/auth)
- **FIREBASE_TOKEN_URI**: OAuth2 token endpoint (default: https://oauth2.googleapis.com/token)
- **FIREBASE_AUTH_PROVIDER_X509_CERT_URL**: Certificate URL (default: https://www.googleapis.com/oauth2/v1/certs)
- **FIREBASE_CLIENT_X509_CERT_URL**: Client certificate URL
- **FIREBASE_STORAGE_BUCKET**: Storage bucket for media files (optional, defaults to {projectId}.appspot.com)
- **FIREBASE_SERVICE_ACCOUNT_PATH**: Alternative path to Firebase credentials file

### 1.2 Server & Environment Configuration

- **NODE_ENV**
  - Description: Node environment mode
  - Values: 'production', 'development', 'test'
  - Default: 'development'
  - Location: Throughout codebase
  - Usage: Environment-specific behavior, logging levels, error reporting

- **PORT**
  - Description: Server port for webhook and web services
  - Default: 3000
  - Format: Number (string in env)
  - Location: `/src/bot/webhook.js`

- **LOG_LEVEL**
  - Description: Winston logger level
  - Values: 'error', 'warn', 'info', 'debug'
  - Default: 'info'
  - Location: `/src/utils/logger.js`

### 1.3 Telegram Channel & Group Configuration

- **CHANNEL_ID**
  - Description: Main premium channel ID for paid membership access
  - Format: String (negative number ID)
  - Default: '-1002997324714'
  - Location: Multiple handlers for channel management
  - Usage: Sending premium channel invites, managing subscriptions

- **FREE_CHANNEL_ID**
  - Description: Free channel ID for trial/free tier users
  - Format: String (negative number ID)
  - Default: '-1003159260496'
  - Location: `/src/bot/helpers/onboardingHelpers.js`, membership manager
  - Usage: Managing free channel access and trial invites

- **FREE_GROUP_ID**
  - Description: Free group ID for general community
  - Format: String (negative number ID)
  - Default: '-1003291737499'
  - Location: Multiple handlers
  - Usage: Broadcasting to free tier users, general messages

### 1.4 Payment Processing Configuration

#### Daimo Pay (Crypto Payment)
- **DAIMO_WEBHOOK_TOKEN**
  - Description: Webhook authentication token for Daimo payment notifications
  - Format: Bearer token
  - Location: Payment webhook handlers
  - Required for: Crypto payment processing

- **DAIMO_WEBHOOK_URL**
  - Description: Webhook URL for Daimo payment callbacks
  - Format: URL
  - Default: 'https://pnptv.app/daimo/webhook'
  - Location: Webhook setup and health checks

- **DAIMO_API_KEY**
  - Description: API key for Daimo service
  - Format: String
  - Location: Payment debugging/testing

- **DAIMO_DESTINATION_ADDRESS**
  - Description: Wallet address for receiving Daimo payments
  - Format: Ethereum-like address
  - Location: Payment handlers

- **DAIMO_REFUND_ADDRESS**
  - Description: Wallet address for refunds
  - Format: Ethereum-like address
  - Location: Payment handlers

#### COP Card (Colombian Peso Card)
- **COP_CARD_PAYMENT_LINK**
  - Description: Wompi payment link for COP card payments
  - Format: URL
  - Default: 'https://pnptv.app/cop-card/instructions'
  - Location: COP card handlers
  - Usage: Directing users to payment page

- **COP_CARD_MERCHANT_NAME**
  - Description: Merchant name displayed in COP card payments
  - Format: String
  - Default: 'PNPtv'
  - Location: Payment handlers

- **COP_CARD_ADMIN_NOTIFICATION_CHAT_ID**
  - Description: Chat ID for COP card payment notifications to admins
  - Format: Number or string
  - Location: Cop card service

#### Kyrrex Payment
- **BOT_URL**
  - Description: Base URL for bot API endpoints
  - Format: URL
  - Location: Kyrrex admin handler
  - Usage: Payment confirmation endpoints

#### Nequi/Wompi
- Payment links configured in static plans (plans.js)

### 1.5 Admin Configuration

- **ADMIN_IDS**
  - Description: Comma-separated list of admin user IDs
  - Format: '123456,789012,345678'
  - Default: [8365312597]
  - Location: `/src/config/admin.js`
  - Usage: Authorization for admin-only commands

### 1.6 Webhook & URL Configuration

- **WEBHOOK_URL**
  - Description: Public webhook URL for payment/external service callbacks
  - Format: URL
  - Default: 'https://pnptv.app'
  - Location: Multiple services
  - Usage: Payment verification callbacks, webhook setup

- **BOT_URL**
  - Description: Base URL for bot API endpoints
  - Format: URL
  - Location: Kyrrex and payment handlers

- **WEB_APP_URL** (or **WEBAPP_URL**)
  - Description: URL to the web app/mini app interface
  - Format: URL
  - Default: 'https://pnptv.app/app'
  - Location: App handler, next.config.js
  - Usage: Opening Telegram mini app

### 1.7 AI & Third-party Services

#### Mistral AI
- **MISTRAL_API_KEY**
  - Description: API key for Mistral AI service
  - Format: String (API key)
  - Location: `/src/bot/handlers/aiChat.js`
  - Usage: AI-powered chat responses
  - Optional: YES

- **MISTRAL_AGENT_ID**
  - Description: Agent ID for Mistral AI
  - Format: String
  - Location: `/src/bot/handlers/aiChat.js`
  - Usage: Specifying which AI agent to use

#### Zoom Integration
- **ZOOM_ACCOUNT_ID**
  - Description: Zoom account ID for OAuth
  - Format: String
  - Location: `/src/services/zoomService.js`
  - Usage: Zoom meeting integration

- **ZOOM_CLIENT_ID**
  - Description: Zoom OAuth client ID
  - Format: String
  - Location: Zoom service

- **ZOOM_CLIENT_SECRET**
  - Description: Zoom OAuth client secret
  - Format: String (sensitive)
  - Location: Zoom service

### 1.8 Caching & Redis Configuration

- **REDIS_ENABLED**
  - Description: Enable/disable Redis caching
  - Values: 'true', 'false'
  - Default: 'false'
  - Location: `/src/services/cacheService.js`

- **REDIS_URL**
  - Description: Complete Redis connection URL
  - Format: 'redis://user:password@host:port'
  - Location: Cache service
  - Usage: Alternative to individual Redis config vars

- **REDIS_HOST**
  - Description: Redis server hostname
  - Default: '127.0.0.1'
  - Location: Cache service

- **REDIS_PORT**
  - Description: Redis server port
  - Default: '6379'
  - Format: Number (string in env)
  - Location: Cache service

- **REDIS_PASSWORD**
  - Description: Redis authentication password
  - Format: String (optional)
  - Location: Cache service

- **REDIS_DB**
  - Description: Redis database number
  - Default: '0'
  - Format: Number (string in env)
  - Location: Cache service

### 1.9 Error Tracking & Monitoring

- **SENTRY_DSN**
  - Description: Sentry error tracking DSN
  - Format: URL
  - Location: `/src/config/sentry.js`
  - Usage: Production error monitoring and alerting
  - Optional: YES

- **SENTRY_ENABLE_IN_DEV**
  - Description: Enable Sentry in development environment
  - Values: 'true', 'false'
  - Default: 'false'
  - Location: Sentry config

### 1.10 Frontend/NextJS Configuration

- **NEXT_PUBLIC_DAIMO_APP_ID**
  - Description: Public Daimo app ID for frontend
  - Format: String
  - Location: `/next.config.js`
  - Usage: Frontend crypto payment setup

- **NEXT_PUBLIC_TREASURY_ADDRESS**
  - Description: Public treasury wallet address
  - Format: Address
  - Location: Frontend config

- **NEXT_PUBLIC_REFUND_ADDRESS**
  - Description: Public refund wallet address
  - Format: Address
  - Location: Frontend config

- **NEXT_PUBLIC_WEBAPP_URL**
  - Description: Public webapp URL
  - Format: URL
  - Default: 'https://pnptv.app/app'
  - Location: Frontend config

- **NEXT_PUBLIC_BOT_URL**
  - Description: Public bot URL
  - Format: URL
  - Location: Frontend config

### 1.11 Feature Flags

- **AUTO_ACTIVATE_FREE_USERS**
  - Description: Automatically activate free tier users without manual approval
  - Values: 'true', 'false'
  - Default: 'false'
  - Location: `/src/bot/helpers/onboardingHelpers.js`

---

## 2. CONFIGURATION CONSTANTS (Defined in Code)

### 2.1 Session Management Configuration

**File: `/src/utils/sessionManager.js`**

```javascript
const SESSION_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 60 * 60,              // 1 hour in seconds
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60,   // 30 days in seconds
  MAX_SESSIONS_PER_USER: 5,                  // Maximum concurrent sessions
  TOKEN_ROTATION_THRESHOLD: 15 * 60,         // Rotate tokens if older than 15 minutes
};
```

### 2.2 Rate Limiting Configuration

**File: `/src/bot/middleware/rateLimit.js`**

```javascript
const RATE_LIMIT_WINDOW = 60 * 1000;  // 1 minute
const MAX_REQUESTS = 30;               // 30 requests per minute
```

### 2.3 Cache Service Configuration

**File: `/src/services/cacheService.js`**

```javascript
// TTL configurations (in seconds)
const TTL = {
  PLANS_LIST: 60 * 60,              // 1 hour
  PLAN_BY_ID: 60 * 60 * 2,          // 2 hours
  PLAN_STATS: 60 * 5,               // 5 minutes
  LOCALE_DATA: 60 * 60 * 24,        // 24 hours
  MENU_CONFIG: 60 * 60 * 12,        // 12 hours
  USER_SESSION: 60 * 30,            // 30 minutes
};

// Cache key prefixes
const KEYS = {
  PLANS_ACTIVE: "plans:active",
  PLAN_BY_ID: "plan:id:",
  PLAN_BY_SLUG: "plan:slug:",
  PLAN_STATS: "plans:stats",
  LOCALE: "locale:",
  MENU: "menu:",
};
```

### 2.4 Promotion Configuration

**File: `/src/bot/handlers/promoHandler.js`**

```javascript
const PROMO_CONFIG = {
  amount: 10,
  currency: "USD",
  paymentLink: "https://checkout.nequi.wompi.co/l/xo2XHx",
  groupId: process.env.FREE_GROUP_ID || "-1003291737499"
};
```

### 2.5 Firestore Error Codes

**File: `/src/utils/firestoreErrorHandler.js`**

```javascript
const FirestoreErrorCodes = {
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown',
  INVALID_ARGUMENT: 'invalid-argument',
  DEADLINE_EXCEEDED: 'deadline-exceeded',
  NOT_FOUND: 'not-found',
  ALREADY_EXISTS: 'already-exists',
  PERMISSION_DENIED: 'permission-denied',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  FAILED_PRECONDITION: 'failed-precondition',
  ABORTED: 'aborted',
  OUT_OF_RANGE: 'out-of-range',
  UNIMPLEMENTED: 'unimplemented',
  INTERNAL: 'internal',
  UNAVAILABLE: 'unavailable',
  DATA_LOSS: 'data-loss',
  UNAUTHENTICATED: 'unauthenticated',
};
```

### 2.6 Timezone Map

**File: `/src/utils/timezoneHelper.js`**

```javascript
const TIMEZONE_MAP = {
  // Americas
  'US': 'America/New_York',
  'CA': 'America/Toronto',
  'MX': 'America/Mexico_City',
  'BR': 'America/Sao_Paulo',
  'AR': 'America/Argentina/Buenos_Aires',
  'CL': 'America/Santiago',
  'CO': 'America/Bogota',
  'VE': 'America/Caracas',
  'PE': 'America/Lima',
  // Europe
  'GB': 'Europe/London',
  'FR': 'Europe/Paris',
  'DE': 'Europe/Berlin',
  'ES': 'Europe/Madrid',
  'IT': 'Europe/Rome',
  'PT': 'Europe/Lisbon',
  'RU': 'Europe/Moscow',
  'UA': 'Europe/Kiev',
  'PL': 'Europe/Warsaw',
  // Asia
  'CN': 'Asia/Shanghai',
  'JP': 'Asia/Tokyo',
  'IN': 'Asia/Kolkata',
  'KR': 'Asia/Seoul',
  'TH': 'Asia/Bangkok',
  'SG': 'Asia/Singapore',
  'HK': 'Asia/Hong_Kong',
  'PH': 'Asia/Manila',
  'ID': 'Asia/Jakarta',
  // Oceania
  'AU': 'Australia/Sydney',
  'NZ': 'Pacific/Auckland',
  // Africa
  'ZA': 'Africa/Johannesburg',
  'EG': 'Africa/Cairo',
};
```

---

## 3. SUBSCRIPTION PLANS (Static Fallback)

**File: `/src/config/plans.js`**

Defines canonical plans with structure:
```javascript
{
  id: string,
  name: string,
  displayName: string,
  price: number (USD),
  priceInCOP: number,
  currency: string,
  duration: number (days),
  durationDays: number,
  tier: string ('Free', 'Basic', 'Premium'),
  description: string,
  features: array,
  active: boolean,
  wompiPaymentLink: string,
  paymentLink: string,
}
```

**Plans:**
1. **TRIAL_WEEK** - 7 days, $14.99, Basic tier
2. **PNP_MEMBER** - 30 days, $24.99, Basic tier
3. **PNP_CRYSTAL** - 120 days, $49.99, Premium tier
4. **PNP_DIAMOND** - 365 days, $99.99, Premium tier
5. **LIFETIME_PASS** - 36500 days (100 years), $249.99, Premium tier

---

## 4. VALIDATION & SECURITY CONFIGURATION

**File: `/src/config/env.js`**

### Required Environment Variables (by priority)

```javascript
REQUIRED_ENV_VARS = {
  critical: [
    'TELEGRAM_BOT_TOKEN',
    'FIREBASE_CREDENTIALS',
  ],
  important: [
    'NODE_ENV',
    'PORT',
    'FIREBASE_PROJECT_ID',
  ],
  optional: [
    'FIREBASE_CLIENT_EMAIL',
    'SENTRY_DSN',
    'MISTRAL_API_KEY',
  ],
};
```

### Sensitive Variable Patterns

Variables matching these patterns are masked in logs:
- `/token/i`
- `/key/i`
- `/secret/i`
- `/password/i`
- `/credential/i`
- `/private/i`

---

## 5. FIRESTORE COLLECTIONS

The application uses the following Firestore collections:

- **users**: User profiles and data
- **plans**: Subscription plans (primary data source)
- **sessions**: User sessions with tokens
- **payments**: Payment records and history
- **bot_sessions**: Bot conversation sessions
- **menus**: Cached menu configurations
- **locales**: Internationalization strings

---

## 6. DATABASE COLLECTION NAMING PATTERNS

- Firestore documents use consistent naming:
  - Menu configs: `${menuType}_${lang}` (e.g., 'main_en', 'main_es')
  - Plan caches: Plan ID or slug-based keys in Redis

---

## 7. LOGGING CONFIGURATION

**File: `/src/utils/logger.js`**

Winston logger configuration:
- **Default Level**: 'info' (from LOG_LEVEL env var)
- **Output Files**:
  - `logs/error.log` - Error level logs
  - `logs/combined.log` - All logs
  - Console output (always enabled for cloud platforms)
- **Format**: JSON with timestamp

---

## 8. SENTRY ERROR TRACKING CONFIGURATION

**File: `/src/config/sentry.js`**

Filtered sensitive keys in error reports:
- TELEGRAM_TOKEN
- TELEGRAM_BOT_TOKEN
- FIREBASE_PRIVATE_KEY
- FIREBASE_CREDENTIALS
- SENTRY_DSN

Ignored errors (expected Telegram API errors):
- "400: Bad Request: message is not modified"
- "403: Forbidden: bot was blocked by the user"
- "403: Forbidden: bot can't initiate conversation with a user"
- Network errors: ECONNRESET, ETIMEDOUT, ENOTFOUND

Performance sampling:
- Production: 10% sample rate (0.1)
- Development: 100% sample rate (1.0)

---

## 9. MINI APP CONFIGURATION

The bot supports Telegram mini apps (web apps) with URLs configured via:
- `WEB_APP_URL` or `WEBAPP_URL` environment variables
- Defaults to: 'https://pnptv.app/app'

---

## 10. DEPENDENCY VERSIONS (from package.json)

**Key Dependencies:**
- Node.js: >=18.0.0
- npm: >=9.0.0
- telegraf: ^3.40.0 (Telegram bot framework)
- firebase-admin: ^13.5.0 (Firebase backend)
- next: ^15.0.0 (Web framework)
- express: ^5.1.0 (HTTP server)
- ioredis: ^5.8.1 (Redis client)
- winston: ^3.18.3 (Logging)
- @sentry/node: ^10.20.0 (Error tracking)
- @daimo/pay: ^1.18.3 (Crypto payments)
- @mistralai/mistralai: ^1.10.0 (AI chat)

---

## 11. SUMMARY TABLE

| Category | Variable Name | Type | Required | Default |
|----------|---------------|------|----------|---------|
| **Telegram** | TELEGRAM_TOKEN | String | YES | - |
| | TELEGRAM_BOT_USERNAME | String | NO | 'PNPtvBot' |
| **Firebase** | FIREBASE_CREDENTIALS | JSON | YES | - |
| | FIREBASE_PROJECT_ID | String | YES | - |
| | FIREBASE_STORAGE_BUCKET | String | NO | {projectId}.appspot.com |
| **Server** | NODE_ENV | String | YES | 'development' |
| | PORT | Number | NO | 3000 |
| | LOG_LEVEL | String | NO | 'info' |
| **Channels** | CHANNEL_ID | String | NO | '-1002997324714' |
| | FREE_CHANNEL_ID | String | NO | '-1003159260496' |
| | FREE_GROUP_ID | String | NO | '-1003291737499' |
| **Admin** | ADMIN_IDS | String | NO | '8365312597' |
| **Webhooks** | WEBHOOK_URL | String | NO | 'https://pnptv.app' |
| | BOT_URL | String | NO | - |
| | WEBAPP_URL | String | NO | 'https://pnptv.app/app' |
| **Daimo** | DAIMO_WEBHOOK_TOKEN | String | NO | - |
| | DAIMO_API_KEY | String | NO | - |
| | DAIMO_DESTINATION_ADDRESS | String | NO | - |
| | DAIMO_REFUND_ADDRESS | String | NO | - |
| **COP Card** | COP_CARD_PAYMENT_LINK | String | NO | 'https://pnptv.app/cop-card/instructions' |
| | COP_CARD_MERCHANT_NAME | String | NO | 'PNPtv' |
| **Redis** | REDIS_URL | String | NO | - |
| | REDIS_HOST | String | NO | '127.0.0.1' |
| | REDIS_PORT | Number | NO | '6379' |
| | REDIS_ENABLED | String | NO | 'false' |
| **Mistral AI** | MISTRAL_API_KEY | String | NO | - |
| | MISTRAL_AGENT_ID | String | NO | - |
| **Zoom** | ZOOM_ACCOUNT_ID | String | NO | - |
| | ZOOM_CLIENT_ID | String | NO | - |
| | ZOOM_CLIENT_SECRET | String | NO | - |
| **Monitoring** | SENTRY_DSN | String | NO | - |
| **Features** | AUTO_ACTIVATE_FREE_USERS | String | NO | 'false' |

---

## 12. SETUP CHECKLIST

To run the application, ensure:

- [ ] TELEGRAM_BOT_TOKEN is set
- [ ] FIREBASE_CREDENTIALS is properly formatted
- [ ] FIREBASE_PROJECT_ID is set
- [ ] NODE_ENV is set to 'production' or 'development'
- [ ] PORT is available (default 3000)
- [ ] CHANNEL_ID and FREE_CHANNEL_ID point to valid Telegram channels
- [ ] ADMIN_IDS contains valid admin user IDs
- [ ] WEBHOOK_URL is properly configured for payment callbacks
- [ ] Optional: SENTRY_DSN for production error tracking
- [ ] Optional: Redis configuration if caching is needed
- [ ] Optional: Mistral API key for AI chat features

