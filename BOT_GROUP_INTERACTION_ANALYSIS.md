# 📊 How the Bot Currently Interacts with Groups

## 🔍 Current System Overview

The bot has a **sophisticated group interaction system** with multiple layers working together. Here's how it all works:

---

## 🎯 Core Interaction Flows

### 1. **User Joins Group** → Welcome & Permissions Applied

```
New Member Joins
    ↓
handleNewMember() triggered
    ↓
Get user's subscription tier from Firestore
    ↓
Apply Telegram permissions based on tier:
  • FREE → Text only (no photos, videos, documents, etc.)
  • PREMIUM → Full media access
    ↓
Send welcome message in group (auto-deletes after 60s)
    ↓
Log activity to Firestore
```

**File:** `src/bot/helpers/groupManagement.js`

---

### 2. **User Runs a Group Command** → Redirects to Private Chat

**Group-Only Commands** (stay in group):
- `/menu` - Music library, open room, rules, help
- `/library` - Browse music library
- `/toptracks` - View top tracks
- `/addtrack` - Add music (admin)
- `/deletetrack` - Delete music (admin)
- `/schedulecall` - Schedule video calls
- `/schedulestream` - Schedule streams
- `/upcoming` - View upcoming events
- `/settimezone` - Set timezone

**Private-Chat Commands** (redirected):
- `/start`, `/help`, `/profile`, `/subscribe`, `/admin`, `/aichat`, etc.

**What Happens:**
```
User runs /profile in group
    ↓
privateResponseMiddleware catches it
    ↓
Sends response to user's private chat
    ↓
Posts notification in group:
"✉️ @username, I've sent you the response via private message.
[💬 Check Private Message]"
    ↓
Group message auto-deletes after 5 minutes
```

**Files:** 
- `src/bot/middleware/privateResponseMiddleware.js`
- `src/bot/middleware/autoDeleteMiddleware.js`

---

### 3. **User Sends Media (Photos, Videos, etc.)** → Permission Check

```
User sends photo/video in group
    ↓
handleMediaMessage() triggered
    ↓
Check user's subscription tier in Firestore
    ↓
If FREE tier:
  • DELETE the media message immediately
  • Send friendly warning:
    "⚠️ Hey @username!
     Only premium members can send media.
     💎 Want to upgrade? → /subscribe"
  • Warning auto-deletes after 20 seconds
    ↓
If PREMIUM tier:
  • Allow message to stay
  • No action taken
```

**File:** `src/bot/helpers/groupManagement.js`

---

### 4. **Bot Sends Any Message in Group** → Auto-Delete After 5 Minutes

```
Bot sends response/notification in group
    ↓
autoDeleteMiddleware catches it
    ↓
Schedule automatic deletion after 5 minutes
    ↓
Message disappears from group
    ↓
(Exceptions: Event notifications stay longer)
```

**File:** `src/bot/middleware/autoDeleteMiddleware.js`

---

## 📋 Permission System

### Tier-Based Permissions

**FREE TIER:**
```
can_send_messages: ✅ (text only)
can_send_photos: ❌
can_send_videos: ❌
can_send_documents: ❌
can_send_audios: ❌
can_send_voice_notes: ❌
can_send_video_notes: ❌
can_send_polls: ❌
can_send_other_messages: ❌ (stickers, GIFs, etc.)
```

**PREMIUM TIER:**
```
All of the above: ✅ (all media types allowed)
```

---

## 🎛️ Group Menu System

### /menu Command (Group-Only)

```
User taps /menu in group
    ↓
Shows inline keyboard with options:
  [📚 Music Library]
  [📅 Open Room] (Premium: Create Zoom room, Free: See upgrade prompt)
  [📋 Rules] (View community guidelines)
  [❓ Help] (Command guide)
    ↓
Tapping any option sends response to PRIVATE chat
    ↓
Group sees: "✉️ @username, I've sent you... [💬 Check Private Message]"
```

**File:** `src/bot/handlers/groupMenu.js`

---

## 🔄 Message Flow Diagram

### Scenario: User runs /profile in group

```
                    GROUP CHAT
                        ↓
                User: /profile
                        ↓
        privateResponseMiddleware
                        ↓
              (Detects group + private command)
                        ↓
                    ┌───┴───┐
                    ↓       ↓
            PRIVATE CHAT   GROUP CHAT
            (Response)      (Notification)
            ✓ Sent to user  ✉️ @username
                            I've sent you...
                            [💬 Check...]
                                ↓
                        autoDeleteMiddleware
                                ↓
                        Deleted after 5 min
```

---

## 🛡️ Permission Enforcement

### How Restrictions Work

```
1. User joins → getTelegramPermissions() applied via restrictChatMember()
2. User sends media → Telegram API blocks it (based on permissions)
3. Bot detects violation → Deletes message + warns user
4. User upgrades → New permissions applied on next interaction
```

**Two-Layer Defense:**
- **Layer 1:** Telegram API (enforces permissions at protocol level)
- **Layer 2:** Bot detection (catches slips, provides user feedback)

---

## 📊 Database Tracking

### What Gets Logged

**On New Member Join:**
```
{
  lastActive: timestamp,
  lastActivityInGroup: "joined_group",
  groupActivityLog: {
    lastMessageTime: timestamp,
    action: "joined_group"
  }
}
```

**On Message Send:**
```
{
  lastActive: timestamp,
  lastActivityInGroup: "sent_message"
}
```

---

## ⏱️ Auto-Delete Behavior

### Message Lifecycle

```
Bot sends message in group
    ↓ (0 seconds) Message appears
    ↓ (scheduled)
    ↓ (300 seconds / 5 minutes)
    ↓ Auto-delete triggers
    ↓ Message deleted
    ↓ Group stays clean

Exceptions:
  • Event notifications → Longer TTL
  • Direct member responses → Auto-deleted (20-60 sec)
```

---

## 🎯 Current Features

✅ **Permission-based media restrictions**  
✅ **Automatic message cleanup (5-min auto-delete)**  
✅ **User mention in private responses**  
✅ **"Check Private Message" button**  
✅ **Bilingual support (EN/ES)**  
✅ **Welcome messages for new members**  
✅ **Tier-based access to group features**  
✅ **Activity logging to Firestore**  
✅ **Graceful error handling**  

---

## 🔌 Key Middleware Stack

```
User sends message in group
    ↓
1. privateResponseMiddleware
   (Redirects private commands to DM)
    ↓
2. autoDeleteMiddleware
   (Schedules message deletion)
    ↓
3. autoDeleteUserCommandsMiddleware
   (Deletes user's command messages after 10s)
    ↓
4. moderationMiddleware
   (Checks for blacklisted words/links)
    ↓
5. rateLimitMiddleware
   (Prevents spam - 20 req/min per user)
    ↓
Handler processes (handleMediaMessage, etc.)
```

---

## 🎨 User Experience Timeline

### Example: Asking for /profile in group

```
T+0s   User: "/profile"
       └─ Command message visible in group
       └ Private response middleware activates

T+1s   Bot: (silently processes)
       Bot DM: "Your profile info..."
       └─ Sent to user's private chat

T+2s   Group shows:
       "✉️ @username, I've sent you the response...
        [💬 Check Private Message]"
       └─ Auto-delete scheduled

T+10s  User's "/profile" command deleted
       └─ Group stays cleaner

T+5m   Bot's notification deleted
       └─ Group fully cleaned up
```

---

## 📱 Interaction Types

### Type 1: Group-Only (Stays in Group)
```
Examples: /menu, /library, /toptracks
Behavior: Sends response in group, auto-deletes after 5 min
```

### Type 2: Private-Only (Goes to DM)
```
Examples: /profile, /subscribe, /admin, /aichat
Behavior: Redirects to DM, group gets notification + button
```

### Type 3: Event Notifications (Special Handling)
```
Examples: Scheduled calls, streams, broadcasts
Behavior: Posted in group, NOT auto-deleted (important info)
```

### Type 4: Member Management (Automatic)
```
Examples: Welcome message, permission changes
Behavior: Sent in group, auto-delete after 60-90 seconds
```

---

## 🔐 Security & Privacy

### Privacy Protection:
- Sensitive user data (profiles, subscriptions) → DM only
- Public commands (music, events) → Group OK
- Group is kept clean → Auto-deletes clutter
- Command history reduced → User commands deleted after 10s

### Protection Against Abuse:
- Rate limiting → Max 20 requests/minute per user
- Blacklist checking → Words/links blocked
- Media restrictions → Only premium sends media
- Message auto-delete → Prevents spam buildup

---

## 🎯 Potential Improvements

Areas where we could enhance group interaction:

1. **Better feedback for media rejections**
   - More detailed reasons for rejection
   - Countdown to when they can upgrade
   - Visual progress on restrictions

2. **Group-wide announcements**
   - Broadcast to specific groups
   - Poll participation in groups
   - Group achievements/milestones

3. **Activity stats per group**
   - How many messages sent
   - Premium vs free split
   - Most active members

4. **Smarter deletion logic**
   - Keep important messages longer
   - Let admins pin important messages
   - Thread-based organization

5. **Enhanced group menu**
   - Quick stats dashboard
   - Group member leaderboard
   - Recent activity feed

6. **Admin controls per group**
   - Set custom deletion timers
   - Filter by content type
   - Manage permission overrides

7. **Interactive group experiences**
   - Polls & surveys
   - Challenges & contests
   - Rewards for participation

8. **Better error messages**
   - Contextual help messages
   - Quick action buttons
   - Educational tooltips

---

## 📊 Summary

The bot currently has a **well-designed, multi-layered system** for group interaction that:

✅ Respects privacy (sensitive features in DM)  
✅ Keeps groups clean (auto-delete messages)  
✅ Enforces rules (permission-based media restrictions)  
✅ Tracks activity (logs to Firestore)  
✅ Provides feedback (warnings, notifications)  
✅ Maintains security (rate limiting, moderation)  
✅ Supports languages (EN/ES)  
✅ Handles errors gracefully  

**Current State:** Functional and mature  
**Improvement Opportunities:** Many possible enhancements available

---

Would you like me to suggest specific improvements, or would you like to enhance a particular aspect of group interaction?
