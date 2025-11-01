const logger = require('../utils/logger');
const { db } = require('../config/firebase');
const cron = require('node-cron');

/**
 * Broadcast Messaging Service
 * Send rich media and text messages to group, one-time or recurring
 */

const scheduledBroadcasts = new Map(); // Store cron jobs in memory

/**
 * Create a broadcast message
 */
async function createBroadcast({
  groupId,
  title,
  content,
  messageType = 'text', // 'text', 'photo', 'video', 'document', 'poll'
  mediaData = null, // file_id, file_path, or url
  parseMode = 'Markdown', // 'Markdown', 'HTML', 'plain'
  schedule = null, // null = send now, object = { type: 'once'|'recurring', time: Date, recurringPattern: cron }
  createdBy,
  buttons = [] // Optional inline buttons
}) {
  try {
    const broadcastDoc = {
      groupId,
      title,
      content,
      messageType,
      mediaData,
      parseMode,
      schedule,
      createdBy,
      buttons,
      createdAt: new Date(),
      status: 'pending',
      sentCount: 0,
      failureCount: 0,
      nextScheduledTime: schedule ? new Date(schedule.time) : null
    };
    
    // Save to Firestore
    const docRef = await db.collection('broadcasts').add(broadcastDoc);
    const broadcastId = docRef.id;
    
    logger.info(`Broadcast created: ${broadcastId}`);
    
    // If scheduled, setup cron job
    if (schedule) {
      if (schedule.type === 'once') {
        setupOnetimeBroadcast(groupId, broadcastId, schedule.time);
      } else if (schedule.type === 'recurring') {
        setupRecurringBroadcast(groupId, broadcastId, schedule.recurringPattern);
      }
    } else {
      // Send immediately
      await markBroadcastReady(broadcastId);
    }
    
    return { success: true, broadcastId, ...broadcastDoc };
  } catch (error) {
    logger.error('Error creating broadcast:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup one-time broadcast scheduling
 */
function setupOnetimeBroadcast(groupId, broadcastId, scheduledTime) {
  const cronExpression = getCronExpression(scheduledTime);
  
  const job = cron.schedule(cronExpression, async () => {
    try {
      await markBroadcastReady(broadcastId);
      logger.info(`One-time broadcast ${broadcastId} marked ready`);
      job.stop();
      scheduledBroadcasts.delete(broadcastId);
    } catch (error) {
      logger.error(`Error executing one-time broadcast ${broadcastId}:`, error);
    }
  });
  
  scheduledBroadcasts.set(broadcastId, job);
}

/**
 * Setup recurring broadcast scheduling
 */
function setupRecurringBroadcast(groupId, broadcastId, recurringPattern) {
  // recurringPattern should be a cron expression like:
  // "0 9 * * *" = every day at 9 AM
  // "0 9 * * 0" = every Sunday at 9 AM
  // "0 */2 * * *" = every 2 hours
  
  const job = cron.schedule(recurringPattern, async () => {
    try {
      await markBroadcastReady(broadcastId);
      logger.info(`Recurring broadcast ${broadcastId} marked ready`);
    } catch (error) {
      logger.error(`Error executing recurring broadcast ${broadcastId}:`, error);
    }
  });
  
  scheduledBroadcasts.set(`${broadcastId}_recurring`, job);
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
 * Mark broadcast as ready to send
 */
async function markBroadcastReady(broadcastId) {
  try {
    await db.collection('broadcasts').doc(broadcastId).update({
      status: 'ready',
      readyAt: new Date()
    });
    logger.info(`Broadcast ${broadcastId} marked as ready to send`);
    return true;
  } catch (error) {
    logger.error(`Error marking broadcast as ready: ${broadcastId}`, error);
    return false;
  }
}

/**
 * Get pending broadcasts ready to send
 */
async function getPendingBroadcasts() {
  try {
    const query = await db.collection('broadcasts')
      .where('status', '==', 'ready')
      .orderBy('createdAt', 'asc')
      .get();
    
    const broadcasts = [];
    query.forEach(doc => {
      broadcasts.push({ id: doc.id, ...doc.data() });
    });
    
    return broadcasts;
  } catch (error) {
    logger.error('Error getting pending broadcasts:', error);
    return [];
  }
}

/**
 * Mark broadcast as sent
 */
async function markBroadcastSent(broadcastId, successCount, failureCount) {
  try {
    await db.collection('broadcasts').doc(broadcastId).update({
      status: 'sent',
      sentCount: successCount,
      failureCount: failureCount,
      sentAt: new Date()
    });
    logger.info(`Broadcast ${broadcastId} sent to ${successCount} users (${failureCount} failures)`);
    return true;
  } catch (error) {
    logger.error(`Error marking broadcast as sent: ${broadcastId}`, error);
    return false;
  }
}

/**
 * Build broadcast message for Telegram
 */
function buildBroadcastMessageOptions(broadcast) {
  try {
    const options = {
      parse_mode: broadcast.parseMode || 'Markdown'
    };
    
    // Add inline buttons if provided
    if (broadcast.buttons && broadcast.buttons.length > 0) {
      options.reply_markup = {
        inline_keyboard: broadcast.buttons.map(btn => [
          {
            text: btn.text,
            url: btn.url || undefined,
            callback_data: btn.callback_data || undefined
          }
        ])
      };
    }
    
    return options;
  } catch (error) {
    logger.error('Error building broadcast options:', error);
    return { parse_mode: 'Markdown' };
  }
}

/**
 * Get broadcast by ID
 */
async function getBroadcast(broadcastId) {
  try {
    const doc = await db.collection('broadcasts').doc(broadcastId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error getting broadcast:', error);
    return null;
  }
}

/**
 * Update broadcast status
 */
async function updateBroadcastStatus(broadcastId, status, updates = {}) {
  try {
    await db.collection('broadcasts').doc(broadcastId).update({
      status,
      ...updates,
      updatedAt: new Date()
    });
    logger.info(`Broadcast ${broadcastId} status updated to: ${status}`);
    return true;
  } catch (error) {
    logger.error('Error updating broadcast status:', error);
    return false;
  }
}

/**
 * Cancel a scheduled broadcast
 */
async function cancelBroadcast(broadcastId) {
  try {
    await db.collection('broadcasts').doc(broadcastId).update({
      status: 'cancelled',
      cancelledAt: new Date()
    });
    
    // Stop cron job
    const job = scheduledBroadcasts.get(broadcastId);
    if (job) {
      job.stop();
      scheduledBroadcasts.delete(broadcastId);
    }
    
    const recurringJob = scheduledBroadcasts.get(`${broadcastId}_recurring`);
    if (recurringJob) {
      recurringJob.stop();
      scheduledBroadcasts.delete(`${broadcastId}_recurring`);
    }
    
    logger.info(`Broadcast ${broadcastId} cancelled`);
    return { success: true };
  } catch (error) {
    logger.error('Error cancelling broadcast:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createBroadcast,
  getPendingBroadcasts,
  markBroadcastSent,
  buildBroadcastMessageOptions,
  getBroadcast,
  updateBroadcastStatus,
  cancelBroadcast,
  setupOnetimeBroadcast,
  setupRecurringBroadcast
};
