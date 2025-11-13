# PNPtv Telegram Bot

A production-ready Telegram bot with advanced features including subscription management, cryptocurrency payments, AI support, and geolocation services.

## 🌟 Features

- **Subscription Management**: Dynamic subscription plans with Firestore
- **Cryptocurrency Payments**: USDC payments via Daimo Pay
- **AI Customer Support**: 24/7 support with Mistral AI chatbot
- **Geolocation Services**: Find nearby members with map integration
- **Bilingual Support**: Full English/Spanish internationalization
- **Admin Panel**: Comprehensive admin tools (4000+ lines)
- **Scheduled Broadcasting**: Queue and schedule messages
- **Analytics**: User statistics and revenue tracking

## 🚀 Quick Start

### Development (Polling Mode)

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
# Make sure USE_WEBHOOK=false for local development

# Start bot in development mode
npm run dev
```

### Production (Webhook Mode)

See [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) for detailed instructions.

```bash
# Set environment variables
export NODE_ENV=production
export USE_WEBHOOK=true
export BOT_URL=https://yourdomain.com

# Start bot
npm start
```

## 📋 Environment Variables

See [.env.example](./.env.example) for a complete list.

**Required:**
- `TELEGRAM_TOKEN` - Your Telegram bot token
- `FIREBASE_CREDENTIALS` - Firebase service account JSON
- `FIREBASE_PROJECT_ID` - Firebase project ID

**Production (Webhook):**
- `NODE_ENV=production`
- `USE_WEBHOOK=true`
- `BOT_URL` - Your public HTTPS URL

**Optional:**
- `DAIMO_API_KEY` - For Daimo Pay integration
- `MISTRAL_API_KEY` - For AI chatbot
- `SENTRY_DSN` - For error tracking
- `ADMIN_IDS` - Comma-separated admin user IDs

## 🏗️ Architecture

### Technology Stack

- **Bot Framework**: Telegraf 3.40.0
- **Database**: Firebase Firestore
- **Payment**: Daimo Pay (USDC on blockchain)
- **AI**: Mistral AI
- **Server**: Express.js
- **Monitoring**: Sentry

### Project Structure

```
├── start-bot.js              # Entry point
├── src/
│   ├── bot/
│   │   ├── index.js          # Bot initialization
│   │   ├── handlers/         # Command handlers
│   │   ├── middleware/       # Session, rate limiting, errors
│   │   └── helpers/          # Onboarding, subscriptions
│   ├── server.js             # Express server with webhooks
│   ├── api/
│   │   ├── daimo-routes.js   # Payment API routes
│   │   └── bot/api/routes.js # Bot API routes
│   ├── services/             # Business logic
│   ├── config/               # Configuration
│   ├── utils/                # Utilities
│   └── locales/              # Translations (en/es)
└── WEBHOOK_SETUP.md          # Webhook deployment guide
```

## 🔄 Bot Modes

The bot supports two modes:

### Polling Mode (Development)
- Used for local development
- No HTTPS required
- Easy debugging
- Auto-enabled when `NODE_ENV != production` and `USE_WEBHOOK != true`

### Webhook Mode (Production)
- Used for production deployments
- More efficient and scalable
- Requires HTTPS domain
- Auto-enabled when `NODE_ENV=production` OR `USE_WEBHOOK=true`

**Scripts:**
```bash
npm start              # Auto-select based on env
npm run start:webhook  # Force webhook mode
npm run start:polling  # Force polling mode
npm run dev            # Development with auto-reload
```

## 📡 API Endpoints

- `GET /health` - Health check
- `POST /webhook/telegram` - Telegram webhook
- `POST /api/daimo/webhook` - Daimo payment webhook
- `POST /api/daimo/create-payment` - Create payment link
- `GET /api/plans/:planId` - Get plan details

## 🎯 User Commands

- `/start` - Start bot and onboarding
- `/subscribe` - View subscription plans
- `/profile` - View/edit profile
- `/map` - Location-based member discovery
- `/nearby` - Find nearby members
- `/aichat` - Start AI support chat
- `/help` - Get help
- `/rules` - View community rules

## 👨‍💼 Admin Commands

- `/admin` - Admin dashboard
- `/plans` - Manage subscription plans

Admin features:
- User management (search, ban, extend memberships)
- Broadcasting (immediate or scheduled)
- Plan management (create, edit, delete)
- Analytics and statistics

## 🔐 Security Features

- Input validation and sanitization
- Rate limiting (30 req/min per user)
- Admin whitelist protection
- Payment webhook signature verification
- HTTPS enforcement for webhooks
- Session security with 30-day TTL

## 🌍 Internationalization

Full bilingual support:
- English (`en`)
- Spanish (`es`)

Translations in `src/locales/`

## 📊 Background Tasks

Scheduled tasks (via node-cron):
1. **Daily Membership Check** (2:00 AM) - Expire memberships
2. **Backup Check** (Every 6 hours) - Safety net
3. **Broadcast Executor** (Every 30 seconds) - Send scheduled messages

## 🚢 Deployment

### Recommended Platforms

#### Vercel/Railway/Render
1. Connect GitHub repository
2. Set environment variables
3. Deploy (webhook auto-configured)

#### VPS/Server
1. Clone repository
2. Install dependencies
3. Configure `.env`
4. Set up reverse proxy (Nginx/Caddy) with SSL
5. Use PM2: `pm2 start start-bot.js --name pnptv-bot`

See [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) for detailed deployment instructions.

## 🧪 Testing

```bash
# Run tests
npm test

# Test database connection
npm run test:connection

# Test plan updates
npm run test:plans
```

## 🛠️ Maintenance

### Clean up expired sessions
```bash
npm run cleanup:sessions
npm run cleanup:sessions:dry-run    # Preview only
npm run cleanup:sessions:verbose    # Detailed output
```

### Initialize plans
```bash
npm run init:plans
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Your License Here]

## 🆘 Support

For issues or questions:
- Check logs for error messages
- Verify environment variables
- Review [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)
- Test with `/health` endpoint
- Contact: support@pnptv.app

## 🙏 Acknowledgments

Built with:
- [Telegraf](https://telegraf.js.org/) - Modern Telegram Bot Framework
- [Firebase](https://firebase.google.com/) - Database and Authentication
- [Daimo Pay](https://daimo.com/) - Cryptocurrency Payment Integration
- [Mistral AI](https://mistral.ai/) - AI Customer Support
- [Sentry](https://sentry.io/) - Error Tracking and Monitoring
