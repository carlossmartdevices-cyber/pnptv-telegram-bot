const { getUserPermissions } = require("../helpers/groupManagement");
const { getNearbyUsers, trackNearbySearch, getTracks, getTopTracks, scheduleVideoCall, scheduleLiveStream, addTrack, createPlaylist, getScheduledBroadcasts } = require("../../services/communityService");
const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");

/**
 * Community Features
 * Nearby users, music library, scheduling, video calls, etc.
 */

/**
 * Handle /nearby command - Find nearby members
 */
async function handleNearby(ctx) {
  try {
    const userId = ctx.from.id.toString();
    
    // Check user permissions
    const { tier } = await getUserPermissions(userId);
    
    // Track search for free users
    const searchResult = await trackNearbySearch(userId);
    
    if (!searchResult.allowed) {
      await ctx.reply(
        t(ctx, 'nearby.limit_reached') || 
        `⚠️ *Search Limit Reached*\n\n` +
        `Free users can search for nearby members 3 times per week.\n\n` +
        `💎 Upgrade to premium for unlimited searches and more features!\n\n` +
        `Send /plans to see subscription options.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await ctx.reply('🔍 Searching for nearby members...');

    const nearbyUsers = await getNearbyUsers(userId);
    
    if (nearbyUsers.length === 0) {
      await ctx.reply(
        t(ctx, 'nearby.none_found') ||
        `📍 *No nearby members found*\n\n` +
        `Make sure you've shared your location in the bot settings!\n\n` +
        `💡 Tip: More members join daily, try again later.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Limit results for free users
    const maxResults = tier === 'Free' ? 3 : nearbyUsers.length;
    const displayUsers = nearbyUsers.slice(0, maxResults);

    let message = `📍 *Nearby Members* ${tier === 'Free' ? '(Limited to 3)' : ''}\n\n`;

    displayUsers.forEach((user, index) => {
      const tierEmoji = user.tier === 'Free' ? '🆓' : '💎';
      const distance = user.distance.toFixed(1);
      message += `${index + 1}. ${tierEmoji} @${user.username || user.firstName}\n`;
      message += `   📏 ${distance} km away\n`;
      message += `   🕒 ${user.lastActive ? 'Active recently' : 'Last seen: Unknown'}\n\n`;
    });

    if (tier === 'Free') {
      const remaining = searchResult.remaining;
      message += `\n🔍 *Searches remaining this week:* ${remaining}\n`;
      message += `💎 *Premium:* Unlimited searches + see all nearby members!`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
    logger.info(`User ${userId} found ${nearbyUsers.length} nearby members`);
    
  } catch (error) {
    logger.error('Error in handleNearby:', error);
    await ctx.reply(
      t(ctx, 'errors.generic') || 
      '❌ Error searching for nearby members. Please try again.'
    );
  }
}

/**
 * Handle /library command - View music library (Basic and Premium tiers)
 */
async function handleLibrary(ctx) {
  try {
    const userId = ctx.from.id.toString();
    // Use 'community-library' as the fixed groupId for all users
    // This ensures all premium members can see the same library
    // regardless of whether they call from DM or group chat
    const groupId = 'community-library';

    const { tier } = await getUserPermissions(userId);

    // Library requires at least Basic tier
    if (tier === 'Free') {
      await ctx.reply(
        `🎵 *Music Library*\n\n` +
        `This feature is available for paid members.\n\n` +
        `📀 With a subscription you can:\n` +
        `• Browse music library\n` +
        `• View playlists\n` +
        `• Access exclusive content\n\n` +
        `Send /plans to upgrade!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const tracks = await getTracks(groupId);

    if (tracks.length === 0) {
      await ctx.reply(
        `🎵 *Music Library*\n\n` +
        `No tracks available yet.\n\n` +
        `💡 Admins can add tracks using /addtrack command.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Send header message
    await ctx.reply(
      `🎵 *Music Library* (${tracks.length} track${tracks.length > 1 ? 's' : ''})\n\n` +
      `Showing ${Math.min(tracks.length, 10)} tracks:`,
      { parse_mode: 'Markdown' }
    );

    // Send each track with interactive buttons
    const tracksToShow = tracks.slice(0, 10);

    for (const track of tracksToShow) {
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';

      let message = `${typeEmoji} *${track.title}*\n`;
      message += `👤 ${track.artist}\n`;
      message += `🎯 ${track.genre}\n`;
      message += `🔥 ${track.playCount || 0} plays`;

      // Create inline keyboard with buttons
      const keyboard = {
        inline_keyboard: []
      };

      // Add Play button if URL exists
      if (track.url) {
        keyboard.inline_keyboard.push([
          { text: '▶️ Play Track', url: track.url }
        ]);
      } else {
        // If no URL, show a disabled-looking button or skip
        message += `\n\n⚠️ _No playback URL available_`;
      }

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }

    if (tracks.length > 10) {
      await ctx.reply(
        `\n... and ${tracks.length - 10} more track${tracks.length - 10 > 1 ? 's' : ''}!\n\n` +
        `💡 _Use /toptracks to see the most popular tracks_`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    logger.error('Error in handleLibrary:', error);
    await ctx.reply('❌ Error accessing music library. Please try again.');
  }
}

/**
 * Handle /toptracks command - Show most played tracks
 */
async function handleTopTracks(ctx) {
  try {
    // Use 'community-library' as the fixed groupId for all users
    const groupId = 'community-library';
    
    const topTracks = await getTopTracks(groupId, 5);
    
    if (topTracks.length === 0) {
      await ctx.reply(
        `🔥 *Top Tracks*\n\n` +
        `No tracks have been played yet.\n\n` +
        `Start listening to build the top tracks list!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = `🔥 *Top Tracks*\n\n`;
    
    topTracks.forEach((track, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';
      
      message += `${medal} ${typeEmoji} *${track.title}*\n`;
      message += `   👤 ${track.artist}\n`;
      message += `   🔥 ${track.playCount} plays\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    logger.error('Error in handleTopTracks:', error);
    await ctx.reply('❌ Error getting top tracks. Please try again.');
  }
}

/**
 * Handle /schedulecall command - Schedule video call (Premium tier only) with Zoom
 */
async function handleScheduleCall(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const { tier } = await getUserPermissions(userId);

    // Video calls require Premium tier (Crystal/Diamond members)
    if (tier !== 'Premium') {
      await ctx.reply(
        `📹 *Video Calls*\n\n` +
        `This feature is available for Premium members only (Crystal & Diamond).\n\n` +
        `💎 Premium members can:\n` +
        `• Schedule video calls\n` +
        `• Host live streams\n` +
        `• Create private rooms\n` +
        `• And more!\n\n` +
        `Upgrade to Crystal or Diamond: Send /plans`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Parse command arguments
    // Format: /schedulecall Title | Date & Time | Duration (minutes)
    const commandText = ctx.message.text;
    const args = commandText.replace('/schedulecall', '').trim();

    if (!args) {
      await ctx.reply(
        `📹 *Schedule Video Call*\n\n` +
        `*Usage:*\n` +
        `/schedulecall Title | Date & Time | Duration\n\n` +
        `*Examples:*\n` +
        `/schedulecall Team Meeting | 2025-11-10 15:00 | 60\n` +
        `/schedulecall Music Session | tomorrow 3pm | 90\n\n` +
        `*Format:*\n` +
        `• Title: Name of your meeting\n` +
        `• Date & Time: YYYY-MM-DD HH:MM or "tomorrow 3pm"\n` +
        `• Duration: Minutes (default 60)\n\n` +
        `💎 Powered by Zoom!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Split arguments by pipe character
    const parts = args.split('|').map(part => part.trim());

    if (parts.length < 2) {
      await ctx.reply(
        `❌ *Invalid Format*\n\n` +
        `Please provide at least: Title | Date & Time\n\n` +
        `Example: /schedulecall Team Meeting | 2025-11-10 15:00 | 60`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const [title, dateTimeStr, durationStr] = parts;
    const duration = parseInt(durationStr) || 60;

    // Parse date/time (simple parsing - you may want to use a library like moment.js)
    let scheduledTime;
    try {
      // Try to parse ISO format or simple date format
      scheduledTime = new Date(dateTimeStr);

      // Check if date is valid and in the future
      if (isNaN(scheduledTime.getTime()) || scheduledTime < new Date()) {
        await ctx.reply(
          `❌ *Invalid Date/Time*\n\n` +
          `Please provide a future date and time.\n\n` +
          `Format: YYYY-MM-DD HH:MM\n` +
          `Example: 2025-11-10 15:00`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
    } catch (error) {
      await ctx.reply(
        `❌ *Invalid Date Format*\n\n` +
        `Please use format: YYYY-MM-DD HH:MM\n` +
        `Example: 2025-11-10 15:00`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Schedule the video call with Zoom
    await ctx.reply('⏳ Creating Zoom meeting...');

    const result = await scheduleVideoCall(userId, {
      title: title || 'PNPtv Video Call',
      hostName: ctx.from.first_name || 'Unknown',
      scheduledTime,
      duration,
      isPublic: true,
    });

    if (result.success) {
      const message =
        `✅ *Video Call Scheduled Successfully!*\n\n` +
        `📹 *${title}*\n` +
        `🕒 ${scheduledTime.toLocaleString('en-US', { timeZone: 'America/Bogota' })}\n` +
        `⏱️ Duration: ${duration} minutes\n` +
        `👤 Host: ${ctx.from.first_name}\n\n` +
        `🔗 *Join URL:*\n${result.joinUrl}\n\n` +
        (result.password ? `🔒 *Password:* ${result.password}\n\n` : '') +
        `📋 *Meeting ID:* ${result.meetingId}\n\n` +
        `💡 *Note:* Share the join URL with participants!\n` +
        `⚡ Powered by Zoom`;

      await ctx.reply(message, { parse_mode: 'Markdown' });

      // Notify the group about the scheduled event
      if (ctx.chat?.id && ctx.chat.type === 'group') {
        try {
          const groupAnnouncement = 
            `📹 *New Video Call Scheduled!*\n\n` +
            `🎯 *${title}*\n` +
            `👤 Host: ${ctx.from.first_name}\n` +
            `🕒 Time: ${scheduledTime.toLocaleString('en-US', { timeZone: 'America/Bogota' })}\n` +
            `⏱️ Duration: ${duration} minutes\n\n` +
            `🔗 [Join Video Call](${result.joinUrl})\n\n` +
            (result.password ? `🔒 Password: \`${result.password}\`\n\n` : '') +
            `📋 Meeting ID: \`${result.meetingId}\`\n\n` +
            `💡 Click the link above to join!`;
          
          await ctx.telegram.sendMessage(ctx.chat.id, groupAnnouncement, { parse_mode: 'Markdown' });
          logger.info(`Group notification sent for video call: ${title}`);
        } catch (error) {
          logger.error('Error sending group notification for video call:', error);
        }
      }

      logger.info(`User ${userId} scheduled video call: ${title} at ${scheduledTime}`);
    } else {
      await ctx.reply(
        `❌ *Error Scheduling Video Call*\n\n` +
        `${result.error}\n\n` +
        `Please try again or contact support.`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    logger.error('Error in handleScheduleCall:', error);
    await ctx.reply('❌ Error with video call feature. Please try again.');
  }
}

/**
 * Handle /schedulestream command - Schedule live stream (Premium tier only) with Zoom
 */
async function handleScheduleStream(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const { tier } = await getUserPermissions(userId);

    // Live streaming requires Premium tier (Crystal/Diamond members)
    if (tier !== 'Premium') {
      await ctx.reply(
        `📺 *Live Streaming*\n\n` +
        `This feature is available for Premium members only (Crystal & Diamond).\n\n` +
        `💎 Premium members can:\n` +
        `• Schedule live streams\n` +
        `• Broadcast to the community\n` +
        `• Host live events\n` +
        `• And more!\n\n` +
        `Upgrade to Crystal or Diamond: Send /plans`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Parse command arguments
    // Format: /schedulestream Title | Date & Time | Duration (minutes)
    const commandText = ctx.message.text;
    const args = commandText.replace('/schedulestream', '').trim();

    if (!args) {
      await ctx.reply(
        `📺 *Schedule Live Stream*\n\n` +
        `*Usage:*\n` +
        `/schedulestream Title | Date & Time | Duration\n\n` +
        `*Examples:*\n` +
        `/schedulestream Music Show | 2025-11-10 20:00 | 120\n` +
        `/schedulestream DJ Set | tomorrow 8pm | 180\n\n` +
        `*Format:*\n` +
        `• Title: Name of your stream\n` +
        `• Date & Time: YYYY-MM-DD HH:MM\n` +
        `• Duration: Minutes (default 120)\n\n` +
        `💎 Powered by Zoom!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Split arguments by pipe character
    const parts = args.split('|').map(part => part.trim());

    if (parts.length < 2) {
      await ctx.reply(
        `❌ *Invalid Format*\n\n` +
        `Please provide at least: Title | Date & Time\n\n` +
        `Example: /schedulestream Music Show | 2025-11-10 20:00 | 120`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const [title, dateTimeStr, durationStr] = parts;
    const duration = parseInt(durationStr) || 120; // Default 2 hours for streams

    // Parse date/time
    let scheduledTime;
    try {
      scheduledTime = new Date(dateTimeStr);

      // Check if date is valid and in the future
      if (isNaN(scheduledTime.getTime()) || scheduledTime < new Date()) {
        await ctx.reply(
          `❌ *Invalid Date/Time*\n\n` +
          `Please provide a future date and time.\n\n` +
          `Format: YYYY-MM-DD HH:MM\n` +
          `Example: 2025-11-10 20:00`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
    } catch (error) {
      await ctx.reply(
        `❌ *Invalid Date Format*\n\n` +
        `Please use format: YYYY-MM-DD HH:MM\n` +
        `Example: 2025-11-10 20:00`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Schedule the live stream with Zoom
    await ctx.reply('⏳ Creating Zoom stream...');

    const result = await scheduleLiveStream(userId, {
      title: title || 'PNPtv Live Stream',
      hostName: ctx.from.first_name || 'Unknown',
      scheduledTime,
      duration,
    });

    if (result.success) {
      const message =
        `✅ *Live Stream Scheduled Successfully!*\n\n` +
        `📺 *${title}*\n` +
        `🕒 ${scheduledTime.toLocaleString('en-US', { timeZone: 'America/Bogota' })}\n` +
        `⏱️ Duration: ${duration} minutes\n` +
        `👤 Host: ${ctx.from.first_name}\n\n` +
        `🔗 *Stream URL:*\n${result.joinUrl}\n\n` +
        (result.password ? `🔒 *Password:* ${result.password}\n\n` : '') +
        `📋 *Meeting ID:* ${result.meetingId}\n\n` +
        `💡 *Note:* Share the stream URL with your audience!\n` +
        `⚡ Powered by Zoom`;

      await ctx.reply(message, { parse_mode: 'Markdown' });

      // Notify the group about the scheduled event
      if (ctx.chat?.id && ctx.chat.type === 'group') {
        try {
          const groupAnnouncement = 
            `📺 *New Live Stream Scheduled!*\n\n` +
            `🎯 *${title}*\n` +
            `👤 Host: ${ctx.from.first_name}\n` +
            `🕒 Time: ${scheduledTime.toLocaleString('en-US', { timeZone: 'America/Bogota' })}\n` +
            `⏱️ Duration: ${duration} minutes\n\n` +
            `🔗 [Watch Live Stream](${result.joinUrl})\n\n` +
            (result.password ? `🔒 Password: \`${result.password}\`\n\n` : '') +
            `📋 Meeting ID: \`${result.meetingId}\`\n\n` +
            `💡 Click the link above to watch!`;
          
          await ctx.telegram.sendMessage(ctx.chat.id, groupAnnouncement, { parse_mode: 'Markdown' });
          logger.info(`Group notification sent for live stream: ${title}`);
        } catch (error) {
          logger.error('Error sending group notification for live stream:', error);
        }
      }

      logger.info(`User ${userId} scheduled live stream: ${title} at ${scheduledTime}`);
    } else {
      await ctx.reply(
        `❌ *Error Scheduling Live Stream*\n\n` +
        `${result.error}\n\n` +
        `Please try again or contact support.`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    logger.error('Error in handleScheduleStream:', error);
    await ctx.reply('❌ Error with streaming feature. Please try again.');
  }
}

/**
 * Handle /upcoming command - Show upcoming events
 */
async function handleUpcoming(ctx) {
  try {
    const groupId = ctx.chat?.id?.toString() || 'default';

    const events = await getScheduledBroadcasts(groupId);

    if (events.length === 0) {
      await ctx.reply(
        `📅 *Upcoming Events*\n\n` +
        `No events scheduled.\n\n` +
        `💡 Premium members can schedule:\n` +
        `• Music broadcasts 🎶\n` +
        `• Podcast episodes 🎙️\n` +
        `• Live DJ sets 🎧\n` +
        `• Video calls 📹\n` +
        `• Live streams 📡\n\n` +
        `Stay tuned for announcements!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Send header
    await ctx.reply(
      `📅 *Upcoming Events* (${events.length} event${events.length > 1 ? 's' : ''})\n\n` +
      `🌍 _Times shown in UTC. Tap event for your local time._`,
      { parse_mode: 'Markdown' }
    );

    // Helper function to get relative time
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

    // Send each event with interactive buttons
    const eventsToShow = events.slice(0, 10);

    for (const event of eventsToShow) {
      const scheduledTime = event.scheduledTime?.toDate ? event.scheduledTime.toDate() : new Date(event.scheduledTime);

      // Determine emoji based on event type
      let typeEmoji = '🎶';
      let eventTypeName = event.type || 'Event';

      if (event.eventType === 'video_call' || event.type === 'zoom_call') {
        typeEmoji = '📹';
        eventTypeName = 'Zoom Call';
      } else if (event.eventType === 'stream' || event.type === 'live_stream') {
        typeEmoji = '📡';
        eventTypeName = 'Live Stream';
      } else if (event.type === 'podcast') {
        typeEmoji = '🎙️';
        eventTypeName = 'Podcast';
      } else if (event.type === 'live_dj') {
        typeEmoji = '🎧';
        eventTypeName = 'Live DJ';
      }

      // Format message with UTC time and relative time
      const utcDate = scheduledTime.toISOString().split('T')[0];
      const utcTime = scheduledTime.toISOString().split('T')[1].substring(0, 5);
      const relativeTime = getRelativeTime(scheduledTime);

      let message = `${typeEmoji} *${event.title || 'Untitled Event'}*\n`;
      message += `👤 ${event.hostName || 'Unknown'}\n`;
      message += `📅 ${utcDate} at ${utcTime} UTC\n`;
      message += `⏰ ${relativeTime}\n`;

      if (event.description) {
        message += `📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n`;
      }

      // Create inline keyboard with buttons
      const keyboard = {
        inline_keyboard: []
      };

      const buttons = [];

      // Add join button for video calls/streams
      if ((event.eventType === 'video_call' || event.type === 'zoom_call') && event.zoomJoinUrl) {
        buttons.push({ text: '🎥 Join Call', url: event.zoomJoinUrl });
      }

      // Add event ID for deletion reference
      const eventId = event.callId || event.streamId || event.broadcastId;
      if (eventId) {
        message += `\n🆔 ID: \`${eventId}\``;
      }

      if (buttons.length > 0) {
        keyboard.inline_keyboard.push(buttons);
      }

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }

    if (events.length > 10) {
      await ctx.reply(
        `\n... and ${events.length - 10} more event${events.length - 10 > 1 ? 's' : ''}!`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    logger.error('Error in handleUpcoming:', error);
    await ctx.reply('❌ Error getting upcoming events. Please try again.');
  }
}

/**
 * Handle /playlist command - Create or view playlists (Admin only)
 */
async function handlePlaylist(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const { isAdmin } = require("../../config/admin");

    // Check if user is admin
    if (!isAdmin(userId)) {
      await ctx.reply(
        `🔒 *Permission Denied*\n\n` +
        `Only administrators can create or manage playlists.\n\n` +
        `This is an admin-only feature.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Use 'community-library' as the fixed groupId for all users
    const groupId = 'community-library';
    const args = ctx.message.text.split('\n');

    if (args.length < 2) {
      await ctx.reply(
        `📀 *Playlist Manager*\n\n` +
        `*Create a playlist:*\n` +
        `/playlist\n` +
        `Name: Chill Vibes\n` +
        `Description: Late night music\n` +
        `Tracks: track_id1,track_id2,track_id3\n\n` +
        `*View playlist:*\n` +
        `/playlist playlist_id`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // If single argument, show playlist details
    if (args.length === 1 && args[0].split(' ').length === 2) {
      const playlistId = args[0].split(' ')[1];

      // Get playlist from Firestore
      const { db } = require("../../config/firebase");
      const playlistDoc = await db.collection('playlists').doc(playlistId).get();

      if (!playlistDoc.exists) {
        await ctx.reply('❌ Playlist not found', { parse_mode: 'Markdown' });
        return;
      }

      const playlist = playlistDoc.data();

      let message = `📀 *${playlist.name}*\n\n`;
      message += `${playlist.description || 'No description'}\n\n`;
      message += `🎵 *Tracks:* ${playlist.tracks?.length || 0}\n`;
      message += `👤 Created by: User ${playlist.createdBy}\n`;
      message += `📅 Created: ${playlist.createdAt.toDate().toLocaleDateString()}\n\n`;

      if (playlist.tracks && playlist.tracks.length > 0) {
        message += `*Track IDs:*\n`;
        playlist.tracks.slice(0, 10).forEach((trackId, i) => {
          message += `${i + 1}. ${trackId}\n`;
        });
        if (playlist.tracks.length > 10) {
          message += `... and ${playlist.tracks.length - 10} more`;
        }
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
      return;
    }

    // Create new playlist
    const name = args[1]?.replace('Name: ', '')?.replace('Name:', '')?.trim();
    const description = args[2]?.replace('Description: ', '')?.replace('Description:', '')?.trim();
    const tracksStr = args[3]?.replace('Tracks: ', '')?.replace('Tracks:', '')?.trim();
    const tracks = tracksStr ? tracksStr.split(',').map(t => t.trim()) : [];

    if (!name) {
      await ctx.reply('❌ Playlist name is required', { parse_mode: 'Markdown' });
      return;
    }

    // Create playlist data
    const playlistData = {
      name,
      description: description || '',
      tracks,
      createdBy: userId,
    };

    // Use the createPlaylist service
    const result = await createPlaylist(groupId, playlistData);

    if (result.success) {
      await ctx.reply(
        `✅ *Playlist Created Successfully!*\n\n` +
        `📀 *${name}*\n` +
        `${description ? `📝 ${description}\n` : ''}` +
        `🎵 Tracks: ${tracks.length}\n` +
        `🔖 Playlist ID: ${result.playlistId}\n\n` +
        `Use /library to view available tracks!`,
        { parse_mode: 'Markdown' }
      );

      logger.info(`Admin ${userId} created playlist: ${name} (${result.playlistId})`);
    } else {
      await ctx.reply(
        `❌ *Error Creating Playlist*\n\n` +
        `${result.error}\n\n` +
        `Please try again or contact support.`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    logger.error('Error in handlePlaylist:', error);
    await ctx.reply('❌ Error managing playlist. Please try again.');
  }
}

/**
 * Handle /addtrack command - Add music track to library (Admin only)
 */
async function handleAddTrack(ctx) {
  try {
    const userId = ctx.from.id.toString();
    // Use 'community-library' as the fixed groupId for all users
    // This ensures all premium members see the same library
    // regardless of where they call the commands from
    const groupId = 'community-library';
    const { isAdmin } = require("../../config/admin");

    // Check if user is admin
    if (!isAdmin(userId)) {
      await ctx.reply(
        `🔒 *Permission Denied*\n\n` +
        `Only administrators can add tracks to the music library.\n\n` +
        `This is an admin-only feature.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Parse command arguments
    // Format: /addtrack Title | Artist | Genre | URL/FileID
    const commandText = ctx.message.text;
    const args = commandText.replace('/addtrack', '').trim();

    if (!args) {
      await ctx.reply(
        `🎵 *Add Music Track*\n\n` +
        `*Usage:*\n` +
        `/addtrack Title | Artist | Genre | URL\n\n` +
        `*Example:*\n` +
        `/addtrack Bohemian Rhapsody | Queen | Rock | https://example.com/song.mp3\n\n` +
        `*Or upload a music file with caption:*\n` +
        `Title | Artist | Genre`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Split arguments by pipe character
    const parts = args.split('|').map(part => part.trim());

    if (parts.length < 3) {
      await ctx.reply(
        `❌ *Invalid Format*\n\n` +
        `Please provide at least: Title | Artist | Genre\n\n` +
        `Example: /addtrack Bohemian Rhapsody | Queen | Rock | https://example.com/song.mp3`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const [title, artist, genre, url] = parts;

    // Create track data - only include url if provided
    const trackData = {
      title: title || 'Untitled',
      artist: artist || 'Unknown Artist',
      genre: genre || 'Other',
      type: 'music',
      addedBy: userId,
      duration: 0
    };

    // Only add url if it's provided
    if (url) {
      trackData.url = url;
    }

    // Add track to library
    const result = await addTrack(groupId, trackData);

    if (result.success) {
      await ctx.reply(
        `✅ *Track Added Successfully!*\n\n` +
        `🎵 *${trackData.title}*\n` +
        `👤 Artist: ${trackData.artist}\n` +
        `🎯 Genre: ${trackData.genre}\n\n` +
        `Track ID: ${result.trackId}\n\n` +
        `Use /library to view all tracks!`,
        { parse_mode: 'Markdown' }
      );

      logger.info(`User ${userId} added track: ${trackData.title} to group ${groupId}`);
    } else {
      await ctx.reply(
        `❌ *Error Adding Track*\n\n` +
        `${result.error}\n\n` +
        `Please try again or contact support.`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    logger.error('Error in handleAddTrack:', error);
    await ctx.reply(
      t(ctx, 'errors.generic') ||
      '❌ Error adding track to library. Please try again.'
    );
  }
}

/**
 * Handle /deleteevent command - Delete scheduled event (Admin only)
 */
async function handleDeleteEvent(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const { isAdmin } = require("../../config/admin");

    // Check if user is admin
    if (!isAdmin(userId)) {
      await ctx.reply(
        `🔒 *Permission Denied*\n\n` +
        `Only administrators can delete scheduled events.\n\n` +
        `This is an admin-only feature.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Parse command arguments
    const commandText = ctx.message.text;
    const args = commandText.replace('/deleteevent', '').trim();

    if (!args) {
      await ctx.reply(
        `🗑️ *Delete Scheduled Event*\n\n` +
        `*Usage:*\n` +
        `/deleteevent <event_id>\n\n` +
        `*Example:*\n` +
        `/deleteevent call_1762219246922\n\n` +
        `💡 Use /upcoming to see event IDs`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const eventId = args.trim();

    // Try to find and delete the event from different collections
    let deleted = false;
    let eventType = '';
    const { db } = require("../../config/firebase");

    // Check scheduled_calls
    const callDoc = await db.collection('scheduled_calls').doc(eventId).get();
    if (callDoc.exists) {
      await db.collection('scheduled_calls').doc(eventId).delete();
      deleted = true;
      eventType = 'Video Call';
    }

    // Check scheduled_streams
    if (!deleted) {
      const streamDoc = await db.collection('scheduled_streams').doc(eventId).get();
      if (streamDoc.exists) {
        await db.collection('scheduled_streams').doc(eventId).delete();
        deleted = true;
        eventType = 'Live Stream';
      }
    }

    // Check scheduled_broadcasts
    if (!deleted) {
      const broadcastDoc = await db.collection('scheduled_broadcasts').doc(eventId).get();
      if (broadcastDoc.exists) {
        await db.collection('scheduled_broadcasts').doc(eventId).delete();
        deleted = true;
        eventType = 'Broadcast';
      }
    }

    if (deleted) {
      await ctx.reply(
        `✅ *Event Deleted*\n\n` +
        `${eventType} has been removed from the schedule.\n\n` +
        `🆔 Event ID: \`${eventId}\`\n\n` +
        `Use /upcoming to view remaining events.`,
        { parse_mode: 'Markdown' }
      );
      logger.info(`Admin ${userId} deleted event: ${eventId} (${eventType})`);
    } else {
      await ctx.reply(
        `❌ *Event Not Found*\n\n` +
        `No event found with ID: \`${eventId}\`\n\n` +
        `Please check the ID and try again.\n` +
        `Use /upcoming to see all scheduled events.`,
        { parse_mode: 'Markdown' }
      );
    }

  } catch (error) {
    logger.error('Error in handleDeleteEvent:', error);
    await ctx.reply(
      '❌ Error deleting event. Please try again.'
    );
  }
}

module.exports = {
  handleNearby,
  handleLibrary,
  handleTopTracks,
  handleScheduleCall,
  handleScheduleStream,
  handleUpcoming,
  handlePlaylist,
  handleAddTrack,
  handleDeleteEvent
};