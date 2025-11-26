# PNPtv Bot - AI Coding Agent Instructions

## Project Overview

**PNPtv Bot** is a multi-bot Telegram platform with premium subscription management (manual activation by admin), geolocation features, AI chat integration (Mistral), and automated group management.

### Architecture Components

1. **Main Bot** (`src/bot/index.js`) - User-facing Telegram bot with onboarding, profiles, subscriptions, maps, and admin features
2. **SantinoBot** (`SantinoBot/`) - Autonomous group management bot that enforces media permissions based on user tiers (Free vs Premium)
3. **Firestore Database** - Shared real-time database for user profiles, sessions, subscriptions, broadcasts
4. **Mini App** - Telegram WebApp for map/location features

### Key Data Flows

```
User Action (Telegram) → Bot Handler → Service Layer → Firestore → Real-time Listeners
                                                              ↓
                                      Admin Activation → Subscription Update → Permission Sync
```

**Critical**: SantinoBot and Main Bot share the same Firestore database but run as **independent processes**. Changes to user tiers in Main Bot trigger real-time listeners in SantinoBot that update Telegram group permissions instantly.

## Development Patterns

### File Organization

```
src/
├── bot/
│   ├── index.js              # Main entry point, command registration
│   ├── handlers/             # Feature-specific handlers (start, profile, admin, etc.)
│   ├── middleware/           # Session, rate limiting, error handling
│   └── helpers/              # Onboarding, subscription logic
├── services/                 # Business logic layer (planService, scheduledBroadcastService)
├── config/                   # Firebase, admin IDs, menus, environment
├── utils/                    # Logger, i18n, guards, session cleanup
└── api/                      # Express routes for webhooks and web endpoints

SantinoBot/src/
├── bot.js                    # Independent bot instance
├── handlers/                 # Group events, admin commands
├── services/                 # userDataService, syncService
└── utils/                    # permissions.js, userDataSync.js, logger
```

### Session Management

**Migration Complete**: Sessions use Firestore (`bot_sessions` collection) instead of local JSON files.

```javascript
// In handlers - session is automatically available on ctx
ctx.session.awaitingEmail = true;  // Auto-persisted to Firestore
```

- **TTL**: 30 days automatic cleanup
- **Session Key**: Combines userId + chatId for uniqueness
- See `src/bot/middleware/firestoreSession.js` for implementation

### Firestore Patterns

**Read user data:**
```javascript
const userDoc = await db.collection('users').doc(userId).get();
const userData = userDoc.data();
```

**Real-time listeners** (used in SantinoBot for permission sync):
```javascript
db.collection('users').doc(userId).onSnapshot((doc) => {
  const newTier = doc.data().tier;
  applyUserPermissions(ctx, userId, newTier);
});
```

**Batch updates** (for bulk operations):
```javascript
const batch = db.batch();
userIds.forEach(id => batch.update(db.collection('users').doc(id), { tier: 'Free' }));
await batch.commit();
```

### Command Handlers

Follow this structure for new commands:
```javascript
// src/bot/handlers/myFeature.js
const { db } = require("../../config/firebase");
const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");

async function handleMyCommand(ctx) {
  try {
    const userId = ctx.from.id;
    // Business logic here
    await ctx.reply(t(ctx, 'response.key'));
  } catch (error) {
    logger.error('Error in handleMyCommand:', error);
    await ctx.reply(t(ctx, 'errors.generic'));
  }
}

module.exports = { handleMyCommand };
```

Register in `src/bot/index.js`:
```javascript
bot.command('mycommand', handleMyCommand);
```

### Error Handling

**Sentry Integration**: All errors automatically captured with context (userId, command, chatId)

```javascript
bot.catch((error, ctx) => {
  captureException(error, { userId: ctx.from?.id, command: ctx.message?.text });
  return errorHandler(error, ctx);
});
```

**Handler pattern**: Always wrap in try/catch, log errors, send user-friendly messages via i18n

### Internationalization

**Languages**: English (en), Spanish (es) - stored in `src/locales/`

```javascript
const { t } = require("../utils/i18n");
await ctx.reply(t(ctx, 'welcome.title')); // Auto-detects user language from session
```

User language set during onboarding, stored in `ctx.session.language`

## Critical Conventions

### Environment Variables

**Never hardcode**: Use `process.env.VARIABLE_NAME` for all credentials
**Two .env files**: `.env.example` (template), `.env` (actual secrets, gitignored)

**Required for Main Bot**:
- `TELEGRAM_TOKEN` - Bot token from @BotFather
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `ADMIN_IDS` - Comma-separated Telegram user IDs with admin access
- `BOT_URL` - Your deployed domain for webhooks (must be HTTPS)

**For SantinoBot**: Shares Firebase credentials, has its own `BOT_TOKEN`, needs `GROUP_ID`

### Permission Tiers (SantinoBot)

Defined in `SantinoBot/src/utils/permissions.js`:

- **Free**: Text only, no media
- **Premium** (trial-week, pnp-member, crystal-member, diamond-member): All media types allowed

**Key function**: `getTelegramPermissions(tier)` returns permission object for `restrictChatMember()`

### Admin Commands


New admin features in `src/bot/handlers/admin/` - examples: `planManager.js`, broadcast system

### Scheduled Tasks

**Broadcasts**: `src/services/scheduledBroadcastService.js` uses `node-cron` to execute deferred messages
- Cron job runs every 30 seconds checking for broadcasts marked "ready"
- Limit: 12 concurrent scheduled broadcasts
- Rate limiting: 100ms between sends

**SantinoBot Sync**: 
- Hourly cron: Check expired memberships, downgrade to Free tier
- Daily cron: Cleanup old activity logs (30-day retention)

## Deployment

### Production Environment

**Current**: VPS (Hostinger) at `72.60.29.80` / `srv1071867.hstgr.cloud`
- **Process Manager**: PM2 (`pm2 start pnptv-bot`)
- **Domain**: `pnptv.app` with Nginx reverse proxy
- **Webhook mode**: Telegram webhooks to `/webhook` endpoint
- **Node.js**: >=18.0.0 required

**PM2 Configuration**: `ecosystem.config.js` defines app name, script, env vars, deployment config

### Deployment Commands

```bash
# Production restart
pm2 restart pnptv-bot

# View logs
pm2 logs pnptv-bot

# Deployment script (from repo)
./deploy-pnptv.app.sh
```

### Webhook Setup

**Critical**: Set webhook URL after deployment:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://pnptv.app/webhook"
```

**Verify**:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Alternative Platforms

- **Railway**: Use `railway up`, auto-deploys from Git
- **Heroku**: `Procfile` defines `web: node src/bot/index.js`
- **Docker**: `Dockerfile` in root for containerized deployment

## Testing & Debugging

### Local Development

```bash
npm install
cp .env.example .env
# Edit .env with credentials
npm start  # Uses long polling instead of webhooks
```

**Development mode**: Bot uses `bot.launch()` with polling instead of webhooks

### Test Scripts

- `test-bot.js` - Verify bot connectivity
- `check-plans.js` - Query Firestore plans
- `delete-user.js` - Admin script to remove user data

### Logging

**Winston logger** in `src/utils/logger.js`:
- Logs to `logs/` directory (gitignored)
- Levels: error, warn, info, debug
- Production: info level, Development: debug level

```javascript
logger.info('User subscribed', { userId, planId });
logger.error('Payment failed', { error, transactionId });
```

## Common Tasks

### Adding a New Subscription Plan

1. Update `src/config/plans.js` or add to Firestore `subscriptionPlans` collection
2. Update tier logic in `SantinoBot/src/utils/permissions.js` if new tier type

### Adding a New Handler

1. Create file in `src/bot/handlers/`
2. Export handler function
3. Register in `src/bot/index.js` with `bot.command()` or `bot.action()`
4. Add i18n strings to `src/locales/en.json` and `src/locales/es.json`

### Modifying Group Permissions

Edit `SantinoBot/src/utils/permissions.js` → `getTelegramPermissions(tier)`
Changes apply on next user join or tier update via real-time listener

### Creating Scheduled Broadcasts

Admin uses `/broadcast` command → `src/services/scheduledBroadcastService.js` handles storage and cron execution

## Integration Points

### Telegram Mini App

- Location in `src/webapp/` (React/Vite app)
- API endpoints in `src/api/`
- Accessed via web_app keyboard buttons
- Requires `WEB_APP_URL` env var

### Mistral AI Chat

- Handler: `src/bot/handlers/aiChat.js`
- Commands: `/aichat` (start), `/endchat` (stop)
- Requires `MISTRAL_API_KEY` env var
- Sessions track conversation history

### Sentry Error Tracking

- Initialized in `instrument.js` (application entry point)
- Captures exceptions automatically via bot.catch()
- Requires `SENTRY_DSN` env var

## Anti-Patterns to Avoid

❌ **Don't** store sensitive data in session - use Firestore for persistence
❌ **Don't** use synchronous file operations - all I/O should be async
❌ **Don't** forget error handling in handlers - always try/catch
❌ **Don't** hardcode user IDs or group IDs - use env vars or database
❌ **Don't** expose API keys in logs or responses
❌ **Don't** modify SantinoBot and Main Bot Firestore schemas independently - coordinate changes

## Key Files for Reference

- **Main entry**: `src/bot/index.js`
- **User tier logic**: `SantinoBot/src/utils/permissions.js`
- **Broadcast system**: `src/services/scheduledBroadcastService.js`
- **Session middleware**: `src/bot/middleware/firestoreSession.js`
- **Firebase config**: `src/config/firebase.js`
- **Comprehensive docs**: `SANTINOBOT_ARCHITECTURE_GUIDE.md`

## Quick Reference

**Get user profile**:
```javascript
const userDoc = await db.collection('users').doc(userId).get();
const { tier, email, membershipExpiresAt } = userDoc.data();
```

**Check if admin**:
```javascript
const { isAdmin } = require("../config/admin");
if (!isAdmin(ctx.from.id)) return ctx.reply("Unauthorized");
```

**Send translated message**:
```javascript
await ctx.reply(t(ctx, 'subscription.success', { plan: planName }));
```

**Rate limit check**: Automatically handled by `rateLimitMiddleware()` - 20 requests/minute per user
