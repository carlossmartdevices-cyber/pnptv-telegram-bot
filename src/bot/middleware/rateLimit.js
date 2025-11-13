const logger = require("../../utils/logger");
const { isAdmin } = require("../../config/admin");

// Store user request timestamps
const userRequests = new Map();

// Configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

/**
 * Rate limiting middleware
 * Prevents users from spamming the bot
 * Admins are exempt from rate limiting
 */
function rateLimitMiddleware() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;

    if (!userId) {
      return next();
    }

    // Exempt admins from rate limiting
    if (isAdmin(userId)) {
      return next();
    }

    const now = Date.now();
    const userKey = `user_${userId}`;

    // Get user's request history
    if (!userRequests.has(userKey)) {
      userRequests.set(userKey, []);
    }

    const requests = userRequests.get(userKey);

    // Remove old requests outside the time window
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
    );

    // Check if user exceeded rate limit
    if (recentRequests.length >= MAX_REQUESTS) {
      logger.warn(`Rate limit exceeded for user ${userId}`);
      await ctx.reply(
        "You're sending too many requests. Please wait a moment and try again."
      );
      return;
    }

    // Add current request
    recentRequests.push(now);
    userRequests.set(userKey, recentRequests);

    // Clean up old entries periodically
    if (userRequests.size > 1000) {
      const cutoff = now - RATE_LIMIT_WINDOW;
      for (const [key, timestamps] of userRequests.entries()) {
        const recent = timestamps.filter((t) => t > cutoff);
        if (recent.length === 0) {
          userRequests.delete(key);
        } else {
          userRequests.set(key, recent);
        }
      }
    }

    return next();
  };
}

module.exports = rateLimitMiddleware;
