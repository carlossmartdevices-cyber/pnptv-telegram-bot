# Santino Group Management Bot

🤖 Anonymous Telegram bot for managing PNPtv community group permissions based on subscription tiers.

## ⚡ Quick Start (2 Methods)

### Method 1: Interactive Setup (Easiest!)

```bash
npm install
npm run setup:interactive
```

Follow the prompts to configure your bot. Then:

```bash
npm run check-config  # Verify everything is correct
npm start             # Start the bot!
```

### Method 2: Manual Setup

```bash
npm run setup         # Creates .env from template
nano .env             # Edit with your values
npm run check-config  # Verify configuration
npm start             # Start the bot
```

📚 **Need detailed help?** See [GETTING_STARTED.md](GETTING_STARTED.md) for step-by-step guide.

## Features

- **Automatic Permission Management**: Sets user permissions based on subscription tier
- **Media Restrictions**: Only premium members can send photos/videos
- **Real-time Updates**: Syncs with main bot's user database
- **Anonymous Operation**: Bot operates without revealing admin identity
- **Automatic Cleanup**: Removes unauthorized media instantly

## Permission Levels

### Free Users
- ✅ Can send text messages
- ❌ Cannot send media (photos, videos, documents)
- ❌ Cannot send voice messages
- ❌ Cannot send stickers/GIFs

### Premium Users (Trial Week / PNP Member / PNP Crystal / PNP Diamond)
- ✅ Can send text messages
- ✅ Can send media (photos, videos, documents)
- ✅ Can send voice messages
- ✅ Can send stickers/GIFs

## Setup Requirements

1. **Telegram Bot Token** - Get from [@BotFather](https://t.me/BotFather)
2. **Firebase Credentials** - Copy from your main PNPtv bot
3. **Group ID** - Your Telegram group's ID
4. **Bot Admin Permissions** - Delete messages & Restrict members

## Configuration

Edit the `.env` file with your credentials:

```env
BOT_TOKEN=your_bot_token_here
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_CLIENT_EMAIL=your_client_email
GROUP_ID=-1001234567890
```

Run `npm run check-config` to validate your configuration before starting.

## Commands

### User Commands
- `/status` - Check your current permission level
- `/info` - Bot information
- `/userprofile` - View your profile
- `/nearby` - Find nearby members (premium only)
- `/subscription` - Check subscription status

### Admin Commands
- `/refresh` - Refresh permissions for a user
- `/configwelcome` - Configure welcome message
- `/schedulevideocall` - Schedule a video call
- `/schedulelivestream` - Schedule a live stream
- `/broadcast` - Send broadcast message
- `/listscheduled` - View scheduled events

## Deployment

Deploy your bot to the cloud with one command:

```bash
npm run deploy
```

This interactive wizard will guide you through deploying to:
- **Railway** (Free tier, recommended)
- **Render** (Free tier)
- **VPS** (Full control)
- **Docker** (Containerized)

### Quick Deploy Options

```bash
npm run deploy              # Interactive deployment wizard
npm run deploy:railway      # Railway helper
npm run deploy:vps          # VPS deployment script
```

📚 **Detailed Guide:** See [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) for complete deployment instructions.

**Popular platforms:**

## Security

- Bot operates anonymously
- No user data stored locally
- All permissions managed through Firestore
- Automatic cleanup of unauthorized content
- Credentials protected via .gitignore

## Support

📖 **Documentation:**
- [Quick Start Guide](QUICKSTART.md) - Step-by-step setup
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [Features Guide](NEW_FEATURES_GUIDE.md) - Advanced features

## License

MIT
