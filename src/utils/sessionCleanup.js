/**
 * Session Cleanup Utility
 * Periodically cleans up expired sessions from Firestore
 */

const { FirestoreSession } = require("../bot/middleware/firestoreSession");
const logger = require("./logger");

class SessionCleanupService {
  constructor(options = {}) {
    this.sessionManager = new FirestoreSession({
      collectionName: options.collectionName || "bot_sessions",
    });

    this.interval = options.interval || 6 * 60 * 60 * 1000; // 6 hours default
    this.enabled = options.enabled !== false;
    this.intervalId = null;

    logger.info("SessionCleanupService initialized", {
      interval: this.interval,
      enabled: this.enabled,
    });
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (!this.enabled) {
      logger.info("SessionCleanupService: Disabled, not starting");
      return;
    }

    if (this.intervalId) {
      logger.warn("SessionCleanupService: Already running");
      return;
    }

    // Run immediately on start
    this.runCleanup();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, this.interval);

    logger.info("SessionCleanupService: Started", {
      nextRun: new Date(Date.now() + this.interval).toISOString(),
    });
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("SessionCleanupService: Stopped");
    }
  }

  /**
   * Run cleanup
   * @returns {Promise<Object>} - Cleanup results
   */
  async runCleanup() {
    try {
      logger.info("SessionCleanupService: Starting cleanup");

      const startTime = Date.now();
      const deletedCount = await this.sessionManager.cleanupExpiredSessions();
      const duration = Date.now() - startTime;

      logger.info("SessionCleanupService: Cleanup completed", {
        deletedSessions: deletedCount,
        durationMs: duration,
        nextRun: new Date(Date.now() + this.interval).toISOString(),
      });

      return {
        success: true,
        deletedSessions: deletedCount,
        durationMs: duration,
      };
    } catch (error) {
      logger.error("SessionCleanupService: Cleanup failed", {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} - Session stats
   */
  async getStats() {
    try {
      return await this.sessionManager.getStats();
    } catch (error) {
      logger.error("SessionCleanupService: Failed to get stats", {
        error: error.message,
      });
      return {
        error: error.message,
      };
    }
  }

  /**
   * Manual cleanup trigger (for admin endpoints)
   * @returns {Promise<Object>} - Cleanup results
   */
  async manualCleanup() {
    logger.info("SessionCleanupService: Manual cleanup triggered");
    return await this.runCleanup();
  }
}

// Create default instance
const defaultCleanupService = new SessionCleanupService({
  collectionName: "bot_sessions",
  interval: 6 * 60 * 60 * 1000, // 6 hours
  enabled: true,
});

module.exports = {
  SessionCleanupService,
  sessionCleanup: defaultCleanupService,
};
