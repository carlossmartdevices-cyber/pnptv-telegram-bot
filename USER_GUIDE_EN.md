# 📱 PNPtv Bot - User Guide

Welcome to PNPtv! This guide will help you make the most of all available features.

---

## 🚀 Getting Started

### First Steps
1. **Start the bot**: Send `/start` to begin
2. **Choose your language**: Select English or Spanish
3. **Complete onboarding**: Accept terms, confirm age, and set up your profile
4. **Share your location** (optional): Find nearby members

---

## 📋 Basic Commands

### `/start`
- **What it does**: Initializes the bot and shows the main menu
- **Who can use it**: Everyone
- **When to use**: First time using the bot or to return to main menu

### `/help`
- **What it does**: Shows available commands and features
- **Who can use it**: Everyone
- **When to use**: When you need assistance or want to see what's available

### `/profile`
- **What it does**: View and edit your profile information
- **Who can use it**: Everyone
- **Features**:
  - View your membership tier
  - Edit your bio
  - Update your location
  - Change profile photo
  - Manage settings

---

## 🌍 Discovery & Community

### `/nearby`
- **What it does**: Find other members near your location
- **Free users**:
  - ✅ 3 searches per week
  - ✅ See up to 3 nearby members
- **Premium users**:
  - ✅ Unlimited searches
  - ✅ See ALL nearby members
  - ✅ See distances and activity status

**How to use:**
1. Make sure you've shared your location in your profile
2. Send `/nearby`
3. Browse the list of members near you

---

## 🎵 Music & Entertainment

### `/toptracks`
- **What it does**: Shows the most played tracks
- **Who can use it**: Everyone
- **Features**: See top 5 most popular tracks with play counts

### `/library`
- **What it does**: Browse the music library
- **Who can use it**: Premium members only
- **Features**:
  - View all available tracks
  - See artist, genre, and play count
  - Click **"▶️ Play Track"** button to listen
  - Direct links to SoundCloud, YouTube, and other platforms
  - Access exclusive music content

### `/upcoming`
- **What it does**: View scheduled events and broadcasts
- **Who can use it**: Everyone
- **Features**:
  - See upcoming music broadcasts, video calls, and live streams
  - **UTC time display** with clear timezone (2025-11-07 at 00:00 UTC)
  - **Relative time** showing urgency (e.g., "in 2 days", "in 5 hours")
  - Event ID for reference
  - Click **"🎥 Join Call"** button for video events
  - Event descriptions and host information

**How it works:**
1. Send `/upcoming`
2. View each event with its UTC time and countdown
3. Convert UTC to your timezone if needed (or just use the relative time!)
4. Click "Join Call" button when event starts

---

## 📹 Live Features (Premium)

### `/schedulecall`
- **What it does**: Schedule video calls with other members
- **Who can use it**: Premium members only
- **Coming soon**: Full video call functionality

### `/schedulestream`
- **What it does**: Schedule and host live streams
- **Who can use it**: Premium members only
- **Coming soon**: Full streaming capability

---

## 🤖 AI Support

### `/aichat`
- **What it does**: Start a conversation with AI support
- **Who can use it**: Everyone
- **Features**:
  - 24/7 customer support
  - Get help with membership questions
  - Technical support
  - Answer questions about features

### `/endchat`
- **What it does**: End the AI chat session
- **When to use**: When you're done talking to the AI assistant

---

## 💎 Subscription & Membership

### `/subscribe`
- **What it does**: View and purchase subscription plans
- **Who can use it**: Everyone
- **What you'll see**:
  - Available membership tiers
  - Pricing information
  - Features for each plan
  - Payment options

### Membership Tiers

#### 🆓 Free Tier
**What's included:**
- Basic profile access
- **Share photos and videos in community group** ✅
- View top tracks
- 3 nearby searches per week
- See up to 3 nearby members
- View upcoming events
- AI support access
- Community group access

#### 💎 Premium Tier
**What's included:**
- ✅ **Everything in Free, PLUS:**
- ✅ **Access to exclusive Santino premium channel** 🔥
- ✅ Exclusive VIP content and videos
- ✅ Full music library access with playback
- ✅ Unlimited nearby searches
- ✅ See ALL nearby members
- ✅ Video call scheduling
- ✅ Live streaming capability
- ✅ Priority support
- ✅ VIP badges and status

**How to upgrade:**
1. Send `/subscribe`
2. Choose your plan
3. Follow payment instructions
4. Receive your unique channel invite link

---

## 🗺️ Map Features

### `/map`
- **What it does**: View members on an interactive map
- **Who can use it**: Everyone
- **Features**:
  - See member locations
  - Choose distance radius (5km, 10km, 25km)
  - Visual representation of nearby members

---

## 📺 Live Content

### `/live`
- **What it does**: Access live streaming features
- **Who can use it**: Everyone (features vary by tier)
- **Free users**: View live streams
- **Premium users**: Host and schedule live streams

---

## 📱 Mini App

### `/app`
- **What it does**: Opens the PNPtv Mini App
- **Who can use it**: Everyone
- **Features**: Access additional features through Telegram Mini App

---

## ⚙️ Settings & Privacy

### Profile Settings
Access via `/profile` → Settings

**Available options:**
- **Toggle Ads**: Opt in/out of promotional messages
- **Privacy Settings**: Control who can see your profile
- **Location Settings**: Manage location sharing
- **Language**: Change bot language (English/Spanish)

---

## 💡 Tips & Best Practices

### Getting the Most Out of PNPtv

1. **Complete Your Profile**
   - Add a bio
   - Upload a profile photo
   - Share your location (to find nearby members)

2. **Use Nearby Search Wisely** (Free users)
   - You have 3 searches per week
   - Update your location before searching
   - Consider upgrading for unlimited searches

3. **Engage with Content**
   - Check `/upcoming` for new events
   - Explore `/toptracks` for popular music
   - Use `/aichat` for quick questions

4. **Upgrade to Premium**
   - Unlock all features
   - Support the community
   - Get exclusive content access

---

## 🔧 Admin Commands

**Note**: These commands are only available to bot administrators.

### `/deleteevent`
- **What it does**: Delete a scheduled event
- **Who can use it**: Administrators only
- **Syntax**: `/deleteevent <event_id>`

**How to use:**
1. Send `/upcoming` to see all scheduled events
2. Copy the event ID (e.g., `call_1762219246922`)
3. Send `/deleteevent call_1762219246922`
4. Event will be deleted and confirmation message sent

**Example:**
```
Admin: /deleteevent call_1762219246922

Bot: ✅ Event Deleted
     Video Call has been removed from the schedule.
     🆔 Event ID: call_1762219246922
```

**Features:**
- Deletes video calls, live streams, and broadcasts
- Automatically searches all event types
- Confirms deletion with event type
- Shows error if event ID not found

### Other Admin Commands
- `/admin` - Access admin dashboard
- `/addtrack` - Add tracks to music library
- `/broadcast` - Send messages to all users

---

## 🆘 Need Help?

### Support Options

1. **AI Support**: Send `/aichat` for instant help
2. **Help Command**: Send `/help` for command list
3. **Email Support**: support@pnptv.app

### Common Issues

**Problem**: Can't find nearby members
- **Solution**: Make sure you've shared your location in `/profile`

**Problem**: Reached nearby search limit
- **Solution**: Wait for weekly reset or upgrade to Premium

**Problem**: Can't access premium features
- **Solution**: Check your membership status in `/profile` or send `/subscribe`

**Problem**: Bot not responding
- **Solution**: Send `/start` to restart, or contact support

---

## 📊 Understanding Your Account

### Check Your Status
Send `/profile` to see:
- Current membership tier
- Expiration date (Premium users)
- Profile completeness
- Settings status

### Membership Expiration
- Premium memberships renew automatically or expire based on your plan
- You'll receive notifications before expiration
- Check `/profile` for renewal information

---

## 🎯 Quick Reference

| Command | Free | Premium | Description |
|---------|------|---------|-------------|
| `/start` | ✅ | ✅ | Start the bot |
| `/help` | ✅ | ✅ | Get help |
| `/profile` | ✅ | ✅ | View/edit profile |
| `/nearby` | ⚠️ Limited | ✅ Full | Find nearby members |
| `/toptracks` | ✅ | ✅ | See top tracks |
| `/library` | ❌ | ✅ | Browse music library |
| `/upcoming` | ✅ | ✅ | View events |
| `/schedulecall` | ❌ | ✅ | Schedule video calls |
| `/schedulestream` | ❌ | ✅ | Schedule streams |
| `/aichat` | ✅ | ✅ | AI support |
| `/subscribe` | ✅ | ✅ | View/buy plans |
| `/map` | ✅ | ✅ | Interactive map |
| `/live` | ⚠️ View | ✅ Host | Live streams |
| `/deleteevent` | 🔒 Admin | 🔒 Admin | Delete scheduled events |

**Legend:**
- ✅ = Available
- ❌ = Not available
- ⚠️ = Limited access
- 🔒 = Admin only

---

## 🌟 Premium Member Benefits

### What You Get with Premium

1. **Exclusive Santino Content** 🔥
   - Access to exclusive Santino premium channel
   - VIP videos and full-length content
   - Uncensored exclusive material
   - Early access to new releases

2. **Enhanced Discovery**
   - Unlimited nearby searches
   - See all nearby members
   - Advanced filters
   - Distance-based sorting

3. **Community Features**
   - Full community group access (free members can also share media!)
   - Video calls with members
   - Live streaming capability
   - VIP status and badges

4. **Music & Entertainment**
   - Full music library access
   - Schedule broadcasts
   - Host live DJ sets
   - Exclusive playlists

5. **Priority Support**
   - Faster AI responses
   - Priority email support
   - Direct feature requests
   - Beta feature access

---

## 📞 Contact

- **Email**: support@pnptv.app
- **Bot Support**: `/aichat`
- **Website**: https://pnptv.app

---

**Last Updated**: November 4, 2025
**Version**: 2.1

*Enjoy PNPtv! 💎*
