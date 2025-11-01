# 🤖 SantinoBot - Complete Implementation Guide

## Overview

**SantinoBot** is an **independent Telegram group management bot** that operates separately from your main PNPtv bot but shares the same Firestore database. It automatically manages user permissions based on subscription tiers in real-time.

---

## What We Have So Far

### ✅ Core Architecture

```
┌──────────────────┐         ┌─────────────────┐
│  Main PNPtv Bot  │         │  SantinoBot     │
│  (Your main bot) │────────→│ (Group manager) │
└──────────────────┘  shares └─────────────────┘
        ↓                           ↓
        └──────────┬────────────────┘
                   ↓
         ┌─────────────────────┐
         │ Firestore Database  │
         │ (users collection)  │
         │ (shared data)       │
         └─────────────────────┘
```

### ✅ What SantinoBot Does

1. **Automatic Permission Management**
   - Detects when users join the group
   - Reads subscription tier from Firestore
   - Applies appropriate permissions instantly
   - Sets up real-time listeners for tier changes

2. **Media Restriction**
   - Free users: Text messages only
   - Premium users: Full media access (photos, videos, documents, voice)
   - Auto-deletes unauthorized media with warning

3. **Real-Time Synchronization**
   - Listens to Firestore changes
   - Auto-updates permissions when user upgrades/downgrades
   - Tracks user activities
   - No polling needed

4. **Data Access & Tracking**
   - Read user profiles (email, bio, location)
   - Read subscription status & expiration dates
   - Find nearby members (based on location)
   - Track search history
   - Log user activities

---

## File Structure

```
SantinoBot/
├── src/
│   ├── bot.js                          # Main entry point
│   ├── config/
│   │   └── firebase.js                 # Firebase initialization
│   ├── handlers/
│   │   ├── groupHandlers.js            # Event handlers (join, media, etc)
│   │   └── dataCommands.js             # Data query commands
│   ├── services/
│   │   ├── userDataService.js          # Core data access layer
│   │   └── syncService.js              # Real-time sync & cleanup
│   └── utils/
│       ├── logger.js                   # Winston logging
│       ├── permissions.js              # Permission management
│       └── userDataSync.js             # Real-time listeners
├── package.json                        # Dependencies
├── .env.example                        # Configuration template
├── Dockerfile                          # Docker deployment
├── QUICKSTART.md                       # Setup guide
└── DEPLOYMENT.md                       # Deployment instructions
```

---

## Key Components Explained

### 1. **bot.js** - Main Entry Point

**What it does:**
- Initializes the Telegraf bot with your token
- Sets up event handlers
- Starts background services
- Handles graceful shutdown

**Key features:**
```javascript
// Validates environment variables
// Sets up middleware for group filtering
// Attaches event listeners:
  - 'new_chat_members'    → handleNewMember
  - 'left_chat_member'    → handleLeftMember
  - 'photo', 'video', etc → handleMediaMessage
  - 'text'                → handleTextMessage
  - Commands (/status, /info, etc)
```

---

### 2. **groupHandlers.js** - Event Processing

#### `handleNewMember(ctx)` - When User Joins
```javascript
1. Gets member info
2. Checks Firestore for user tier
3. Applies Telegram permissions
4. Sets up real-time listener
5. Sends welcome message
6. Logs activity
```

**Workflow:**
```
User joins group
    ↓
SantinoBot detects event
    ↓
Checks Firestore: tier = 'Free' or 'Premium'
    ↓
Calls restrictChatMember() with appropriate permissions
    ↓
Sets listener: when tier changes → auto-update permissions
    ↓
Sends welcome message with tier info
```

#### `handleMediaMessage(ctx)` - Media Restriction
```javascript
1. Gets user tier
2. Checks if message type is allowed
3. If NOT allowed:
   - Deletes message
   - Sends warning to user
   - Auto-deletes warning after 15s
4. Logs action
```

**Example Flow:**
```
Free user sends photo
    ↓
SantinoBot detects photo
    ↓
Checks tier: 'Free' → photo NOT allowed
    ↓
Deletes photo
    ↓
Sends warning: "Only premium members can send media"
    ↓
Warning auto-deletes after 15s
```

#### `handleTextMessage(ctx)` - Text Processing
```javascript
- Logs text messages
- Can be extended for:
  - Spam filtering
  - Content moderation
  - Text analysis
```

#### `handleAdminCommand(ctx)` - Admin Commands
```javascript
/status   → Show user tier & permissions
/refresh  → Manually refresh permissions
```

---

### 3. **userDataService.js** - Data Access Layer

This is the **core service** that reads/writes data from Firestore.

#### Key Methods:

```javascript
// Get complete user profile
const profile = await userDataService.getUserProfile(userId);
// Returns: { username, email, tier, bio, location, etc }

// Get nearby members within 10km
const nearby = await userDataService.getNearbyUsers(userId);
// Returns: array of { userId, username, distance, tier }

// Get subscription status
const sub = await userDataService.getSubscriptionStatus(userId);
// Returns: { tier, isActive, expiresAt }

// Update user profile fields
await userDataService.updateUserProfile(userId, { 
  bio: "New bio",
  lastActive: new Date()
});

// Track nearby search (enforce 3/week limit for free)
const result = await userDataService.trackNearbySearch(userId);
// Returns: { allowed: true/false, searchesUsed, searchLimit }

// Log user activity
await userDataService.logUserActivity(userId, 'joined_group');
```

#### Real-Time Listeners:

```javascript
// Setup listener: fires when user data changes
userDataService.setupUserListener(userId, (userData) => {
  console.log("User data changed!", userData);
  // Tier changed? Auto-grant new permissions
  // Email updated? Update profile
  // etc.
});

// Remove listener when user leaves
userDataService.removeUserListener(userId);
```

---

### 4. **permissions.js** - Permission Management

#### `getUserPermissions(userId)` - Get Current Tier
```javascript
Returns: { tier: 'Free'/'Premium', isActive: boolean }

Checks:
- User exists in Firestore
- Membership not expired
- Updates to Free if expired
```

#### `getTelegramPermissions(tier)` - Telegram Permission Object
```javascript
Free users:
- ✅ can_send_messages
- ❌ can_send_photos, can_send_videos, etc.

Premium users:
- ✅ can_send_messages
- ✅ can_send_photos, can_send_videos, audio, etc.
- ✅ can_send_polls, can_send_other_messages
```

#### `applyUserPermissions(ctx, userId, tier)` - Set Permissions
```javascript
Calls: ctx.restrictChatMember(userId, permissions)
Result: User's message abilities update in group
```

#### `isMessageTypeAllowed(tier, messageType)` - Check Message
```javascript
messageType: 'photo', 'video', 'document', 'voice', etc.
Returns: true/false
```

---

### 5. **syncService.js** - Background Tasks

#### `startPermissionSync(bot)` - Hourly Check
```javascript
Runs: Every hour (cron: 0 * * * *)

Checks:
- Find users with expired membershipExpiresAt
- Downgrade them to Free tier
- Update Firestore record
- Log changes

Example:
User had: tier = 'Premium', membershipExpiresAt = Oct 30
Current date: Oct 31
Action: tier → 'Free', membershipIsPremium → false
```

#### `startCleanupTasks()` - Daily Cleanup
```javascript
Runs: Daily at 2 AM (cron: 0 2 * * *)

Cleans:
- Old search records (>30 days)
- Old log entries
- Expired temporary data
```

---

### 6. **firebase.js** - Database Connection

```javascript
// Initializes Firebase Admin SDK
// Uses environment variables:
  - FIREBASE_PROJECT_ID
  - FIREBASE_PRIVATE_KEY
  - FIREBASE_CLIENT_EMAIL
  - FIREBASE_CLIENT_ID

// Returns: admin.firestore() instance
// Used by all services to read/write data
```

---

### 7. **dataCommands.js** - Query Commands

Available admin commands:

```
/userprofile [id]    → Get user's full profile
/nearby [id]         → List nearby members
/subscription [id]   → Check subscription status
/tracksearch [id]    → Track and log a search
/updateprofile       → Update profile fields
/datainfo            → Show data services info
```

---

## Environment Variables (.env)

```bash
# Telegram Bot
BOT_TOKEN=your_bot_token_from_BotFather

# Firebase (same as main bot)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=service_account@project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id

# Group Configuration
GROUP_ID=-1001234567890        # Optional: limit to specific group
FREE_CHANNEL_ID=-1003159260496 # Channel for free users

# Logging
LOG_LEVEL=info

# Production (optional)
NODE_ENV=production
WEBHOOK_URL=https://your-domain.com
PORT=3000
```

---

## Data Flow Examples

### Example 1: User Joins Group

```
1. New user joins group
   ↓
2. handleNewMember() triggered
   ↓
3. Bot checks Firestore: users/{userId}
   ↓
4. Reads tier: 'Free'
   ↓
5. Calls restrictChatMember() with Free permissions
   ↓
6. Sets real-time listener on user document
   ↓
7. Sends welcome message
   ↓
Result: User can only send text messages
```

### Example 2: User Tries to Send Photo

```
Free user sends photo
   ↓
handleMediaMessage() triggered
   ↓
Gets tier from Firestore: 'Free'
   ↓
Checks: isMessageTypeAllowed('Free', 'photo') → false
   ↓
Bot deletes message
   ↓
Bot sends warning: "Only premium members can send media"
   ↓
Warning auto-deletes after 15 seconds
```

### Example 3: User Upgrades (in Main Bot)

```
User pays in main bot
   ↓
Main bot updates Firestore: tier = 'Premium'
   ↓
SantinoBot real-time listener fires
   ↓
setupUserListener() callback executes
   ↓
applyUserPermissions() called with 'Premium' tier
   ↓
restrictChatMember() updates permissions
   ↓
User can now send photos/videos in group
   ↓
Result: Instant permission update, no delay
```

### Example 4: Membership Expires

```
Scheduled sync runs (every hour)
   ↓
Finds users: membershipExpiresAt <= now, tier != 'Free'
   ↓
For each expired user:
   - Updates tier to 'Free'
   - Updates membershipIsPremium to false
   - Records previousTier for logging
   ↓
Next time user sends media:
   - handleMediaMessage() checks tier
   - tier is now 'Free'
   - Photo deleted, warning sent
```

---

## Firestore Data Structure

The bot reads/writes to these collections:

```
users/
├── {userId}/
│   ├── username: string
│   ├── email: string
│   ├── tier: 'Free' | 'trial-week' | 'pnp-member' | 'crystal-member' | 'diamond-member'
│   ├── membershipExpiresAt: timestamp
│   ├── membershipIsPremium: boolean
│   ├── bio: string
│   ├── location: { latitude, longitude }
│   ├── lastActive: timestamp
│   ├── createdAt: timestamp
│   ├── searches: array of timestamps (last 7 days)
│   └── activities: array of activity logs
```

---

## Setup & Deployment

### Local Testing

```bash
# 1. Copy .env
cp .env.example .env

# 2. Edit .env with:
#    - BOT_TOKEN (from @BotFather)
#    - Firebase credentials (same as main bot)
#    - GROUP_ID (your test group)

# 3. Install dependencies
npm install

# 4. Run with nodemon (auto-restart on changes)
npm run dev

# 5. Test in group:
#    - Join with free account → can only send text
#    - Send photo → gets deleted with warning
#    - Try /status command
```

### Production Deployment

Supports multiple platforms:

```bash
# Railway (recommended)
# See DEPLOYMENT.md

# Heroku
# See DEPLOYMENT.md

# VPS with PM2
pm2 start src/bot.js --name "santino-group-bot"
pm2 save
pm2 startup

# Docker
docker build -t santino-bot .
docker run --env-file .env santino-bot

# Google Cloud Run
gcloud run deploy --image gcr.io/PROJECT-ID/santino-bot
```

---

## Key Features Summary

| Feature | Status | Implementation |
|---------|--------|-----------------|
| Auto permission management | ✅ Done | groupHandlers.js |
| Media restriction | ✅ Done | permissions.js |
| Real-time sync | ✅ Done | userDataSync.js |
| Expire membership check | ✅ Done | syncService.js (hourly) |
| Nearby members | ✅ Done | userDataService.js |
| Search tracking | ✅ Done | userDataService.js |
| Profile updates | ✅ Done | userDataService.js |
| Activity logging | ✅ Done | userDataService.js |
| Admin commands | ✅ Done | dataCommands.js |
| Webhook support | ✅ Done | bot.js (production) |
| Error handling | ✅ Done | Global catch handlers |
| Logging | ✅ Done | Winston logger |

---

## Next Steps to Implement

If you need to extend SantinoBot:

1. **Add Text Filtering**
   - Modify `handleTextMessage()` to check for spam/profanity
   - Use library like `bad-words`

2. **Add Notifications**
   - When user upgrades, send celebration message
   - When membership expires soon, send reminder

3. **Add Bot Commands**
   - `/stats` - Show group statistics
   - `/members` - List all group members
   - `/logs` - Show recent activity

4. **Add Welcome Customization**
   - Different messages for different tiers
   - Custom buttons/inline keyboards

5. **Add Advanced Features**
   - Message pinning for premium users
   - Exclusive channels for premium
   - Referral tracking
   - Usage analytics

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not responding | Check BOT_TOKEN, verify bot is admin in group |
| Permissions not applying | Ensure bot has "Restrict members" permission |
| Firebase errors | Check private key formatting (\n characters), verify credentials |
| Real-time updates not working | Check Firestore rules allow read/write, verify Firebase connection |
| Messages not deleted | Check bot has "Delete messages" permission |

---

## Security Notes

- ✅ Firebase credentials safely loaded from environment
- ✅ Bot operates anonymously (no admin reveal)
- ✅ No user data stored locally
- ✅ All data read from shared Firestore
- ✅ Permissions enforced at Telegram level
- ✅ Automatic cleanup of logs (30-day retention)

---

## Performance Considerations

- Real-time listeners only on active group members
- Cleanup tasks run at off-peak hours (2 AM)
- Batch operations for multiple user updates
- Efficient distance calculation for nearby members
- Webhook support for production (faster than polling)

---

**SantinoBot is production-ready and fully independent! 🚀**

It can run on a separate server/platform while maintaining real-time sync with your main bot's data through Firestore.
