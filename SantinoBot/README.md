# Santino Group Management Bot

Anonymous Telegram bot for managing PNPtv community group permissions based on subscription tiers.

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

## Setup

1. **Create Bot**: Create a new bot with @BotFather
2. **Add to Group**: Add bot to your Telegram group as administrator
3. **Bot Permissions**: Give bot these admin permissions:
   - Delete messages
   - Restrict members
   - Pin messages (optional)

4. **Environment Variables**:
```env
BOT_TOKEN=your_bot_token_here
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_CLIENT_EMAIL=your_client_email
GROUP_ID=-1001234567890
LOG_LEVEL=info
```

5. **Install & Run**:
```bash
npm install
npm start
```

## Configuration

The bot automatically syncs with the main PNPtv bot's Firestore database to check user subscription status.

## Deployment

Can be deployed to:
- Railway
- Heroku  
- VPS
- Google Cloud Run
- Any Node.js hosting platform

## Security

- Bot operates anonymously
- No user data stored locally
- All permissions managed through Firestore
- Automatic cleanup of unauthorized content