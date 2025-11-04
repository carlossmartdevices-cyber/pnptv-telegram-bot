const logger = require("../../utils/logger");
const { scheduleMessageDeletion } = require("../../utils/messageAutoDelete");

/**
 * Middleware to auto-delete bot messages in groups after 5 minutes
 * This ensures the bot doesn't clutter group chats
 */
function autoDeleteMiddleware() {
  return async (ctx, next) => {
    // Check if this is a group or supergroup
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    if (!isGroup) {
      // Not a group, skip auto-delete
      return next();
    }

    // Store original reply method
    const originalReply = ctx.reply.bind(ctx);

    // Override ctx.reply to auto-delete in groups
    ctx.reply = async (text, extra = {}) => {
      try {
        const result = await originalReply(text, extra);

        // Schedule deletion for this message
        if (result && result.message_id) {
          scheduleMessageDeletion(ctx, result.message_id, ctx.chat.id);
        }

        return result;
      } catch (error) {
        logger.error("Error in autoDelete reply:", error);
        throw error;
      }
    };

    // Override ctx.telegram.sendMessage to auto-delete in groups
    const originalSendMessage = ctx.telegram.sendMessage.bind(ctx.telegram);

    ctx.telegram.sendMessage = async (chatId, text, extra = {}) => {
      try {
        const result = await originalSendMessage(chatId, text, extra);

        // Schedule deletion if this is a group message
        if (result && result.message_id && result.chat?.type === 'group' || result.chat?.type === 'supergroup') {
          scheduleMessageDeletion(ctx, result.message_id, chatId);
        }

        return result;
      } catch (error) {
        logger.error("Error in autoDelete sendMessage:", error);
        throw error;
      }
    };

    // Override ctx.telegram.editMessageText to auto-delete in groups
    const originalEditMessageText = ctx.telegram.editMessageText.bind(ctx.telegram);

    ctx.telegram.editMessageText = async (chatId, messageId, inlineMessageId, text, extra = {}) => {
      try {
        return await originalEditMessageText(chatId, messageId, inlineMessageId, text, extra);
        // Note: Edited messages keep the same auto-delete timer from when they were created
      } catch (error) {
        logger.error("Error in autoDelete editMessageText:", error);
        throw error;
      }
    };

    logger.debug(`Auto-delete middleware active for group ${ctx.chat.id}`);
    return next();
  };
}

module.exports = autoDeleteMiddleware;
