# Firestore Database Schema - New Features

## Collections Overview

```
firestore/
├── config/
│   └── community                    # Community-wide settings
├── users/
│   └── {userId}/                    # User profiles with personality
├── videoCalls/
│   └── {callId}                     # Scheduled video calls
├── liveStreams/
│   └── {streamId}                   # Scheduled live streams
└── broadcasts/
    └── {broadcastId}                # Scheduled broadcasts
```

---

## 1. config/community

**Purpose**: Store welcome message and community settings

```javascript
{
  // Welcome Message Content
  welcomeTitle: string,              // e.g., "👋 Welcome to PNPtv!"
  santinoPMessage: string,           // Personal greeting from Santino
  communityDescription: string,      // About the community
  communityRules: string,            // Community guidelines
  
  // Personality System
  personalityChoices: [
    {
      emoji: string,                 // e.g., "🧜"
      name: string,                  // e.g., "Chem Mermaid"
      description: string            // Optional description
    }
  ],
  maxPersonalityMembers: number,     // Default: 1000
  currentPersonalityMemberCount: number,  // Incremented when user selects
  
  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Example Document**:
```javascript
{
  welcomeTitle: "👋 Welcome to PNPtv! The Telegram Community",
  santinoPMessage: "Hey everyone! I'm Santino, your community leader...",
  communityDescription: "A vibrant community of 2000+ members...",
  communityRules: "📋 Rules:\n1. Respect...",
  personalityChoices: [
    { emoji: "🧜", name: "Chem Mermaid", description: "Aquatic vibes" },
    { emoji: "👯", name: "Slam Slut", description: "Party lover" },
    { emoji: "🧮", name: "M*th Alpha", description: "Brainy type" },
    { emoji: "👑", name: "Spun Royal", description: "Elite member" }
  ],
  maxPersonalityMembers: 1000,
  currentPersonalityMemberCount: 523,
  createdAt: Timestamp(2025-01-10),
  updatedAt: Timestamp(2025-01-15)
}
```

---

## 2. users/{userId}

**Purpose**: Store user profiles with new personality badge

**New Fields Only** (existing fields remain):

```javascript
{
  // Existing fields...
  // ... (tier, email, bio, location, etc.)
  
  // NEW: Personality Choice
  personalityChoice: {
    emoji: string,                   // e.g., "🧜"
    name: string,                    // e.g., "Chem Mermaid"
    selectedAt: Timestamp            // When user selected
  },
  
  // NEW: Badge for display
  personalityBadge: string           // e.g., "🧜 Chem Mermaid" (optional cached value)
}
```

**Example Document**:
```javascript
{
  // Existing fields...
  userId: "123456789",
  username: "john_doe",
  firstName: "John",
  email: "john@example.com",
  tier: "pnp-member",
  bio: "Crypto enthusiast",
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    city: "New York"
  },
  
  // NEW: Personality Badge
  personalityChoice: {
    emoji: "🧮",
    name: "M*th Alpha",
    selectedAt: Timestamp(2025-01-15T10:30:00Z)
  },
  personalityBadge: "🧮 M*th Alpha"
}
```

---

## 3. videoCalls/{callId}

**Purpose**: Store scheduled video calls with notifications

```javascript
{
  // Basic Info
  groupId: number,                   // Telegram group ID
  title: string,                     // e.g., "Team Standup"
  description: string,               // Full description
  
  // Scheduling
  scheduledTime: Timestamp,          // When the call happens
  vcPlatform: string,                // "telegram", "discord", "zoom", etc.
  roomLink: string,                  // Join link (optional)
  
  // Metadata
  createdBy: string,                 // User ID of admin who scheduled
  status: string,                    // "scheduled" | "live" | "ended" | "cancelled"
  createdAt: Timestamp,
  
  // Notifications (internal use)
  notification_15min_pending: boolean,   // 15 min before
  notification_15min_time: Timestamp,
  notification_5min_pending: boolean,    // 5 min before
  notification_5min_time: Timestamp,
  notification_start_pending: boolean,   // At scheduled time
  notification_start_time: Timestamp,
  
  // Optional
  cancelledAt: Timestamp,
  cancelReason: string
}
```

**Example Document**:
```javascript
{
  groupId: -1001234567890,
  title: "Team Standup",
  description: "Weekly sync to discuss sprint progress",
  scheduledTime: Timestamp(2025-01-20T19:00:00Z),
  vcPlatform: "zoom",
  roomLink: "https://zoom.us/j/abc123",
  createdBy: "111111111",
  status: "scheduled",
  createdAt: Timestamp(2025-01-15T10:00:00Z),
  notification_15min_pending: false,
  notification_15min_time: Timestamp(2025-01-20T18:45:00Z),
  notification_5min_pending: false,
  notification_5min_time: Timestamp(2025-01-20T18:55:00Z),
  notification_start_pending: false,
  notification_start_time: Timestamp(2025-01-20T19:00:00Z)
}
```

---

## 4. liveStreams/{streamId}

**Purpose**: Store scheduled live streams with performer info

```javascript
{
  // Basic Info
  groupId: number,                   // Telegram group ID
  title: string,                     // e.g., "Weekend DJ Set"
  description: string,               // Full description
  
  // Performer
  performerId: string,               // User ID of performer
  performerName: string,             // Display name (cached for quick access)
  
  // Scheduling
  scheduledTime: Timestamp,          // When the stream goes live
  platform: string,                  // "telegram", "youtube", "twitch", "facebook"
  streamLink: string,                // Broadcast link
  
  // Status
  status: string,                    // "scheduled" | "live" | "ended" | "cancelled"
  viewerCount: number,               // Current viewers (updated during stream)
  
  // Metadata
  createdBy: string,                 // Admin who scheduled
  createdAt: Timestamp,
  liveStartedAt: Timestamp,          // When stream actually started
  endedAt: Timestamp,                // When stream ended
  
  // Notifications
  notification_15min_pending: boolean,
  notification_15min_time: Timestamp,
  notification_5min_pending: boolean,
  notification_5min_time: Timestamp,
  notification_start_pending: boolean,
  notification_start_time: Timestamp,
  
  // Optional
  cancelledAt: Timestamp,
  cancelReason: string,
  recordingUrl: string               // For playback after stream
}
```

**Example Document**:
```javascript
{
  groupId: -1001234567890,
  title: "Weekend DJ Set",
  description: "High energy electronic music mix",
  performerId: "222222222",
  performerName: "DJ Sky",
  scheduledTime: Timestamp(2025-01-25T20:00:00Z),
  platform: "twitch",
  streamLink: "https://twitch.tv/djsky",
  status: "scheduled",
  viewerCount: 0,
  createdBy: "111111111",
  createdAt: Timestamp(2025-01-15T14:00:00Z),
  notification_15min_pending: false,
  notification_5min_pending: false,
  notification_start_pending: false
}
```

---

## 5. broadcasts/{broadcastId}

**Purpose**: Store broadcast messages with scheduling

```javascript
{
  // Basic Info
  groupId: number,                   // Telegram group ID
  title: string,                     // e.g., "Daily Motivation"
  content: string,                   // Message content/text
  
  // Type & Format
  messageType: string,               // "text" | "photo" | "video" | "document" | "poll"
  mediaData: {                       // Only for non-text
    file_id: string,                 // Telegram file ID
    url: string,                     // External URL
    caption: string                  // Optional caption
  },
  parseMode: string,                 // "Markdown" | "HTML" | "plain"
  
  // Interactive Elements
  buttons: [
    {
      text: string,                  // Button label
      url: string,                   // HTTP link
      callback_data: string          // Callback ID
    }
  ],
  
  // Scheduling
  schedule: {
    type: string,                    // "once" | "recurring"
    time: Timestamp,                 // Execution time
    recurringPattern: string         // Cron: "0 9 * * *"
  },
  nextScheduledTime: Timestamp,      // Next run time
  
  // Status
  status: string,                    // "pending" | "ready" | "sent" | "cancelled"
  
  // Tracking
  sentCount: number,                 // Successful sends
  failureCount: number,              // Failed sends
  
  // Metadata
  createdBy: string,                 // Admin who created
  createdAt: Timestamp,
  readyAt: Timestamp,                // When queued to send
  sentAt: Timestamp,                 // When actually sent
  cancelledAt: Timestamp
}
```

**Example Documents**:

*One-time Message:*
```javascript
{
  groupId: -1001234567890,
  title: "Important Announcement",
  content: "🎉 We have exciting news!",
  messageType: "text",
  parseMode: "Markdown",
  schedule: {
    type: "once",
    time: Timestamp(2025-01-20T15:30:00Z)
  },
  nextScheduledTime: Timestamp(2025-01-20T15:30:00Z),
  status: "pending",
  sentCount: 0,
  failureCount: 0,
  createdBy: "111111111",
  createdAt: Timestamp(2025-01-15T10:00:00Z)
}
```

*Recurring Message:*
```javascript
{
  groupId: -1001234567890,
  title: "Daily Motivation",
  content: "🌟 You got this! Have an amazing day!",
  messageType: "text",
  parseMode: "Markdown",
  buttons: [
    {
      text: "💪 Like",
      callback_data: "like_123"
    }
  ],
  schedule: {
    type: "recurring",
    recurringPattern: "0 9 * * *"   // Daily at 9 AM
  },
  nextScheduledTime: Timestamp(2025-01-16T09:00:00Z),
  status: "pending",
  sentCount: 15,                     // Already sent 15 times
  failureCount: 0,
  createdBy: "111111111",
  createdAt: Timestamp(2025-01-01T08:00:00Z)
}
```

*Photo Broadcast:*
```javascript
{
  groupId: -1001234567890,
  title: "Meme Monday",
  content: "Check out this funny meme!",
  messageType: "photo",
  mediaData: {
    file_id: "AgADBAADn6cxG...",
    caption: "😂 Too relatable!"
  },
  parseMode: "Markdown",
  schedule: {
    type: "recurring",
    recurringPattern: "0 9 * * 1"   // Every Monday at 9 AM
  },
  status: "pending",
  createdBy: "111111111",
  createdAt: Timestamp(2025-01-10T10:00:00Z)
}
```

---

## Firestore Rules

Add these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Config - Read by bot only
    match /config/{document=**} {
      allow read: if request.auth.uid != null;
      allow write: if false;  // Admin only via console
    }
    
    // Video Calls - Read/Write by authenticated users
    match /videoCalls/{document=**} {
      allow read: if request.auth.uid != null;
      allow write: if false;  // Bot only
    }
    
    // Live Streams - Read/Write by authenticated users
    match /liveStreams/{document=**} {
      allow read: if request.auth.uid != null;
      allow write: if false;  // Bot only
    }
    
    // Broadcasts - Read/Write by authenticated users
    match /broadcasts/{document=**} {
      allow read: if request.auth.uid != null;
      allow write: if false;  // Bot only
    }
    
    // Users - Existing rules + new personalityChoice field
    match /users/{userId} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid == userId || request.auth.uid != null;
    }
  }
}
```

---

## Indexes Required

Create these Firestore indexes for performance:

| Collection | Fields | Filters |
|-----------|--------|---------|
| `videoCalls` | `groupId`, `status`, `scheduledTime` | Query by group + status |
| `liveStreams` | `groupId`, `status`, `scheduledTime` | Query by group + status |
| `broadcasts` | `status`, `createdAt` | Query pending broadcasts |
| `users` | `personalityChoice.name` | Query by personality type |

---

## Query Examples

### Get All Scheduled Video Calls
```javascript
db.collection('videoCalls')
  .where('groupId', '==', groupId)
  .where('status', '==', 'scheduled')
  .orderBy('scheduledTime', 'asc')
  .get()
```

### Get All Users with Personality Choice
```javascript
db.collection('users')
  .where('personalityChoice', '!=', null)
  .get()
```

### Get Personality Count by Type
```javascript
db.collection('users')
  .where('personalityChoice.name', '==', 'Chem Mermaid')
  .get()
```

### Get Pending Broadcasts
```javascript
db.collection('broadcasts')
  .where('status', '==', 'ready')
  .orderBy('createdAt', 'asc')
  .get()
```

---

## Maintenance

### Cleanup Old Data (runs automatically)
- Delete video calls older than 90 days
- Archive completed broadcasts
- Clean up old notifications

### Monitoring
- Track `currentPersonalityMemberCount` → stops at 1000
- Check notification status fields
- Monitor broadcast success/failure rates

---

**Schema Complete! Ready for deployment 🚀**
