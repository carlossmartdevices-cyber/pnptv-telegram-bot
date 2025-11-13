const { db } = require("../config/firebase");
const logger = require("../utils/logger");
const cron = require('node-cron');

/**
 * Event Reminder Service
 * Handles scheduled reminders for video calls, live streams, and broadcasts
 */

/**
 * Schedule reminders for an event
 * @param {string} eventId - Event ID
 * @param {string} eventType - 'video_call', 'live_stream', or 'broadcast'
 * @param {Date} eventTime - When the event starts
 * @param {Object} eventData - Event details (title, description, etc.)
 * @param {string} groupId - Group/chat ID to send reminders to
 */
async function scheduleEventReminders(eventId, eventType, eventTime, eventData, groupId) {
  try {
    const now = new Date();
    const eventTimestamp = eventTime.getTime();
    const nowTimestamp = now.getTime();

    // Calculate reminder times (in milliseconds)
    const reminderTimes = [
      { name: '48_hours', ms: 48 * 60 * 60 * 1000, label: '48 hours' },
      { name: '24_hours', ms: 24 * 60 * 60 * 1000, label: '24 hours' },
      { name: '12_hours', ms: 12 * 60 * 60 * 1000, label: '12 hours' },
      { name: '1_hour', ms: 1 * 60 * 60 * 1000, label: '1 hour' }
    ];

    const reminders = [];

    // Create reminders for each time interval
    for (const reminder of reminderTimes) {
      const reminderTime = new Date(eventTimestamp - reminder.ms);
      
      // Only schedule if reminder time is in the future
      if (reminderTime.getTime() > nowTimestamp) {
        const reminderId = `${eventId}_${reminder.name}`;
        
        const reminderData = {
          reminderId,
          eventId,
          eventType,
          reminderType: reminder.name,
          reminderTime,
          eventTime,
          eventData,
          groupId,
          status: 'scheduled',
          createdAt: now
        };

        await db.collection('event_reminders').doc(reminderId).set(reminderData);
        reminders.push(reminderData);
        
        logger.info(`Scheduled ${reminder.label} reminder for ${eventType} ${eventId} at ${reminderTime.toISOString()}`);
      }
    }

    return { success: true, reminders };
  } catch (error) {
    logger.error('Error scheduling event reminders:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send event notification to group (bypasses auto-delete)
 * @param {Object} bot - Telegram bot instance
 * @param {string} groupId - Group chat ID
 * @param {string} message - Message to send
 * @param {Object} options - Message options
 */
async function sendEventNotification(bot, groupId, message, options = {}) {
  try {
    // Send message with special flag to bypass auto-delete
    const result = await bot.telegram.sendMessage(groupId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
      ...options,
      // Add special metadata to identify this as an event notification
      reply_markup: {
        ...options.reply_markup,
        // Add invisible metadata that auto-delete middleware can check
        __eventNotification: true
      }
    });

    logger.info(`Event notification sent to group ${groupId}: ${result.message_id}`);
    return result;
  } catch (error) {
    logger.error(`Error sending event notification to group ${groupId}:`, error);
    throw error;
  }
}

/**
 * Generate reminder message based on event type and time remaining
 */
function generateReminderMessage(eventData, timeRemaining, eventType) {
  const { title, hostName, description } = eventData;
  
  let emoji = '📅';
  let eventTypeText = 'Event';
  
  switch (eventType) {
    case 'video_call':
      emoji = '📹';
      eventTypeText = 'Video Call';
      break;
    case 'live_stream':
      emoji = '📺';
      eventTypeText = 'Live Stream';
      break;
    case 'broadcast':
      emoji = '📢';
      eventTypeText = 'Broadcast';
      break;
  }

  let message = `${emoji} **${eventTypeText} Reminder**\n\n`;
  message += `🎯 **${title}**\n`;
  
  if (hostName) {
    message += `👤 Host: ${hostName}\n`;
  }
  
  if (description) {
    message += `📝 ${description}\n`;
  }
  
  message += `\n⏰ **Starting in ${timeRemaining}**\n\n`;
  
  if (eventData.joinUrl) {
    message += `🔗 [Join ${eventTypeText}](${eventData.joinUrl})\n`;
  }
  
  if (eventData.password) {
    message += `🔒 Password: \`${eventData.password}\`\n`;
  }
  
  message += `\n💡 Don't miss it!`;
  
  return message;
}

/**
 * Generate initial event announcement message
 */
function generateEventAnnouncementMessage(eventData, eventTime, eventType) {
  const { title, hostName, description } = eventData;
  
  let emoji = '📅';
  let eventTypeText = 'Event';
  
  switch (eventType) {
    case 'video_call':
      emoji = '📹';
      eventTypeText = 'Video Call';
      break;
    case 'live_stream':
      emoji = '📺';
      eventTypeText = 'Live Stream';
      break;
    case 'broadcast':
      emoji = '📢';
      eventTypeText = 'Broadcast';
      break;
  }

  let message = `🎉 **New ${eventTypeText} Scheduled!**\n\n`;
  message += `${emoji} **${title}**\n`;
  
  if (hostName) {
    message += `👤 Host: ${hostName}\n`;
  }
  
  if (description) {
    message += `📝 ${description}\n\n`;
  } else {
    message += `\n`;
  }
  
  message += `🕒 **When:** ${eventTime.toLocaleString('en-US', { 
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })}\n\n`;
  
  if (eventData.joinUrl) {
    message += `🔗 [Join ${eventTypeText}](${eventData.joinUrl})\n`;
  }
  
  if (eventData.password) {
    message += `🔒 Password: \`${eventData.password}\`\n`;
  }
  
  message += `\n📅 **Reminders will be sent:**\n`;
  message += `• 48 hours before\n`;
  message += `• 24 hours before\n`;
  message += `• 12 hours before\n`;
  message += `• 1 hour before\n\n`;
  message += `💾 This message will stay pinned for reference!`;
  
  return message;
}

/**
 * Cron job to check and send due reminders
 * Runs every minute to check for due reminders
 */
function startReminderCron(bot) {
  // TEMPORARY: Disable until Firestore composite index is created
  // Composite index needed for: event_reminders(status, reminderTime)
  const CRON_DISABLED = process.env.DISABLE_REMINDER_CRON === 'true';
  
  if (CRON_DISABLED) {
    logger.warn('⚠️ Event reminder cron job is DISABLED (requires Firestore index creation)');
    logger.warn('To enable: 1) Create composite index in Firebase Console 2) Set DISABLE_REMINDER_CRON=false');
    return;
  }

  // Run every minute to check for due reminders
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find reminders that are due (within the last minute)
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      
      const snapshot = await db.collection('event_reminders')
        .where('status', '==', 'scheduled')
        .where('reminderTime', '<=', now)
        .where('reminderTime', '>', oneMinuteAgo)
        .get();

      if (snapshot.empty) {
        return; // No reminders due
      }

      logger.info(`Found ${snapshot.size} due reminders to send`);

      for (const doc of snapshot.docs) {
        const reminder = doc.data();
        
        try {
          // Generate reminder message
          const timeRemaining = getTimeRemaining(reminder.reminderType);
          const message = generateReminderMessage(
            reminder.eventData,
            timeRemaining,
            reminder.eventType
          );

          // Send reminder to group
          await sendEventNotification(bot, reminder.groupId, message);

          // Mark reminder as sent
          await doc.ref.update({
            status: 'sent',
            sentAt: now
          });

          logger.info(`Sent ${reminder.reminderType} reminder for event ${reminder.eventId}`);
        } catch (error) {
          logger.error(`Error sending reminder ${reminder.reminderId}:`, error);
          
          // Mark as failed
          await doc.ref.update({
            status: 'failed',
            failedAt: now,
            error: error.message
          });
        }
      }
    } catch (error) {
      logger.error('Error in reminder cron job:', error);
    }
  });

  logger.info('Event reminder cron job started (runs every minute)');
}

/**
 * Helper function to get human-readable time remaining
 */
function getTimeRemaining(reminderType) {
  switch (reminderType) {
    case '48_hours': return '48 hours';
    case '24_hours': return '24 hours';
    case '12_hours': return '12 hours';
    case '1_hour': return '1 hour';
    default: return 'soon';
  }
}

/**
 * Cancel all reminders for an event (when event is deleted)
 */
async function cancelEventReminders(eventId) {
  try {
    const snapshot = await db.collection('event_reminders')
      .where('eventId', '==', eventId)
      .where('status', '==', 'scheduled')
      .get();

    if (snapshot.empty) {
      return { success: true, cancelled: 0 };
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelledAt: new Date()
      });
    });

    await batch.commit();
    
    logger.info(`Cancelled ${snapshot.size} reminders for event ${eventId}`);
    return { success: true, cancelled: snapshot.size };
  } catch (error) {
    logger.error('Error cancelling event reminders:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  scheduleEventReminders,
  sendEventNotification,
  generateEventAnnouncementMessage,
  generateReminderMessage,
  startReminderCron,
  cancelEventReminders
};