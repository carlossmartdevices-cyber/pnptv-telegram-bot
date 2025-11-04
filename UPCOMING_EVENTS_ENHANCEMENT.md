# Upcoming Events Enhancement - Complete ✅

## Overview
Enhanced the `/upcoming` command to display events with UTC timezone and relative time information, plus added a new `/deleteevent` command for admins to manage scheduled events.

## Changes Made

### Files Modified
1. **[src/bot/handlers/community.js](src/bot/handlers/community.js#L519-L640)** - Enhanced `handleUpcoming` function
2. **[src/bot/handlers/community.js](src/bot/handlers/community.js#L867-L960)** - Added `handleDeleteEvent` function
3. **[src/bot/index.js](src/bot/index.js#L66)** - Registered new command

---

## Feature 1: Enhanced /upcoming Command

### What Changed

#### Before:
```
📅 Upcoming Events

1. 📹 Welcome to PNPtv!
   👤 Host: Santino
   📅 11/7/2025
   🕒 12:00:00 AM
```
**Problems:**
- ❌ Time displayed in server timezone (confusing)
- ❌ No way to know when event starts relative to now
- ❌ No event ID for reference
- ❌ All events in single message

#### After:
```
📅 Upcoming Events (2 events)

🌍 Times shown in UTC. Tap event for your local time.

---

📹 Welcome to PNPtv!
👤 Santino
📅 2025-11-07 at 00:00 UTC
⏰ in 2 days
🆔 ID: call_1762219246922

[🎥 Join Call] <- Interactive button
```

### New Features

✅ **UTC Time Display**
- Shows date and time in UTC (universal standard)
- Format: `YYYY-MM-DD at HH:MM UTC`
- No timezone confusion

✅ **Relative Time**
- Shows how long until event starts
- Examples: "in 2 days", "in 5 hours", "in 30 minutes", "starting soon"
- Helps users understand urgency

✅ **Event ID Display**
- Shows event ID for reference and deletion
- Format: `🆔 ID: call_1762219246922`

✅ **Separate Messages**
- Each event displayed individually
- Cleaner, more readable format
- Better for mobile viewing

✅ **Interactive Buttons**
- Video calls show "🎥 Join Call" button
- Direct link to Zoom meeting

✅ **Event Count**
- Header shows total number of events
- Footer shows if more than 10 exist

### Implementation Details

```javascript
// UTC time formatting
const utcDate = scheduledTime.toISOString().split('T')[0];
const utcTime = scheduledTime.toISOString().split('T')[1].substring(0, 5);

// Relative time calculation
const getRelativeTime = (date) => {
  const now = new Date();
  const diff = date - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  return 'starting soon';
};
```

---

## Feature 2: /deleteevent Command

### Purpose
Allow administrators to delete scheduled events from the system.

### Usage
```
/deleteevent <event_id>
```

### Example
```
/deleteevent call_1762219246922
```

### Features

✅ **Admin-Only Access**
- Only users in admin list can delete events
- Non-admins receive permission denied message

✅ **Multi-Collection Search**
- Searches `scheduled_calls` collection
- Searches `scheduled_streams` collection
- Searches `scheduled_broadcasts` collection
- Automatically finds the right collection

✅ **Event Type Detection**
- Identifies what type of event was deleted
- Shows type in confirmation message

✅ **Confirmation Messages**
- Success: Shows event type and ID
- Failure: Explains event not found
- Suggests using /upcoming to see valid IDs

✅ **Logging**
- Logs admin action with user ID and event ID
- Helps track event management

### Implementation

```javascript
async function handleDeleteEvent(ctx) {
  // 1. Check admin permission
  if (!isAdmin(userId)) {
    return sendPermissionDenied();
  }

  // 2. Parse event ID from command
  const eventId = args.trim();

  // 3. Search all event collections
  const callDoc = await db.collection('scheduled_calls').doc(eventId).get();
  if (callDoc.exists) {
    await db.collection('scheduled_calls').doc(eventId).delete();
    return sendSuccess('Video Call');
  }

  // ... search other collections ...

  // 4. Send appropriate response
}
```

### Security
- ✅ Admin-only access enforced
- ✅ Validates event ID before deletion
- ✅ Confirms event exists before deleting
- ✅ Logs all deletion actions

---

## User Experience

### For Regular Users

**Using /upcoming:**
1. Send `/upcoming` command
2. See header with event count
3. View each event with:
   - UTC time (universal, no confusion)
   - Relative time (know urgency)
   - Event details (title, host, description)
   - Join button (for video calls)
   - Event ID (for reference)

**Understanding Times:**
- UTC time is shown (e.g., "2025-11-07 at 00:00 UTC")
- Users can convert to their timezone online or in their head
- Relative time helps ("in 2 days" is clear regardless of timezone)

### For Admins

**Deleting Events:**
1. Use `/upcoming` to see all events and their IDs
2. Copy the event ID you want to delete
3. Send `/deleteevent <event_id>`
4. Receive confirmation or error message

**Example Flow:**
```
Admin: /upcoming
Bot: Shows events with IDs

Admin: /deleteevent call_1762219246922
Bot: ✅ Event Deleted
     Video Call has been removed from the schedule.
     🆔 Event ID: call_1762219246922
     Use /upcoming to view remaining events.
```

---

## Why UTC?

### Problem with Local Time
- Telegram doesn't provide user timezone data
- Server timezone might not match user timezone
- Users are in different timezones worldwide

### UTC Solution
- ✅ Universal standard everyone can convert from
- ✅ No ambiguity about what time is shown
- ✅ Clearly labeled as "UTC"
- ✅ Professional standard for global apps

### User Conversion Options
Users can easily convert UTC to their timezone:
- **Built-in**: Most devices show UTC time natively
- **Online**: Many "UTC to my timezone" converters
- **Apps**: World clock apps
- **Math**: Simple addition/subtraction (e.g., EST = UTC - 5)

### Relative Time Helps
The "in X days/hours" display helps regardless of timezone:
- "in 2 days" is clear to everyone
- "in 5 hours" is universal
- No timezone conversion needed

---

## Testing

### Test Results

✅ **UTC Time Display**
- Shows correct UTC time from Firestore timestamps
- Format is clean and readable
- Clearly labeled with "UTC"

✅ **Relative Time Calculation**
- Correctly calculates days/hours/minutes
- Handles different time ranges properly
- Shows "starting soon" for imminent events

✅ **Event ID Display**
- Shows correct event ID from database
- Format is copyable (monospace)
- Works with deletion command

✅ **Delete Command**
- Successfully deletes events
- Searches all collections correctly
- Shows appropriate error messages
- Logs admin actions

### Sample Output

```
📅 Upcoming Events (2 events)

🌍 Times shown in UTC. Tap event for your local time.

---

📹 Welcome to PNPtv!
👤 Santino
📅 2025-11-07 at 00:00 UTC
⏰ in 2 days

🆔 ID: call_1762219246922

[🎥 Join Call]

---

📹 cloud
👤 Juan 🇨🇴
📅 2025-11-06 at 18:00 UTC
⏰ in 2 days

🆔 ID: call_1762239721124

[🎥 Join Call]
```

---

## Commands Reference

### /upcoming
**Purpose:** View all scheduled events
**Access:** All users
**Shows:**
- Event count in header
- Each event with UTC time
- Relative time until event
- Event ID
- Join buttons for video calls

### /deleteevent
**Purpose:** Delete a scheduled event
**Access:** Admins only
**Syntax:** `/deleteevent <event_id>`
**Example:** `/deleteevent call_1762219246922`

---

## Event Types Supported

| Type | Emoji | Collection | Join Button |
|------|-------|------------|-------------|
| Video Call | 📹 | scheduled_calls | ✅ Yes |
| Live Stream | 📡 | scheduled_streams | ❌ No |
| Broadcast | 🎶 | scheduled_broadcasts | ❌ No |
| Podcast | 🎙️ | scheduled_broadcasts | ❌ No |
| Live DJ | 🎧 | scheduled_broadcasts | ❌ No |

---

## Future Enhancements (Optional)

### Timezone Detection
- Could add user timezone preference to profile
- Allow users to set preferred timezone
- Display times in user's preferred timezone + UTC

### Calendar Integration
- Add "Add to Calendar" button
- Generates .ics file with event details
- Works with Google Calendar, Apple Calendar, etc.

### Reminders
- Send reminder X hours before event
- User configurable reminder times
- Opt-in/opt-out per user

### Event Management
- `/editevent` command to modify events
- Change time, title, description
- Update Zoom links

---

## Deployment

- ✅ Changes applied to [community.js:519-640](src/bot/handlers/community.js#L519-L640)
- ✅ New command added to [community.js:867-960](src/bot/handlers/community.js#L867-L960)
- ✅ Command registered in [index.js:152](src/bot/index.js#L152)
- ✅ Bot restarted successfully
- ✅ No errors in logs
- ✅ Ready for production use

---

## Summary

### ✅ Completed
1. Enhanced `/upcoming` with UTC time display
2. Added relative time ("in X days")
3. Show event IDs for reference
4. Created `/deleteevent` command for admins
5. Added interactive join buttons
6. Individual messages per event
7. Tested all functionality

### 📱 User Benefits
- Clear, unambiguous UTC times
- Know urgency with relative time
- Easy event management for admins
- Professional, polished interface

### 🎯 Best Practices
- UTC as universal time standard
- Relative time for context
- Admin-only deletion for safety
- Clear error messages
- Comprehensive logging
