const logger = require('../utils/logger');
const musicService = require('../services/musicService');
const { getUserPermissions } = require('../utils/permissions');

/**
 * Music & Podcast Commands Handler
 */

/**
 * Command: /addtrack
 * Add music or podcast to library (Admin/Diamond only)
 */
async function cmdAddTrack(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const { tier } = await getUserPermissions(userId);
    
    // Only admins and diamond members can add tracks
    if (tier !== 'diamond-member') {
      const member = await ctx.getChatMember(ctx.from.id);
      if (member.status !== 'administrator' && member.status !== 'creator') {
        await ctx.reply('⛔ Only admins and diamond members can add tracks');
        return;
      }
    }

    const args = ctx.message.text.split('\n');
    
    if (args.length < 3) {
      await ctx.reply(
        `🎵 **Add Track to Library**\n\n` +
        `Usage:\n` +
        `\`/addtrack\n` +
        `Title: Song/Episode Name\n` +
        `Artist: Artist/Host Name\n` +
        `Type: music|podcast\n` +
        `Genre: Rock|Jazz|Comedy|News\n` +
        `URL: https://soundcloud.com/...\`\n\n` +
        `Or reply to an audio file with /addtrack and the details`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const title = args[1]?.replace('Title: ', '')?.trim();
    const artist = args[2]?.replace('Artist: ', '')?.trim();
    const type = args[3]?.replace('Type: ', '')?.trim() || 'music';
    const genre = args[4]?.replace('Genre: ', '')?.trim() || 'Other';
    const url = args[5]?.replace('URL: ', '')?.trim();

    // Check if replying to audio file
    let fileId = null;
    if (ctx.message.reply_to_message?.audio) {
      fileId = ctx.message.reply_to_message.audio.file_id;
    }

    if (!title || !artist) {
      await ctx.reply('❌ Title and Artist are required');
      return;
    }

    if (!fileId && !url) {
      await ctx.reply('❌ Either reply to an audio file or provide a URL');
      return;
    }

    const result = await musicService.addTrack(ctx.chat.id, {
      title,
      artist,
      type,
      genre,
      fileId,
      url,
      addedBy: userId
    });

    if (result.success) {
      await ctx.reply(
        `✅ Track added to library!\n\n` +
        `🎵 ${title}\n` +
        `👤 ${artist}\n` +
        `📂 ${genre}\n` +
        `🔖 ID: ${result.trackId}`
      );
    } else {
      await ctx.reply(`❌ Error adding track: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in addtrack command:', error);
    await ctx.reply('❌ Error adding track');
  }
}

/**
 * Command: /playlist
 * Create or view playlists
 */
async function cmdPlaylist(ctx) {
  try {
    const args = ctx.message.text.split('\n');
    
    if (args.length < 2) {
      await ctx.reply(
        `📀 **Playlist Manager**\n\n` +
        `Create a playlist:\n` +
        `\`/playlist\n` +
        `Name: Chill Vibes\n` +
        `Description: Late night music\n` +
        `Tracks: track_id1,track_id2,track_id3\`\n\n` +
        `View playlist:\n` +
        `\`/playlist playlist_id\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // If single argument, show playlist
    if (args.length === 1 && args[0].split(' ').length === 2) {
      const playlistId = args[0].split(' ')[1];
      const playlist = await musicService.getPlaylist(playlistId);
      
      if (!playlist) {
        await ctx.reply('❌ Playlist not found');
        return;
      }

      let message = `📀 **${playlist.name}**\n\n`;
      message += `${playlist.description}\n\n`;
      message += `🎵 **Tracks (${playlist.trackDetails.length}):**\n\n`;
      
      playlist.trackDetails.forEach((track, i) => {
        message += `${i + 1}. ${track.title} - ${track.artist}\n`;
      });

      await ctx.reply(message, { parse_mode: 'Markdown' });
      return;
    }

    // Create new playlist
    const userId = ctx.from.id.toString();
    const name = args[1]?.replace('Name: ', '')?.trim();
    const description = args[2]?.replace('Description: ', '')?.trim();
    const tracksStr = args[3]?.replace('Tracks: ', '')?.trim();
    const tracks = tracksStr ? tracksStr.split(',').map(t => t.trim()) : [];

    if (!name) {
      await ctx.reply('❌ Playlist name is required');
      return;
    }

    const result = await musicService.createPlaylist(ctx.chat.id, {
      name,
      description,
      tracks,
      createdBy: userId
    });

    if (result.success) {
      await ctx.reply(
        `✅ Playlist created!\n\n` +
        `📀 ${name}\n` +
        `🎵 ${tracks.length} tracks\n` +
        `🔖 ID: ${result.playlistId}`
      );
    } else {
      await ctx.reply(`❌ Error creating playlist: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in playlist command:', error);
    await ctx.reply('❌ Error managing playlist');
  }
}

/**
 * Command: /schedulemusic
 * Schedule a music broadcast or podcast (Admin/Diamond only)
 */
async function cmdScheduleMusic(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const { tier } = await getUserPermissions(userId);
    
    // Only admins and diamond members can schedule
    if (tier !== 'diamond-member') {
      const member = await ctx.getChatMember(ctx.from.id);
      if (member.status !== 'administrator' && member.status !== 'creator') {
        await ctx.reply('⛔ Only admins and diamond members can schedule broadcasts');
        return;
      }
    }

    const args = ctx.message.text.split('\n');
    
    if (args.length < 4) {
      await ctx.reply(
        `🎵 **Schedule Music/Podcast Broadcast**\n\n` +
        `Usage:\n` +
        `\`/schedulemusic\n` +
        `Title: Friday Night Mix\n` +
        `Type: music|podcast|live_dj\n` +
        `Time: 2025-11-05 20:00\n` +
        `Host: DJ Name\n` +
        `Playlist: playlist_id\n` +
        `Description: Amazing vibes!\n` +
        `StreamURL: https://... (for live)\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const title = args[1]?.replace('Title: ', '')?.trim();
    const type = args[2]?.replace('Type: ', '')?.trim() || 'music';
    const timeStr = args[3]?.replace('Time: ', '')?.trim();
    const hostName = args[4]?.replace('Host: ', '')?.trim() || ctx.from.first_name;
    const playlistId = args[5]?.replace('Playlist: ', '')?.trim();
    const description = args[6]?.replace('Description: ', '')?.trim();
    const streamUrl = args[7]?.replace('StreamURL: ', '')?.trim();

    if (!title || !timeStr) {
      await ctx.reply('❌ Title and Time are required');
      return;
    }

    const scheduledTime = new Date(timeStr);
    if (isNaN(scheduledTime.getTime())) {
      await ctx.reply('❌ Invalid time format. Use: YYYY-MM-DD HH:MM');
      return;
    }

    const result = await musicService.scheduleBroadcast(ctx.chat.id, {
      title,
      type,
      scheduledTime: scheduledTime.toISOString(),
      hostId: userId,
      hostName,
      playlistId,
      description,
      streamUrl,
      isLive: type === 'live_dj'
    });

    if (result.success) {
      const message = await musicService.buildBroadcastMessage(result.broadcastId);
      await ctx.reply(
        `✅ Broadcast scheduled!\n\n${message}`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(`❌ Error scheduling broadcast: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error in schedulemusic command:', error);
    await ctx.reply('❌ Error scheduling broadcast');
  }
}

/**
 * Command: /library
 * View music library
 */
async function cmdLibrary(ctx) {
  try {
    const args = ctx.message.text.split(' ');
    const filter = args[1]; // music, podcast, or genre

    const filters = {};
    if (filter === 'music' || filter === 'podcast') {
      filters.type = filter;
    }

    const tracks = await musicService.getTracks(ctx.chat.id, filters);

    if (tracks.length === 0) {
      await ctx.reply('📚 Library is empty. Use /addtrack to add music or podcasts!');
      return;
    }

    let message = `📚 **Music Library** (${tracks.length} tracks)\n\n`;
    
    // Group by type
    const music = tracks.filter(t => t.type === 'music');
    const podcasts = tracks.filter(t => t.type === 'podcast');

    if (music.length > 0) {
      message += `🎵 **Music (${music.length}):**\n`;
      music.slice(0, 10).forEach(track => {
        message += `• ${track.title} - ${track.artist}\n`;
        message += `  ID: ${track.trackId}\n`;
      });
      message += '\n';
    }

    if (podcasts.length > 0) {
      message += `🎙️ **Podcasts (${podcasts.length}):**\n`;
      podcasts.slice(0, 10).forEach(track => {
        message += `• ${track.title} - ${track.artist}\n`;
        message += `  ID: ${track.trackId}\n`;
      });
    }

    if (tracks.length > 20) {
      message += `\n_Showing first 20 tracks_`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in library command:', error);
    await ctx.reply('❌ Error loading library');
  }
}

/**
 * Command: /toptracks
 * Show most played tracks
 */
async function cmdTopTracks(ctx) {
  try {
    const topTracks = await musicService.getTopTracks(ctx.chat.id, 10);

    if (topTracks.length === 0) {
      await ctx.reply('📊 No play statistics yet');
      return;
    }

    let message = `📊 **Top 10 Most Played**\n\n`;
    
    topTracks.forEach((track, i) => {
      message += `${i + 1}. ${track.title} - ${track.artist}\n`;
      message += `   ▶️ ${track.playCount} plays\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in toptracks command:', error);
    await ctx.reply('❌ Error loading top tracks');
  }
}

/**
 * Command: /upcomingmusic
 * Show scheduled music broadcasts
 */
async function cmdUpcomingMusic(ctx) {
  try {
    const broadcasts = await musicService.getScheduledBroadcasts(ctx.chat.id);

    if (broadcasts.length === 0) {
      await ctx.reply('📅 No upcoming broadcasts scheduled');
      return;
    }

    let message = `📅 **Upcoming Music Broadcasts**\n\n`;
    
    for (const broadcast of broadcasts.slice(0, 5)) {
      const time = broadcast.scheduledTime.toDate();
      message += `🎵 **${broadcast.title}**\n`;
      message += `📅 ${time.toLocaleDateString()} at ${time.toLocaleTimeString()}\n`;
      message += `👤 ${broadcast.hostName}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in upcomingmusic command:', error);
    await ctx.reply('❌ Error loading upcoming broadcasts');
  }
}

module.exports = {
  cmdAddTrack,
  cmdPlaylist,
  cmdScheduleMusic,
  cmdLibrary,
  cmdTopTracks,
  cmdUpcomingMusic
};
