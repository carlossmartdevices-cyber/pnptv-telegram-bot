const logger = require("../../utils/logger");
const { scheduleMessageDeletion } = require("../../utils/messageAutoDelete");

/**
 * Middleware to auto-delete user command messages in groups
 * This keeps group chats clean by removing user commands while preserving bot responses
 */
function deleteUserCommandsMiddleware() {
  return async (ctx, next) => {
    // Check if this is a group or supergroup
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

    if (!isGroup) {
      // Not a group, skip this middleware
      return next();
    }

    // Check if this is a user command (starts with /)
    const messageText = ctx.message?.text;
    const isCommand = messageText && messageText.startsWith('/');

    if (isCommand && ctx.message?.message_id) {
      try {
        // Schedule deletion of the user's command message after 10 seconds
        // This gives time for the bot to process and respond, then cleans up
        setTimeout(async () => {
          try {
            await ctx.deleteMessage(ctx.message.message_id);
            logger.debug(`Deleted user command message: ${messageText} from group ${ctx.chat.id}`);
          } catch (error) {
            // Ignore errors - message might already be deleted or bot lacks permissions
            logger.debug(`Could not delete command message: ${error.message}`);
          }
        }, 10000); // 10 seconds delay

        logger.debug(`Scheduled deletion for user command: ${messageText} in group ${ctx.chat.id}`);
      } catch (error) {
        logger.error("Error scheduling command message deletion:", error);
      }
    }

    return next();
  };
}

module.exports = deleteUserCommandsMiddleware;