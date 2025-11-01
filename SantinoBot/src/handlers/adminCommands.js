const logger = require('../utils/logger');
const communityConfig = require('../config/communityConfig');
const videoCallService = require('../services/videoCallService');
const liveStreamService = require('../services/liveStreamService');
const broadcastService = require('../services/broadcastService');

/**
 * Admin Commands Handler
 * All commands related to scheduling, broadcasting, and community management
 */

/**
 * Command: /configwelcome
 * Admin sets welcome message, rules, and description
 */
async function cmdConfigWelcome(ctx) {
  try {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ This command is only available to group administrators.');
      return;
    }
    
    const currentConfig = await communityConfig.getCommunityConfig();
    
    await ctx.reply(
      `📝 *Welcome Message Configuration*\n\n` +
      `*Current Settings:*\n` +
      `Title: ${currentConfig.welcomeTitle}\n\n` +
      `*To update, send commands:*\n\n` +
      `\`/setwelcometitle Your New Title\`\n` +
      `\`/setsantinomsg Your message from Santino\`\n` +
      `\`/setdescription Community description here\`\n` +
      `\`/setrules Your community rules\`\n\n` +
      `*Example:*\n` +
      `\`/setwelcometitle 👋 Welcome to PNPtv Community!\``,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error in configwelcome command:', error);
    await ctx.reply('❌ Error loading configuration. Please try again.').catch(() => {});
  }
}

/**
 * Command: /schedulevideocall
 * Admin schedules a video call
 */
async function cmdScheduleVideoCall(ctx) {
  try {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ Admin only command');
      return;
    }
    
    const args = ctx.message.text.split('\n');
    
    if (args.length < 4) {
      await ctx.reply(
        `📹 **Schedule Video Call**\n\n` +
        `Format:\n` +
        `\`/schedulevideocall\n` +
        `Title: Your Call Title\n` +
        `Time: 2025-01-15 19:00\n` +
        `Platform: telegram|discord|zoom|other\n` +
        `Description: Your description\n` +
        `Link: https://... (optional)\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    const title = args[1]?.replace('Title: ', '')?.trim();
    const timeStr = args[2]?.replace('Time: ', '')?.trim();
    const platform = args[3]?.replace('Platform: ', '')?.trim();
    const description = args[4]?.replace('Description: ', '')?.trim() || 'Video call';
    const roomLink = args[5]?.replace('Link: ', '')?.trim();
    
    const result = await videoCallService.scheduleVideoCall(ctx.chat.id, {
      title,
      description,
      scheduledTime: new Date(timeStr),
      vcPlatform: platform,
      roomLink,
      createdBy: ctx.from.id.toString()
    });
    
    if (result.success) {
      const message = await videoCallService.buildVideoCallMessage(result.callId);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in schedulevideocall command:', error);
    await ctx.reply('❌ Error scheduling video call');
  }
}

/**
 * Command: /schedulelivestream
 * Admin schedules a live stream with performer
 */
async function cmdScheduleLiveStream(ctx) {
  try {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ Admin only command');
      return;
    }
    
    const args = ctx.message.text.split('\n');
    
    if (args.length < 4) {
      await ctx.reply(
        `📺 **Schedule Live Stream**\n\n` +
        `Format:\n` +
        `\`/schedulelivestream\n` +
        `Title: Stream Title\n` +
        `PerformerID: 123456789\n` +
        `Time: 2025-01-15 20:00\n` +
        `Platform: telegram|youtube|twitch|facebook\n` +
        `Description: Your description\n` +
        `Link: https://... (optional)\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    const title = args[1]?.replace('Title: ', '')?.trim();
    const performerId = args[2]?.replace('PerformerID: ', '')?.trim();
    const timeStr = args[3]?.replace('Time: ', '')?.trim();
    const platform = args[4]?.replace('Platform: ', '')?.trim();
    const description = args[5]?.replace('Description: ', '')?.trim() || 'Live stream';
    const streamLink = args[6]?.replace('Link: ', '')?.trim();
    
    // Get performer info
    const performer = await liveStreamService.getPerformerInfo(performerId);
    if (!performer) {
      await ctx.reply('❌ Performer not found');
      return;
    }
    
    const result = await liveStreamService.scheduleLiveStream(ctx.chat.id, {
      title,
      description,
      scheduledTime: new Date(timeStr),
      performerId,
      performerName: performer.name,
      platform,
      streamLink,
      createdBy: ctx.from.id.toString()
    });
    
    if (result.success) {
      const message = await liveStreamService.buildLiveStreamMessage(result.streamId);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in schedulelivestream command:', error);
    await ctx.reply('❌ Error scheduling live stream');
  }
}

/**
 * Command: /broadcast
 * Admin creates and sends broadcast message
 */
async function cmdBroadcast(ctx) {
  try {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ This command is only available to group administrators.');
      return;
    }
    
    const args = ctx.message.text.split('\n');
    
    if (args.length < 2) {
      await ctx.reply(
        `📢 *Send Broadcast Message*\n\n` +
        `*Simple Format:*\n` +
        `\`\`\`\n/broadcast\nYour message here\`\`\`\n\n` +
        `*Advanced Format:*\n` +
        `\`\`\`\n/broadcast\n` +
        `Title: Announcement\n` +
        `Content: Your message\n` +
        `Type: text\n` +
        `Schedule: now\`\`\`\n\n` +
        `*Examples:*\n` +
        `• \`/broadcast\\nHello everyone!\` - Send immediately\n` +
        `• Schedule options: now | once | recurring\n` +
        `• Types: text | photo | video`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Simple mode: just message content
    if (!args[1].startsWith('Title:')) {
      const content = args.slice(1).join('\n');
      const result = await broadcastService.createBroadcast({
        groupId: ctx.chat.id,
        title: 'Quick Broadcast',
        content,
        messageType: 'text',
        schedule: null,
        createdBy: ctx.from.id.toString()
      });
      
      if (result.success) {
        await ctx.reply(`✅ Broadcast sent successfully!`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`❌ Error: ${result.error}`);
      }
      return;
    }
    
    // Advanced mode with full options
    const title = args[1]?.replace('Title: ', '')?.trim();
    const content = args[2]?.replace('Content: ', '')?.trim();
    const messageType = args[3]?.replace('Type: ', '')?.trim() || 'text';
    const scheduleType = args[4]?.replace('Schedule: ', '')?.trim() || 'now';
    const timeStr = args[5]?.replace('Time: ', '')?.trim();
    const pattern = args[6]?.replace('Pattern: ', '')?.trim();
    
    let schedule = null;
    if (scheduleType === 'once') {
      schedule = { type: 'once', time: new Date(timeStr) };
    } else if (scheduleType === 'recurring') {
      schedule = { type: 'recurring', recurringPattern: pattern };
    }
    
    const result = await broadcastService.createBroadcast({
      groupId: ctx.chat.id,
      title,
      content,
      messageType,
      schedule,
      createdBy: ctx.from.id.toString()
    });
    
    if (result.success) {
      if (scheduleType === 'now') {
        await ctx.reply(`✅ Broadcast sent!`, { parse_mode: 'Markdown' });
      } else if (scheduleType === 'once') {
        await ctx.reply(`✅ Broadcast scheduled for ${timeStr}`, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply(`✅ Recurring broadcast created with pattern: \`${pattern}\``, { parse_mode: 'Markdown' });
      }
    } else {
      await ctx.reply(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in broadcast command:', error);
    await ctx.reply('❌ Error creating broadcast. Please check your format and try again.').catch(() => {});
  }
}

/**
 * Command: /listscheduled
 * Admin views all scheduled events
 */
async function cmdListScheduled(ctx) {
  try {
    const isAdmin = await checkIsAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ Admin only command');
      return;
    }
    
    const calls = await videoCallService.getScheduledCalls(ctx.chat.id);
    const streams = await liveStreamService.getScheduledStreams(ctx.chat.id);
    
    let message = `📅 **Scheduled Events**\n\n`;
    
    if (calls.length > 0) {
      message += `📹 **Video Calls** (${calls.length})\n`;
      calls.forEach((call, i) => {
        const time = call.scheduledTime.toDate().toLocaleString();
        message += `${i+1}. ${call.title}\n   🕐 ${time}\n\n`;
      });
    }
    
    if (streams.length > 0) {
      message += `📺 **Live Streams** (${streams.length})\n`;
      streams.forEach((stream, i) => {
        const time = stream.scheduledTime.toDate().toLocaleString();
        message += `${i+1}. ${stream.title}\n   🎤 ${stream.performerName}\n   🕐 ${time}\n\n`;
      });
    }
    
    if (calls.length === 0 && streams.length === 0) {
      message += `No scheduled events found`;
    }
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in listscheduled command:', error);
    await ctx.reply('❌ Error listing scheduled events');
  }
}

/**
 * Helper: Check if user is admin
 */
async function checkIsAdmin(ctx) {
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return member.status === 'administrator' || member.status === 'creator';
  } catch (error) {
    logger.error('Error checking admin status:', error);
    return false;
  }
}

module.exports = {
  cmdConfigWelcome,
  cmdScheduleVideoCall,
  cmdScheduleLiveStream,
  cmdBroadcast,
  cmdListScheduled,
  checkIsAdmin
};
