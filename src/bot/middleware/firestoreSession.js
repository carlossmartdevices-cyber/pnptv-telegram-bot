/**
 * Firestore Session Middleware for Telegraf
 * Replaces telegraf-session-local with scalable Firestore-based sessions
 */

const { db } = require("../../config/firebase");
const logger = require("../../utils/logger");

class FirestoreSession {
  constructor(options = {}) {
    this.collectionName = options.collectionName || "bot_sessions";
    this.sessionsCollection = db.collection(this.collectionName);
    this.ttl = options.ttl || 30 * 24 * 60 * 60 * 1000; // 30 days default
    this.property = options.property || "session";
    this.getSessionKey = options.getSessionKey || this.defaultGetSessionKey;

    // Default state
    this.defaultState = options.defaultState || {
      language: "en",
      onboardingStep: "start",
      onboardingComplete: false,
      xp: 0,
      badges: [],
      ageVerified: false,
      termsAccepted: false,
      privacyAccepted: false,
      waitingFor: null,
      editingField: null,
    };

    logger.info(`FirestoreSession initialized with collection: ${this.collectionName}`);
  }

  /**
   * Default session key generator
   * @param {Object} ctx - Telegraf context
   * @returns {string} - Session key
   */
  defaultGetSessionKey(ctx) {
    if (!ctx.from || !ctx.chat) {
      logger.warn("FirestoreSession: Missing ctx.from or ctx.chat");
      return null;
    }
    return `${ctx.from.id}:${ctx.chat.id}`;
  }

  /**
   * Get session from Firestore
   * @param {string} key - Session key
   * @returns {Promise<Object>} - Session data
   */
  async getSession(key) {
    if (!key) {
      logger.warn("FirestoreSession: Cannot get session without key");
      return { ...this.defaultState };
    }

    try {
      const docRef = this.sessionsCollection.doc(key);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();

        // Check if session has expired
        if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
          logger.info(`FirestoreSession: Session expired for key ${key}`);
          await docRef.delete();
          return { ...this.defaultState };
        }

        // Return session data without metadata
        const { expiresAt, createdAt, updatedAt, ...sessionData } = data;
        return sessionData;
      }

      // Return default state for new sessions
      return { ...this.defaultState };
    } catch (error) {
      logger.error("FirestoreSession: Error getting session:", {
        key,
        error: error.message,
      });
      return { ...this.defaultState };
    }
  }

  /**
   * Save session to Firestore
   * @param {string} key - Session key
   * @param {Object} data - Session data
   * @returns {Promise<void>}
   */
  async saveSession(key, data) {
    if (!key) {
      logger.warn("FirestoreSession: Cannot save session without key");
      return;
    }

    try {
      const now = new Date();
      const expiresAt = new Date(Date.now() + this.ttl);

      const docRef = this.sessionsCollection.doc(key);
      const doc = await docRef.get();

      const sessionData = {
        ...data,
        updatedAt: now,
        expiresAt: expiresAt,
      };

      if (!doc.exists) {
        sessionData.createdAt = now;
      }

      await docRef.set(sessionData, { merge: true });

      logger.debug(`FirestoreSession: Session saved for key ${key}`);
    } catch (error) {
      logger.error("FirestoreSession: Error saving session:", {
        key,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Delete session from Firestore
   * @param {string} key - Session key
   * @returns {Promise<void>}
   */
  async deleteSession(key) {
    if (!key) {
      return;
    }

    try {
      await this.sessionsCollection.doc(key).delete();
      logger.info(`FirestoreSession: Session deleted for key ${key}`);
    } catch (error) {
      logger.error("FirestoreSession: Error deleting session:", {
        key,
        error: error.message,
      });
    }
  }

  /**
   * Cleanup expired sessions
   * Should be called periodically (e.g., via cron job)
   * @returns {Promise<number>} - Number of deleted sessions
   */
  async cleanupExpiredSessions() {
    try {
      logger.info("FirestoreSession: Starting cleanup of expired sessions");

      const now = new Date();
      const expiredDocs = await this.sessionsCollection
        .where("expiresAt", "<", now)
        .limit(500) // Process in batches
        .get();

      if (expiredDocs.empty) {
        logger.info("FirestoreSession: No expired sessions to cleanup");
        return 0;
      }

      const batch = db.batch();
      expiredDocs.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info(`FirestoreSession: Cleaned up ${expiredDocs.size} expired sessions`);
      return expiredDocs.size;
    } catch (error) {
      logger.error("FirestoreSession: Error during cleanup:", {
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} - Session stats
   */
  async getStats() {
    try {
      const snapshot = await this.sessionsCollection.get();
      const now = Date.now();

      let activeCount = 0;
      let expiredCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.expiresAt && data.expiresAt.toMillis() < now) {
          expiredCount++;
        } else {
          activeCount++;
        }
      });

      return {
        total: snapshot.size,
        active: activeCount,
        expired: expiredCount,
        collection: this.collectionName,
      };
    } catch (error) {
      logger.error("FirestoreSession: Error getting stats:", error);
      return {
        total: 0,
        active: 0,
        expired: 0,
        error: error.message,
      };
    }
  }

  /**
   * Middleware function for Telegraf
   * @returns {Function} - Telegraf middleware
   */
  middleware() {
    return async (ctx, next) => {
      try {
        const sessionKey = this.getSessionKey(ctx);

        if (!sessionKey) {
          logger.warn("FirestoreSession: No session key generated, skipping session");
          return next();
        }

        // Load session
        ctx[this.property] = await this.getSession(sessionKey);

        // Store original session for comparison
        const originalSession = JSON.stringify(ctx[this.property]);

        // Execute handler
        await next();

        // Save session only if it changed
        const currentSession = JSON.stringify(ctx[this.property]);
        if (originalSession !== currentSession) {
          await this.saveSession(sessionKey, ctx[this.property]);
        }
      } catch (error) {
        logger.error("FirestoreSession: Middleware error:", {
          error: error.message,
          stack: error.stack,
        });
        // Continue even if session fails
        await next();
      }
    };
  }
}

/**
 * Create a new Firestore session middleware instance
 * @param {Object} options - Configuration options
 * @returns {Function} - Telegraf middleware
 */
function createFirestoreSession(options = {}) {
  const sessionManager = new FirestoreSession(options);
  return sessionManager.middleware();
}

module.exports = {
  FirestoreSession,
  createFirestoreSession,
};
