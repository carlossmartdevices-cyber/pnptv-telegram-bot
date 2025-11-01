const logger = require('../utils/logger');
const { db } = require('../config/firebase');
const cron = require('node-cron');

/**
 * Live Stream Scheduling Service
 * Manages scheduled live streams with performer selection
 */

const scheduledStreams = new Map(); // Store cron jobs in memory

/**
 * Schedule a live stream
 */
async function scheduleLiveStream(groupId, {
  title,
  description,
  scheduledTime,
  performerId,
  performerName,
  platform = 'telegram', // 'telegram', 'youtube', 'twitch', 'facebook'
  streamLink = null,
  createdBy
}) {
  try {
    const streamDoc = {
      title,
      description,
      groupId,
      scheduledTime: new Date(scheduledTime),
      performerId,
      performerName,
      platform,
      streamLink,
      createdBy,
      status: 'scheduled',
      createdAt: new Date(),
      viewerCount: 0,
      notificationSent: false,
      reminderSent_15min: false,
      reminderSent_5min: false
    };
    
    // Save to Firestore
    const docRef = await db.collection('liveStreams').add(streamDoc);
    const streamId = docRef.id;
    
    logger.info(`Live stream scheduled: ${streamId} with performer ${performerId} at ${scheduledTime}`);
    
    // Setup automatic notifications
    setupLiveStreamNotifications(groupId, streamId, scheduledTime);
    
    return { success: true, streamId, ...streamDoc };
  } catch (error) {
    logger.error('Error scheduling live stream:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup automatic notifications for live stream
 */
function setupLiveStreamNotifications(groupId, streamId, scheduledTime) {
  const now = new Date();
  const timeDiff = scheduledTime - now;
  
  // 15 minutes before
  if (timeDiff > 15 * 60 * 1000) {
    const reminderTime = new Date(scheduledTime - 15 * 60 * 1000);
    scheduleNotification(groupId, streamId, reminderTime, '15min');
  }
  
  // 5 minutes before
  if (timeDiff > 5 * 60 * 1000) {
    const reminderTime = new Date(scheduledTime - 5 * 60 * 1000);
    scheduleNotification(groupId, streamId, reminderTime, '5min');
  }
  
  // At scheduled time
  scheduleNotification(groupId, streamId, scheduledTime, 'start');
}

/**
 * Schedule a notification using node-cron
 */
function scheduleNotification(groupId, streamId, notificationTime, type) {
  const cronExpression = getCronExpression(notificationTime);
  
  const job = cron.schedule(cronExpression, async () => {
    try {
      const streamDoc = await db.collection('liveStreams').doc(streamId).get();
      if (!streamDoc.exists) return;
      
      const streamData = streamDoc.data();
      
      // Mark notification as pending
      await db.collection('liveStreams').doc(streamId).update({
        [`notification_${type}_pending`]: true,
        [`notification_${type}_time`]: new Date()
      });
      
      logger.info(`Live stream notification queued: ${streamId} (${type})`);
    } catch (error) {
      logger.error(`Error scheduling notification for ${streamId}:`, error);
    }
  });
  
  scheduledStreams.set(`${streamId}_${type}`, job);
}

/**
 * Convert date to cron expression
 */
function getCronExpression(date) {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  
  return `${minute} ${hour} ${day} ${month} *`;
}

/**
 * Get all scheduled live streams
 */
async function getScheduledStreams(groupId) {
  try {
    const query = await db.collection('liveStreams')
      .where('groupId', '==', groupId)
      .where('status', '==', 'scheduled')
      .orderBy('scheduledTime', 'asc')
      .get();
    
    const streams = [];
    query.forEach(doc => {
      streams.push({ id: doc.id, ...doc.data() });
    });
    
    return streams;
  } catch (error) {
    logger.error('Error getting scheduled streams:', error);
    return [];
  }
}

/**
 * Update live stream status
 */
async function updateStreamStatus(streamId, status) {
  try {
    const updates = {
      status,
      updatedAt: new Date()
    };
    
    if (status === 'live') {
      updates.liveStartedAt = new Date();
    } else if (status === 'ended') {
      updates.endedAt = new Date();
    }
    
    await db.collection('liveStreams').doc(streamId).update(updates);
    logger.info(`Live stream ${streamId} status updated to: ${status}`);
    return { success: true };
  } catch (error) {
    logger.error('Error updating stream status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a scheduled live stream
 */
async function cancelLiveStream(streamId) {
  try {
    await db.collection('liveStreams').doc(streamId).update({
      status: 'cancelled',
      cancelledAt: new Date()
    });
    
    // Stop cron jobs
    scheduledStreams.delete(`${streamId}_15min`);
    scheduledStreams.delete(`${streamId}_5min`);
    scheduledStreams.delete(`${streamId}_start`);
    
    logger.info(`Live stream cancelled: ${streamId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error cancelling live stream:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build live stream announcement message
 */
async function buildLiveStreamMessage(streamId) {
  try {
    const streamDoc = await db.collection('liveStreams').doc(streamId).get();
    if (!streamDoc.exists) return null;
    
    const stream = streamDoc.data();
    const timeStr = stream.scheduledTime.toDate().toLocaleString();
    
    let message = `📺 **Live Stream Scheduled!**\n\n` +
      `**Title:** ${stream.title}\n` +
      `**Performer:** ${stream.performerName}\n` +
      `**When:** ${timeStr}\n` +
      `**Platform:** ${stream.platform}\n\n` +
      `${stream.description}`;
    
    if (stream.streamLink) {
      message += `\n\n🔗 [Watch Live](${stream.streamLink})`;
    }
    
    return message;
  } catch (error) {
    logger.error('Error building live stream message:', error);
    return null;
  }
}

/**
 * Get performer info for stream
 */
async function getPerformerInfo(performerId) {
  try {
    const userDoc = await db.collection('users').doc(performerId).get();
    if (!userDoc.exists) return null;
    
    const user = userDoc.data();
    return {
      id: performerId,
      name: user.username || user.firstName,
      bio: user.bio,
      personalityBadge: user.personalityChoice
    };
  } catch (error) {
    logger.error('Error getting performer info:', error);
    return null;
  }
}

module.exports = {
  scheduleLiveStream,
  getScheduledStreams,
  updateStreamStatus,
  cancelLiveStream,
  buildLiveStreamMessage,
  getPerformerInfo,
  setupLiveStreamNotifications
};
