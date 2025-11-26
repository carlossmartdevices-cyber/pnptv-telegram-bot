# PNPtv Bot - Member Commands Reference

Last Updated: November 13, 2025

---

## 👥 User / Member Commands

### 🎯 Core Commands

| Command | Description | Availability |
|---------|-------------|---------------|
| `/start` | Begin onboarding & setup profile | Everyone |
| `/help` | Show help menu with available features | Everyone |
| `/profile` | View & edit your profile | Everyone |
| `/menu` | Show main menu with quick actions | Everyone |

---

### 💳 Subscription & Payments

| Command | Description | Availability |
|---------|-------------|---------------|
| `/subscribe` | Browse & purchase subscription plans | Everyone |
| `/plans` | View all available membership plans | Members |
| `/reactivate` | Reactivate expired membership | Expired members |

---

### 🗺️ Location & Discovery

| Command | Description | Availability |
|---------|-------------|---------------|
| `/map` | Open interactive map of nearby members | Premium members |
| `/nearby` | Find members near your location | Premium members |
| `/app` | Launch PNPtv web app | Everyone |

---

### 💬 Communication & Support

| Command | Description | Availability |
|---------|-------------|---------------|
| `/aichat` | Start AI chat conversation (Mistral AI) | Everyone |
| `/endchat` | End current AI chat session | Everyone |

---

### 🎶 Music & Events

| Command | Description | Availability |
|---------|-------------|---------------|
| `/toptracks` | View top played tracks in your group | Everyone |
| `/playlist` | Browse or manage playlists | Everyone |
| `/addtrack` | Add a new song to playlist | Everyone |
| `/deletetrack` | Remove song from playlist | Everyone |
| `/schedulecall` | Schedule a group video call | Everyone |
| `/schedulestream` | Schedule a live stream event | Everyone |
| `/upcoming` | View upcoming events & calls | Everyone |
| `/deleteevent` | Cancel a scheduled event | Event creator |
| `/zoomstatus` | Check Zoom meeting status | Everyone |

---

### 📚 Community

| Command | Description | Availability |
|---------|-------------|---------------|
| `/rules` | View community rules & guidelines | Everyone |
| `/library` | Access content library | Everyone |
| `/settimezone` | Set your timezone for events | Everyone |

---

### 📢 Notifications

| Command | Description | Availability |
|---------|-------------|---------------|
| `/optout` | Stop receiving broadcast messages | Everyone |
| `/optin` | Resume receiving broadcast messages | Everyone |

---

## 🛡️ Admin Commands (Admin Only)

### Panel & Dashboard

| Command | Description |
|---------|-------------|
| `/admin` | Open admin control panel |
| `/plans` | View plan management dashboard |
| `/support_tickets` | View support ticket queue |
| `/broadcaster` | Channel broadcaster interface |

---

### 📢 Broadcasting & Announcements

| Command | Description |
|---------|-------------|
| `/sendpromo` | Send promotional announcement |
| `/reactivateprime` | Send PRIME membership reactivation message |
| `/broadcastprime` | Broadcast to PRIME channel |
| `/sendpaymentbutton` | Send payment button to user |

---

### 🚫 Moderation & Filtering

| Command | Description |
|---------|-------------|
| `/blacklist` | View content filtering rules |
| `/addword` | Add word to blacklist filter |
| `/removeword` | Remove word from filter |
| `/addlink` | Add URL to link filter |
| `/removelink` | Remove URL from filter |
| `/violations` | Check user violations |
| `/clearviolations` | Clear user violations |

---

## 🎥 Live Features

| Command | Description | Availability |
|---------|-------------|---------------|
| `/live` | Access live streaming features | Premium members |

---

## Feature Access by Tier

### 🆓 Free Members
- Profile management
- AI chat
- Music & event scheduling
- Community features
- Playlists (view only)
- Rules & library

### 💎 Premium Members (All Tiers)
**All Free features + :**
- Map & location discovery
- Nearby member search
- Live streaming access
- Full playlist management
- Extended group permissions (media, files)

---

## 🔄 Callback Actions (Inline Buttons)

These are triggered by buttons in bot responses, not typed as commands:

### Onboarding
- Language selection: `lang_xx`, `language_xx`
- Age confirmation: `confirm_age`
- Terms acceptance: `accept_terms`, `decline_terms`
- Privacy acceptance: `accept_privacy`

### Subscriptions
- Plan selection: `select_plan_*`
- Payment method selection: `payment_method_*`
- COP card: `cop_card_plan_*`, `cop_card_confirmed_*`

### Community
- Event creation: `schedule_*`
- Music: `add_track_*`, `delete_track_*`
- Broadcasting: `broadcast_*`

---

## 📊 Command Categories

| Category | Count | User Access |
|----------|-------|-------------|
| Core/Navigation | 4 | Everyone |
| Subscriptions | 3 | Everyone |
| Location/Discovery | 3 | Premium |
| Chat/Support | 2 | Everyone |
| Music/Events | 8 | Everyone |
| Community | 3 | Everyone |
| Notifications | 2 | Everyone |
| **Total User Commands** | **25** | - |
| Admin Commands | 13 | Admins only |
| **Total All Commands** | **38** | - |

---

## 💡 Tips for Members

- **Type `/help`** to see all available features
- **Use `/menu`** for quick access to main features
- **Premium features** require active membership
- **Use `/aichat`** for instant AI assistance
- **Check `/upcoming`** before events start
- **Set timezone** with `/settimezone` for accurate event times

---

## 🔧 Common Command Flows

### New User Onboarding
```
/start → Language selection → Age/Terms → Profile setup → Ready
```

### Purchase Membership
```
/subscribe → View plans → Choose plan → Payment → ✅ Active
```

### Schedule an Event
```
/schedulecall or /schedulestream → Enter details → Confirm → ✅ Scheduled
```

### Find Nearby Members
```
/map or /nearby → View members → Filter by interests → Connect
```

### Get Help
```
/help → Browse features → /aichat for AI help
```

---

## 🔐 Permission System

Commands are restricted by:
1. **User Tier** (Free vs Premium)
2. **Admin Role** (Admin-only commands)
3. **Onboarding Status** (Incomplete onboarding limits access)
4. **Active Membership** (Expired = limited to Free features)
5. **Group/Channel Role** (Some commands only in groups)

---

## 📱 Accessing Commands

**Mobile/Web:**
- Type `/` in Telegram chat to see available commands
- Click suggested commands from dropdown

**Desktop:**
- Type `/` for command autocomplete
- Commands appear as bot menu when chatting

---

## 🆘 Support

- **For bot issues**: `/aichat` then ask for help
- **Report bug**: Contact admin via support panel
- **Feature request**: Mention in group or DM admin

---

## Last Modified
- **Date**: 2025-11-13
- **Status**: All commands verified & working
- **Next Review**: After next major feature release
