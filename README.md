# PNPtv Telegram Bot

A feature-rich Telegram bot for social networking with integrated payment processing via Bold API.

## 🚀 Features

- **Multi-language Support**: English & Spanish
- **User Onboarding**: Age verification, terms acceptance, privacy policy
- **User Profiles**: Bio, location, XP system, badges, tiers
- **Payment Integration**: Bold payment gateway for subscriptions
- **Session Persistence**: Local file-based session storage
- **Rate Limiting**: Prevents spam and abuse
- **Comprehensive Logging**: Winston logger with file and console outputs
- **Input Validation**: Sanitizes and validates all user inputs
- **Error Handling**: Graceful error handling throughout

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

   Create a `.env` file in the root directory:
   ```env
   TELEGRAM_TOKEN=your_telegram_bot_token
   BOLD_API_KEY=your_bold_api_key
   BOLD_SECRET_KEY=your_bold_secret_key
   CHANNEL_ID=your_channel_id
   BOLD_CALLBACK_URL=https://yourdomain.com/api/webhooks/bold
   BOLD_REDIRECT_URL=https://yourdomain.com/payment/return
   BOLD_API_BASE=https://integrations.api.bold.co
   NODE_ENV=development
   LOG_LEVEL=info
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
Bots/
├── src/
│   ├── bot/
│   │   ├── handlers/          # Command handlers
│   │   │   ├── start.js
│   │   │   ├── help.js
│   │   │   ├── map.js
│   │   │   ├── profile.js
│   │   │   └── subscribe.js
│   │   ├── middleware/        # Bot middleware
│   │   │   ├── session.js
│   │   │   ├── rateLimit.js
│   │   │   └── errorHandler.js
│   │   └── index.js          # Main bot file
│   ├── config/               # Configuration files
│   │   ├── firebase.js
│   │   ├── bold.js
│   │   ├── i18n.js
│   │   └── plans.js
│   ├── locales/              # Translation files
│   │   ├── en.json
│   │   └── es.json
│   ├── utils/                # Utility functions
│   │   ├── formatters.js
│   │   ├── validation.js
│   │   ├── i18n.js
│   │   ├── logger.js
│   │   └── __tests__/        # Unit tests
│   └── webapp/               # Web app files
├── logs/                     # Log files
├── .env                      # Environment variables
├── .gitignore
├── jest.config.js
├── package.json
└── README.md
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

## 🛠️ Available Commands

### Bot Commands

- `/start` - Start the bot and begin onboarding
- `/help` - Display available commands
- `/profile` - View and edit your profile
- `/map` - View community map (placeholder)
- `/subscribe` - Subscribe to PRIME plan

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
