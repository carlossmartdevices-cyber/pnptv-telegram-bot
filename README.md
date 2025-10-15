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
- **Premium Subscriptions** (Silver & Golden tiers)
- **Admin Panel** for user management and broadcasting
- **Rate Limiting** and security features
- **Session Persistence** with local file-based storage
- **Comprehensive Logging** with Winston
- **Input Validation** and sanitization

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
- Bold API credentials

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
   ```env
   TELEGRAM_TOKEN=your_telegram_bot_token
   FIREBASE_PROJECT_ID=your_firebase_project_id
   ADMIN_IDS=your_telegram_user_id
   BOLD_PUBLIC_KEY=pk_live_your_public_key
   BOLD_SECRET_KEY=sk_live_your_secret_key
   WEB_PORT=3000
   WEB_APP_URL=http://localhost:3000
   ```

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
│   │   ├── bold.js
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

## 🔐 Security Best Practices

### ⚠️ CRITICAL - Before First Deployment

1. **Rotate ALL credentials**:
   - Generate new Telegram bot token
   - Rotate Bold API keys
   - Create new Firebase service account
   - Update `.env` file

2. **Remove credentials from git history**:
   ```bash
   # Using BFG Repo-Cleaner (recommended)
   brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/
   bfg --delete-files firebase_credentials.json
   bfg --replace-text passwords.txt  # Create file with old credentials
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```

3. **Verify .gitignore**:
   - Ensure `.env` is listed
   - Ensure `firebase_credentials.json` is listed
   - Never commit sensitive files

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

## 🚂 Deploy to Railway (Recommended for Testing)

Deploy your bot with HTTPS in 5 minutes!

**Quick Deploy:**
1. Push to GitHub
2. Connect to Railway: https://railway.app/new
3. Add environment variables
4. Get free HTTPS domain
5. Mini App works in Telegram!

See complete guide: **[RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md)**

**Full documentation:** [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)

**What you get:**
- ✅ Free HTTPS domain
- ✅ $5/month free credit
- ✅ Automatic deployments
- ✅ Mini App working in Telegram

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

### Bold Payment API

The bot integrates with Bold's payment gateway for subscription processing:

- Create payment links
- Query payment status
- Handle payment callbacks

See `src/config/bold.js` for implementation details.

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
- Verify Bold API credentials
- Check Bold API base URL
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

**Made with ❤️ for PNPtv Community**
