const logger = require("../../utils/logger");

/**
 * Global error handler middleware
 * Catches and logs all errors
 */
function errorHandler(err, ctx) {
  logger.error("Bot error:", {
    error: err.message,
    stack: err.stack,
    userId: ctx?.from?.id,
    updateType: ctx?.updateType,
  });

  // Attempt to notify user
  try {
    ctx?.reply(
      "An error occurred while processing your request. Please try again later."
    );
  } catch (replyError) {
    logger.error("Failed to send error message to user:", replyError);
  }
}

module.exports = errorHandler;
