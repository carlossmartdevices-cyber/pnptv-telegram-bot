# 📤 Post-to-Channel Admin Feature Guide

## Overview

The **Post-to-Channel System** is an **admin-only feature** that enables administrators to:
- Select high-performing posts
- Publish them to multiple Telegram channels
- Schedule batch broadcasts
- Track engagement metrics
- Manage channel publications

---

## Access & Permissions

### Who Can Use This Feature?
- **Only Telegram Admin IDs** specified in `process.env.ADMIN_IDS`
- Regular users cannot access this feature

### Authorization Check
```javascript
// Every function includes this check:
if (!isAdmin(ctx.from.id)) {
  await ctx.reply(t(ctx, 'errors.unauthorized'));
  return;
}
```

---

## Feature Overview

### 📱 Main Entry Points

```
/admin (command)
  ↓
Admin Panel
  ↓
📤 Post-to-Channel Panel (NEW!)
  ↓
├─ 📝 Create Broadcast
├─ 📅 View Scheduled
├─ 📊 Analytics
└─ « Back
```

---

## Complete User Flow

### 1️⃣ Access Post-to-Channel Panel

**Command:** `/admin` or button callback

```
Admin Menu
  ↓
[📤 Post-to-Channel Panel] ← Click this
  ↓
Post-to-Channel Panel Main Menu
```

---

### 2️⃣ Create Broadcast (Step-by-Step)

#### Step 1: Select Posts Source

```
📝 Broadcast Wizard
Step 1: Select posts to publish

Choose your options:
1. 🔥 Top Posts        (Most liked/shared)
2. 📅 Recent Posts     (Latest created)
3. 📌 Pinned Posts     (Admin-pinned)
4. 👤 By User         (Specific user's posts)
5. 🏷️ By Hashtag      (Filter by tag)
```

**Option Details:**

| Option | What It Does | Use Case |
|--------|-------------|----------|
| 🔥 Top Posts | Fetches 10 most-engaged posts | Daily digest of best content |
| 📅 Recent | Gets latest 10 posts | Fresh content broadcast |
| 📌 Pinned | Shows admin-pinned posts | Curated content |
| 👤 By User | Filters single user's posts | Feature user content |
| 🏷️ By Tag | Shows posts with hashtag | Themed broadcasts |

---

#### Step 2: Select Individual Posts

```
☐ 1 | This is my first post...
☐ 2 | Another amazing post...
☑️ 3 | A very popular post...
☐ 4 | More content here...

(0 selected)

[✅ Confirm] [« Back]
```

**Action:** Click each post checkbox to select/unselect

After selection:
```
☑️ 1 | This is my first post...
☑️ 3 | A very popular post...

(2 selected)

[✅ Confirm] [« Back]
```

---

#### Step 3: Select Channels

```
📢 Step 2: Select Channels

2 posts selected

Now choose channels to publish to:

[📱 Main Channel] ✓
[💎 Premium Channel] ✓
[📢 Announcements]

[✅ Next]
```

**Available Channels:**
- **📱 Main Channel** - Public posts (everyone sees)
- **💎 Premium Channel** - Premium member-only content
- **📢 Announcements** - Critical updates & news

---

#### Step 4: Choose Timing

```
⏰ Step 3: Schedule

2 posts → 2 channels

When should we publish?

[🚀 Now]              - Publish immediately
[⏱️ In 1 hour]        - Delay 1 hour
[📅 Custom]           - Pick specific date/time
[✅ Preview]          - See how it looks first
```

**Option Details:**

| Option | When It Posts | Use Case |
|--------|---------------|----------|
| 🚀 Now | Immediately | Emergency announcements |
| ⏱️ 1 hour | 1 hour from now | Allow time for review |
| 📅 Custom | Specified date/time | Schedule for optimal engagement |
| ✅ Preview | Shows preview first | Quality control |

---

### 3️⃣ Broadcast Execution

#### During Broadcast

```
📤 Publishing... 50%
✅ Successful: 12
```

**What's Happening:**
- Posts are being sent to each channel
- System processes at ~500ms delay between posts
- Rate-limited to prevent Telegram API throttling
- Real-time progress updates

#### After Broadcast Completes

```
✅ Broadcast Complete

✉️ Successful: 25
❌ Failed: 1

⚠️ Errors:
• post_123: Channel not found

[« Back]
```

**Error Handling:**
- ✅ Successful posts still delivered if some fail
- ❌ Failed posts logged for admin review
- ⚠️ Error messages explain what happened

---

### 4️⃣ View Scheduled Broadcasts

```
📅 Scheduled Broadcasts (3)

1. Weekly Digest
   🕐 Tomorrow, 8:00 AM
   📊 5 posts → 2 channels

2. Premium Update
   🕐 Today, 6:00 PM
   📊 3 posts → 1 channel

3. Weekly Roundup
   🕐 Sunday, 12:00 PM
   📊 10 posts → 3 channels

[1. Weekly Digest...]
[2. Premium Update...]
[3. Weekly Roundup...]
[« Back]
```

---

### 5️⃣ View Analytics

```
📊 Channel Analytics (30 days)

📱 Main Channel
├─ 247 posts published
├─ 125K total views
├─ 8.9K likes
├─ 245 shares
└─ Avg 505 views/post

💎 Premium Channel
├─ 89 posts published
├─ 45K total views
├─ 4.2K likes
└─ Avg 505 views/post

[Top Performers]
1. "Amazing Content" - 2.5K views
2. "Great Post" - 1.8K views
3. "Cool Stuff" - 1.2K views
```

---

## Advanced Features

### Post Selection Filters

#### 🔥 Top Posts Algorithm
```javascript
Ranking = (Likes × 1.0) + (Views × 0.1) + (Shares × 2.0)

Example:
Post A: 100 likes, 1000 views, 10 shares
Score = 100 + 100 + 20 = 220

Post B: 50 likes, 2000 views, 5 shares
Score = 50 + 200 + 10 = 260 ✓ (Higher rank)
```

#### 📅 Recent Posts
- Posts from last 7 days
- Sorted newest first
- Includes all visibility levels

#### 🏷️ By Hashtag
```
Available tags:
#news (145 posts)
#tips (89 posts)
#promo (56 posts)
#community (234 posts)
```

---

### Visibility Control

Posts respect user visibility settings:

```
Post Visibility → Channel Permission

public          → Can post to any channel
members_only    → Can post to premium channels
premium_only    → Can post to premium channel only
private         → Cannot post (draft only)
```

---

### Rate Limiting & Throttling

**To prevent Telegram API rate limits:**

```
Batch Size:     20 messages
Delay Between:  500ms
Batch Delay:    1 second (between batches)
Max Concurrent: 1 broadcast at a time
```

**Example Timeline:**
```
Post 1 ─────────────── 500ms
Post 2 ─────────────── 500ms
Post 3 ─────────────── 500ms
...
Post 20 ───────────────┐
                 (1 sec batch pause)
Post 21 ─────────────── 500ms
```

---

## Command Reference

### Quick Commands

```
/admin                 → Open admin panel
/ptc_menu             → Direct access to post-to-channel panel
```

### Callback Routes

| Action | Callback Data | Result |
|--------|---------------|--------|
| Open Menu | `ptc_menu` | Shows main panel |
| Create Broadcast | `ptc_create_broadcast` | Starts wizard |
| Select Top Posts | `ptc_posts_popular` | Shows top 10 posts |
| Select Recent | `ptc_posts_recent` | Shows latest 10 posts |
| Select Pinned | `ptc_posts_pinned` | Shows pinned posts |
| Toggle Post | `ptc_toggle_post_0` | Selects/unselects post 0 |
| Confirm Posts | `ptc_confirm_posts` | Moves to channel selection |
| Select Main Ch | `ptc_channel_main` | Toggles main channel |
| Select Premium | `ptc_channel_premium` | Toggles premium channel |
| Select Announce | `ptc_channel_announce` | Toggles announcements |
| Confirm Channels | `ptc_confirm_channels` | Moves to scheduling |
| Schedule Now | `ptc_schedule_now` | Publishes immediately |
| View Scheduled | `ptc_view_scheduled` | Lists scheduled broadcasts |
| Cancel | `ptc_cancel` | Aborts wizard |

---

## Database Schema

### Collections Used

#### `channelPosts`
```json
{
  "channelPostId": "doc_id",
  "channelId": "-1001234567890",
  "postId": "original_post_id",
  "telegramMessageId": 12345,
  "userId": "user_telegram_id",
  "publishedAt": "2025-01-10T14:30:00Z",
  "engagement": {
    "views": 245,
    "forwardCount": 12,
    "reactions": {}
  },
  "status": "published",
  "createdAt": "2025-01-10T14:30:00Z",
  "updatedAt": "2025-01-10T14:30:00Z"
}
```

#### `broadcastSchedules`
```json
{
  "broadcastId": "doc_id",
  "adminId": "admin_telegram_id",
  "title": "Weekly Digest",
  "postIds": ["post1", "post2", "post3"],
  "channelIds": ["-1001111", "-1002222"],
  "scheduledTime": "2025-01-11T08:00:00Z",
  "status": "scheduled",
  "executedAt": null,
  "results": null,
  "createdAt": "2025-01-10T14:00:00Z",
  "updatedAt": "2025-01-10T14:00:00Z"
}
```

---

## Configuration

### Required Environment Variables

```bash
# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Admin IDs (comma-separated)
ADMIN_IDS=123456789,987654321

# Channels
CHANNEL_ID=-1001234567890           # Main channel
PREMIUM_CHANNEL_ID=-1001234567891  # Premium channel
ANNOUNCE_CHANNEL_ID=-1001234567892 # Announcements channel

# Firebase (for database)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="your-key"
```

### Optional Configuration

```javascript
// In postToChannelService.js

// Adjust batch size
const BATCH_SIZE = 20;

// Adjust delay between posts
const PUBLISH_DELAY = 500; // milliseconds

// Adjust max retries on failure
const MAX_RETRIES = 3;
```

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Channel not configured" | Channel ID missing from .env | Add channel ID to environment |
| "Channel not found" | Bot not admin in channel | Add bot as admin to channel |
| "Unauthorized" | User is not admin | Add user ID to ADMIN_IDS |
| "No posts available" | No posts match filter | Create posts first |
| "No channels selected" | Admin didn't select channels | Select at least one channel |
| "Session expired" | Wizard timed out | Start broadcast creation again |

### Error Logging

All errors are automatically logged to:
- **Console:** Development environment
- **Sentry:** Production environment
- **Firestore:** Activity logs

---

## Usage Statistics

### What Gets Tracked

For each broadcast:
- ✅ Successful publishes
- ❌ Failed publishes
- 📊 Delivery percentage
- ⏱️ Execution time
- 👁️ Views per post
- ❤️ Likes per post
- ↗️ Shares per post

### Accessing Statistics

```javascript
// Get channel analytics
const analytics = await PostToChannelService.getChannelAnalytics(channelId);

// Result:
{
  channelId: "-1001234567890",
  period: "30 days",
  totalPosts: 247,
  totalViews: 125432,
  totalForwards: 589,
  averageViewsPerPost: 508,
  topPosts: [
    { postId: "1", views: 2541, forwards: 23 },
    { postId: "2", views: 1845, forwards: 15 }
  ]
}
```

---

## Best Practices

### ✅ Do's

✅ **Preview before publishing** - Use preview option
✅ **Test with one channel first** - Verify formatting before broad push
✅ **Use optimal scheduling** - Peak hours get more engagement
✅ **Monitor after publish** - Check engagement metrics
✅ **Rotate content types** - Mix text, images, videos
✅ **Read error messages** - They explain what went wrong

### ❌ Don'ts

❌ **Spam users** - Limit broadcasts to 1-2 per day
❌ **Publish without review** - Check preview first
❌ **Target wrong channels** - Wrong audience loses engagement
❌ **Ignore failed publishes** - Investigate errors
❌ **Repeat same content** - Boring posts get unfollowed
❌ **Schedule during low hours** - Use prime time slots

---

## Troubleshooting

### "Broadcast wizard not working"

**Check:**
1. Are you an admin? (User ID in ADMIN_IDS?)
2. Did you start with `/admin`?
3. Is session data persisting? (Check Firestore)

**Fix:**
```bash
# Restart bot
pm2 restart pnptv-bot

# Check logs
pm2 logs pnptv-bot | grep "ptc"
```

### "Posts not appearing in channel"

**Check:**
1. Bot is admin in the channel?
2. Channel ID is correct?
3. Posts are `isActive: true`?

**Fix:**
```bash
# Verify bot is admin
# Go to channel settings → Administrators → Check bot listed

# Verify channel ID
# Forward message from channel to @userinfobot
# Copy the channel ID with -100 prefix
```

### "Engagement metrics not updating"

**Note:** View counts and reactions require:
- Bot to be admin in channel
- Message to be older than 1 minute
- Telegram API support for metrics

**Update manually:**
```javascript
await PostToChannelService.updateEngagementFromTelegram(channelPostId, messageId);
```

---

## API Reference

### Core Functions

#### `PostToChannelService.publishPostToChannel(postId, channelId, options)`

Publish single post to channel

```javascript
const result = await PostToChannelService.publishPostToChannel(
  'post123',
  '-1001234567890',
  {
    addCaption: true,
    addButtons: true,
    parseMode: 'HTML',
    maxRetries: 3
  }
);

// Returns: { channelPostId, telegramMessageId, publishedAt }
```

#### `PostToChannelService.publishBatch(postIds, channelIds, options)`

Publish multiple posts to multiple channels

```javascript
const results = await PostToChannelService.publishBatch(
  ['post1', 'post2', 'post3'],
  ['-1001111', '-1002222'],
  {
    delay: 500,
    stopOnError: false,
    progressCallback: (progress) => console.log(progress)
  }
);

// Returns: { successful, failed, errors[] }
```

#### `PostToChannelService.scheduleBroadcast(broadcastData)`

Schedule broadcast for future execution

```javascript
const broadcast = await PostToChannelService.scheduleBroadcast({
  adminId: '123456',
  title: 'Weekly Digest',
  postIds: ['post1', 'post2'],
  channelIds: ['-1001111'],
  scheduledTime: new Date('2025-01-15T08:00:00Z'),
  tags: ['weekly', 'digest']
});

// Returns: { broadcastId, ...broadcastData }
```

#### `PostToChannelService.getChannelAnalytics(channelId, options)`

Get channel performance metrics

```javascript
const analytics = await PostToChannelService.getChannelAnalytics(
  '-1001234567890',
  { days: 30 }
);

// Returns: { totalPosts, totalViews, averageViewsPerPost, topPosts[] }
```

---

## Support & Monitoring

### Check System Health

```bash
# View recent admin actions
pm2 logs pnptv-bot | grep "admin\|ptc"

# Check Firestore collections
# Firebase Console → Firestore → channelPosts, broadcastSchedules

# Monitor broadcasts
# Admin panel → 📊 Analytics
```

### Get Help

**Issue:** Post won't publish to channel
**Solution:** 
1. Check bot is admin in channel
2. Verify channel ID in .env
3. Check post visibility allows channel

**Issue:** Posts taking too long
**Solution:**
- This is normal - rate limiting to prevent throttling
- Adjust PUBLISH_DELAY in code if needed

**Issue:** Wrong posts appearing
**Solution:**
- Check post visibility filters
- Verify selected posts in preview

---

## FAQ

**Q: Can regular users use post-to-channel?**
A: No, this is admin-only. Only users in ADMIN_IDS can access.

**Q: How many posts can I broadcast at once?**
A: Unlimited, but recommend 50 max per broadcast to avoid timeouts.

**Q: What happens if a channel ID is wrong?**
A: Broadcast will fail for that channel, but others still complete.

**Q: Can I edit a broadcast after scheduling?**
A: Not yet - cancel and create new broadcast.

**Q: How long do scheduled broadcasts persist?**
A: Until executed or manually cancelled. Auto-cleanup after 90 days.

**Q: Can I see who saw my broadcast?**
A: View counts are available in analytics (requires bot as channel admin).

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-10 | Initial release - Core publish features |
| 1.1 | Planned | Comments & replies |
| 1.2 | Planned | Content moderation |
| 1.3 | Planned | ML-based recommendations |
| 2.0 | Planned | Mobile app integration |

---

**Status: ✅ Production Ready**

The Post-to-Channel Admin Feature is fully functional and ready for production use.
