const { db } = require("../config/firebase");
const logger = require("../utils/logger");
const cron = require('node-cron');

/**
 * Music & Community Service - Integrated from SantinoBot
 * Manages music streaming, playlists, broadcasts, and community features
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
 * Schedule a music/podcast broadcast
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
 * Get user's nearby members
 */
async function getNearbyUsers(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return [];
    }

    const userData = userDoc.data();
    const userLocation = userData?.location;

    if (!userLocation || !userLocation.latitude) {
      logger.info(`User ${userId} has no location data`);
      return [];
    }

    // Query nearby users within 10km
    const nearbyUsers = await db.collection('users')
      .where('location.latitude', '!=', null)
      .get();

    const nearbyList = [];
    nearbyUsers.forEach((doc) => {
      if (doc.id === userId) return; // Skip self

      const otherUser = doc.data();
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        otherUser.location.latitude,
        otherUser.location.longitude
      );

      if (distance <= 10) { // 10km radius
        nearbyList.push({
          userId: doc.id,
          username: otherUser.username,
          firstName: otherUser.firstName,
          distance,
          tier: otherUser.tier,
          lastActive: otherUser.lastActive
        });
      }
    });

    // Sort by distance
    nearbyList.sort((a, b) => a.distance - b.distance);
    
    return nearbyList;
  } catch (error) {
    logger.error(`Error getting nearby users for ${userId}:`, error);
    return [];
  }
}

/**
 * Track nearby searches for free users (3 per week limit)
 */
async function trackNearbySearch(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const tier = userData?.tier || 'Free';

    // If premium, no limits
    if (tier !== 'Free') {
      return { allowed: true, remaining: -1 }; // -1 means unlimited
    }

    // For free users, check 3-search weekly limit
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const searches = userData.searches || [];
    const recentSearches = searches.filter(timestamp => 
      new Date(timestamp.toDate()).getTime() > weekAgo.getTime()
    );

    if (recentSearches.length >= 3) {
      return { allowed: false, remaining: 0 };
    }

    // Record new search
    recentSearches.push(now);
    await db.collection('users').doc(userId).update({
      searches: recentSearches
    });

    return { allowed: true, remaining: 3 - recentSearches.length };
  } catch (error) {
    logger.error(`Error tracking nearby search for ${userId}:`, error);
    return { allowed: false, remaining: 0 };
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
 * Get scheduled broadcasts
 */
async function getScheduledBroadcasts(groupId) {
  try {
    const now = new Date();
    
    const snapshot = await db.collection('scheduled_broadcasts')
      .where('groupId', '==', groupId)
      .where('status', '==', 'scheduled')
      .get();
    
    const broadcasts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const scheduledTime = data.scheduledTime.toDate();
      
      // Filter for future broadcasts
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
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Schedule video call (premium feature)
 */
async function scheduleVideoCall(userId, callData) {
  try {
    const callId = `call_${Date.now()}`;
    
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
      createdAt: new Date()
    });

    logger.info(`Video call scheduled: ${callId}`);
    return { success: true, callId };
  } catch (error) {
    logger.error('Error scheduling video call:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Schedule live stream (premium feature)
 */
async function scheduleLiveStream(userId, streamData) {
  try {
    const streamId = `stream_${Date.now()}`;
    
    await db.collection('scheduled_streams').doc(streamId).set({
      streamId,
      hostId: userId,
      hostName: streamData.hostName,
      title: streamData.title,
      description: streamData.description || '',
      scheduledTime: new Date(streamData.scheduledTime),
      streamUrl: streamData.streamUrl || null,
      isLive: false,
      status: 'scheduled',
      viewerCount: 0,
      createdAt: new Date()
    });

    logger.info(`Live stream scheduled: ${streamId}`);
    return { success: true, streamId };
  } catch (error) {
    logger.error('Error scheduling live stream:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  addTrack,
  createPlaylist,
  scheduleBroadcast,
  getNearbyUsers,
  trackNearbySearch,
  getTracks,
  getTopTracks,
  getScheduledBroadcasts,
  calculateDistance,
  scheduleVideoCall,
  scheduleLiveStream
};