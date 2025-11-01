# 🤖 SantinoBot - Independent Operation Guide

## Overview

SantinoBot operates **completely independently** while staying synchronized with your main PNPtv bot's Firestore database. It pulls data, updates profiles, and manages permissions automatically.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SantinoBot (Independent)             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Real-time Data Sync Layer                       │  │
│  │  • Listens to user data changes                  │  │
│  │  • Auto-updates permissions when tier changes   │  │
│  │  • Tracks nearby searches & activities           │  │
│  └──────────────────────────────────────────────────┘  │
│                           ↕                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Shared Firestore Database                       │  │
│  │  ├─ users/{userId}                              │  │
│  │  ├─ profiles/                                   │  │
│  │  ├─ nearby/locations                            │  │
│  │  └─ activities/                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                           ↕                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Main PNPtv Bot                                  │  │
│  │  (Still running independently)                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **Real-Time Data Synchronization**
- Listens to Firestore for user data changes
- Automatically updates group permissions when subscription changes
- No polling needed - instant updates

### 2. **Independent Operation**
- Runs on its own process/server
- Can be deployed separately
- Doesn't depend on main bot being online
- Handles group management autonomously

### 3. **Access to Main Bot Data**
Can read and update:
- ✅ User profiles (bio, photos, location)
- ✅ Subscription tier & expiration
- ✅ Nearby members data
- ✅ User activity logs
- ✅ Email addresses
- ✅ Search history

### 4. **Automatic Permission Management**
```javascript
// When a free user joins
→ Automatically restricted to text only

// When free user upgrades to trial-week / pnp-member / crystal-member / diamond-member
→ Instantly gets photo/video permissions

// When membership expires
→ Automatically downgraded to free tier
```

## Data Flow Examples

### Example 1: User Upgrades to Premium

```
1. User pays in main bot
2. Main bot updates Firestore: tier = "pnp-member"
3. SantinoBot listener detects change
4. Automatically grants media permissions in group
5. User can now send photos/videos
```

### Example 2: User Nearby Search

```
1. User wants to see nearby members in group
2. SantinoBot calls userDataService.getNearbyUsers()
3. Reads user location from Firestore
4. Calculates distance to all other users
5. Returns top 3 for free users, unlimited for premium
6. Tracks search count (3 per week for free)
```

### Example 3: Profile Update

```
1. User updates bio in main bot
2. Main bot saves to Firestore
3. SantinoBot listener receives update
4. Can reflect in group messages/descriptions
5. Keeps everything synchronized
```

## Services Overview

### UserDataService
**File**: `src/services/userDataService.js`

Key functions:
- `getUserProfile(userId)` - Get complete user data
- `getNearbyUsers(userId)` - Get nearby members
- `updateUserProfile(userId, updates)` - Update profile
- `logUserActivity(userId, action)` - Track activities
- `trackNearbySearch(userId)` - Enforce search limits
- `getSubscriptionStatus(userId)` - Check membership

### UserDataSync
**File**: `src/utils/userDataSync.js`

Handles real-time listeners:
- `startListening(userId, callback)` - Start real-time updates
- `stopListening(userId)` - Stop listening
- `stopAllListeners()` - Cleanup all

## Usage Examples

### In Group Handlers

```javascript
// Get user's subscription status
const subscription = await userDataService.getSubscriptionStatus(userId);
console.log(subscription);
// Output: { tier: 'Silver', isActive: true, expiresAt: Date, ... }

// Get nearby members
const nearby = await userDataService.getNearbyUsers(userId);
console.log(nearby);
// Output: [{ userId, username, distance, tier, ... }, ...]

// Update user's bio
await userDataService.updateUserProfile(userId, {
  bio: 'Updated bio from group'
});

// Track activity
await userDataService.logUserActivity(userId, 'sent_message');

// Setup real-time listener for auto-updates
userDataService.setupUserListener(userId, (userData) => {
  console.log('User data changed:', userData);
  // Update permissions, send notification, etc.
});
```

### Permission Sync Example

```javascript
// When subscription changes in main bot
// SantinoBot automatically detects and updates:

// 1. Real-time listener fires
userDataService.setupUserListener(userId, async (userData) => {
  const newTier = userData.tier;
  
  // 2. Apply new permissions
  await applyUserPermissions(ctx, userId, newTier);
  
  // 3. Notify user
  await ctx.reply(`✅ Your permissions updated to ${newTier}`);
});
```

## Database Structure

The bot reads/writes to this Firestore structure:

```firestore
users/{userId}
  ├── tier: "Free" | "Silver" | "Golden"
  ├── email: "user@email.com"
  ├── username: "@username"
  ├── firstName: "John"
  ├── lastName: "Doe"
  ├── membershipExpiresAt: Timestamp
  ├── location: {
  │   latitude: 40.7128,
  │   longitude: -74.0060,
  │   updatedAt: Timestamp
  │ }
  ├── bio: "My bio"
  ├── photoFileId: "AgACAgIAAxkBAAI..."
  ├── searches: [Timestamp, Timestamp, ...]
  ├── lastActive: Timestamp
  ├── createdAt: Timestamp
  ├── groupPermissions: {
  │   canSendMedia: true,
  │   canSendMessages: true,
  │   lastPermissionUpdate: Timestamp
  │ }
  └── groupActivityLog: {
      lastMessageTime: Timestamp,
      action: "sent_message"
    }
```

## Independence Checklist

✅ **Runs independently** - Own process, separate from main bot
✅ **Syncs automatically** - Real-time Firestore listeners
✅ **Handles updates** - Auto-applies permission changes
✅ **Reads full data** - Access to all user info
✅ **Writes updates** - Can modify profiles and logs
✅ **Tracks usage** - Monitors searches and activities
✅ **Graceful shutdown** - Cleans up listeners on exit
✅ **Error resilient** - Continues if main bot goes down

## Deployment

Can be deployed independently:
- **Same server** - Different process
- **Different server** - Just needs Firebase credentials
- **Cloud** - Railway, Heroku, Cloud Run, etc.

Each instance needs:
1. `.env` file with Firebase credentials (same as main bot)
2. `BOT_TOKEN` for the group bot
3. Network access to Firebase

## Monitoring

Check logs for:
- User permission updates
- Data sync status
- Activity tracking
- Error conditions

```bash
# View real-time logs
tail -f logs/combined.log

# Check for errors
grep ERROR logs/error.log
```

## Future Enhancements

- [ ] Webhook integration with main bot for instant updates
- [ ] Activity dashboard for group statistics
- [ ] Custom group rules (word filters, spam detection)
- [ ] Media moderation (auto-approve/reject)
- [ ] User reputation system
- [ ] Group-specific settings per tier

---

**Result**: SantinoBot operates completely independently while maintaining perfect synchronization with your main bot's data! 🚀