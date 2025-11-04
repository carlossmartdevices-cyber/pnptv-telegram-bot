const { db } = require("../config/firebase");
const logger = require("../utils/logger");
const cron = require("node-cron");
const admin = require("firebase-admin");

/**
 * Scheduled Broadcast Service
 * Manages creation, scheduling, and execution of future broadcasts
 */

const MAX_SCHEDULED_BROADCASTS = 12;
const COLLECTION = "scheduledBroadcasts";

/**
 * Check if a broadcast can be scheduled
 * @returns {Promise<boolean>} True if under limit
 */
async function canScheduleBroadcast() {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "pending")
      .get();

    return snapshot.size < MAX_SCHEDULED_BROADCASTS;
  } catch (error) {
    logger.error("Error checking scheduled broadcast limit:", error);
    return false;
  }
}

/**
 * Get count of scheduled broadcasts
 * @returns {Promise<number>} Count of pending broadcasts
 */
async function getScheduledBroadcastCount() {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "pending")
      .get();

    return snapshot.size;
  } catch (error) {
    logger.error("Error getting scheduled broadcast count:", error);
    return 0;
  }
}

/**
 * Get all scheduled broadcasts
 * @returns {Promise<Array>} Array of scheduled broadcasts
 */
async function getScheduledBroadcasts() {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "pending")
      .orderBy("scheduledTime", "asc")
      .get();

    const broadcasts = [];
    snapshot.forEach((doc) => {
      broadcasts.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return broadcasts;
  } catch (error) {
    logger.error("Error getting scheduled broadcasts with complex query, trying simple query:", error);
    
    // Fallback to simple query without orderBy if complex query fails
    try {
      const snapshot = await db
        .collection(COLLECTION)
        .where("status", "==", "pending")
        .get();

      const broadcasts = [];
      snapshot.forEach((doc) => {
        broadcasts.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Sort in memory as fallback
      return broadcasts.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
    } catch (fallbackError) {
      logger.error("Error with fallback query:", fallbackError);
      return [];
    }
  }
}

/**
 * Get a specific scheduled broadcast
 * @param {string} broadcastId - Broadcast ID
 * @returns {Promise<Object|null>} Broadcast data or null
 */
async function getScheduledBroadcast(broadcastId) {
  try {
    const doc = await db.collection(COLLECTION).doc(broadcastId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error("Error getting scheduled broadcast:", error);
    return null;
  }
}

/**
 * Create a scheduled broadcast
 * @param {Object} broadcastData - Broadcast data
 * @param {Object} broadcastData.targetLanguage - "en", "es", or "all"
 * @param {Object} broadcastData.targetStatus - "all", "subscribers", "free", "churned"
 * @param {string} broadcastData.text - Message text
 * @param {Object} broadcastData.media - Media object (optional)
 * @param {Array} broadcastData.buttons - Button array (optional)
 * @param {Date} broadcastData.scheduledTime - When to send
 * @param {number} broadcastData.adminId - Admin user ID
 * @returns {Promise<string|null>} Broadcast ID or null on error
 */
async function createScheduledBroadcast(broadcastData) {
  try {
    // Check limit
    const canSchedule = await canScheduleBroadcast();
    if (!canSchedule) {
      logger.warn(`Cannot schedule broadcast - limit of ${MAX_SCHEDULED_BROADCASTS} reached`);
      return null;
    }

    // Validate scheduled time is in future
    const scheduledTimestamp = broadcastData.scheduledTime instanceof admin.firestore.Timestamp 
      ? broadcastData.scheduledTime 
      : admin.firestore.Timestamp.fromDate(broadcastData.scheduledTime);
    
    if (scheduledTimestamp.toDate() < new Date()) {
      logger.warn("Cannot schedule broadcast for past time");
      return null;
    }

    const broadcast = {
      ...broadcastData,
      status: "pending",
      createdAt: admin.firestore.Timestamp.now(),
      scheduledTime: scheduledTimestamp,
      sentAt: null,
      statistics: {
        sent: 0,
        failed: 0,
        skipped: 0,
      },
    };

    const docRef = await db.collection(COLLECTION).add(broadcast);

    logger.info(`Scheduled broadcast created: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logger.error("Error creating scheduled broadcast:", error);
    return null;
  }
}

/**
 * Cancel a scheduled broadcast
 * @param {string} broadcastId - Broadcast ID
 * @returns {Promise<boolean>} Success status
 */
async function cancelScheduledBroadcast(broadcastId) {
  try {
    const broadcast = await getScheduledBroadcast(broadcastId);

    if (!broadcast) {
      logger.warn(`Broadcast not found: ${broadcastId}`);
      return false;
    }

    if (broadcast.status !== "pending") {
      logger.warn(`Cannot cancel broadcast with status: ${broadcast.status}`);
      return false;
    }

    await db.collection(COLLECTION).doc(broadcastId).update({
      status: "cancelled",
      cancelledAt: admin.firestore.Timestamp.now(),
    });

    logger.info(`Scheduled broadcast cancelled: ${broadcastId}`);
    return true;
  } catch (error) {
    logger.error("Error cancelling scheduled broadcast:", error);
    return false;
  }
}

/**
 * Update a scheduled broadcast
 * @param {string} broadcastId - Broadcast ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
async function updateScheduledBroadcast(broadcastId, updates) {
  try {
    const broadcast = await getScheduledBroadcast(broadcastId);

    if (!broadcast) {
      logger.warn(`Broadcast not found: ${broadcastId}`);
      return false;
    }

    if (broadcast.status !== "pending") {
      logger.warn(`Cannot update broadcast with status: ${broadcast.status}`);
      return false;
    }

    // If updating scheduled time, validate it's in future
    if (updates.scheduledTime && updates.scheduledTime < new Date()) {
      logger.warn("Cannot update scheduled time to past");
      return false;
    }

    await db
      .collection(COLLECTION)
      .doc(broadcastId)
      .update({
        ...updates,
        updatedAt: new Date(),
      });

    logger.info(`Scheduled broadcast updated: ${broadcastId}`);
    return true;
  } catch (error) {
    logger.error("Error updating scheduled broadcast:", error);
    return false;
  }
}

/**
 * Get broadcasts due for execution
 * @returns {Promise<Array>} Array of broadcasts ready to send
 */
async function getBroadcastsDueForExecution() {
  try {
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "pending")
      .where("scheduledTime", "<=", now)
      .orderBy("scheduledTime", "asc")
      .get();

    const broadcasts = [];
    snapshot.forEach((doc) => {
      broadcasts.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return broadcasts;
  } catch (error) {
    logger.error("Error getting broadcasts due for execution:", error);
    return [];
  }
}

/**
 * Mark broadcast as sent
 * @param {string} broadcastId - Broadcast ID
 * @param {Object} statistics - Send statistics
 * @returns {Promise<boolean>} Success status
 */
async function markBroadcastAsSent(broadcastId, statistics) {
  try {
    await db.collection(COLLECTION).doc(broadcastId).update({
      status: "sent",
      sentAt: new Date(),
      statistics: statistics,
    });

    logger.info(`Scheduled broadcast marked as sent: ${broadcastId}`);
    return true;
  } catch (error) {
    logger.error("Error marking broadcast as sent:", error);
    return false;
  }
}

/**
 * Mark broadcast as failed
 * @param {string} broadcastId - Broadcast ID
 * @param {string} error - Error message
 * @returns {Promise<boolean>} Success status
 */
async function markBroadcastAsFailed(broadcastId, error) {
  try {
    await db.collection(COLLECTION).doc(broadcastId).update({
      status: "failed",
      failedAt: new Date(),
      failureReason: error,
    });

    logger.info(`Scheduled broadcast marked as failed: ${broadcastId}`);
    return true;
  } catch (error) {
    logger.error("Error marking broadcast as failed:", error);
    return false;
  }
}

/**
 * Initialize scheduled broadcast executor
 * Checks for due broadcasts every 30 seconds
 * @param {Object} bot - Telegraf bot instance
 */
function initializeScheduledBroadcastExecutor(bot) {
  logger.info("Initializing scheduled broadcast executor...");

  // Check for due broadcasts every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const dueBroadcasts = await getBroadcastsDueForExecution();

      if (dueBroadcasts.length === 0) {
        return; // No broadcasts to send
      }

      logger.info(`Found ${dueBroadcasts.length} broadcasts ready for execution`);

      for (const broadcast of dueBroadcasts) {
        await executeScheduledBroadcast(bot, broadcast);
      }
    } catch (error) {
      logger.error("Error in scheduled broadcast executor:", error);
    }
  });

  logger.info("Scheduled broadcast executor initialized (checks every 30 seconds)");
}

/**
 * Execute a scheduled broadcast
 * @param {Object} bot - Telegraf bot instance
 * @param {Object} broadcast - Broadcast data
 */
async function executeScheduledBroadcast(bot, broadcast) {
  try {
    const { id, targetLanguage, targetStatus, text, media, buttons, statistics } = broadcast;

    logger.info(`Executing scheduled broadcast: ${id}`);

    // Get users to send to
    const users = await getFilteredUsers(targetLanguage, targetStatus);

    if (users.length === 0) {
      await markBroadcastAsSent(id, { sent: 0, failed: 0, skipped: 0 });
      logger.info(`No users matched for broadcast ${id}`);
      return;
    }

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Send to each user with rate limiting
    for (const user of users) {
      try {
        const messageOptions = buildBroadcastMessageOptions(broadcast);

        if (media) {
          // Send with media
          if (media.type === "photo") {
            await bot.telegram.sendPhoto(user.id, media.fileId, messageOptions);
          } else if (media.type === "video") {
            await bot.telegram.sendVideo(user.id, media.fileId, messageOptions);
          } else if (media.type === "document") {
            await bot.telegram.sendDocument(user.id, media.fileId, messageOptions);
          }
        } else {
          // Send text only
          await bot.telegram.sendMessage(user.id, text, messageOptions);
        }

        sentCount++;
      } catch (error) {
        if (error.message.includes("blocked") || error.message.includes("FORBIDDEN")) {
          skippedCount++;
        } else {
          failedCount++;
          logger.warn(`Failed to send broadcast to user ${user.id}:`, error.message);
        }
      }

      // Rate limiting: 100ms between sends
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Mark as sent with statistics
    await markBroadcastAsSent(id, {
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
    });

    logger.info(
      `Scheduled broadcast ${id} completed: sent=${sentCount}, failed=${failedCount}, skipped=${skippedCount}`
    );
  } catch (error) {
    logger.error(`Error executing scheduled broadcast ${broadcast.id}:`, error);
    await markBroadcastAsFailed(broadcast.id, error.message);
  }
}

/**
 * Get filtered users based on broadcast criteria
 * @param {string} targetLanguage - "en", "es", or "all"
 * @param {string} targetStatus - "all", "subscribers", "free", "churned"
 * @returns {Promise<Array>} Array of user objects
 */
async function getFilteredUsers(targetLanguage, targetStatus) {
  try {
    let query = db.collection("users");

    // Filter by language
    if (targetLanguage !== "all") {
      query = query.where("language", "==", targetLanguage);
    }

    const snapshot = await query.get();
    let users = [];

    snapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Filter by status
    if (targetStatus === "subscribers") {
      users = users.filter((u) => u.tier !== "Free" && u.membershipIsPremium);
    } else if (targetStatus === "free") {
      users = users.filter((u) => u.tier === "Free");
    } else if (targetStatus === "churned") {
      users = users.filter(
        (u) => u.membershipExpiresAt && new Date() > u.membershipExpiresAt
      );
    }

    return users;
  } catch (error) {
    logger.error("Error getting filtered users:", error);
    return [];
  }
}

/**
 * Build message options for broadcast
 * @param {Object} broadcast - Broadcast data
 * @returns {Object} Message options
 */
function buildBroadcastMessageOptions(broadcast) {
  const options = {
    parse_mode: "Markdown",
  };

  if (broadcast.buttons && broadcast.buttons.length > 0) {
    options.reply_markup = {
      inline_keyboard: broadcast.buttons,
    };
  }

  return options;
}

module.exports = {
  MAX_SCHEDULED_BROADCASTS,
  canScheduleBroadcast,
  getScheduledBroadcastCount,
  getScheduledBroadcasts,
  getScheduledBroadcast,
  createScheduledBroadcast,
  cancelScheduledBroadcast,
  updateScheduledBroadcast,
  getBroadcastsDueForExecution,
  markBroadcastAsSent,
  markBroadcastAsFailed,
  initializeScheduledBroadcastExecutor,
  executeScheduledBroadcast,
};
