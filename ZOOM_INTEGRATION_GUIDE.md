# Zoom Integration Guide - Complete Implementation 📹

## Overview
This guide will walk you through integrating Zoom video calls into your PNPtv bot so that `/schedulecall` actually creates real Zoom meetings.

---

## 🎯 What We'll Build

### Before (Current State):
```
User: /schedulecall
Bot: "Coming soon!"
```

### After (With Zoom):
```
User: /schedulecall
Bot: "What's the title of your call?"
User: "Friday Night Hangout"
Bot: "When should it start? (e.g., 2025-11-05 20:00)"
User: "2025-11-05 20:00"
Bot: "✅ Video call scheduled!

📹 Friday Night Hangout
🕒 November 5, 2025 at 8:00 PM

Join URL: https://zoom.us/j/123456789
Meeting ID: 123 456 789
Password: abc123

Share this link with participants!"
```

---

## 📋 Step-by-Step Process

### PHASE 1: Zoom Account Setup

#### Step 1.1: Create Zoom Account
1. Go to https://marketplace.zoom.us/
2. Click **"Sign In"** or **"Sign Up"** if you don't have an account
3. Use a business email (recommended)

#### Step 1.2: Create a Server-to-Server OAuth App
1. Go to https://marketplace.zoom.us/develop/create
2. Click **"Server-to-Server OAuth"**
3. Fill in the details:
   - **App Name**: `PNPtv Bot`
   - **Short Description**: `Video calls for PNPtv community`
   - **Company Name**: Your company name
   - **Developer Name**: Your name
   - **Developer Email**: Your email
4. Click **"Create"**

#### Step 1.3: Get API Credentials
After creating the app, you'll get:
- **Account ID**: `abc123...`
- **Client ID**: `xyz789...`
- **Client Secret**: `secret123...`

**IMPORTANT**: Copy these credentials - you'll need them!

#### Step 1.4: Add Scopes (Permissions)
In your app settings, go to **"Scopes"** and add:
- ✅ `meeting:write:admin` - Create meetings
- ✅ `meeting:read:admin` - Read meeting details
- ✅ `user:read:admin` - Read user information

Click **"Continue"** and **"Activate"** your app.

---

### PHASE 2: Install Zoom SDK

#### Step 2.1: Install the Zoom API Package
```bash
cd "/root/bot 1"
npm install @zoom/meetingsdk
```

Or use the Zoom REST API directly (simpler):
```bash
npm install axios
```

We'll use `axios` for REST API calls - it's simpler!

#### Step 2.2: Add Credentials to Environment
Edit your `.env` file:
```bash
nano .env
```

Add these lines:
```env
# Zoom API Credentials
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
```

Save and exit (Ctrl+X, Y, Enter)

---

### PHASE 3: Create Zoom Service

#### Step 3.1: Create Zoom Service File
Create a new file for Zoom API integration:

**File**: `src/services/zoomService.js`

```javascript
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Zoom API Service
 * Handles meeting creation and management
 */

class ZoomService {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token
   */
  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      // Get new token
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        null,
        {
          params: {
            grant_type: 'account_credentials',
            account_id: this.accountId,
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in 1 hour, refresh 5 minutes before
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      logger.info('Zoom access token obtained');
      return this.accessToken;
    } catch (error) {
      logger.error('Error getting Zoom access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom');
    }
  }

  /**
   * Create a Zoom meeting
   * @param {Object} meetingData - Meeting configuration
   * @returns {Object} Meeting details including join URL
   */
  async createMeeting(meetingData) {
    try {
      const token = await this.getAccessToken();

      const payload = {
        topic: meetingData.title || 'PNPtv Video Call',
        type: 2, // Scheduled meeting
        start_time: meetingData.startTime, // ISO 8601 format: 2025-11-05T20:00:00Z
        duration: meetingData.duration || 60, // Duration in minutes
        timezone: meetingData.timezone || 'America/New_York',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: false,
          watermark: false,
          audio: 'both',
          auto_recording: 'none',
          waiting_room: false,
        },
      };

      const response = await axios.post(
        'https://api.zoom.us/v2/users/me/meetings',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const meeting = response.data;

      logger.info(`Zoom meeting created: ${meeting.id}`);

      return {
        success: true,
        meetingId: meeting.id.toString(),
        joinUrl: meeting.join_url,
        password: meeting.password || meeting.encrypted_password,
        startUrl: meeting.start_url, // Host start URL
        startTime: meeting.start_time,
        duration: meeting.duration,
        topic: meeting.topic,
      };
    } catch (error) {
      logger.error('Error creating Zoom meeting:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create Zoom meeting',
      };
    }
  }

  /**
   * Get meeting details
   * @param {string} meetingId - Zoom meeting ID
   */
  async getMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return {
        success: true,
        meeting: response.data,
      };
    } catch (error) {
      logger.error('Error getting Zoom meeting:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Failed to get meeting details',
      };
    }
  }

  /**
   * Delete a Zoom meeting
   * @param {string} meetingId - Zoom meeting ID
   */
  async deleteMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();

      await axios.delete(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      logger.info(`Zoom meeting deleted: ${meetingId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting Zoom meeting:', error.response?.data || error.message);
      return {
        success: false,
        error: 'Failed to delete meeting',
      };
    }
  }
}

// Export singleton instance
module.exports = new ZoomService();
```

---

### PHASE 4: Update Community Service

#### Step 4.1: Modify `src/services/communityService.js`

Add Zoom integration to the `scheduleVideoCall` function:

```javascript
const zoomService = require('./zoomService');

/**
 * Schedule video call with Zoom integration
 */
async function scheduleVideoCall(userId, callData) {
  try {
    const callId = `call_${Date.now()}`;

    // Create Zoom meeting
    const zoomMeeting = await zoomService.createMeeting({
      title: callData.title || 'Video Call',
      startTime: callData.scheduledTime, // Should be ISO 8601 format
      duration: callData.duration || 60,
      timezone: callData.timezone || 'America/New_York',
    });

    if (!zoomMeeting.success) {
      throw new Error(zoomMeeting.error);
    }

    // Save to database with Zoom details
    await db.collection('scheduled_calls').doc(callId).set({
      callId,
      hostId: userId,
      hostName: callData.hostName,
      title: callData.title || 'Video Call',
      description: callData.description || '',
      scheduledTime: new Date(callData.scheduledTime),
      maxParticipants: callData.maxParticipants || 10,
      isPublic: callData.isPublic !== false,
      status: 'scheduled',
      participants: [],
      createdAt: new Date(),
      // Zoom meeting details
      zoomMeetingId: zoomMeeting.meetingId,
      zoomJoinUrl: zoomMeeting.joinUrl,
      zoomPassword: zoomMeeting.password,
      zoomStartUrl: zoomMeeting.startUrl,
    });

    logger.info(`Video call scheduled with Zoom: ${callId}`);

    return {
      success: true,
      callId,
      zoomMeetingId: zoomMeeting.meetingId,
      joinUrl: zoomMeeting.joinUrl,
      password: zoomMeeting.password,
      startUrl: zoomMeeting.startUrl,
    };
  } catch (error) {
    logger.error('Error scheduling video call:', error);
    return { success: false, error: error.message };
  }
}
```

---

### PHASE 5: Update Bot Handler

#### Step 5.1: Create Interactive Schedule Flow

Update `src/bot/handlers/community.js`:

```javascript
const { scheduleVideoCall } = require('../../services/communityService');

/**
 * Handle /schedulecall command - Schedule video call with Zoom
 */
async function handleScheduleCall(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const { tier } = await getUserPermissions(userId);

    if (tier === 'Free') {
      await ctx.reply(
        `📹 *Video Calls*\n\n` +
        `This feature is available for premium members.\n\n` +
        `💎 Premium members can:\n` +
        `• Schedule video calls\n` +
        `• Host live streams\n` +
        `• Create private rooms\n` +
        `• And more!\n\n` +
        `Send /plans to upgrade!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Premium user - start scheduling flow
    ctx.session.schedulingCall = {
      step: 'title',
    };

    await ctx.reply(
      `📹 *Schedule Video Call*\n\n` +
      `Let's set up your Zoom video call!\n\n` +
      `*Step 1/3:* What's the title of your call?`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    logger.error('Error in handleScheduleCall:', error);
    await ctx.reply('❌ Error with video call feature. Please try again.');
  }
}

/**
 * Handle text input during call scheduling
 */
async function handleCallSchedulingInput(ctx) {
  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || 'en';

  if (!ctx.session.schedulingCall) return false;

  const scheduling = ctx.session.schedulingCall;
  const input = ctx.message.text;

  try {
    switch (scheduling.step) {
      case 'title':
        scheduling.title = input;
        scheduling.step = 'time';
        await ctx.reply(
          `✅ Title: *${input}*\n\n` +
          `*Step 2/3:* When should it start?\n\n` +
          `Please provide date and time in this format:\n` +
          `\`YYYY-MM-DD HH:MM\`\n\n` +
          `Example: \`2025-11-05 20:00\``,
          { parse_mode: 'Markdown' }
        );
        return true;

      case 'time':
        // Parse the datetime
        const dateTimeRegex = /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/;
        const match = input.match(dateTimeRegex);

        if (!match) {
          await ctx.reply(
            `❌ Invalid format. Please use: \`YYYY-MM-DD HH:MM\`\n\n` +
            `Example: \`2025-11-05 20:00\``,
            { parse_mode: 'Markdown' }
          );
          return true;
        }

        const [, year, month, day, hour, minute] = match;
        const scheduledDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);

        if (scheduledDate < new Date()) {
          await ctx.reply('❌ The date must be in the future. Please try again.');
          return true;
        }

        scheduling.scheduledTime = scheduledDate.toISOString();
        scheduling.step = 'duration';

        await ctx.reply(
          `✅ Time: *${scheduledDate.toLocaleString()}*\n\n` +
          `*Step 3/3:* How long should the call be? (in minutes)\n\n` +
          `Example: \`60\` for 1 hour`,
          { parse_mode: 'Markdown' }
        );
        return true;

      case 'duration':
        const duration = parseInt(input);

        if (isNaN(duration) || duration < 15 || duration > 480) {
          await ctx.reply('❌ Please enter a valid duration between 15 and 480 minutes.');
          return true;
        }

        scheduling.duration = duration;

        // Create the Zoom meeting
        await ctx.reply('⏳ Creating your Zoom meeting...');

        const result = await scheduleVideoCall(userId, {
          hostName: ctx.from.first_name || ctx.from.username || 'User',
          title: scheduling.title,
          scheduledTime: scheduling.scheduledTime,
          duration: duration,
          timezone: 'UTC',
        });

        if (!result.success) {
          await ctx.reply(`❌ Error creating meeting: ${result.error}`);
          ctx.session.schedulingCall = null;
          return true;
        }

        // Success! Send meeting details
        const message = lang === 'es'
          ? `✅ *¡Videollamada programada!*\n\n` +
            `📹 *${scheduling.title}*\n` +
            `🕒 ${new Date(scheduling.scheduledTime).toLocaleString('es-CO')}\n` +
            `⏱️ Duración: ${duration} minutos\n\n` +
            `🔗 *Link de unión:*\n${result.joinUrl}\n\n` +
            `🔑 *Contraseña:* ${result.password || 'No requerida'}\n\n` +
            `📋 *ID de reunión:* ${result.zoomMeetingId}\n\n` +
            `💡 *Comparte este link con los participantes!*`
          : `✅ *Video call scheduled!*\n\n` +
            `📹 *${scheduling.title}*\n` +
            `🕒 ${new Date(scheduling.scheduledTime).toLocaleString('en-US')}\n` +
            `⏱️ Duration: ${duration} minutes\n\n` +
            `🔗 *Join URL:*\n${result.joinUrl}\n\n` +
            `🔑 *Password:* ${result.password || 'Not required'}\n\n` +
            `📋 *Meeting ID:* ${result.zoomMeetingId}\n\n` +
            `💡 *Share this link with participants!*`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

        // Clear scheduling session
        ctx.session.schedulingCall = null;
        return true;
    }
  } catch (error) {
    logger.error('Error handling call scheduling input:', error);
    await ctx.reply('❌ Error processing your request. Please try again.');
    ctx.session.schedulingCall = null;
    return true;
  }

  return false;
}

module.exports = {
  handleNearby,
  handleLibrary,
  handleTopTracks,
  handleScheduleCall,
  handleScheduleStream,
  handleUpcoming,
  handleAddTrack,
  handleCallSchedulingInput, // Export new function
};
```

---

### PHASE 6: Update Bot Index

#### Step 6.1: Add Handler for Text Input

In `src/bot/index.js`, update the text handler to check for scheduling:

```javascript
const { handleCallSchedulingInput } = require('./handlers/community');

// In the text handler (around line 420)
bot.on("text", async (ctx) => {
  try {
    // Check if user is scheduling a call
    if (await handleCallSchedulingInput(ctx)) {
      return; // Message was handled by scheduling flow
    }

    // ... rest of existing text handler code
  } catch (error) {
    logger.error("Error handling text message:", error);
  }
});
```

---

### PHASE 7: Testing

#### Step 7.1: Test Zoom Connection
Create a test script:

**File**: `test-zoom.js`
```javascript
require('./src/config/env');
const zoomService = require('./src/services/zoomService');

async function testZoom() {
  try {
    console.log('Testing Zoom integration...\n');

    // Test authentication
    console.log('1. Getting access token...');
    const token = await zoomService.getAccessToken();
    console.log('✅ Access token obtained\n');

    // Test meeting creation
    console.log('2. Creating test meeting...');
    const meeting = await zoomService.createMeeting({
      title: 'Test Meeting',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: 30,
    });

    if (meeting.success) {
      console.log('✅ Meeting created successfully!');
      console.log('Join URL:', meeting.joinUrl);
      console.log('Meeting ID:', meeting.meetingId);
      console.log('Password:', meeting.password);
    } else {
      console.log('❌ Failed to create meeting:', meeting.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testZoom();
```

Run it:
```bash
cd "/root/bot 1"
node test-zoom.js
```

#### Step 7.2: Test in Bot
1. Restart the bot: `pm2 restart pnptv-bot`
2. Send `/schedulecall` to the bot
3. Follow the prompts
4. Verify you receive a Zoom link

---

### PHASE 8: Enhancements (Optional)

#### Enhancement 1: Send Reminders
Add a cron job to send reminders 15 minutes before meetings:

**File**: `src/services/meetingReminderService.js`
```javascript
const cron = require('node-cron');
const { db } = require('../config/firebase');
const { Telegraf } = require('telegraf');

function startMeetingReminders(bot) {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

      // Find meetings starting in ~15 minutes
      const upcomingCalls = await db.collection('scheduled_calls')
        .where('scheduledTime', '>', now)
        .where('scheduledTime', '<', in15Minutes)
        .where('reminderSent', '==', false)
        .get();

      for (const doc of upcomingCalls.docs) {
        const call = doc.data();

        // Send reminder to host
        await bot.telegram.sendMessage(
          call.hostId,
          `⏰ *Reminder!*\n\n` +
          `Your video call "${call.title}" starts in 15 minutes!\n\n` +
          `🔗 Join URL: ${call.zoomJoinUrl}`,
          { parse_mode: 'Markdown' }
        );

        // Mark reminder as sent
        await doc.ref.update({ reminderSent: true });
      }
    } catch (error) {
      console.error('Error sending meeting reminders:', error);
    }
  });
}

module.exports = { startMeetingReminders };
```

#### Enhancement 2: List Upcoming Calls
Add command to view scheduled calls:

```javascript
async function handleMyCall(ctx) {
  const userId = ctx.from.id.toString();

  const calls = await db.collection('scheduled_calls')
    .where('hostId', '==', userId)
    .where('status', '==', 'scheduled')
    .orderBy('scheduledTime', 'asc')
    .limit(5)
    .get();

  if (calls.empty) {
    await ctx.reply('You have no upcoming video calls.');
    return;
  }

  let message = '📹 *Your Upcoming Calls:*\n\n';

  calls.forEach((doc, index) => {
    const call = doc.data();
    message += `${index + 1}. *${call.title}*\n`;
    message += `   🕒 ${new Date(call.scheduledTime.toDate()).toLocaleString()}\n`;
    message += `   🔗 ${call.zoomJoinUrl}\n\n`;
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
```

---

## 📝 Checklist

### Setup Phase:
- [ ] Create Zoom account
- [ ] Create Server-to-Server OAuth app
- [ ] Copy Account ID, Client ID, Client Secret
- [ ] Add scopes (meeting:write:admin, meeting:read:admin)
- [ ] Activate the app

### Installation Phase:
- [ ] Install axios: `npm install axios`
- [ ] Add Zoom credentials to `.env`
- [ ] Create `src/services/zoomService.js`
- [ ] Update `src/services/communityService.js`
- [ ] Update `src/bot/handlers/community.js`
- [ ] Update `src/bot/index.js`

### Testing Phase:
- [ ] Run `test-zoom.js` to verify connection
- [ ] Restart bot: `pm2 restart pnptv-bot`
- [ ] Test `/schedulecall` command
- [ ] Verify Zoom link works
- [ ] Test joining the meeting

### Enhancement Phase (Optional):
- [ ] Add meeting reminders
- [ ] Add `/mycalls` command
- [ ] Add ability to cancel meetings
- [ ] Add participant invite system

---

## 🚨 Common Issues & Solutions

### Issue 1: "Failed to authenticate with Zoom"
**Solution**: Double-check your credentials in `.env` match your Zoom app

### Issue 2: "Invalid grant"
**Solution**: Make sure your Zoom app is activated in the Marketplace

### Issue 3: "Insufficient privileges"
**Solution**: Add the required scopes in your Zoom app settings

### Issue 4: "Meeting creation failed"
**Solution**: Check that the start time is in the future and properly formatted

---

## 💰 Zoom Pricing

- **Free Plan**: Up to 100 participants, 40-minute limit on group meetings
- **Pro Plan** ($14.99/month): Up to 100 participants, no time limit
- **Business Plan** ($19.99/month/user): Up to 300 participants

For PNPtv, the **Free Plan** might be sufficient for testing and small communities!

---

## 🎉 You're Done!

Your bot can now:
- ✅ Create real Zoom meetings
- ✅ Schedule video calls
- ✅ Generate join links
- ✅ Store meeting details
- ✅ Send meeting info to users

---

**Next Steps**: Test it live and gather user feedback!
