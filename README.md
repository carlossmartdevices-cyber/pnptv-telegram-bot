# 🤖 PNPtv Telegram Bot & Mini App

A full-featured Telegram bot with an integrated Mini App for social networking, live streaming, and premium subscriptions.

[![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue?logo=telegram)](https://t.me/PNPtvbot)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Features

### 🤖 Telegram Bot
- **Multi-language Support** (English & Spanish)
- **User Onboarding** with age verification and terms acceptance
- **Profile Management** with photo uploads
- **Geolocation** - Find nearby users with real-time distance calculation
- **Premium Subscriptions** (Silver & Golden tiers) with ePayco integration
- **Admin Panel** for user management and broadcasting
- **Advanced Security** - Session management with JWT-like tokens, webhook signature validation
- **Rate Limiting** and DDoS protection
- **Session Management** - Token-based auth with automatic expiry and refresh
- **Comprehensive Logging** with Winston and Sentry integration
- **Input Validation** and sanitization with express-validator

### 🌐 Telegram Mini App (NEW!)
- **Interactive Profile** - View and edit profile in a web interface
- **Live Map** - See nearby users on an interactive map
- **Live Streams** - Watch live content (coming soon)
- **Premium Marketplace** - Browse and subscribe to plans
- **Responsive Design** - Optimized for mobile devices
- **Telegram Theme Integration** - Matches user's Telegram theme

## 📋 Prerequisites

- Node.js >= 14.x
- Firebase project with Firestore enabled
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- ePayco API credentials (public/private/test mode)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Bots
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your credentials:

   **Critical Variables (Required):**
   ```env
   # Telegram Bot
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   TELEGRAM_TOKEN=your_bot_token_from_botfather  # Same as above (legacy support)

   # Firebase
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # Admin
   ADMIN_IDS=your_telegram_user_id  # Comma-separated for multiple admins
   ```

   **Important Variables:**
   ```env
   # Environment
   NODE_ENV=development  # development | production
   PORT=3000

   # URLs (for webhooks and Mini App)
   BOT_URL=https://your-app.herokuapp.com
   WEB_APP_URL=https://your-app.herokuapp.com
   ```

   **Optional - Payment Integration:**
   ```env
   # ePayco (Colombian payment gateway)
   EPAYCO_PUBLIC_KEY=your_public_key
   EPAYCO_PRIVATE_KEY=your_private_key
   EPAYCO_P_CUST_ID=your_customer_id
   EPAYCO_P_KEY=your_p_key
   EPAYCO_TEST_MODE=true  # false for production
   EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false  # NEVER true in production
   ```

   **Optional - Monitoring:**
   ```env
   # Sentry (error tracking)
   SENTRY_DSN=your_sentry_dsn
   ```

   See [Environment Variables Reference](#environment-variables-reference) for complete documentation.

4. **Configure Firebase**

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Generate a service account key
   - Save it as `src/config/firebase_credentials.json`
   - **IMPORTANT**: Never commit this file to git

5. **Create necessary directories**
   ```bash
   mkdir -p logs
   ```

## 🎯 Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Run Tests

```bash
npm test
```

## 📁 Project Structure

```
pnptv-bot/
├── src/
│   ├── bot/
│   │   ├── handlers/             # Command handlers
│   │   │   ├── start.js
│   │   │   ├── help.js
│   │   │   ├── map.js
│   │   │   ├── profile.js
│   │   │   ├── subscribe.js
│   │   │   ├── live.js
│   │   │   └── admin.js
│   │   ├── middleware/           # Bot middleware
│   │   │   ├── session.js
│   │   │   ├── rateLimit.js
│   │   │   └── errorHandler.js
│   │   └── index.js             # Main bot file
│   ├── web/                     # Mini App (NEW!)
│   │   ├── server.js            # Express web server + API
│   │   └── public/              # Frontend files
│   │       ├── index.html       # Mini App main page
│   │       ├── styles.css       # Telegram-themed styles
│   │       ├── app.js           # Client-side JavaScript
│   │       └── demo.html        # Demo mode (no Telegram)
│   ├── config/                  # Configuration files
│   │   ├── firebase.js
│   │   ├── epayco.js
│   │   ├── plans.js
│   │   ├── admin.js
│   │   └── menus.js
│   ├── locales/                 # Translation files
│   │   ├── en.json
│   │   └── es.json
│   └── utils/                   # Utility functions
│       ├── logger.js
│       ├── i18n.js
│       ├── validation.js
│       ├── geolocation.js
│       └── guards.js
├── logs/                        # Log files
├── start-bot.js                 # Bot launcher
├── .env.example                 # Environment template
├── .env                         # Environment variables
├── package.json
├── README.md
└── MINI_APP_SETUP.md           # Mini App guide
```

## 🔐 Security Features

### 🛡️ Enterprise-Grade Security (Phase 1 Completed ✅)

This bot implements comprehensive security measures to protect user data and prevent fraud:

#### 1. **Webhook Signature Validation**
- ✅ Strict SHA256 signature validation for ePayco webhooks
- ✅ Replay attack prevention with timestamp validation
- ✅ Amount verification against ePayco API before processing payments
- ✅ Idempotency checks to prevent duplicate payment processing

#### 2. **Session Management**
- ✅ Access tokens with 1-hour expiry
- ✅ Refresh tokens with 30-day expiry
- ✅ Automatic token rotation every 15 minutes
- ✅ Maximum 5 concurrent sessions per user
- ✅ Secure session storage in Firestore

#### 3. **Telegram Authentication**
- ✅ Complete validation of Telegram initData
- ✅ Timing-safe hash comparison to prevent timing attacks
- ✅ Auth timestamp validation (rejects >24 hours old)
- ✅ Clock skew detection and prevention

#### 4. **Environment Protection**
- ✅ Automatic validation of critical environment variables
- ✅ Sensitive value masking in logs
- ✅ Placeholder detection for insecure configurations
- ✅ Enhanced .gitignore to prevent credential exposure

### API Endpoints

#### Authentication
- `POST /api/auth/telegram-login` - Login with Telegram credentials
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Revoke current session
- `POST /api/auth/logout-all` - Revoke all user sessions

#### User Management
- `GET /api/profile/:userId` - Get user profile (requires auth)
- `PUT /api/profile/:userId` - Update profile (requires auth)
- `POST /api/map/nearby` - Find nearby users (requires auth)

#### Payments
- `POST /api/payment/create` - Create payment link (requires auth)
- `GET /epayco/confirmation` - Payment webhook (signed)
- `POST /epayco/confirmation` - Payment webhook (signed)
- `GET /epayco/response` - User redirect after payment

### ⚠️ CRITICAL - Before First Deployment

1. **Rotate ALL credentials**:
   - Generate new Telegram bot token at [@BotFather](https://t.me/botfather)
   - Rotate ePayco API keys from [dashboard](https://dashboard.epayco.co/)
   - Create new Firebase service account
   - Update `.env` file with new credentials

2. **Remove credentials from git history**:
   ```bash
   # Using BFG Repo-Cleaner (recommended)
   brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/
   bfg --delete-files firebase_credentials.json
   bfg --replace-text passwords.txt  # Create file with old credentials
   git reflog expire --expire=now --all && git gc --prune=now --aggressive

   # Force push (DANGEROUS - coordinate with team)
   git push origin --force --all
   ```

3. **Verify .gitignore**:
   - Ensure `.env*` patterns are listed
   - Ensure `**/firebase_credentials.json` is listed
   - Ensure `*.key`, `*.pem`, `*.cert` are listed
   - Never commit sensitive files

4. **Enable security features in production**:
   ```env
   NODE_ENV=production
   EPAYCO_TEST_MODE=false
   EPAYCO_ALLOW_UNSIGNED_WEBHOOKS=false  # MUST be false in production
   ```

### Security Monitoring

Monitor these events in your logs:
- `[WEBHOOK SECURITY] Invalid signature` - Possible fraud attempt
- `[Auth] Hash mismatch` - Possible spoofing attempt
- `[SESSION] Access token expired` - Normal, but watch for excessive occurrences
- `[WEBHOOK SECURITY] Amount mismatch` - CRITICAL: Fraud attempt

## 📱 Testing the Mini App Locally

To test the Mini App in Telegram during development:

1. **Install ngrok**
```bash
# Windows
choco install ngrok

# Or download from https://ngrok.com/download
```

2. **Start ngrok**
```bash
ngrok http 3000
```

3. **Update .env with ngrok URL**
```env
WEB_APP_URL=https://abc123.ngrok.io
```

4. **Restart the bot and test in Telegram**

For more details, see [MINI_APP_SETUP.md](MINI_APP_SETUP.md)

## 🎨 Demo Mode

To test the web interface without Telegram:
```
http://localhost:3000/demo.html
```

## 🚀 Deployment

### Heroku (Production)

Your bot is currently deployed on Heroku:
- **URL:** https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com
- Mini App with HTTPS enabled
- Automatic deployments from main branch

See **[HEROKU_DEPLOYMENT.md](HEROKU_DEPLOYMENT.md)** for deployment guide.

### Railway (Alternative)

You can also deploy to Railway for testing:
1. Push to GitHub
2. Connect to Railway: https://railway.app/new
3. Add environment variables
4. Get free HTTPS domain

See complete guide: **[RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md)**

## 🛠️ Available Commands

### Bot Commands

- `/start` - Start the bot and complete onboarding
- `/profile` - View and edit your profile
- `/map` - Find nearby users with geolocation
- `/live` - Browse live streams
- `/subscribe` - View premium subscription plans
- `/help` - Get help and support
- `/admin` - Admin panel (admin only)

### Callback Actions

- Language selection (English/Español)
- Age verification
- Terms & conditions acceptance
- Privacy policy acceptance
- Profile editing (bio, location)
- Subscription management

## 📊 Database Structure

### Users Collection (Firestore)

```javascript
{
  userId: "telegram_user_id",
  username: "telegram_username",
  language: "en|es",
  ageVerified: boolean,
  termsAccepted: boolean,
  privacyAccepted: boolean,
  onboardingComplete: boolean,
  createdAt: timestamp,
  xp: number,
  badges: array,
  tier: "Free|Silver|Gold",
  bio: string,
  location: string
}
```

## 🔌 API Integration

### ePayco Payment API

The bot integrates with ePayco's payment gateway for subscription processing:

- Create payment links
- Query payment status
- Handle payment callbacks

See `src/config/epayco.js` for implementation details.

## 🧪 Testing

Unit tests are written using Jest. Test files are located in `__tests__` directories.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 📝 Logging

Logs are stored in the `logs/` directory:

- `error.log` - Error-level logs only
- `combined.log` - All log levels

Console logging is enabled in development mode.

## 🚦 Rate Limiting

Default configuration:
- 30 requests per minute per user
- Automatic cleanup of old request data

Modify in `src/bot/middleware/rateLimit.js`

## 🌐 Internationalization

Supported languages:
- English (en)
- Spanish (es)

Add new languages by:
1. Creating `src/locales/{lang}.json`
2. Adding translations for all keys

## 🐛 Troubleshooting

### Bot doesn't respond
- Check Telegram token is valid
- Ensure bot is not blocked by user
- Verify Firebase connection
- Check logs for errors

### Payment links not working
- Verify ePayco API credentials
- Check ePayco API base URL
- Review callback URL configuration

### Session data lost
- Check `sessions.json` file exists and is writable
- Verify file permissions

## 📄 License

[Add your license here]

## 👥 Contributors

[Add contributors here]

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email [your-email] or open an issue in the repository.

---

## 📚 Environment Variables Reference

### Critical Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | Bot token from @BotFather | `123456:ABC-DEF1234...` |
| `FIREBASE_PROJECT_ID` | ✅ Yes | Firebase project identifier | `my-project-12345` |
| `FIREBASE_CLIENT_EMAIL` | ✅ Yes | Service account email | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY` | ✅ Yes | Service account private key | `-----BEGIN PRIVATE KEY-----\n...` |
| `ADMIN_IDS` | ✅ Yes | Comma-separated admin user IDs | `123456789,987654321` |

### Important Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ⚠️ Important | `development` | Environment mode |
| `PORT` | ⚠️ Important | `3000` | Web server port |
| `BOT_URL` | ⚠️ Important | - | Public bot URL (HTTPS) |
| `WEB_APP_URL` | ⚠️ Important | - | Mini app URL (HTTPS) |

### Optional - Payment Integration

| Variable | Required | Description |
|----------|----------|-------------|
| `EPAYCO_PUBLIC_KEY` | Optional | ePayco public API key |
| `EPAYCO_PRIVATE_KEY` | Optional | ePayco private API key |
| `EPAYCO_P_CUST_ID` | Optional | ePayco customer ID |
| `EPAYCO_P_KEY` | Optional | ePayco P key for signatures |
| `EPAYCO_TEST_MODE` | Optional | `true` for test mode, `false` for production |
| `EPAYCO_ALLOW_UNSIGNED_WEBHOOKS` | Optional | **MUST be `false` in production** |
| `EPAYCO_RESPONSE_URL` | Optional | Auto-constructed from `BOT_URL` |
| `EPAYCO_CONFIRMATION_URL` | Optional | Auto-constructed from `BOT_URL` |

### Optional - Monitoring

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | Optional | Sentry error tracking DSN |

### Validation

The bot automatically validates environment variables on startup:
- **Critical** variables missing → Application fails to start
- **Important** variables missing → Warning displayed
- **Optional** variables missing → Info message (dev mode only)

To manually validate your configuration:
```javascript
const { validateEnv } = require('./src/config/env');
const result = validateEnv({ throwOnMissing: false });
console.log(result);
```

---

**Made with ❤️ for PNPtv Community**



