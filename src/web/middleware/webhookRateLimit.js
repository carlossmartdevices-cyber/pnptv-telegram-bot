/**
 * Rate Limiting Middleware for Webhook Endpoints
 * Protects against abuse and DDoS attacks on payment webhooks
 */

const logger = require("../../utils/logger");

class WebhookRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.maxRequests = options.maxRequests || 100; // 100 requests per window
    this.requests = new Map(); // Store: IP -> [{timestamp, reference}]
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5 minutes

    // Auto-cleanup old entries
    this.startCleanup();

    logger.info("WebhookRateLimiter initialized", {
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    });
  }

  /**
   * Start periodic cleanup of old entries
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs * 2; // Keep 2 windows worth of data

    let cleanedCount = 0;
    for (const [ip, requests] of this.requests.entries()) {
      // Filter out old requests
      const filteredRequests = requests.filter((req) => req.timestamp > cutoff);

      if (filteredRequests.length === 0) {
        this.requests.delete(ip);
        cleanedCount++;
      } else if (filteredRequests.length !== requests.length) {
        this.requests.set(ip, filteredRequests);
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`WebhookRateLimiter: Cleaned up ${cleanedCount} IPs`);
    }
  }

  /**
   * Check if request should be rate limited
   * @param {string} ip - Client IP address
   * @param {string} reference - Payment reference (optional)
   * @returns {Object} - {allowed: boolean, remaining: number, resetTime: number}
   */
  checkLimit(ip, reference = null) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get requests for this IP
    let ipRequests = this.requests.get(ip) || [];

    // Filter to current window
    ipRequests = ipRequests.filter((req) => req.timestamp > windowStart);

    // Check for duplicate references (idempotency)
    if (reference) {
      const duplicate = ipRequests.find((req) => req.reference === reference);
      if (duplicate) {
        logger.info(`WebhookRateLimiter: Duplicate reference detected`, {
          ip,
          reference,
          originalTimestamp: new Date(duplicate.timestamp).toISOString(),
        });
        return {
          allowed: true,
          duplicate: true,
          remaining: this.maxRequests - ipRequests.length,
          resetTime: windowStart + this.windowMs,
        };
      }
    }

    // Check rate limit
    if (ipRequests.length >= this.maxRequests) {
      logger.warn(`WebhookRateLimiter: Rate limit exceeded`, {
        ip,
        requests: ipRequests.length,
        maxRequests: this.maxRequests,
        windowMs: this.windowMs,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + this.windowMs,
        retryAfter: Math.ceil((windowStart + this.windowMs - now) / 1000),
      };
    }

    // Add new request
    ipRequests.push({
      timestamp: now,
      reference,
    });
    this.requests.set(ip, ipRequests);

    return {
      allowed: true,
      remaining: this.maxRequests - ipRequests.length,
      resetTime: windowStart + this.windowMs,
    };
  }

  /**
   * Express middleware
   * @returns {Function} - Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const reference =
        req.query.ref_payco ||
        req.query.x_ref_payco ||
        req.body?.ref_payco ||
        req.body?.x_ref_payco ||
        null;

      const result = this.checkLimit(ip, reference);

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", this.maxRequests);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      res.setHeader(
        "X-RateLimit-Reset",
        new Date(result.resetTime).toISOString()
      );

      if (!result.allowed) {
        res.setHeader("Retry-After", result.retryAfter);

        logger.warn("[WEBHOOK RATE LIMIT] Request blocked", {
          ip,
          reference,
          path: req.path,
          method: req.method,
        });

        return res.status(429).json({
          success: false,
          error: "Too Many Requests",
          retryAfter: result.retryAfter,
          message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
        });
      }

      if (result.duplicate) {
        logger.info("[WEBHOOK RATE LIMIT] Duplicate request (idempotent)", {
          ip,
          reference,
        });
      }

      next();
    };
  }

  /**
   * Get current statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    let totalRequests = 0;
    let totalIPs = this.requests.size;

    for (const requests of this.requests.values()) {
      totalRequests += requests.length;
    }

    return {
      totalIPs,
      totalRequests,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    };
  }
}

// Create default instance
const defaultLimiter = new WebhookRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per IP
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
});

module.exports = {
  WebhookRateLimiter,
  webhookRateLimit: defaultLimiter.middleware(),
  rateLimiterStats: () => defaultLimiter.getStats(),
};
