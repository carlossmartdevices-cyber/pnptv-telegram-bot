# PNPtv Bot Commands - Complete Index

## Quick Navigation

This directory contains comprehensive documentation of all PNPtv bot commands, features, and architecture.

### Documentation Files

#### 1. **COMPREHENSIVE_BOT_SUMMARY.md** (Main Reference)
Complete guide covering:
- All 17 slash commands with descriptions
- 40+ admin callback actions
- Feature areas (profiles, location, payments, AI, admin, community)
- Data flow architecture
- Command execution flows
- Database schema
- Integration points
- Configuration

**Best for:** Getting a complete overview of the bot

---

#### 2. **BOT_COMMANDS_REFERENCE.md** (Detailed)
Comprehensive breakdown including:
- Direct slash commands with file locations
- Community commands (music, events, calls)
- Callback actions (inline buttons)
- Broadcast wizard flow
- Form input handlers (waiting states)
- Media message handlers
- Group management features
- Admin functions list (28 functions)
- Daimo Pay functions
- AI chat functions
- Community functions
- Plan manager functions
- Key features by category
- Session state management

**Best for:** Finding specific commands and their implementations

---

#### 3. **COMMANDS_QUICK_REFERENCE.txt** (Quick Lookup)
Fast reference including:
- All 17 slash commands in table format
- Admin commands (40+ actions)
- Form input states
- Handlers & features
- Integration points
- Statistics & monitoring
- Subscription plans
- Session variables
- Middleware & security

**Best for:** Quick command lookup while developing

---

#### 4. **COMMAND_FLOW_DIAGRAM.txt** (Visual)
ASCII diagrams showing:
- User entry points
- Command execution flow
- Multi-step form flow
- Admin command hierarchy
- Subscription payment flow
- AI chat flow
- Onboarding state machine
- Middleware stack
- File structure

**Best for:** Understanding how commands flow and interact

---

## Command Categories

### User Commands (15 commands)
- `/start` - Onboarding
- `/help` - Help
- `/profile` - Profile management
- `/map` - Location search
- `/nearby` - Nearby users
- `/live` - Live streams
- `/app` - Web app
- `/subscribe` - Subscriptions
- `/aichat` - AI chat
- `/endchat` - End chat
- `/library` - Music library
- `/toptracks` - Top tracks
- `/schedulecall` - Video calls
- `/schedulestream` - Live streams
- `/upcoming` - Events

### Admin Commands (40+ Callback Actions)
- Statistics
- User management
- Broadcasting
- Membership management
- Plan management

---

## Key Features

### 1. User Management & Profile
- Photo uploads
- Bio editing
- Location sharing
- Settings management

### 2. Location-Based Discovery
- 5/10/25/50km search radius
- Distance calculation
- Result categorization
- Free user limits (3 searches/week)

### 3. Payment Integration
- 5 subscription tiers
- Daimo Pay (USDC stablecoin)
- Instant activation
- Multiple payment sources

### 4. AI Customer Support
- Mistral AI integration
- English & Spanish support
- Rate limiting (3 sec)
- Sales-focused responses

### 5. Admin Tools (40+ Functions)
- User management
- Broadcasting
- Membership activation
- Plan management
- Statistics dashboard

### 6. Community Features
- Music library
- Event scheduling
- Video calls
- Live streaming

---

## Database

**Engine:** Firebase Firestore

**Collections:**
- `users` - User profiles
- `bot_sessions` - Session storage
- `subscriptions` - Subscription data
- `broadcasts` - Scheduled broadcasts
- `plans` - Subscription plans

---

## External Integrations

1. **Mistral AI** - Customer support chatbot
2. **Daimo Pay** - USDC cryptocurrency payments
3. **Firebase** - Database & sessions
4. **Telegram Bot API** - Bot platform

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Slash Commands | 17 |
| Callback Actions | 60+ |
| Handler Functions | 80+ |
| Handler Files | 14 |
| Admin Functions | 40+ |
| Form States | 15+ |
| Subscription Plans | 5 |
| Supported Languages | 2 |

---

## Getting Started

### For Users
1. Start with `/start` for onboarding
2. Use `/help` for available commands
3. `/profile` to set up profile
4. `/subscribe` for membership

### For Developers
1. Read **COMPREHENSIVE_BOT_SUMMARY.md** for overview
2. Use **BOT_COMMANDS_REFERENCE.md** for implementation details
3. Reference **COMMANDS_QUICK_REFERENCE.txt** during development
4. Check **COMMAND_FLOW_DIAGRAM.txt** for flow understanding

### For Admins
1. Use `/admin` to access admin panel
2. Reference admin section in **BOT_COMMANDS_REFERENCE.md**
3. Follow broadcast wizard for notifications
4. Use `admin_stats` for analytics

---

## File Locations

All command handlers are in:
```
src/bot/handlers/
├── start.js           - Onboarding
├── help.js            - Help
├── profile.js         - Profile management
├── map.js             - Location search
├── nearby.js          - Nearby users
├── live.js            - Live streams
├── app.js             - Web app
├── subscribe.js       - Subscriptions
├── aiChat.js          - AI support
├── community.js       - Community features
├── daimoPayHandler.js - Payments
├── admin.js           - Admin panel
└── admin/
    └── planManager.js - Plan management
```

Command registration:
```
src/bot/index.js      - Main bot setup
```

---

## Important Notes

- All commands check for onboarding completion
- Admin commands require admin middleware
- Premium features are tier-restricted
- Rate limiting applied to AI chat (3 sec)
- Session TTL is 30 days
- Broadcast filtering supports: all users, premium, free
- Language support: English (en), Spanish (es)

---

## Version Info

- **Created:** November 2025
- **Framework:** Telegraf.js
- **Language:** JavaScript/Node.js
- **Database:** Firebase Firestore
- **AI:** Mistral
- **Payments:** Daimo Pay (USDC)

---

## Related Documentation

- See SantinoBot documentation for group management features
- See Firebase configuration for database setup
- See environment variables guide for configuration
- See Sentry documentation for error tracking

---

**Last Updated:** November 3, 2025

For questions or updates, refer to the main bot index.js file and handler implementations.
