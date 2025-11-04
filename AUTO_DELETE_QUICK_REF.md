# 🗑️ Auto-Delete Messages - Quick Start

## What It Does
Bot automatically **deletes all its messages from groups after 5 minutes**. Keeps groups clean! 📱

## How It Works
```
User: /library
    ↓
Bot: Sends response + schedules deletion
    ↓
⏱️ 5 minutes later
    ↓
🗑️ Message auto-deleted!
```

## Implementation

### New Files
1. `src/utils/messageAutoDelete.js` - Deletion logic
2. `src/bot/middleware/autoDeleteMiddleware.js` - Interception middleware

### Modified Files
1. `src/bot/index.js` - Added middleware
2. `start-bot.js` - Added cleanup on shutdown

---

## Testing

### Test in Group
```
1. Add bot to group
2. /library
3. Wait 5 minutes
4. Message disappears ✅
```

### Test in Private Chat
```
1. DM bot /library
2. Wait 5 minutes
3. Message stays ✅ (private chats not deleted)
```

---

## Configuration

**Change delete delay (default 5 min):**

File: `src/utils/messageAutoDelete.js` line 11

```javascript
MESSAGE_DELETE_DELAY = 5 * 60 * 1000   // 5 minutes (DEFAULT)
MESSAGE_DELETE_DELAY = 3 * 60 * 1000   // 3 minutes
MESSAGE_DELETE_DELAY = 10 * 60 * 1000  // 10 minutes
```

---

## Restart Bot

```bash
pm2 restart pnptv-bot
# OR
npm start
```

---

## Verify It Works

```bash
pm2 logs pnptv-bot | grep -i "scheduled\|deleted"

# Should show:
# ⏱️ Scheduled deletion for message 12345 in group 67890
# ✅ Auto-deleted bot message 12345 from group 67890
```

---

## Features

✅ **Group messages only** - Private chats not affected  
✅ **Automatic** - No setup needed per message  
✅ **Safe** - Handles permissions errors gracefully  
✅ **Clean shutdown** - Timers cleared when bot stops  
✅ **Configurable** - Easy to adjust 5-minute delay  

---

## What Happens

### Gets Deleted (5 min)
- Bot responses to commands in groups
- Error messages in groups
- Notifications in groups

### NOT Deleted
- Messages in private chats
- User messages
- Admin sticky messages

---

**Status:** ✅ Ready to use!
