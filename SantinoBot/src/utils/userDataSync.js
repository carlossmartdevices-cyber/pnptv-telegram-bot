const { db } = require('../config/firebase');
const logger = require('./logger');

/**
 * Real-time listener for user data changes
 * Automatically updates when subscription tier changes
 */
class UserDataSyncListener {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Start listening for a user's data changes
   * @param {string} userId - Telegram user ID
   * @param {Function} onUpdate - Callback when data changes
   */
  startListening(userId, onUpdate) {
    try {
      // Stop existing listener if any
      if (this.listeners.has(userId)) {
        this.listeners.get(userId)();
      }

      // Create real-time listener
      const unsubscribe = db.collection('users').doc(userId).onSnapshot(
        (snapshot) => {
          if (snapshot.exists) {
            const userData = snapshot.data();
            logger.info(`User data updated for ${userId}:`, {
              tier: userData.tier,
              membershipExpires: userData.membershipExpiresAt
            });
            onUpdate(userData);
          }
        },
        (error) => {
          logger.error(`Error listening to user ${userId}:`, error);
        }
      );

      this.listeners.set(userId, unsubscribe);
    } catch (error) {
      logger.error(`Failed to start listening to user ${userId}:`, error);
    }
  }

  /**
   * Stop listening for a user's data changes
   */
  stopListening(userId) {
    try {
      if (this.listeners.has(userId)) {
        this.listeners.get(userId)();
        this.listeners.delete(userId);
        logger.info(`Stopped listening to user ${userId}`);
      }
    } catch (error) {
      logger.error(`Failed to stop listening to user ${userId}:`, error);
    }
  }

  /**
   * Stop all listeners (cleanup)
   */
  stopAllListeners() {
    try {
      this.listeners.forEach((unsubscribe) => unsubscribe());
      this.listeners.clear();
      logger.info('All data listeners stopped');
    } catch (error) {
      logger.error('Error stopping all listeners:', error);
    }
  }
}

module.exports = new UserDataSyncListener();
