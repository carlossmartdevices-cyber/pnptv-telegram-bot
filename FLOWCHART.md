# PNPtv Bot - Complete User Flow

## 📱 User Journey Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│                        BOT START                             │
│                        /start                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │  Is user registered?    │
           └──────┬──────────┬───────┘
                  │ NO       │ YES
                  ▼          ▼
        ┌──────────────┐  ┌────────────────┐
        │  ONBOARDING  │  │   MAIN MENU    │
        └──────────────┘  └────────────────┘


═══════════════════════════════════════════════════════════════
                      ONBOARDING FLOW
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                  STEP 1: Language Selection                  │
├─────────────────────────────────────────────────────────────┤
│  "Welcome to PNPtv! Choose your language:"                  │
│                                                              │
│  [English 🇺🇸]    [Español 🇪🇸]                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  STEP 2: Age Verification                    │
├─────────────────────────────────────────────────────────────┤
│  "🔞 Age Verification"                                       │
│  "PNPtv is an adult platform."                              │
│  "Please confirm you are 18+ years old."                    │
│                                                              │
│  [✅ I am 18+ years old]                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                STEP 3: Terms & Conditions                    │
├─────────────────────────────────────────────────────────────┤
│  "📜 Terms & Conditions"                                     │
│  "Please read and accept our Terms of Service."             │
│  "🔗 https://pnp.tv/terms-en"                               │
│                                                              │
│  [✅ Accept]    [❌ Decline]                                  │
└────────────┬──────────────┬─────────────────────────────────┘
             │ Accept       │ Decline
             ▼              ▼
    ┌────────────┐    ┌─────────────────┐
    │   STEP 4   │    │  "You must      │
    │            │    │   accept to     │
    │            │    │   continue"     │
    │            │    └─────────────────┘
    │            │
    │            │
    ▼            │
┌─────────────────────────────────────────────────────────────┐
│                 STEP 4: Privacy Policy                       │
├─────────────────────────────────────────────────────────────┤
│  "🔒 Privacy Policy"                                         │
│  "Please read and accept our Privacy Policy."               │
│  "🔗 https://pnp.tv/privacy-en"                             │
│                                                              │
│  [✅ Accept]    [❌ Decline]                                  │
└────────────┬──────────────┬─────────────────────────────────┘
             │ Accept       │ Decline
             ▼              ▼
    ┌────────────┐    ┌─────────────────┐
    │   STEP 5   │    │  "You must      │
    │            │    │   accept to     │
    │            │    │   continue"     │
    │            │    └─────────────────┘
    │            │
    │            │
    ▼            │
┌─────────────────────────────────────────────────────────────┐
│                STEP 5: Profile Creation                      │
├─────────────────────────────────────────────────────────────┤
│  ✅ "Profile Created!"                                       │
│  "Welcome to the PNPtv community!"                          │
│                                                              │
│  🎁 "Reward Unlocked!"                                       │
│  "+100 XP earned"                                           │
│  "🏆 Badge unlocked: Trailblazer"                           │
│                                                              │
│  Database Record Created:                                    │
│  - userId: 123456789                                        │
│  - username: @user                                          │
│  - language: en/es                                          │
│  - xp: 100                                                  │
│  - badges: ["Trailblazer"]                                  │
│  - tier: "Free"                                             │
│  - onboardingComplete: true                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      MAIN MENU                               │
│                                                              │
│  [👤 Profile]    [🗺️ Map]                                   │
│  [📡 Live]       [💎 Subscribe]                             │
│  [❓ Help]                                                   │
└─────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════
                       MAIN MENU FLOWS
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                    👤 PROFILE FLOW                           │
└─────────────────────────────────────────────────────────────┘

Click [👤 Profile] or /profile
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  👤 Your Profile                                             │
│                                                              │
│  🆔 ID: 123456789                                            │
│  👤 Username: @john_doe                                      │
│  ⭐ XP: 100                                                  │
│  🏆 Badges: Trailblazer                                      │
│  💎 Tier: Free                                               │
│  📍 Location: Not set                                        │
│  📝 Bio: Not set                                             │
│                                                              │
│  [📝 Edit Bio] [📍 Edit Location]                           │
│  [💎 Upgrade Tier] [🗺️ View Map]                           │
└───────┬────────────┬──────────┬───────────┬─────────────────┘
        │            │          │           │
        │ Edit Bio   │ Edit     │ Upgrade   │ View Map
        │            │ Location │           │
        ▼            ▼          ▼           ▼
  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────────┐
  │ "Enter   │ │ "Share   │ │ Go to│ │ Go to    │
  │  new bio"│ │location" │ │ SUB  │ │ MAP flow │
  │          │ │          │ │ flow │ │          │
  │ [Text    │ │ [📍 GPS  │ │      │ │          │
  │  input]  │ │  button] │ │      │ │          │
  └────┬─────┘ └────┬─────┘ └──────┘ └──────────┘
       │            │
       ▼            ▼
  ┌──────────┐ ┌──────────┐
  │ Validate │ │ Save     │
  │ Update   │ │ location │
  │ Database │ │ Update   │
  │          │ │ Database │
  └────┬─────┘ └────┬─────┘
       │            │
       ▼            ▼
  "✅ Bio updated" "✅ Location updated"


┌─────────────────────────────────────────────────────────────┐
│                     🗺️ MAP FLOW                              │
└─────────────────────────────────────────────────────────────┘

Click [🗺️ Map] or /map
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  🗺️ Interactive Map                                          │
│                                                              │
│  "Explore users near you."                                  │
│  "📍 Share your location to see nearby members."            │
│                                                              │
│  [📍 Share Location] [🔍 Search Nearby]                     │
└──────────┬────────────────────┬──────────────────────────────┘
           │                    │
           │ Share Location     │ Search Nearby
           ▼                    ▼
  ┌─────────────────┐    ┌─────────────────┐
  │ Request GPS or  │    │ Check if user   │
  │ city name       │    │ has location    │
  │                 │    │                 │
  │ [📍 GPS button] │    │ If NO location: │
  │ [Text input]    │    │ "Share location │
  │                 │    │  first"         │
  └────────┬────────┘    │                 │
           │             │ If YES:         │
           ▼             │ Query database  │
  ┌─────────────────┐    │ for nearby      │
  │ Save to DB      │    │ users           │
  │ location: {     │    │                 │
  │   latitude,     │    │ Display list:   │
  │   longitude,    │    │ 1. @user1 (Tier)│
  │   updatedAt     │    │    ~2km         │
  │ }               │    │ 2. @user2 (Tier)│
  └────────┬────────┘    │    ~5km         │
           │             └─────────────────┘
           ▼
  "✅ Location updated"


┌─────────────────────────────────────────────────────────────┐
│                    📡 LIVE FLOW                              │
└─────────────────────────────────────────────────────────────┘

Click [📡 Live] or /live
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  📡 Live Streams                                             │
│                                                              │
│  "Watch or start live broadcasts."                          │
│  "🎥 Coming soon!"                                           │
│                                                              │
│  [🎥 Start Live] [📺 View Lives]                            │
└──────────┬──────────────────┬────────────────────────────────┘
           │                  │
           ▼                  ▼
    "📡 Live streaming is coming soon!"
    "Stay tuned for updates. 🎬"


┌─────────────────────────────────────────────────────────────┐
│                  💎 SUBSCRIPTION FLOW                        │
└─────────────────────────────────────────────────────────────┘

Click [💎 Subscribe] or /subscribe
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  💎 Subscription Plans                                       │
│                                                              │
│  "Choose a plan to upgrade:"                                │
│                                                              │
│  [🥈 Silver ($15/month)]                                     │
│  [🥇 Golden ($25+5USDT/month)]                              │
│  [« Back]                                                    │
└──────────┬──────────────────┬────────────────────────────────┘
           │ Silver           │ Golden
           ▼                  ▼
  ┌─────────────────┐    ┌─────────────────┐
  │ 🥈 Silver Plan   │    │ 🥇 Golden Plan   │
  │ $15/month       │    │ $25+5 USDT/month│
  │                 │    │                 │
  │ Features:       │    │ All Silver +    │
  │ • No ads        │    │ • VIP channels  │
  │ • 20 swipes/day │    │ • Golden badges │
  │ • Verification  │    │ • Priority      │
  │ • Support       │    │   support       │
  │                 │    │ • 5 USDT bonus  │
  │                 │    │ • Unlimited     │
  │                 │    │   swipes        │
  │                 │    │                 │
  │ [💳 Pay Now]    │    │ [💳 Pay Now]    │
  └────────┬────────┘    └────────┬────────┘
           │                      │
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │ Generate ePayco        │
           │ Payment Link         │
           │                      │
           │ Metadata:            │
           │ - userId             │
           │ - plan (silver/gold) │
           │ - username           │
           │ - referenceId        │
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │ Redirect to ePayco.co  │
           │ payment page         │
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │ User completes       │
           │ payment              │
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │ Webhook callback     │
           │ (ePayco → Bot)         │
           └──────────┬───────────┘
                      ▼
           ┌──────────────────────┐
           │ Update user tier     │
           │ in database          │
           │                      │
           │ tier: "Silver/Golden"│
           └──────────┬───────────┘
                      ▼
           "✅ Subscription Activated!"
           "Your [plan] subscription is now active."
           "Enjoy your premium features! 🎉"


┌─────────────────────────────────────────────────────────────┐
│                     ❓ HELP FLOW                             │
└─────────────────────────────────────────────────────────────┘

Click [❓ Help] or /help
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  ❓ Help & Commands                                          │
│                                                              │
│  Available commands:                                         │
│                                                              │
│  👤 /profile - View your profile                            │
│  🗺️ /map - View interactive map                             │
│  📡 /live - Watch live streams                              │
│  💎 /subscribe - Upgrade subscription                       │
│  ⚙️ /admin - Admin panel (admins only)                      │
│  ❓ /help - Show this help                                  │
└─────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════
                      ADMIN PANEL FLOW
═══════════════════════════════════════════════════════════════

Admin sends /admin (ID 6636269 only)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Admin Panel                                              │
│                                                              │
│  "Select an option:"                                        │
│                                                              │
│  [👥 User Management] [💰 Plan Management]                  │
│  [📋 Menu Config] [📢 Broadcast]                            │
│  [📊 Statistics]                                            │
└──┬────────┬──────────┬──────────┬──────────┬────────────────┘
   │        │          │          │          │
   ▼        ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ ┌─────────┐
│ User │ │ Plan │ │ Menu │ │Broadcast │ │ Stats   │
│ Mgmt │ │ Mgmt │ │Config│ │          │ │         │
│      │ │      │ │      │ │          │ │         │
│Coming│ │Coming│ │Coming│ │ Active   │ │ Active  │
│ Soon │ │ Soon │ │ Soon │ │          │ │         │
└──────┘ └──────┘ └──────┘ └────┬─────┘ └────┬────┘
                                │             │
                                ▼             ▼
                    ┌───────────────┐  ┌──────────────┐
                    │ "Enter message│  │ 👥 User Stats│
                    │  to broadcast"│  │              │
                    │               │  │ Total: 150   │
                    │ [Text input]  │  │ Active: 45   │
                    └───────┬───────┘  │ Free: 120    │
                            │          │ Silver: 20   │
                            ▼          │ Golden: 10   │
                    ┌───────────────┐  └──────────────┘
                    │ Send to all   │
                    │ users in DB   │
                    │               │
                    │ For each user:│
                    │ sendMessage() │
                    └───────┬───────┘
                            ▼
                    "✅ Broadcast sent to 150 users."


═══════════════════════════════════════════════════════════════
                    TECHNICAL ARCHITECTURE
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                      USER REQUEST                            │
│             (Telegram message/callback)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   TELEGRAF BOT                               │
│                  (src/bot/index.js)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE CHAIN                          │
├─────────────────────────────────────────────────────────────┤
│  1. Session Middleware (load user session)                  │
│  2. Rate Limit Middleware (check 30 req/min)                │
│  3. Error Handler (catch all errors)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   COMMAND ROUTER                             │
├─────────────────────────────────────────────────────────────┤
│  /start → startHandler                                      │
│  /profile → profileHandler                                  │
│  /map → mapHandler                                          │
│  /live → liveHandler                                        │
│  /subscribe → subscribeHandler                              │
│  /admin → adminMiddleware + adminPanel                      │
│  /help → helpHandler                                        │
│  callback_query → action handlers                           │
│  text → text handler                                        │
│  location → location handler                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      HANDLERS                                │
├─────────────────────────────────────────────────────────────┤
│  • Load data from Firestore                                 │
│  • Validate input                                           │
│  • Apply business logic                                     │
│  • Update database                                          │
│  • Format response with i18n                                │
│  • Send reply to user                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────┤
│  • Firestore (database)                                     │
│  • ePayco.co (payments)                                       │
│  • Winston (logging)                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 State Machine

```
┌──────────────┐
│ NOT_STARTED  │
└──────┬───────┘
       │ /start
       ▼
┌──────────────┐
│ LANGUAGE_SEL │
└──────┬───────┘
       │ Select language
       ▼
┌──────────────┐
│ AGE_VERIFY   │
└──────┬───────┘
       │ Confirm 18+
       ▼
┌──────────────┐
│ TERMS_ACCEPT │
└──────┬───────┘
       │ Accept terms
       ▼
┌──────────────┐
│ PRIVACY      │
└──────┬───────┘
       │ Accept privacy
       ▼
┌──────────────┐
│ COMPLETED    │ ← User stays in this state
└──────────────┘   (onboardingComplete = true)
```

---

## 📊 Database Schema

```
Firestore: users/{userId}
{
  userId: "123456789",           // Telegram user ID
  username: "john_doe",          // Telegram username
  language: "en",                // User preference (en/es)
  ageVerified: true,             // 18+ confirmed
  termsAccepted: true,           // Terms accepted
  privacyAccepted: true,         // Privacy accepted
  onboardingComplete: true,      // Completed onboarding
  createdAt: Timestamp,          // Account creation
  lastActive: Timestamp,         // Last activity
  xp: 100,                       // Experience points
  badges: ["Trailblazer"],       // Earned badges
  tier: "Free",                  // Subscription tier
  bio: "Hello!",                 // User bio (optional)
  location: {                    // GPS or text (optional)
    latitude: 40.7128,
    longitude: -74.0060,
    updatedAt: Timestamp
  }
}
```

---

## 🎯 Key Decision Points

1. **Is user registered?**
   - YES → Main menu
   - NO → Onboarding

2. **Age verification:**
   - Accept → Continue
   - Decline → Cannot proceed

3. **Terms/Privacy:**
   - Accept both → Profile created
   - Decline either → Cannot proceed

4. **Admin access:**
   - ID = 6636269 → Admin panel
   - Other → "Access denied"

5. **Location search:**
   - Has location → Show nearby users
   - No location → "Share location first"

6. **Payment:**
   - Complete → Tier upgraded
   - Cancel → Tier unchanged

---

This flowchart represents the complete user journey through your PNPtv bot! 🚀

