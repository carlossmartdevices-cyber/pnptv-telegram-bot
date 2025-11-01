# 📅 Scheduled Broadcasts Feature - Complete Implementation Guide

**Date:** November 1, 2025  
**Status:** ✅ IMPLEMENTED & READY FOR PRODUCTION  
**Maximum Scheduled Broadcasts:** 12 concurrent broadcasts

---

## 🎯 Feature Overview

The scheduled broadcast feature allows admins to plan and schedule up to 12 future broadcast messages that will be automatically sent at the specified time. No manual intervention is required - broadcasts execute automatically based on the schedule.

---

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Usage Guide](#usage-guide)
3. [Database Schema](#database-schema)
4. [Execution System](#execution-system)
5. [Admin Commands](#admin-commands)
6. [API Reference](#api-reference)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│                   Admin Panel                   │
│  "📅 Scheduled" button in admin menu            │
└──────────────────┬──────────────────────────────┘
                   │
                   ├─→ View scheduled broadcasts
                   ├─→ Create new scheduled broadcast
                   └─→ Cancel/manage existing broadcasts
                   │
┌──────────────────┴──────────────────────────────┐
│         Broadcast Wizard (5-step flow)          │
│  1. Select date/time                            │
│  2. Choose language target (EN/ES/All)          │
│  3. Select user status (All/Subscribers/Free)   │
│  4. Upload media (optional)                     │
│  5. Add message text & buttons (optional)       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│     Firestore Collection: scheduledBroadcasts   │
│  Stores: time, users, content, status           │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│     Scheduler Service (every 30 seconds)        │
│  Checks for due broadcasts                      │
│  Executes matching broadcasts                   │
│  Updates status & statistics                    │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────┐
│          Telegram API                           │
│  Sends messages to filtered users               │
│  Rate limited (100ms between sends)             │
└─────────────────────────────────────────────────┘
```

### Files Modified/Created

| File | Type | Purpose |
|------|------|---------|
| `src/services/scheduledBroadcastService.js` | ✨ NEW | Core scheduling service |
| `src/services/scheduler.js` | 📝 MODIFIED | Initialize broadcast executor |
| `src/bot/handlers/admin.js` | 📝 MODIFIED | Add scheduled UI & handlers |
| `src/bot/index.js` | 📝 MODIFIED | Add date input handler |
| `src/config/menus.js` | 📝 MODIFIED | Add "Scheduled" button |
| `start-bot.js` | 📝 MODIFIED | Initialize scheduler on startup |

---

## 💡 Usage Guide

### Creating a Scheduled Broadcast

**Step 1: Enter Admin Panel**
```
/admin → ⚙️ Admin Panel
```

**Step 2: Access Scheduled Broadcasts**
```
Click: 📅 Scheduled
```

**Step 3: Create New Broadcast**
```
Click: 📢 Schedule Broadcast
```

**Step 4: Enter Date & Time**
```
Format: DD/MM/YYYY HH:MM
Example: 25/12/2024 14:30

Time is in your local timezone
```

**Step 5: Follow Broadcast Wizard**
- Select language (EN, ES, or All)
- Select target users (All, Subscribers, Free, Churned)
- Upload media (optional)
- Write message text
- Add buttons (optional)
- Review confirmation
- Click: ✅ Save broadcast

**Step 6: Automatic Execution**
```
Broadcast automatically sends at scheduled time
No further action needed
```

### Viewing Scheduled Broadcasts

```
/admin → ⚙️ Admin Panel
       → 📅 Scheduled
       
Shows:
├─ Total count (e.g., 3/12)
├─ Time remaining
├─ Target language
├─ Target status
├─ Message preview
└─ Cancel option (for each)
```

### Canceling a Broadcast

```
/admin → 📅 Scheduled
       → Click ✖️ (cancel button on broadcast)
       
Status changes to "cancelled"
Broadcast will NOT execute
```

---

## 📊 Database Schema

### Firestore Collection: `scheduledBroadcasts`

```javascript
{
  // Document ID: Auto-generated by Firestore
  
  // User Targeting
  targetLanguage: "en" | "es" | "all",
  targetStatus: "all" | "subscribers" | "free" | "churned",
  
  // Message Content
  text: "Message content string",
  media: {
    type: "photo" | "video" | "document",
    fileId: "telegram_file_id"
  } || null,
  buttons: [
    [{ text: "Button Text", url: "https://example.com" }]
  ] || null,
  
  // Scheduling
  scheduledTime: Timestamp("2024-12-25T14:30:00Z"),
  
  // Metadata
  adminId: 123456789,
  createdAt: Timestamp(current_time),
  updatedAt: Timestamp(current_time) || null,
  
  // Status Tracking
  status: "pending" | "sent" | "failed" | "cancelled",
  sentAt: Timestamp || null,
  failedAt: Timestamp || null,
  cancelledAt: Timestamp || null,
  failureReason: "error message" || null,
  
  // Statistics (after execution)
  statistics: {
    sent: 1234,
    failed: 5,
    skipped: 23
  }
}
```

### Example Document

```javascript
{
  targetLanguage: "es",
  targetStatus: "subscribers",
  text: "¡Actualización especial para miembros premium!",
  media: null,
  buttons: [
    [{ text: "Ver más", url: "https://example.com/update" }]
  ],
  scheduledTime: "2024-12-25T14:30:00.000Z",
  adminId: 123456789,
  createdAt: "2024-12-20T10:00:00.000Z",
  updatedAt: null,
  status: "pending",
  sentAt: null,
  failedAt: null,
  cancelledAt: null,
  failureReason: null,
  statistics: {
    sent: 0,
    failed: 0,
    skipped: 0
  }
}
```

---

## ⏰ Execution System

### How It Works

```
1. Bot starts (start-bot.js)
   ↓
2. initializeScheduler(bot) is called
   ↓
3. Cron job starts (runs every 30 seconds)
   ↓
4. Check for broadcasts where:
   - status === "pending"
   - scheduledTime <= now
   ↓
5. For each matching broadcast:
   ├─ Get filtered users (by language & status)
   ├─ Send message to each user (100ms delay)
   ├─ Track sent/failed/skipped count
   └─ Update broadcast status to "sent"
   ↓
6. Wait 30 seconds, repeat
```

### Timing

- **Check Interval:** Every 30 seconds
- **Rate Limit:** 100ms between sends (prevents Telegram throttling)
- **Accuracy:** ±30 seconds (broadcast sends within 30 seconds of scheduled time)

### Example Timeline

```
14:30:00 - Scheduled broadcast time
14:30:15 - Check runs, broadcast found
14:30:16 - Start sending to 1000 users
14:31:40 - All users sent (~100 seconds for 1000 users)
14:31:40 - Status updated to "sent"
14:31:40 - Final statistics saved
```

### Error Handling

```javascript
Blocked users:
  - Silently skipped (user blocked bot)
  - Counted in statistics as "skipped"

Network errors:
  - Counted as "failed"
  - No retry (future enhancement)

Rate limit from Telegram:
  - 100ms delay prevents this
  - If occurs, broadcast marked as "failed"
```

---

## 🎛️ Admin Commands

### Menu Location

```
/admin → ⚙️ Admin Panel → 📅 Scheduled
```

### Buttons & Actions

| Button | Action | Result |
|--------|--------|--------|
| 📢 Schedule Broadcast | Creates new scheduled broadcast | Enter date/time wizard |
| 🔄 Refresh | Reloads the scheduled list | Shows latest broadcasts |
| 📅 View Scheduled | Shows all broadcasts | Lists pending/sent/cancelled |
| ✖️ (on broadcast) | Cancels the broadcast | Status → "cancelled" |
| « Back | Returns to admin panel | Goes to main admin menu |

---

## 🔌 API Reference

### Service Functions

#### `canScheduleBroadcast()`
Check if a new broadcast can be scheduled (< 12 limit)

```javascript
const canSchedule = await canScheduleBroadcast();
// Returns: boolean
```

#### `getScheduledBroadcastCount()`
Get current count of pending broadcasts

```javascript
const count = await getScheduledBroadcastCount();
// Returns: number (0-12)
```

#### `getScheduledBroadcasts()`
Get all pending broadcasts (sorted by time)

```javascript
const broadcasts = await getScheduledBroadcasts();
// Returns: Array of broadcast objects
```

#### `getScheduledBroadcast(broadcastId)`
Get a specific scheduled broadcast

```javascript
const broadcast = await getScheduledBroadcast(id);
// Returns: Broadcast object or null
```

#### `createScheduledBroadcast(broadcastData)`
Create and save a new scheduled broadcast

```javascript
const broadcastId = await createScheduledBroadcast({
  targetLanguage: "es",
  targetStatus: "subscribers",
  text: "Message text",
  media: null,
  buttons: null,
  scheduledTime: new Date("2024-12-25T14:30:00"),
  adminId: 123456789
});
// Returns: broadcastId or null
```

#### `cancelScheduledBroadcast(broadcastId)`
Cancel a scheduled broadcast

```javascript
const success = await cancelScheduledBroadcast(id);
// Returns: boolean
```

#### `updateScheduledBroadcast(broadcastId, updates)`
Update broadcast fields (date, content, etc)

```javascript
const success = await updateScheduledBroadcast(id, {
  scheduledTime: new Date("2024-12-26T15:00:00"),
  text: "Updated message"
});
// Returns: boolean
```

#### `markBroadcastAsSent(broadcastId, statistics)`
Mark broadcast as successfully sent

```javascript
const success = await markBroadcastAsSent(id, {
  sent: 1234,
  failed: 5,
  skipped: 23
});
// Returns: boolean
```

---

## 📝 Examples

### Example 1: Schedule Christmas Promotion

**Scenario:** Schedule a Christmas promotion to all Spanish-speaking premium subscribers on December 25 at 2 PM

**Steps:**
1. Click 📅 Scheduled
2. Click 📢 Schedule Broadcast
3. Enter: `25/12/2024 14:00`
4. Select 🇪🇸 Spanish only
5. Select 💎 Active Subscribers
6. Skip media
7. Enter text:
   ```
   🎄 ¡Promoción Navideña Especial! 🎄
   
   Como miembro premium, recibe 50% de descuento
   en tu próxima compra hoy.
   
   Válido solo hoy, 25 de diciembre.
   ```
8. Add button:
   ```
   Reclamar oferta | https://promo.example.com/xmas
   ```
9. Review and save

**Result:**
- Broadcast saves to Firestore
- At exactly Dec 25, 14:00, message sends to all Spanish premium users
- Admin receives final stats: "Sent: 1,523 | Failed: 3 | Skipped: 8"

### Example 2: Weekly Newsletter

**Scenario:** Schedule a weekly newsletter every Monday at 10 AM to all users

**Steps:**
1. Click 📅 Scheduled (repeat weekly)
2. Create broadcast for next Monday at 10:00
3. Select 🌐 All Languages
4. Select 👥 All Status
5. Upload newsletter image (📷)
6. Write newsletter content
7. Add multiple buttons for sections
8. Save

**Scheduling Pattern:**
```
Monday Dec 23, 2024 @ 10:00 AM → Broadcast 1
Monday Dec 30, 2024 @ 10:00 AM → Broadcast 2
Monday Jan 6, 2025 @ 10:00 AM → Broadcast 3
(etc. - max 12 total)
```

### Example 3: Churn Recovery Campaign

**Scenario:** Target users with expired subscriptions to win them back

**Steps:**
1. Click 📅 Scheduled
2. Schedule for weekend at 11:00 AM
3. Select 🌐 All Languages
4. Select ⏰ Expired subscriptions
5. Add motivational message:
   ```
   ⏰ ¡Te echamos de menos!
   
   Tu membresía premium ha expirado.
   Vuelve y disfruta de contenido exclusivo.
   
   Especial: 7 días gratis con tu próxima suscripción.
   ```
6. Add button:
   ```
   Reactivar membresía | https://example.com/reactivate
   ```
7. Save

**Result:**
- Only users with expired subscriptions receive message
- Can recover lapsed subscribers

---

## 🔧 Troubleshooting

### Broadcasts Not Executing

**Check List:**
1. ✅ Broadcast status is "pending"
2. ✅ Scheduled time has passed
3. ✅ Bot is running
4. ✅ Scheduler is initialized

**Debug Steps:**
```bash
# Check bot logs
tail -f pm2_logs/pnptv-bot.log | grep -i broadcast

# Look for scheduler initialization
grep "Scheduled broadcast executor initialized" pm2_logs/pnptv-bot.log

# Check for errors during execution
grep -i "error executing scheduled broadcast" pm2_logs/pnptv-bot.log
```

### Broadcasts Execute But Don't Send

**Possible Causes:**
1. All users have blocked the bot → statistics show high "skipped"
2. Network connectivity issue → statistics show high "failed"
3. Incorrect user filtering → no matching users

**Solution:**
```javascript
// View broadcast details in Firestore
db.collection('scheduledBroadcasts').doc(broadcastId).get()

// Check statistics
statistics: {
  sent: 0,
  failed: 0,
  skipped: 1500
}

// If all skipped: likely all blocked bot
// If mostly failed: network issue
// If all zeros: user filtering prevented sending
```

### "Limit of 12 reached" Error

**Solution:**
1. Cancel existing broadcasts that are no longer needed
2. Edit their date to be sooner (if appropriate)
3. Wait for pending broadcasts to execute (they move to "sent" status, freeing the slot)

### Date Format Issues

**Valid Format:**
```
DD/MM/YYYY HH:MM
```

**Examples:**
```
✅ 25/12/2024 14:30
✅ 01/01/2025 09:00
✅ 15/11/2024 23:59
❌ 12/25/2024 14:30 (wrong order)
❌ 25-12-2024 14:30 (wrong separator)
❌ 25/12/2024 (missing time)
```

**Fix:**
- Re-enter using DD/MM/YYYY HH:MM format
- Ensure time is in 24-hour format (00:00 - 23:59)

---

## 📊 Monitoring

### View Broadcast Execution Logs

```bash
# Real-time monitoring
tail -f pm2_logs/pnptv-bot.log | grep "broadcast"

# Find execution records
grep "Executing scheduled broadcast" pm2_logs/pnptv-bot.log
grep "marked as sent" pm2_logs/pnptv-bot.log

# Check for errors
grep "Error executing scheduled broadcast" pm2_logs/pnptv-bot.log
```

### Firestore Query Examples

```javascript
// All pending broadcasts
db.collection('scheduledBroadcasts')
  .where('status', '==', 'pending')
  .orderBy('scheduledTime', 'asc')
  .get()

// All executed broadcasts
db.collection('scheduledBroadcasts')
  .where('status', '==', 'sent')
  .orderBy('sentAt', 'desc')
  .get()

// Failed broadcasts
db.collection('scheduledBroadcasts')
  .where('status', '==', 'failed')
  .get()

// Broadcasts by admin
db.collection('scheduledBroadcasts')
  .where('adminId', '==', adminUserId)
  .get()
```

---

## 🚀 Performance

### Throughput

```
User Count | Estimated Duration
─────────────────────────────
100        | ~10 seconds
500        | ~50 seconds
1000       | ~100 seconds
5000       | ~500 seconds (~8 min)
10000      | ~1000 seconds (~17 min)
```

Calculation: (user_count × 100ms) = total_time

### Optimization Tips

1. **Schedule during off-peak times** (3 AM - 6 AM)
   - Reduces bot load
   - Faster execution

2. **Use language filtering** instead of "all"
   - Reduces target users
   - Faster execution
   - Better targeting

3. **Target specific status** (subscribers vs all)
   - Further reduces users
   - More relevant messages

4. **Limit scheduled broadcasts**
   - Keep count under 5 when possible
   - Prevents resource overload

---

## 📋 Limits & Constraints

| Setting | Limit | Notes |
|---------|-------|-------|
| Max Scheduled | 12 | Can increase if needed |
| Check Interval | 30 seconds | ±30 sec accuracy |
| Rate Limit | 100ms/message | Telegram requirement |
| Message Size | 4096 chars | Telegram API limit |
| Buttons | 10 max | Telegram API limit |
| Media Size | 20MB | Telegram API limit |
| Text Length | 4096 | Telegram limit |

---

## 🔐 Security

### Access Control

```javascript
// Only admins can schedule broadcasts
if (!isAdmin(ctx.from.id)) {
  return; // Access denied
}
```

### Data Validation

```javascript
// Date must be in future
if (scheduledTime <= now) {
  return error("Date must be in the future");
}

// Must have valid format
if (!isValidDateFormat(dateStr)) {
  return error("Invalid format");
}
```

### Audit Trail

```javascript
// All broadcasts tracked
{
  adminId: creator_id,
  createdAt: timestamp,
  updatedAt: timestamp,
  targetLanguage: filtered_language,
  targetStatus: filtered_status,
  status: execution_status,
  statistics: send_stats
}
```

---

## ✨ Future Enhancements

Potential improvements for future versions:

1. **Recurring Broadcasts**
   - Schedule: "Every Monday at 10:00 AM"
   - Set end date
   - Automatic repeat

2. **A/B Testing**
   - Send two versions to different user groups
   - Track engagement
   - Compare performance

3. **Scheduled Edits**
   - Modify message before execution
   - Reschedule to different time
   - Change target users

4. **Analytics Dashboard**
   - View send stats per broadcast
   - Track click-through rates
   - Monitor user engagement

5. **Delivery Reports**
   - Detailed per-user delivery status
   - Export statistics
   - Performance graphs

6. **Template System**
   - Save common message templates
   - Quick reuse
   - Bulk scheduling

---

## 📞 Support

**Issues or Questions?**

1. Check logs: `tail -f pm2_logs/pnptv-bot.log`
2. Review Firestore: Check `scheduledBroadcasts` collection
3. Test execution: Manually trigger broadcast to verify system works
4. Contact admin: Reference logs and broadcast ID

---

**Scheduled Broadcasts Feature: ✅ PRODUCTION READY**

The scheduled broadcast system is fully functional, tested, and ready for production use with up to 12 concurrent future broadcasts, automatic execution, and comprehensive admin controls.
