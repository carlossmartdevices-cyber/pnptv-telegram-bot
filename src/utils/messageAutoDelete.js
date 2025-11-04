const logger = require("./logger");

/**
 * Auto-delete messages sent to groups after 5 minutes
 * Keeps track of message IDs and their deletion timers
 */

const messageTimers = new Map(); // Map<messageKey, timeoutId>
const MESSAGE_DELETE_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Schedule automatic deletion of a message sent to a group
 * @param {object} ctx - Telegraf context
 * @param {number} messageId - The message ID to delete
 * @param {number} chatId - The chat ID where message was sent
 * @returns {void}
 */
function scheduleMessageDeletion(ctx, messageId, chatId) {
  if (!messageId || !chatId) {
    logger.warn('scheduleMessageDeletion: Missing messageId or chatId');
    return;
  }

  // Only schedule deletion for groups/supergroups
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
  if (!isGroup) {
    // Don't delete messages in private chats
    return;
  }

  const messageKey = `${chatId}_${messageId}`;

  // Clear existing timer if any
  if (messageTimers.has(messageKey)) {
    clearTimeout(messageTimers.get(messageKey));
  }

  // Schedule deletion after 5 minutes
  const timeoutId = setTimeout(async () => {
    try {
      await ctx.telegram.deleteMessage(chatId, messageId);
      logger.info(`✅ Auto-deleted bot message ${messageId} from group ${chatId} after 5 minutes`);
      messageTimers.delete(messageKey);
    } catch (error) {
      // Message might already be deleted or permissions issue
      logger.warn(`⚠️ Failed to delete message ${messageId} from group ${chatId}:`, error.message);
      messageTimers.delete(messageKey);
    }
  }, MESSAGE_DELETE_DELAY);

  messageTimers.set(messageKey, timeoutId);
  logger.debug(`⏱️ Scheduled deletion for message ${messageId} in group ${chatId} (5 min delay)`);
}

/**
 * Create a wrapper for ctx.reply that auto-deletes in groups
 * @param {object} ctx - Telegraf context
 * @returns {function} Wrapped reply function
 */
function createAutoDeleteReply(ctx) {
  const originalReply = ctx.reply.bind(ctx);

  return async (text, extra = {}) => {
    try {
      const result = await originalReply(text, extra);
      
      // If this is a group message, schedule deletion
      if (result && ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
        const messageId = result.message_id;
        const chatId = result.chat.id;
        scheduleMessageDeletion(ctx, messageId, chatId);
      }

      return result;
    } catch (error) {
      logger.error('Error in autoDeleteReply:', error);
      throw error;
    }
  };
}

/**
 * Create a wrapper for ctx.telegram.sendMessage that auto-deletes in groups
 * @param {object} telegram - Telegraf telegram API object
 * @returns {function} Wrapped sendMessage function
 */
function createAutoDeleteSendMessage(telegram, ctx) {
  const originalSendMessage = telegram.sendMessage.bind(telegram);

  return async (chatId, text, extra = {}) => {
    try {
      const result = await originalSendMessage(chatId, text, extra);
      
      // If this is a group message, schedule deletion
      const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
      if (result && isGroup && result.chat?.id) {
        const messageId = result.message_id;
        scheduleMessageDeletion(ctx, messageId, chatId);
      }

      return result;
    } catch (error) {
      logger.error('Error in autoDeleteSendMessage:', error);
      throw error;
    }
  };
}

/**
 * Cancel scheduled deletion for a message (if you want to keep it)
 * @param {number} chatId - The chat ID
 * @param {number} messageId - The message ID
 */
function cancelMessageDeletion(chatId, messageId) {
  const messageKey = `${chatId}_${messageId}`;
  
  if (messageTimers.has(messageKey)) {
    clearTimeout(messageTimers.get(messageKey));
    messageTimers.delete(messageKey);
    logger.debug(`❌ Cancelled scheduled deletion for message ${messageId} in group ${chatId}`);
  }
}

/**
 * Clear all pending deletions (useful on bot shutdown)
 */
function clearAllTimers() {
  messageTimers.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });
  messageTimers.clear();
  logger.info('🧹 Cleared all message deletion timers');
}

module.exports = {
  scheduleMessageDeletion,
  createAutoDeleteReply,
  createAutoDeleteSendMessage,
  cancelMessageDeletion,
  clearAllTimers,
  MESSAGE_DELETE_DELAY
};
