const { getUserPermissions } = require("../helpers/groupManagement");
const { getNearbyUsers, trackNearbySearch, getTracks, getTopTracks, scheduleVideoCall, scheduleLiveStream, addTrack, createPlaylist, getScheduledBroadcasts } = require("../../services/communityService");
const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");

/**
 * Community Features - Integrated from SantinoBot
 * Nearby users, music library, scheduling, etc.
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
 * Handle /library command - View music library
 */
async function handleLibrary(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const groupId = ctx.chat?.id?.toString() || 'default';
    
    const { tier } = await getUserPermissions(userId);
    
    if (tier === 'Free') {
      await ctx.reply(
        `🎵 *Music Library*\n\n` +
        `This feature is available for premium members.\n\n` +
        `💎 Premium members can:\n` +
        `• Browse music library\n` +
        `• Add tracks to playlists\n` +
        `• Schedule music broadcasts\n` +
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

    let message = `🎵 *Music Library* (${tracks.length} tracks)\n\n`;
    
    tracks.slice(0, 10).forEach((track, index) => {
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';
      message += `${index + 1}. ${typeEmoji} *${track.title}*\n`;
      message += `   👤 ${track.artist}\n`;
      message += `   🎯 ${track.genre} • 🔥 ${track.playCount} plays\n\n`;
    });

    if (tracks.length > 10) {
      message += `\n... and ${tracks.length - 10} more tracks!`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
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
    const groupId = ctx.chat?.id?.toString() || 'default';
    
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
 * Handle /schedulecall command - Schedule video call (premium)
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

    // For now, show info about the feature
    await ctx.reply(
      `📹 *Schedule Video Call*\n\n` +
      `Coming soon! You'll be able to:\n\n` +
      `• Schedule video calls with other members\n` +
      `• Set up group calls\n` +
      `• Host live events\n` +
      `• Create private rooms\n\n` +
      `💎 This is a premium feature - you already have access!\n\n` +
      `Stay tuned for the full implementation.`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    logger.error('Error in handleScheduleCall:', error);
    await ctx.reply('❌ Error with video call feature. Please try again.');
  }
}

/**
 * Handle /schedulestream command - Schedule live stream (premium)
 */
async function handleScheduleStream(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const { tier } = await getUserPermissions(userId);
    
    if (tier === 'Free') {
      await ctx.reply(
        `📺 *Live Streaming*\n\n` +
        `This feature is available for premium members.\n\n` +
        `💎 Premium members can:\n` +
        `• Schedule live streams\n` +
        `• Broadcast to the community\n` +
        `• Host live events\n` +
        `• And more!\n\n` +
        `Send /plans to upgrade!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // For now, show info about the feature
    await ctx.reply(
      `📺 *Schedule Live Stream*\n\n` +
      `Coming soon! You'll be able to:\n\n` +
      `• Schedule live streams\n` +
      `• Broadcast to community\n` +
      `• Share your screen\n` +
      `• Host live events\n\n` +
      `💎 This is a premium feature - you already have access!\n\n` +
      `Stay tuned for the full implementation.`,
      { parse_mode: 'Markdown' }
    );
    
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
    
    const broadcasts = await getScheduledBroadcasts(groupId);
    
    if (broadcasts.length === 0) {
      await ctx.reply(
        `📅 *Upcoming Events*\n\n` +
        `No events scheduled.\n\n` +
        `💡 Premium members can schedule:\n` +
        `• Music broadcasts\n` +
        `• Podcast episodes\n` +
        `• Live DJ sets\n` +
        `• Video calls\n\n` +
        `Stay tuned for announcements!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = `📅 *Upcoming Events*\n\n`;
    
    broadcasts.slice(0, 5).forEach((broadcast, index) => {
      const date = broadcast.scheduledTime.toDate();
      const typeEmoji = broadcast.type === 'podcast' ? '🎙️' : broadcast.type === 'live_dj' ? '🎧' : '🎶';
      
      message += `${index + 1}. ${typeEmoji} *${broadcast.title}*\n`;
      message += `   👤 Host: ${broadcast.hostName}\n`;
      message += `   📅 ${date.toLocaleDateString()}\n`;
      message += `   🕒 ${date.toLocaleTimeString()}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    logger.error('Error in handleUpcoming:', error);
    await ctx.reply('❌ Error getting upcoming events. Please try again.');
  }
}

module.exports = {
  handleNearby,
  handleLibrary,
  handleTopTracks,
  handleScheduleCall,
  handleScheduleStream,
  handleUpcoming
};