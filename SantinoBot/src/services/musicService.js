const { db } = require('../config/firebase');
const logger = require('../utils/logger');
const cron = require('node-cron');

/**
 * Music & Podcast Service
 * Manages audio streaming, playlists, and scheduled broadcasts
 */

/**
 * Add music track to library
 */
async function addTrack(groupId, trackData) {
  try {
    const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.collection('music').doc(trackId).set({
      groupId,
      trackId,
      title: trackData.title,
      artist: trackData.artist,
      genre: trackData.genre || 'Other',
      duration: trackData.duration || 0, // in seconds
      fileId: trackData.fileId, // Telegram file_id if uploaded
      url: trackData.url, // External URL if streaming link
      type: trackData.type || 'music', // 'music' or 'podcast'
      addedBy: trackData.addedBy,
      addedAt: new Date(),
      playCount: 0,
      isActive: true
    });

    logger.info(`Track added: ${trackId} - ${trackData.title}`);
    return { success: true, trackId };
  } catch (error) {
    logger.error('Error adding track:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create or update playlist
 */
async function createPlaylist(groupId, playlistData) {
  try {
    const playlistId = playlistData.playlistId || `playlist_${Date.now()}`;
    
    await db.collection('playlists').doc(playlistId).set({
      groupId,
      playlistId,
      name: playlistData.name,
      description: playlistData.description || '',
      tracks: playlistData.tracks || [], // Array of track IDs
      createdBy: playlistData.createdBy,
      createdAt: new Date(),
      isPublic: playlistData.isPublic !== false,
      playCount: 0
    }, { merge: true });

    logger.info(`Playlist created: ${playlistId} - ${playlistData.name}`);
    return { success: true, playlistId };
  } catch (error) {
    logger.error('Error creating playlist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Schedule a podcast/music broadcast
 */
async function scheduleBroadcast(groupId, broadcastData) {
  try {
    const broadcastId = `broadcast_${Date.now()}`;
    
    const scheduledTime = new Date(broadcastData.scheduledTime);
    
    await db.collection('scheduled_broadcasts').doc(broadcastId).set({
      groupId,
      broadcastId,
      title: broadcastData.title,
      type: broadcastData.type, // 'podcast', 'music', 'live_dj'
      playlistId: broadcastData.playlistId || null,
      trackIds: broadcastData.trackIds || [],
      description: broadcastData.description || '',
      scheduledTime,
      hostId: broadcastData.hostId,
      hostName: broadcastData.hostName,
      isLive: broadcastData.isLive || false, // true for live DJ sets
      streamUrl: broadcastData.streamUrl || null,
      status: 'scheduled', // scheduled, live, completed, cancelled
      createdAt: new Date(),
      notificationSent: false
    });

    logger.info(`Broadcast scheduled: ${broadcastId} - ${broadcastData.title} at ${scheduledTime}`);
    return { success: true, broadcastId };
  } catch (error) {
    logger.error('Error scheduling broadcast:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all tracks in library
 */
async function getTracks(groupId, filters = {}) {
  try {
    let query = db.collection('music').where('groupId', '==', groupId);
    
    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }
    
    if (filters.genre) {
      query = query.where('genre', '==', filters.genre);
    }
    
    const snapshot = await query.get();
    const tracks = [];
    
    snapshot.forEach(doc => {
      tracks.push(doc.data());
    });
    
    return tracks;
  } catch (error) {
    logger.error('Error getting tracks:', error);
    return [];
  }
}

/**
 * Get playlist details with tracks
 */
async function getPlaylist(playlistId) {
  try {
    const doc = await db.collection('playlists').doc(playlistId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const playlist = doc.data();
    
    // Get track details
    const trackDetails = [];
    for (const trackId of playlist.tracks || []) {
      const trackDoc = await db.collection('music').doc(trackId).get();
      if (trackDoc.exists) {
        trackDetails.push(trackDoc.data());
      }
    }
    
    return {
      ...playlist,
      trackDetails
    };
  } catch (error) {
    logger.error('Error getting playlist:', error);
    return null;
  }
}

/**
 * Get scheduled broadcasts
 */
async function getScheduledBroadcasts(groupId) {
  try {
    const now = new Date();
    
    // Simplified query to avoid index requirement
    const snapshot = await db.collection('scheduled_broadcasts')
      .where('groupId', '==', groupId)
      .where('status', '==', 'scheduled')
      .get();
    
    const broadcasts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const scheduledTime = data.scheduledTime.toDate();
      
      // Filter in memory for future broadcasts
      if (scheduledTime > now) {
        broadcasts.push(data);
      }
    });
    
    // Sort by time
    broadcasts.sort((a, b) => a.scheduledTime.toDate() - b.scheduledTime.toDate());
    
    return broadcasts;
  } catch (error) {
    logger.error('Error getting scheduled broadcasts:', error);
    return [];
  }
}

/**
 * Build broadcast announcement message
 */
async function buildBroadcastMessage(broadcastId) {
  try {
    const doc = await db.collection('scheduled_broadcasts').doc(broadcastId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const broadcast = doc.data();
    const scheduledTime = broadcast.scheduledTime.toDate();
    
    let message = `🎵 **${broadcast.title}**\n\n`;
    
    if (broadcast.type === 'podcast') {
      message += `🎙️ Podcast Episode\n`;
    } else if (broadcast.type === 'live_dj') {
      message += `🎧 Live DJ Set\n`;
    } else {
      message += `🎶 Music Broadcast\n`;
    }
    
    message += `👤 Host: ${broadcast.hostName}\n`;
    message += `📅 ${scheduledTime.toLocaleDateString()} at ${scheduledTime.toLocaleTimeString()}\n\n`;
    
    if (broadcast.description) {
      message += `📝 ${broadcast.description}\n\n`;
    }
    
    if (broadcast.isLive && broadcast.streamUrl) {
      message += `🔴 LIVE: ${broadcast.streamUrl}\n\n`;
    }
    
    if (broadcast.playlistId) {
      const playlist = await getPlaylist(broadcast.playlistId);
      if (playlist) {
        message += `📀 Playlist: ${playlist.name}\n`;
        message += `🎵 ${playlist.trackDetails.length} tracks\n\n`;
      }
    }
    
    message += `🔔 Set a reminder to join!`;
    
    return message;
  } catch (error) {
    logger.error('Error building broadcast message:', error);
    return null;
  }
}

/**
 * Increment play count for track
 */
async function trackPlay(trackId) {
  try {
    const trackRef = db.collection('music').doc(trackId);
    const doc = await trackRef.get();
    
    if (doc.exists) {
      const currentCount = doc.data().playCount || 0;
      await trackRef.update({
        playCount: currentCount + 1,
        lastPlayed: new Date()
      });
    }
  } catch (error) {
    logger.error('Error tracking play:', error);
  }
}

/**
 * Get top played tracks
 */
async function getTopTracks(groupId, limit = 10) {
  try {
    const snapshot = await db.collection('music')
      .where('groupId', '==', groupId)
      .orderBy('playCount', 'desc')
      .limit(limit)
      .get();
    
    const tracks = [];
    snapshot.forEach(doc => {
      tracks.push(doc.data());
    });
    
    return tracks;
  } catch (error) {
    logger.error('Error getting top tracks:', error);
    return [];
  }
}

/**
 * Check for upcoming broadcasts and send notifications
 */
async function checkUpcomingBroadcasts(bot, groupId) {
  try {
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
    
    // Simplified query to avoid index requirement
    const snapshot = await db.collection('scheduled_broadcasts')
      .where('groupId', '==', groupId)
      .where('status', '==', 'scheduled')
      .get();
    
    // Filter in memory to avoid complex index requirements
    for (const doc of snapshot.docs) {
      const broadcast = doc.data();
      const scheduledTime = broadcast.scheduledTime.toDate();
      
      // Check if within 15 minutes and notification not sent
      if (scheduledTime <= in15Minutes && 
          scheduledTime > now && 
          !broadcast.notificationSent) {
        
        const message = await buildBroadcastMessage(broadcast.broadcastId);
        
        if (message) {
          await bot.telegram.sendMessage(groupId, 
            `⏰ **STARTING SOON!**\n\n${message}`,
            { parse_mode: 'Markdown' }
          );
          
          // Mark notification as sent
          await doc.ref.update({ notificationSent: true });
          
          logger.info(`Sent broadcast notification for ${broadcast.broadcastId}`);
        }
      }
    }
  } catch (error) {
    logger.error('Error checking upcoming broadcasts:', error);
  }
}

/**
 * Start broadcast notification scheduler
 */
function startBroadcastScheduler(bot, groupId) {
  // Check every 5 minutes for upcoming broadcasts
  cron.schedule('*/5 * * * *', async () => {
    await checkUpcomingBroadcasts(bot, groupId);
  });
  
  logger.info('Broadcast notification scheduler started');
}

module.exports = {
  addTrack,
  createPlaylist,
  scheduleBroadcast,
  getTracks,
  getPlaylist,
  getScheduledBroadcasts,
  buildBroadcastMessage,
  trackPlay,
  getTopTracks,
  startBroadcastScheduler
};
