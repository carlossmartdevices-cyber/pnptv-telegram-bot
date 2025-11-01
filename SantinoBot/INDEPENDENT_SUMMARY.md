# SantinoBot - Independent Operation Summary

## What I've Built

A completely **independent Telegram group management bot** that syncs with your main PNPtv bot's Firestore database in real-time.

## Key Capabilities

### ✅ Operates Independently
- Runs as a separate process/server
- Doesn't depend on main bot being online
- Can be deployed anywhere (Railway, VPS, Cloud Run, etc.)
- Handles group management autonomously

### ✅ Real-Time Data Sync
- Listens to Firestore changes
- Auto-updates permissions when user tier changes
- Tracks activities and updates in real-time
- Zero-lag synchronization

### ✅ Full Data Access
- Reads user profiles, emails, locations
- Accesses subscription status & expiration
- Reads nearby members data
- Tracks search history and usage

### ✅ Can Update Data
- Update user bios and profiles
- Log group activities
- Track nearby searches
- Record user interactions

### ✅ Auto-Manages Permissions
```
User upgrades to Premium
    ↓
Main bot updates Firestore
    ↓
SantinoBot detects change (real-time)
    ↓
Automatically grants media permissions
    ↓
User can send photos/videos
```

## New Services

### 1. **UserDataService** (`src/services/userDataService.js`)
Core data access layer:
```javascript
// Get complete user profile
const profile = await userDataService.getUserProfile(userId);

// Get nearby members
const nearby = await userDataService.getNearbyUsers(userId);

// Update profile
await userDataService.updateUserProfile(userId, { bio: "..." });

// Log activity
await userDataService.logUserActivity(userId, "joined_group");

// Track searches (enforce 3/week limit for free)
const result = await userDataService.trackNearbySearch(userId);

// Get subscription status
const sub = await userDataService.getSubscriptionStatus(userId);
```

### 2. **UserDataSync** (`src/utils/userDataSync.js`)
Real-time listener system:
```javascript
// Setup auto-update when user data changes
userDataService.setupUserListener(userId, (userData) => {
  console.log("User data changed!", userData);
  // Auto-grant new permissions, send notifications, etc.
});

// Stop listening
userDataService.removeUserListener(userId);
```

### 3. **Data Commands** (`src/handlers/dataCommands.js`)
New commands available:
- `/userprofile [id]` - Get user profile
- `/nearby [id]` - Get nearby members  
- `/subscription [id]` - Check subscription
- `/tracksearch [id]` - Track a search
- `/updateprofile <field> <value>` - Update profile
- `/datainfo` - Data services info

## Data Flow Architecture

```
┌─────────────────┐
│  Main PNPtv Bot │
│  (Your existing │
│   bot)          │
└────────┬────────┘
         │
         │ Writes data
         ↓
┌─────────────────────────────────┐
│    Shared Firestore Database    │
│  ├─ users/{userId}              │
│  ├─ profiles/                   │
│  ├─ nearby/locations            │
│  └─ activities/                 │
└────────┬────────────────────────┘
         │
         │ Real-time listener
         ↓
┌─────────────────────────────────┐
│     SantinoBot                  │
│  (Completely Independent)       │
│  ├─ Manages group permissions  │
│  ├─ Handles media restrictions │
│  ├─ Tracks user activities     │
│  └─ Enforces usage limits      │
└─────────────────────────────────┘
```

## How It Works

### When User Joins Group
```
1. User joins
2. SantinoBot checks tier from Firestore
3. Applies appropriate permissions
4. Sets up real-time listener
5. When tier changes → auto-updates permissions
```

### When User Wants Nearby Members
```
1. User command or automatic check
2. SantinoBot reads user's location from Firestore
3. Calculates distance to all users with locations
4. Returns top 3 for free users, unlimited for premium
5. Tracks the search (3 per week limit for free)
```

### When User Upgrades Premium
```
1. Payment in main bot
2. Main bot updates Firestore: tier = "Silver"
3. SantinoBot real-time listener fires
4. Automatically calls applyUserPermissions()
5. User gets photo/video access instantly
```

## Usage Example in Your Code

```javascript
// In any handler:

// Get user's subscription
const subscription = await userDataService.getSubscriptionStatus(userId);
if (subscription.tier === 'Premium') {
  // Do premium-only action
}

// Find nearby members
const nearby = await userDataService.getNearbyUsers(userId);
nearby.forEach(user => {
  console.log(`${user.username} is ${user.distance}km away`);
});

// Setup auto-update when tier changes
userDataService.setupUserListener(userId, async (userData) => {
  if (userData.tier === 'Silver') {
    // Grant silver permissions
    await applyUserPermissions(ctx, userId, 'Silver');
  }
});

// Track and enforce search limit
const searchResult = await userDataService.trackNearbySearch(userId);
if (!searchResult.allowed) {
  await ctx.reply('You\'ve reached your search limit');
}
```

## Independence Benefits

1. **No Coupling** - Main bot can be updated/restarted without affecting group bot
2. **Scalability** - Can run multiple instances for different groups
3. **Flexibility** - Deploy on different servers/clouds
4. **Reliability** - Continues working even if main bot has issues
5. **Real-Time** - Firestore listeners ensure instant updates
6. **Data Rich** - Full access to all user information

## Files Added/Modified

**New Files:**
- ✅ `src/services/userDataService.js` - Main data access
- ✅ `src/utils/userDataSync.js` - Real-time listeners
- ✅ `src/handlers/dataCommands.js` - Data query commands
- ✅ `INDEPENDENT_OPERATION.md` - Detailed guide

**Modified Files:**
- ✅ `src/bot.js` - Added data command handlers
- ✅ `src/handlers/groupHandlers.js` - Enhanced with user data

## Next Steps

1. **Deploy SantinoBot** separately from main bot
2. **Configure `.env`** with Firebase credentials (same as main bot)
3. **Add to group** as administrator
4. **Test commands** - `/userprofile`, `/nearby`, etc.
5. **Monitor** - Check logs for real-time sync

## Deployment Options

```bash
# Same server, different process
npm run dev

# Docker container
docker build -t santino-bot .
docker run --env-file .env santino-bot

# Cloud deployment
# See DEPLOYMENT.md for Railway, Heroku, Cloud Run
```

---

**Result**: SantinoBot is now a fully independent bot that syncs with your main bot's data in real-time! 🚀

The bot can access everything, update profiles, track activities, and automatically manage permissions—all without depending on the main bot being online. It's a complete group management solution that scales independently!