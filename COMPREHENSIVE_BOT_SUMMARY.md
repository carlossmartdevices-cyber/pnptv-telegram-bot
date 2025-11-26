# PNPtv Bot - Comprehensive Command & Architecture Summary

## Overview

The PNPtv bot is a feature-rich Telegram bot built with **Telegraf.js** that manages an 18+ adult community platform. It integrates location-based discovery, cryptocurrency payments (USDC via Daimo Pay), AI customer support (Mistral), and comprehensive admin tools.

**Statistics:**
- 17 slash commands
- 60+ callback actions
- 80+ handler functions
- 14 handler files
- 5 main feature areas

---

## Quick Command Reference

### Public Commands (17 Total)

| Command | Description | File |
|---------|-------------|------|
| `/start` | Onboarding & main menu | handlers/start.js |
| `/help` | Help information | handlers/help.js |
| `/profile` | View/edit profile | handlers/profile.js |
| `/map` | Location-based user search (5/10/25/50km) | handlers/map.js |
| `/nearby` | Nearby users mini app (3 searches/week free) | handlers/nearby.js |
| `/live` | Live streams feature (coming soon) | handlers/live.js |
| `/app` | Open PNPtv web app | handlers/app.js |
| `/subscribe` | View subscription plans | handlers/subscribe.js |
| `/aichat` | Start AI support chat | handlers/aiChat.js |
| `/endchat` | End AI chat session | handlers/aiChat.js |
| `/library` | Music library (premium only) | handlers/community.js |
| `/toptracks` | Show top played tracks | handlers/community.js |
| `/schedulecall` | Schedule video call (coming soon) | handlers/community.js |
| `/schedulestream` | Schedule live stream (coming soon) | handlers/community.js |
| `/upcoming` | Upcoming events | handlers/community.js |
| `/admin` | Admin panel (admin only) | handlers/admin.js |
| `/plans` | Plan management (admin only) | handlers/admin/planManager.js |

### Admin Commands (40+ Callback Actions)

**Stats & Users:**
- `admin_stats` - View bot statistics
- `admin_list_all` - List all users with pagination
- `admin_search_user` - Search for specific user
- `admin_list_premium` - Show premium subscribers
- `admin_list_new` - Show new users (last 7 days)

**User Management:**
- `admin_edit_tier_[userId]` - Change subscription tier
- `admin_message_[userId]` - Send direct message
- `admin_ban_[userId]` - Ban user
- `admin_unban_[userId]` - Unban user
- `admin_change_tier_[userId]` - Modify subscription
- `admin_modify_expiration_[userId]` - Change expiration date
- `admin_quick_activate_[userId]_[tier]_[days]` - Quick activation

**Broadcasting:**
- `bcast_select_audience` - Choose audience
- `bcast_filter_*` - Apply filters (subscribers/free/all)
- `bcast_schedule_confirm` - Schedule broadcast
- `bcast_send_now` - Send immediately

**Membership Management:**
- `admin_activate_membership` - Activate membership
- `admin_update_member_userid` - Update member
- `admin_extend_userid` - Extend membership

**Plan Management:**
- `admin_plan_edit_[field]_[planName]` - Edit plan

---

## Feature Areas

### 1. User Management & Profile
**File:** `handlers/profile.js`

Functions:
- `viewProfile()` - Display user profile
- `handleEditPhoto()` - Photo upload flow
- `handlePhotoMessage()` - Save photo
- `showSettings()` - User settings
- `toggleAdsOptOut()` - Toggle ads

Features:
- Photo profile uploads
- Bio editing
- Location sharing (GPS)
- Ad preferences
- Settings management

### 2. Location & Discovery
**Files:** `handlers/map.js`, `handlers/nearby.js`

Functions:
- `searchNearbyUsers()` - Find users within radius
- `handleLocation()` - Process GPS location
- `handleMapCallback()` - Map actions

Features:
- Search at 5/10/25/50km radius
- Distance calculation
- Categorized results (very close, close, nearby, area, region)
- Search limits for free users (3/week)
- Location-based ranking

### 3. Subscription & Payment
**Files:** `handlers/subscribe.js`, `handlers/daimoPayHandler.js`

Plans:
- **Free** - Basic access
- **Trial Week** ($14.99, 7 days)
- **PNP Member** ($24.99/month)
- **Crystal Member** ($49.99/4 months)
- **Diamond Member** ($99.99/year)

Payment Methods:
- **Daimo Pay** - USDC stablecoin (recommended)
  - Payment sources: Cash App, Venmo, Zelle, Coinbase, Binance, etc.
  - Network: Base (ultra-low fees)
  - Instant automatic activation
- **Traditional payment** - Manual admin activation

Daimo Functions:
- `showDaimoPlans()` - Display plans
- `handleDaimoPlanSelection()` - Create payment link
- `handleDaimoHelp()` - Payment info

### 4. AI Customer Support
**File:** `handlers/aiChat.js`

Integration:
- **AI Provider:** Mistral AI
- **Model:** mistral-small-latest
- **Languages:** English, Spanish (auto-detected)
- **Rate Limit:** 3 seconds between messages
- **History:** Last 20 messages

Functions:
- `startAIChat()` - Initialize chat
- `handleChatMessage()` - Process messages
- `endAIChat()` - End session

Features:
- Customizable system instructions
- Sales-focused responses (promotes Daimo Pay)
- Multi-language support
- Conversation history
- Long message splitting (>4000 chars)

### 5. Admin Tools
**File:** `handlers/admin.js` (25+ functions)

User Management:
- List, search, filter users
- View detailed user profiles
- Edit subscription tiers
- Send direct messages
- Ban/unban users
- Manual membership activation

Broadcasting:
- Multi-step broadcast wizard
- Media support (photo, video, document)
- Audience filtering
- Scheduled broadcasts
- Broadcast preview

Membership Management:
- Activate membership
- Update existing memberships
- Extend subscriptions
- Modify expiration dates
- Quick activation

Statistics:
- Total users
- Active users (today/week)
- Tier distribution
- Feature adoption
- Revenue estimates

### 6. Community Features
**File:** `handlers/community.js`

Features:
- Music library (premium)
- Top tracks ranking
- Event scheduling (coming soon)
- Video calls (coming soon)
- Live streaming (coming soon)

Functions:
- `handleNearby()` - Find nearby members
- `handleLibrary()` - Music library
- `handleTopTracks()` - Top tracks
- `handleScheduleCall()` - Video calls
- `handleScheduleStream()` - Live streams
- `handleUpcoming()` - Upcoming events

---

## Data Flow Architecture

### Session Management

**Engine:** Firestore (Firebase)

Session Variables:
```javascript
ctx.session = {
  onboardingComplete: boolean,    // Onboarding status
  language: "en" | "es",           // User language
  tier: string,                    // Subscription tier
  aiChatActive: boolean,           // AI chat mode
  aiChatHistory: array,            // Chat messages
  waitingFor: string,              // Form input state
  awaitingEmail: boolean           // Email collection
}
```

TTL: 30 days

### User Database Schema

**Collection:** `users`

Fields:
```javascript
{
  userId: string,
  username: string,
  firstName: string,
  lastName: string,
  language: "en" | "es",
  tier: "Free" | "trial-week" | "pnp-member" | "crystal-member" | "diamond-member",
  bio: string,
  photoFileId: string,
  location: { latitude, longitude },
  locationName: string,
  locationGeohash: string,
  adsOptOut: boolean,
  onboardingComplete: boolean,
  ageVerified: boolean,
  termsAccepted: boolean,
  privacyAccepted: boolean,
  createdAt: timestamp,
  lastActive: timestamp,
  email: string,
  subscriptionExpiry: timestamp,
  membershipStatus: string
}
```

---

## Command Execution Flow

### 1. Slash Command Flow
```
User sends: /command
     |
     v
bot.command("command") handler
     |
     v
Handler function executed
     |
     v
Check onboarding + permissions
     |
     v
Execute business logic
     |
     v
Send response with inline buttons
```

### 2. Callback Button Flow
```
User clicks inline button
     |
     v
Button sends: callback_data
     |
     v
bot.action(callback_pattern) router
     |
     v
Match callback regex/string
     |
     v
Call handler function
     |
     v
Execute callback action
     |
     v
Option A: Edit message
Option B: Send new message
Option C: Set waitingFor state
```

### 3. Form Input Flow
```
Handler sets: ctx.session.waitingFor = "fieldName"
     |
     v
Prompt user: "Enter fieldName"
     |
     v
User sends message
     |
     v
bot.on("text") handler
     |
     +---> Check: ctx.session.waitingFor?
     |
     +---> Yes: Execute field handler
     |     |
     |     +---> Validate input
     |     +---> Save to database
     |     +---> Clear waitingFor
     |     +---> Show confirmation
     |
     +---> No: Check keyboard buttons
```

---

## Middleware & Security

### Middleware Stack (Execution Order)

1. **Session Middleware** - Firestore-based sessions
   - 30-day TTL
   - Per-user state tracking

2. **Rate Limiting** - Prevent spam
   - Per-user limits
   - Configurable thresholds

3. **Private Response Middleware** - Group responses
   - Redirects group messages to DM
   - Improves user experience

4. **Sentry Context** - Error tracking
   - User context attachment
   - Error reporting

5. **Error Handler** - Global error catching
   - Sentry integration
   - User feedback

### Permission Checks

```javascript
// Admin middleware
bot.command("admin", adminMiddleware(), adminPanel)

// Onboarding check
if (!ctx.session?.onboardingComplete) {
  await ctx.reply("Complete onboarding first");
  return;
}

// Tier check
if (userTier === "Free") {
  await ctx.reply("Premium feature only");
  return;
}
```

---

## Onboarding Flow

```
New User: /start
    |
    v
1. Language Selection
   lang_en / lang_es
    |
    v
2. Age Verification (18+)
   confirm_age
    |
    v
3. Terms of Service
   accept_terms / decline_terms
    |
    v
4. Privacy Policy
   accept_privacy / decline_privacy
    |
    v
5. Email Collection (optional)
   Awaiting text message
    |
    v
6. Profile Creation (optional)
   Bio, location, photo
    |
    v
onboardingComplete = true
    |
    v
Show Main Menu
```

---

## Payment Integration

### Daimo Pay Flow

```
User: /subscribe
    |
    v
Select plan: plan_select_[planId]
    |
    +---> Option 1: Regular payment
    |
    +---> Option 2: Daimo Pay
         |
         v
    daimo_show_plans
         |
         v
    Select: daimo_plan_[planId]
         |
         v
    handleDaimoPlanSelection()
         |
         +---> Validate config
         +---> Get plan details
         +---> Call Daimo API
         +---> Create checkout link
         +---> Send payment instructions
         |
         v
    User clicks "Pay Now"
         |
         v
    Daimo Checkout (external)
         |
         v
    Payment confirmation webhook
         |
         v
    Activate membership
```

---

## Database & External Services

### Firebase Integration

**Collections:**
- `users` - User profiles
- `bot_sessions` - Session storage
- `subscriptions` - Subscription tracking
- `broadcasts` - Scheduled broadcasts
- `plans` - Subscription plans

**Services Used:**
- Firestore (database)
- Real-time updates
- Transaction support

### External APIs

1. **Mistral AI**
   - Endpoint: `chat.complete()`
   - Model: `mistral-small-latest`
   - Max tokens: 200
   - Temperature: 0.7

2. **Daimo Pay**
   - Payment creation
   - Webhook validation
   - Automatic activation

3. **Telegram Bot API**
   - Message sending
   - File handling
   - Webhook updates

---

## Admin Features Summary

### Dashboard (`/admin`)

```
Admin Panel
├── Statistics (admin_stats)
│   ├── Total users
│   ├── Active users (today/week)
│   ├── Tier distribution
│   ├── Profile completion
│   └── Revenue estimates
│
├── User Management (admin_users)
│   ├── List all (with pagination)
│   ├── Search user
│   ├── Filter premium
│   ├── Filter new (7d)
│   └── User Details
│       ├── Edit tier
│       ├── Send message
│       ├── Ban user
│       └── Unban user
│
├── Broadcasting (admin_broadcast)
│   ├── Select audience
│   ├── Upload media
│   ├── Compose message
│   ├── Add buttons
│   ├── Schedule date
│   └── Send/Preview
│
├── Membership (admin_membership)
│   ├── Activate membership
│   ├── Update member
│   └── Extend subscription
│
└── Plans (/plans)
    ├── Create plan
    ├── Edit plan
    ├── Delete plan
    └── Set pricing
```

---

## Multi-Language Support

**Supported Languages:** English (en), Spanish (es)

**Implementation:**
- `i18n` utility
- Translation keys system
- Language parameter: `ctx.session.language`

**Files:**
- `src/locales/en.json` - English translations
- `src/locales/es.json` - Spanish translations

---

## Error Handling & Monitoring

### Sentry Integration

**Tracked:**
- User context (ID, username)
- Chat context (ID, type)
- Update type
- Command executed
- Error stack traces

**Usage:**
```javascript
captureException(error, {
  userId: ctx.from?.id,
  username: ctx.from?.username,
  chatId: ctx.chat?.id,
  updateType: ctx.updateType,
  command: ctx.message?.text
})
```

---

## Configuration

### Environment Variables

```env
# Bot & API
TELEGRAM_TOKEN=your_token
MISTRAL_API_KEY=your_key
MISTRAL_AGENT_ID=agent_id
DAIMO_PAY_API=api_key

# URLs
WEB_APP_URL=https://your-domain.com
WEBAPP_URL=https://your-domain.com

# Database
FIREBASE_PROJECT_ID=your_project
FIREBASE_CREDENTIALS=path/to/credentials.json

# Monitoring
SENTRY_DSN=your_sentry_dsn

# Other
NODE_ENV=production
```

---

## File Structure

```
src/bot/
├── index.js                          # Main bot setup (commands registered)
├── webhook.js                        # Webhook handler
│
├── handlers/
│   ├── start.js                     # Onboarding
│   ├── help.js                      # Help info
│   ├── profile.js                   # Profile management
│   ├── map.js                       # Location search
│   ├── nearby.js                    # Nearby users
│   ├── live.js                      # Live streams
│   ├── app.js                       # Web app launcher
│   ├── subscribe.js                 # Subscriptions
│   ├── aiChat.js                    # AI support
│   ├── community.js                 # Community features
│   ├── daimoPayHandler.js          # Crypto payments
│   ├── admin.js                     # Admin panel (40+ functions)
│   └── admin/
│       └── planManager.js           # Plan management
│
├── helpers/
│   ├── onboardingHelpers.js        # Onboarding flows
│   ├── subscriptionHelpers.js      # Subscription logic
│   └── groupManagement.js          # Group features
│
├── middleware/
│   ├── firestoreSession.js         # Session management
│   ├── rateLimit.js                # Rate limiting
│   ├── errorHandler.js             # Error handling
│   └── privateResponseMiddleware.js # Group/DM routing
│
└── api/
    └── routes.js                    # HTTP routes
```

---

## Performance & Limits

- **Rate Limit:** 3 seconds between AI messages per user
- **Session TTL:** 30 days
- **Max Chat History:** 20 messages
- **Max Message Length:** 4000 characters (split if longer)
- **Max Users Per Query:** 100
- **Broadcast Filters:** All users, subscribers, free users

---

## Future Features (In Development)

- Live streaming (`/live`)
- Video call scheduling (`/schedulecall`)
- Music playlists and track management
- Advanced event scheduling
- Group management improvements

---

## Testing Commands

For testing, admins can use:
1. `/admin` - Access admin panel
2. `admin_stats` - View statistics
3. `admin_list_all` - List users
4. `admin_search_user` - Search users
5. `/aichat` - Test AI responses
6. `/subscribe` - Test payment flow

---

## Security Considerations

1. **Admin-Only Commands:** Require `adminMiddleware()`
2. **Input Validation:** Sanitization for user bio/location
3. **Age Verification:** Required for all users
4. **Privacy Policy:** Must accept on signup
5. **Terms of Service:** Must accept on signup
6. **Rate Limiting:** Prevents spam/abuse
7. **Ban System:** Ability to ban users
8. **Error Handling:** No sensitive data in error messages

---

**Total Lines of Code:** 5000+ lines
**Languages:** JavaScript/Node.js
**Framework:** Telegraf.js
**Database:** Firebase Firestore
**AI:** Mistral
**Payments:** Daimo Pay (USDC)

Generated: November 2025
