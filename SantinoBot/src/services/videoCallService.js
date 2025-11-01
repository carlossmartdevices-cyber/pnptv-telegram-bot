const logger = require('../utils/logger');
const { db } = require('../config/firebase');
const cron = require('node-cron');

/**
 * Video Call Scheduling Service
 * Manages scheduled video calls for the community
 */

const scheduledCalls = new Map(); // Store cron jobs in memory

/**
 * Schedule a video call
 */
async function scheduleVideoCall(groupId, {
  title,
  description,
  scheduledTime,
  vcPlatform = 'telegram', // 'telegram' or 'discord' or other
  roomLink = null,
  createdBy
}) {
  try {
    const callDoc = {
      title,
      description,
      groupId,
      scheduledTime: new Date(scheduledTime),
      vcPlatform,
      roomLink,
      createdBy,
      status: 'scheduled',
      createdAt: new Date(),
      notificationSent: false,
      reminderSent_15min: false,
      reminderSent_5min: false
    };
    
    // Save to Firestore
    const docRef = await db.collection('videoCalls').add(callDoc);
    const callId = docRef.id;
    
    logger.info(`Video call scheduled: ${callId} at ${scheduledTime}`);
    
    // Setup automatic notifications
    setupVideoCallNotifications(groupId, callId, scheduledTime);
    
    return { success: true, callId, ...callDoc };
  } catch (error) {
    logger.error('Error scheduling video call:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup automatic notifications for video call
 */
function setupVideoCallNotifications(groupId, callId, scheduledTime) {
  const now = new Date();
  const timeDiff = scheduledTime - now;
  
  // 15 minutes before
  if (timeDiff > 15 * 60 * 1000) {
    const reminderTime = new Date(scheduledTime - 15 * 60 * 1000);
    scheduleNotification(groupId, callId, reminderTime, '15min');
  }
  
  // 5 minutes before
  if (timeDiff > 5 * 60 * 1000) {
    const reminderTime = new Date(scheduledTime - 5 * 60 * 1000);
    scheduleNotification(groupId, callId, reminderTime, '5min');
  }
  
  // At scheduled time
  scheduleNotification(groupId, callId, scheduledTime, 'start');
}

/**
 * Schedule a notification using node-cron
 */
function scheduleNotification(groupId, callId, notificationTime, type) {
  const cronExpression = getCronExpression(notificationTime);
  
  const job = cron.schedule(cronExpression, async () => {
    try {
      const callDoc = await db.collection('videoCalls').doc(callId).get();
      if (!callDoc.exists) return;
      
      const callData = callDoc.data();
      
      // This will be sent by bot later
      await db.collection('videoCalls').doc(callId).update({
        [`notification_${type}_pending`]: true,
        [`notification_${type}_time`]: new Date()
      });
      
      logger.info(`Video call notification queued: ${callId} (${type})`);
    } catch (error) {
      logger.error(`Error scheduling notification for ${callId}:`, error);
    }
  });
  
  scheduledCalls.set(`${callId}_${type}`, job);
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
 * Get all scheduled video calls
 */
async function getScheduledCalls(groupId) {
  try {
    const query = await db.collection('videoCalls')
      .where('groupId', '==', groupId)
      .where('status', '==', 'scheduled')
      .orderBy('scheduledTime', 'asc')
      .get();
    
    const calls = [];
    query.forEach(doc => {
      calls.push({ id: doc.id, ...doc.data() });
    });
    
    return calls;
  } catch (error) {
    logger.error('Error getting scheduled calls:', error);
    return [];
  }
}

/**
 * Cancel a scheduled video call
 */
async function cancelVideoCall(callId) {
  try {
    await db.collection('videoCalls').doc(callId).update({
      status: 'cancelled',
      cancelledAt: new Date()
    });
    
    // Stop cron jobs
    scheduledCalls.delete(`${callId}_15min`);
    scheduledCalls.delete(`${callId}_5min`);
    scheduledCalls.delete(`${callId}_start`);
    
    logger.info(`Video call cancelled: ${callId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error cancelling video call:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build video call announcement message
 */
async function buildVideoCallMessage(callId) {
  try {
    const callDoc = await db.collection('videoCalls').doc(callId).get();
    if (!callDoc.exists) return null;
    
    const call = callDoc.data();
    const timeStr = call.scheduledTime.toDate().toLocaleString();
    
    let message = `📹 **Video Call Scheduled!**\n\n` +
      `**Title:** ${call.title}\n` +
      `**When:** ${timeStr}\n` +
      `**Platform:** ${call.vcPlatform}\n\n` +
      `${call.description}`;
    
    if (call.roomLink) {
      message += `\n\n🔗 [Join Call](${call.roomLink})`;
    }
    
    return message;
  } catch (error) {
    logger.error('Error building video call message:', error);
    return null;
  }
}

module.exports = {
  scheduleVideoCall,
  getScheduledCalls,
  cancelVideoCall,
  buildVideoCallMessage,
  setupVideoCallNotifications
};
