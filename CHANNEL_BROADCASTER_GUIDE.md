# 📢 Channel Broadcaster - Complete Admin Guide

## Overview

The **Channel Broadcaster** is a comprehensive admin feature that allows you to create and publish rich content to multiple Telegram channels with just a few taps.

### What You Can Do

✅ **Text Posts** - Markdown-formatted messages  
✅ **Media** - Photos, videos, audio, documents  
✅ **Files & Documents** - Share any file type  
✅ **Polls** - Create interactive surveys  
✅ **Inline Menus** - Add buttons with links or callbacks  
✅ **Multiple Channels** - Post to "Contacto PNP", "PNPtv PRIME", or both  
✅ **Drafts** - Save posts and publish later  
✅ **Scheduling** - Schedule posts for specific times  
✅ **Analytics** - Track delivery and engagement  

---

## Getting Started

### Access Channel Broadcaster

1. Open your bot in Telegram (private chat)
2. Tap `/admin` to open the admin menu
3. Select **📢 Channel Broadcaster** from the menu
4. Choose **✏️ Create Post**

---

## Step-by-Step Wizard

### Step 1: Select Channels

Choose where your post will be published:

- **📱 Contacto PNP** - General announcement channel
- **💎 PNPtv PRIME** - Premium members channel
- **📢 Both** - Post to both channels

You can toggle channels on/off by tapping them. Look for the ✅ checkmark.

### Step 2: Choose Content Type

Select what type of content you want to create:

| Option | Use Case | Example |
|--------|----------|---------|
| 📄 **Text Only** | Announcements, updates | "New feature available!" |
| 🖼️ **Text + Photo** | Featured images | Event poster + description |
| 🎥 **Text + Video** | Video content | Tutorial or teaser |
| 📎 **Files** | Documents, PDFs | Monthly report |
| 📊 **Poll** | User feedback | "Which time works best?" |
| 🔗 **With Menu** | Interactive buttons | Links to features |

### Step 3: Compose Your Message

#### Text Formatting (Markdown)

Use these symbols to format your text:

```
*bold text*          → makes text bold
_italic text_        → makes text italic
~strikethrough~      → adds strikethrough
`code`               → monospace code
[Link Text](URL)     → clickable link
```

**Example:**
```
🎉 *NEW FEATURE ALERT*

_Experience the power of:_
• Geolocation mapping
• AI support chat
• Instant Zoom rooms

[Join Premium Now](https://t.me/pnptv)
```

#### Adding Media

When you select **Photo**, **Video**, or **Files**:

1. Send the file/photo when prompted
2. Add a caption (optional, supports Markdown)
3. The system will combine it with your text

#### Adding Interactive Buttons

When you create a post "With Menu":

1. Compose your text
2. Add button links:
   - **Text** - What appears on the button
   - **URL** - Where it links to (optional)
   - **Callback** - Internal action (optional)

**Example Menu:**
```
[🎵 Music Library] → https://pnptv.app/library
[💬 Support] → /aichat
[👤 Profile] → /profile
```

---

## Publishing Options

### Option 1: Publish Now 🚀

Post immediately to all selected channels.

**Best for:** Breaking news, urgent announcements, real-time updates

### Option 2: Save as Draft 📋

Save your post to edit later before publishing.

**Best for:** Planning content ahead, getting approval, proofreading

### Option 3: Schedule 📅

Set a specific date/time to publish automatically.

**Best for:** Planned announcements, timezone-aware posts, campaign launches

---

## Content Templates

### 1. **Feature Announcement**

```
🎯 *NEW FEATURE: AI Support Chat*

Need help? Our 24/7 AI assistant is here!

✨ *What you can do:*
• Check membership status
• Learn about plans
• Get command help
• Find nearby members

_Use /aichat in private chat_

[Learn More](https://pnptv.app)
```

### 2. **Event/Schedule Post**

```
🎤 *UPCOMING LIVE STREAM*

📅 *Date:* Friday, November 15
⏰ *Time:* 9 PM EST
📍 *Where:* Telegram Group

🎵 Special guest DJ performing

[RSVP in Group](https://t.me/pnptv)
```

### 3. **Promotional Post**

```
💎 *UPGRADE TO PREMIUM*

Unlock all features:
• Full media access
• Unlimited searches
• Instant Zoom rooms
• Exclusive content

📊 Starting at $14.99

[Subscribe Now](/subscribe)
```

### 4. **FAQ/Help Post**

```
❓ *FREQUENTLY ASKED QUESTIONS*

*Q: How do I find members nearby?*
A: Use /nearby in private chat (3x/week for Free, unlimited for Premium)

*Q: Can I use /menu in groups?*
A: Yes! /menu shows music library, zoom rooms, and rules

*Q: How do I upgrade?*
A: Tap /subscribe and choose your plan

[More Help](/aichat)
```

### 5. **Engagement Poll**

```
🎯 *WHAT FEATURE SHOULD WE BUILD NEXT?*

Help us decide! Vote below 👇

[POLL]
• 🎵 Enhanced Music Library
• 🗓️ Event Calendar
• 🤖 Better AI Chat
• 📊 Activity Feed
```

---

## Best Practices

### Content

✅ **DO:**
- Keep messages concise (2-4 paragraphs max)
- Use emojis to break up text
- Include a clear call-to-action
- Format with Markdown for readability
- Test links before posting

❌ **DON'T:**
- Post spam or duplicate messages
- Include sensitive admin information
- Forget to set appropriate times for scheduling
- Post same message too frequently

### Channel Selection

| Channel | Audience | Use For |
|---------|----------|---------|
| **Contacto PNP** | All members | General announcements, updates |
| **PNPtv PRIME** | Premium only | Exclusive features, VIP content |
| **Both** | Everyone | Major announcements |

### Timing

- **Peak Hours:** 7-9 PM weekdays, 10 AM-12 PM weekends
- **Avoid:** 2-4 AM, 12-1 PM (lunch time)
- **Events:** Schedule 1 hour before live events

---

## Advanced Features

### Inline Menus (Button Links)

Create interactive posts with clickable buttons:

```
**Configuration:**
[Button Text] → https://URL.com

**Example:**
[📚 Library] → https://pnptv.app/library
[💰 Subscribe] → /subscribe
[🎵 Top Tracks] → /toptracks
```

### Polls with Options

Create surveys to gather feedback:

```
🎯 Question?

Option 1 (most popular)
Option 2
Option 3
Option 4
```

### File Sharing

Attach any document type:
- PDF reports
- Excel spreadsheets
- Word documents
- Images (JPG, PNG, GIF)
- Videos (MP4, WebM)
- Audio files (MP3, OGG)

---

## Managing Posts

### View Drafts

See all unsent posts:
1. Open Channel Broadcaster menu
2. Tap **📋 View Drafts**
3. Select a draft to edit or publish

### View Published

See all sent posts:
1. Open Channel Broadcaster menu
2. Tap **📤 View Published**
3. See delivery status and engagement

### Edit Draft Posts

1. Go to **View Drafts**
2. Select the post
3. Tap **✏️ Edit**
4. Make changes
5. Tap **📤 Publish** when ready

### Delete Posts

1. Go to **View Drafts** (or **View Published** for drafts only)
2. Select the post
3. Tap **🗑️ Delete**
4. Confirm deletion

**Note:** You can only delete draft posts, not published ones.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Post won't send to a channel | Check channel ID in .env, ensure bot has permissions |
| Text formatting looks wrong | Use Markdown syntax: *bold*, _italic_, ~strike~ |
| Media won't upload | Check file size (under 50MB), use supported formats |
| Buttons don't work | Ensure URLs start with https:// |
| Scheduling didn't work | Check time is in future, timezone is correct |

---

## Commands Cheat Sheet

| Command | What It Does |
|---------|-------------|
| `/admin` | Open admin menu |
| `/done` | Finish composing text in wizard |
| `/edit` | Edit a draft post |
| `/publish` | Publish immediately |
| `/schedule` | Schedule for later |
| `/cancel` | Cancel current action |

---

## Examples

### Example 1: Simple Announcement

**Channels:** Both  
**Type:** Text Only  
**Content:**
```
🎉 *WELCOME TO PNPtv!*

The most interactive adult community on Telegram is here.

*Features:*
• Live shows & events
• Music library
• Connect with nearby members
• Premium membership options

[Join Us](https://t.me/pnptv)
```

### Example 2: Feature Update

**Channels:** Contacto PNP, PNPtv PRIME  
**Type:** Text + Photo  
**Content:**
```
🤖 *AI Support is LIVE*

Say hello to your new 24/7 assistant!

✨ *It can help with:*
• Membership questions
• Payment options
• Command guidance
• Finding nearby members

_Private chat only - type /aichat_
```

**Photo:** Screenshot of AI chat interface

### Example 3: Event Promotion

**Channels:** PNPtv PRIME  
**Type:** Text + Poll  
**Content:**
```
🎤 *LIVE STREAMING THIS WEEKEND*

*Friday 9 PM - DJ Santino*
*Saturday 8 PM - Special Show*

Which day works best for you?

[POLL: Vote below]
• Friday 9 PM
• Saturday 8 PM
• Both!
• Can't make it
```

---

## Integration Points

The Channel Broadcaster integrates with:

- 📊 Analytics dashboard (track views, clicks)
- 🗓️ Scheduling system (queue posts for later)
- 💾 Firestore (persistent storage of all posts)
- 🔔 Notifications (admins get delivery reports)

---

## Security & Admin Permissions

- ✅ Only admins can create/publish posts
- ✅ All posts are logged and traceable
- ✅ Admins are notified of failures
- ✅ Sensitive data never appears in posts
- ✅ Message deletion available for drafts only

---

## Support

**Questions?** Contact support@pnptv.app  
**Bug report?** Open an issue on GitHub  
**Feature request?** DM your admin  

---

**Last Updated:** November 13, 2025
