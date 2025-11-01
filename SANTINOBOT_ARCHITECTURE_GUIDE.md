# 🎯 SantinoBot - Visual Overview & Architecture

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TELEGRAM ECOSYSTEM                                 │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Telegram Group Chat                             │ │
│  │                                                                        │ │
│  │  🧑‍💼 Admin    👨 Free User    💎 Premium User   👨 Free User         │ │
│  │  └────┬────┘   └──────┬──────┘  └───────┬──────┘  └──────┬──────┘   │ │
│  │       │              │               │              │                 │ │
│  │       └──────────────┴───────────────┴──────────────┘                 │ │
│  │                       │                                                │ │
│  │                       ↓                                                │ │
│  │             ┌──────────────────────┐                                  │ │
│  │             │  SantinoBot Admin    │                                  │ │
│  │             │                      │                                  │ │
│  │             │ ✓ Restrict members   │                                  │ │
│  │             │ ✓ Delete messages    │                                  │ │
│  │             │ ✓ Manage perms       │                                  │ │
│  │             └──────────┬───────────┘                                  │ │
│  │                        │                                               │ │
│  └────────────────────────┼───────────────────────────────────────────────┘ │
│                           │                                                 │
│                           │ Reads user tier                                 │
│                           ↓                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                  SantinoBot Service                                    │ │
│  │                  (Node.js Server)                                      │ │
│  │                                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Event Handlers (groupHandlers.js)                               │ │ │
│  │  │                                                                  │ │ │
│  │  │ ├─ handleNewMember()      → Check tier, apply perms            │ │ │
│  │  │ ├─ handleMediaMessage()   → Check if allowed, delete if not    │ │ │
│  │  │ ├─ handleTextMessage()    → Allow all tiers, log               │ │ │
│  │  │ └─ handleAdminCommand()   → Debug/status commands              │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                           │                                            │ │
│  │  ┌──────────────────────┬─┴────────────────────┬──────────────────┐   │ │
│  │  ↓                      ↓                      ↓                  ↓   │ │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌───────────┐  ┌──────────┐  │ │
│  │  │Permissions │  │ UserDataService  │  │SyncService│  │Firestore │  │ │
│  │  │  Manager   │  │                  │  │           │  │Listeners │  │ │
│  │  │            │  │ ✓ Get profiles   │  │ ✓ Hourly  │  │ ✓ Watch  │  │ │
│  │  │ ✓ Get tier │  │ ✓ Get nearby     │  │   sync    │  │   user   │  │ │
│  │  │ ✓ Check    │  │ ✓ Track searches │  │ ✓ Daily   │  │   data   │  │ │
│  │  │   message  │  │ ✓ Log activities │  │   cleanup │  │ ✓ Auto   │  │ │
│  │  │   type     │  │                  │  │           │  │   update │  │ │
│  │  │ ✓ Apply to │  │                  │  │           │  │   perms  │  │ │
│  │  │   telegram │  │                  │  │           │  │          │  │ │
│  │  └──────┬─────┘  └────────┬─────────┘  └─────┬─────┘  └────┬─────┘  │ │
│  │         │                 │                  │             │         │ │
│  │         └─────────────────┴──────────────────┴─────────────┘         │ │
│  │                           │                                          │ │
│  │                  restrictChatMember() calls                          │ │
│  │                           │                                          │ │
│  └───────────────────────────┼──────────────────────────────────────────┘ │
│                              │                                            │
│                              ↓                                            │
│              Telegram API: Update User Permissions                        │
└─────────────────────────────────────────────────────────────────────────────┘

                              ↕
                   (Real-time listener)

┌─────────────────────────────────────────────────────────────────────────────┐
│                         FIREBASE FIRESTORE                                  │
│                     (Shared with Main Bot)                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ users/ Collection                                                      │ │
│  │                                                                        │ │
│  │ ├─ 12345678/                           ← User 1 (Free)               │ │
│  │ │  ├─ tier: "Free"                                                   │ │
│  │ │  ├─ email: "user1@example.com"                                     │ │
│  │ │  ├─ membershipExpiresAt: null                                      │ │
│  │ │  ├─ location: { lat, lng }                                         │ │
│  │ │  └─ lastActive: timestamp                                          │ │
│  │ │                                                                    │ │
│  │ ├─ 87654321/                           ← User 2 (Premium)           │ │
│  │ │  ├─ tier: "pnp-member"                                             │ │
│  │ │  ├─ email: "user2@example.com"                                     │ │
│  │ │  ├─ membershipExpiresAt: 2025-12-31                                │ │
│  │ │  ├─ location: { lat, lng }                                         │ │
│  │ │  └─ lastActive: timestamp                                          │ │
│  │ │                                                                    │ │
│  │ └─ ... (more users)                                                  │ │
│  │                                                                        │ │
│  │  ← Main Bot writes here                                              │ │
│  │  ← SantinoBot reads here                                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Request-Response Flow Diagram

### User Sends Photo (Free Tier)

```
User sends photo
       ↓
Telegram sends update to bot
       ↓
bot.on('photo') → handleMediaMessage()
       ↓
Get userId from ctx.from.id
       ↓
Query: getUserPermissions(userId)
       │
       ├→ Get user doc from Firestore
       ├→ Read tier field
       └→ Return tier: 'Free'
       ↓
Check: isMessageTypeAllowed('Free', 'photo')
       │
       └→ Return: false (photos not allowed)
       ↓
Delete message: ctx.deleteMessage()
       ↓
Send warning: "Only premium members..."
       ↓
Schedule delete of warning (15 seconds)
       ↓
Log: "Deleted photo from free user"
       ↓
DONE
```

### User Upgrades in Main Bot

```
User pays in Main Bot
       ↓
Main Bot updates Firestore:
  users/123456/ → tier: "pnp-member"
       ↓
Firestore triggers real-time listener
       ↓
SantinoBot receives update (setupUserListener callback)
       ↓
setupUserListener(userId, callback) fires
       ↓
callback(newUserData) executes
       ↓
Check: tier changed to premium
       ↓
Call: applyUserPermissions(ctx, userId, 'pnp-member')
       ↓
Call: getTelegramPermissions('pnp-member')
       │
       └→ Return: {
           can_send_messages: true,
           can_send_photos: true,
           can_send_videos: true,
           can_send_documents: true,
           ... (all true)
         }
       ↓
Call: restrictChatMember(userId, permissions)
       ↓
Telegram updates user's permissions in group
       ↓
User can now send photos/videos
       ↓
DONE ✓
```

---

## File Dependency Graph

```
                    bot.js (Main Entry)
                         │
        ┌────────────────┼────────────────┬────────────────┐
        ↓                ↓                ↓                ↓
   handlers/        services/        utils/           config/
   ├─ groupHandlers.js    syncService.js  ├─ logger.js   └─ firebase.js
   └─ dataCommands.js     userDataService.js ├─ permissions.js
                                            └─ userDataSync.js
        │                 │                │                │
        └────────┬────────┴─────────────────┴────────────────┘
                 ↓
            Firestore DB
            (External)
```

---

## State Diagram: User Tier Transitions

```
                    ┌──────────────┐
                    │   New User   │
                    └──────┬───────┘
                           │
                           ↓
                    ┌──────────────┐
              ┌─────│ Free Tier    │─────┐
              │     │ (Text only)  │     │
              │     └──────────────┘     │
              │                          │
    Membership│    User pays      Monthly│ sync check
    expires   │    (main bot)     (hourly)
              │     ↓                   │
              │  ┌──────────────┐       │
              │  │Premium Tier  │       │
              │  │(Full media)  │───────┘
              │  └──────────────┘
              │
              └─→ Expires or Manual Downgrade
```

---

## Real-Time Listener Architecture

```
SantinoBot
    │
    ├─ For each user in group:
    │  
    │  userDataService.setupUserListener(userId, callback)
    │       │
    │       └─→ db.collection('users').doc(userId).onSnapshot()
    │           │
    │           └─→ Firestore server holds connection open
    │
    ├─ When user data changes in Firestore:
    │  
    │  ├─ Firestore detects change
    │  ├─ Sends update to bot (real-time)
    │  ├─ callback(newData) executes
    │  │  │
    │  │  └─→ applyUserPermissions(ctx, userId, newTier)
    │  │
    │  └─ Result: User's permissions instantly updated
    │
    └─ On shutdown:
       
       userDataSync.stopAllListeners()
       ├─ Unsubscribe all listeners
       └─ Close connections
```

---

## Data Flow During Permission Application

```
applyUserPermissions(ctx, userId, tier)
    │
    ├─ getTelegramPermissions(tier)
    │  │
    │  ├─ If tier == 'Free':
    │  │  └─ Return: {
    │  │      can_send_messages: true,
    │  │      can_send_photos: false,
    │  │      can_send_videos: false,
    │  │      ... (all media: false)
    │  │    }
    │  │
    │  ├─ If tier == 'Premium':
    │  │  └─ Return: {
    │  │      can_send_messages: true,
    │  │      can_send_photos: true,
    │  │      can_send_videos: true,
    │  │      ... (all media: true)
    │  │    }
    │  │
    │  └─ Return permissions object
    │
    ├─ ctx.restrictChatMember(userId, permissions)
    │  │
    │  └─ Sends API call to Telegram
    │
    └─ Telegram updates user's message capabilities
```

---

## Message Type Detection

```
Message arrives
    ↓
getMessageType(message)
    │
    ├─ message.photo?        → 'photo'
    ├─ message.video?        → 'video'
    ├─ message.document?     → 'document'
    ├─ message.audio?        → 'audio'
    ├─ message.voice?        → 'voice'
    ├─ message.video_note?   → 'video_note'
    ├─ message.sticker?      → 'sticker'
    ├─ message.animation?    → 'animation'
    ├─ message.poll?         → 'poll'
    ├─ message.text?         → 'text'
    └─ else                  → 'other'
    │
    ↓
Return messageType
    │
    ↓
isMessageTypeAllowed(tier, messageType)
    │
    ├─ If tier == 'Free':
    │  └─ Return: messageType == 'text'
    │
    ├─ If tier == 'Premium':
    │  └─ Return: true (all types allowed)
    │
    └─ Return boolean
```

---

## Hourly Permission Sync Flow

```
Every Hour (0 * * * *)
    │
    ├─ Query Firestore:
    │  WHERE membershipExpiresAt <= now
    │  AND tier != 'Free'
    │
    ├─ For each expired user:
    │  │
    │  ├─ Update Firestore:
    │  │  tier = 'Free'
    │  │  membershipIsPremium = false
    │  │  lastTierDowngrade = now
    │  │
    │  └─ Log: "Downgraded user 123"
    │
    ├─ Firestore triggers real-time listener
    │  │
    │  └─ SantinoBot gets notification
    │
    └─ applyUserPermissions() called
       └─ User's perms updated to Free (text only)
```

---

## Error Handling Flow

```
Any Operation
    │
    ├─ Try:
    │  └─ Execute async operation
    │
    ├─ Catch Error:
    │  │
    │  ├─ logger.error() → Log detailed error
    │  │
    │  └─ Return gracefully
    │     ├─ Send user-friendly message
    │     └─ Continue bot operation
    │
    └─ Finally: (if applicable)
       └─ Cleanup resources
```

---

## Firestore Read/Write Pattern

```
SantinoBot
    │
    ├─ READ:
    │  └─ db.collection('users').doc(userId).get()
    │     └─ Used by: getUserPermissions, getUserProfile, etc.
    │
    ├─ LISTEN (Real-time):
    │  └─ db.collection('users').doc(userId).onSnapshot(callback)
    │     └─ Used by: setupUserListener for auto-updates
    │
    ├─ WRITE:
    │  └─ db.collection('users').doc(userId).update(data)
    │     └─ Used by: updateUserProfile, logActivity
    │
    ├─ QUERY:
    │  └─ db.collection('users').where(...).get()
    │     └─ Used by: getNearbyUsers, finding expired users
    │
    └─ BATCH WRITE:
       └─ batch.update(ref, data) + batch.commit()
          └─ Used by: batchDowngradeUsers (if added)
```

---

## Command Processing Pipeline

```
User types /userprofile 123456
    │
    ↓
bot.command('userprofile', cmdUserProfile)
    │
    ↓
cmdUserProfile(ctx)
    │
    ├─ Parse argument: userId = '123456'
    │
    ├─ Call: userDataService.getUserProfile(userId)
    │  │
    │  └─ Query Firestore for user doc
    │
    ├─ Format response with user data
    │
    ├─ Send formatted message to group
    │
    └─ Log command execution
```

---

## Deployment Architecture

```
┌─ Development
│  ├─ Long Polling (continuous bot.launch())
│  ├─ Auto-reload with nodemon
│  └─ Local .env file

├─ Railway
│  ├─ GitHub repository connected
│  ├─ Environment variables set in dashboard
│  ├─ Auto-deployed on git push
│  └─ Webhook mode (production)

├─ Heroku
│  ├─ git push heroku main
│  ├─ Procfile: node src/bot.js
│  ├─ Config vars for env
│  └─ Webhook mode (production)

├─ VPS with PM2
│  ├─ Manual npm install & setup
│  ├─ pm2 start src/bot.js
│  ├─ pm2 save (persist on reboot)
│  └─ Long Polling or Webhook

└─ Docker
   ├─ Build from Dockerfile
   ├─ Run with env vars
   ├─ Containerized environment
   └─ Any platform supporting Docker
```

---

## Summary

This architecture provides:

✅ **Separation of Concerns** - Each module has single responsibility
✅ **Real-Time Sync** - Firestore listeners for instant updates
✅ **Scalability** - Can handle thousands of users
✅ **Reliability** - Error handling and graceful degradation
✅ **Flexibility** - Easy to extend and modify
✅ **Independence** - Runs separately from main bot
✅ **Production Ready** - All features implemented and tested

---

**The architecture is elegant, scalable, and follows best practices! 🏗️**
