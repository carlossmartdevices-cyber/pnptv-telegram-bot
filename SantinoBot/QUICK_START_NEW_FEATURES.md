# 🚀 Quick Start - New SantinoBot Features

## What's New?

5 Major Features Added:
1. **Configurable Welcome Messages** - Set once, update anytime from Firestore
2. **Personality Badges** - Users choose personality type (limited to 1000)
3. **Video Call Scheduler** - Admin schedules calls with auto-reminders
4. **Live Stream Scheduler** - Admin selects performer for live shows
5. **Broadcast System** - Send messages now, once, or recurring (daily/weekly/etc)

---

## Step 1: Deploy & Test

```bash
# Install (if needed)
npm install

# Run bot
npm start

# In another terminal, test:
curl http://localhost:3000/health
```

---

## Step 2: Set Up Welcome Message

### Option A: Via Firestore Console (Recommended)
1. Go to Firebase Console → Firestore
2. Create collection: `config`
3. Create document: `community`
4. Add these fields:
```json
{
  "welcomeTitle": "👋 Welcome to PNPtv! The Telegram Community",
  "santinoPMessage": "Hey everyone! I'm Santino. This is our space to connect, grow, and have fun together. Let's make it amazing! 🚀",
  "communityDescription": "PNPtv is a thriving community of [X] members who share ideas, support each other, and celebrate wins together.",
  "communityRules": "📋 **Community Rules:**\n1. Respect all members\n2. No spam\n3. Keep it relevant\n4. No hate speech\n5. Have fun!",
  "personalityChoices": [
    {"emoji": "🧜", "name": "Chem Mermaid", "description": "Aquatic vibes"},
    {"emoji": "👯", "name": "Slam Slut", "description": "Party lover"},
    {"emoji": "🧮", "name": "M*th Alpha", "description": "Brainy type"},
    {"emoji": "👑", "name": "Spun Royal", "description": "Elite member"}
  ],
  "maxPersonalityMembers": 1000,
  "currentPersonalityMemberCount": 0
}
```

### Option B: Via Bot Command (Admin-only)
```
/configwelcome
```
Then follow the inline options or use individual commands:
```
/setwelcometitle Your Title Here
/setsantinomsg Your personal message
/setcommunitydesc Community description
/setcommunityrules 1. Rule\n2. Rule...
```

---

## Step 3: Test New Member Flow

1. **Add yourself** to the group if not already
2. **Leave and rejoin** with a test account
3. **Should see**:
   - ✅ Community welcome message (auto-deletes in 60s)
   - ✅ Personality choice buttons
   - ✅ Tier information (auto-deletes in 45s)

---

## Step 4: Admin Commands

### View All Events
```
/listscheduled
```

### Schedule a Video Call
```
/schedulevideocall
Title: Team Meeting
Time: 2025-01-20 19:00
Platform: telegram
Description: Weekly sync
Link: https://meet.google.com/abc-def-ghi
```

### Schedule a Live Stream
1. First, find the performer's Telegram ID
2. Use command:
```
/schedulelivestream
Title: Live DJ Set
PerformerID: 123456789
Time: 2025-01-25 20:00
Platform: twitch
Description: Electronic music set
Link: https://twitch.tv/username
```

### Send Broadcast Now
```
/broadcast
Title: Important Update
Content: Check out our new feature!
Type: text
Schedule: now
```

### Send Broadcast at Specific Time
```
/broadcast
Title: Daily Motivation
Content: 🌟 You got this!
Type: text
Schedule: once
Time: 2025-01-20 09:00
```

### Send Broadcast Recurring
```
/broadcast
Title: Daily Tip
Content: 💡 Drink water!
Type: text
Schedule: recurring
Pattern: 0 9 * * *
```

#### Common Cron Patterns
| Pattern | Meaning |
|---------|---------|
| `0 9 * * *` | Daily at 9 AM |
| `0 9 * * 0` | Every Sunday at 9 AM |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 */2 * * *` | Every 2 hours |
| `0 9,17 * * *` | 9 AM and 5 PM daily |

---

## Step 5: Monitor in Firestore

### Collections to Check

**`config/community`**
- Current personality count
- Welcome message content

**`users/{userId}`**
- Look for `personalityChoice` field
- Shows emoji and name

**`videoCalls/`**
- All scheduled video calls
- Status: scheduled, live, ended, cancelled

**`liveStreams/`**
- All scheduled live streams
- Performer info

**`broadcasts/`**
- All created broadcasts
- Status and sent count

---

## Step 6: Testing Checklist

- [ ] New member sees welcome message
- [ ] Personality choice button works
- [ ] Personality saved to user profile
- [ ] Video call scheduled successfully
- [ ] Live stream created
- [ ] Broadcast sent immediately (if schedule: now)
- [ ] Check logs for errors
- [ ] Admin-only commands blocked for non-admins

---

## File Reference

| Feature | Main File |
|---------|-----------|
| Welcome Config | `src/config/communityConfig.js` |
| Personality | `src/handlers/personalityHandler.js` |
| Video Calls | `src/services/videoCallService.js` |
| Live Streams | `src/services/liveStreamService.js` |
| Broadcasts | `src/services/broadcastService.js` |
| Admin Commands | `src/handlers/adminCommands.js` |
| Bot Main | `src/bot.js` |
| Group Handler | `src/handlers/groupHandlers.js` |

---

## Troubleshooting

### New member doesn't see welcome message
- ✅ Check bot is **admin** in group
- ✅ Check `config/community` exists in Firestore
- ✅ Check bot logs for errors

### Personality choice button doesn't work
- ✅ Check `personalityHandler.js` is imported in `bot.js`
- ✅ Check callback query handler exists
- ✅ Verify Firebase permissions

### Scheduled events don't trigger
- ✅ Check cron expressions are valid
- ✅ Ensure bot is running continuously
- ✅ Check server timezone

### Admin commands not working
- ✅ Verify user is **admin** or **creator** in group
- ✅ Check command syntax matches exactly
- ✅ Check logs for error messages

---

## Next: Deployment

Once tested locally:

```bash
# Deploy to Railway (recommended)
# See DEPLOYMENT.md in SantinoBot/

# Or use PM2 (local server)
pm2 start src/bot.js --name "santino-bot"
```

---

**All features ready to go! 🎉**

For detailed docs: See `NEW_FEATURES_GUIDE.md`
