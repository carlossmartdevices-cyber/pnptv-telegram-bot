/**
 * Admin Audit Logging
 * Tracks all admin actions for security and accountability
 */

const { db } = require("../config/firebase");
const logger = require("./logger");

/**
 * Log an admin action to Firestore
 * @param {Object} params - Action parameters
 * @param {string|number} params.adminId - Admin user ID
 * @param {string} params.adminUsername - Admin username (optional)
 * @param {string} params.action - Action type (e.g., 'manual_activation', 'broadcast_sent')
 * @param {string|number} params.targetUser - Target user ID (optional)
 * @param {Object} params.metadata - Additional action metadata (optional)
 * @param {string} params.result - Action result ('success' or 'failure')
 * @param {string} params.details - Detailed description (optional)
 * @returns {Promise<string>} Log entry ID
 */
async function logAdminAction({
  adminId,
  adminUsername = null,
  action,
  targetUser = null,
  metadata = {},
  result = 'success',
  details = null
}) {
  try {
    const logEntry = {
      adminId: adminId.toString(),
      adminUsername,
      action,
      targetUser: targetUser ? targetUser.toString() : null,
      metadata,
      result,
      details,
      timestamp: new Date(),
      ipAddress: null, // Can be added if needed
      userAgent: null   // Can be added if needed
    };

    const docRef = await db.collection('admin_logs').add(logEntry);

    logger.info('Admin action logged:', {
      logId: docRef.id,
      adminId,
      action,
      result
    });

    return docRef.id;
  } catch (error) {
    logger.error('Error logging admin action:', error);
    // Don't throw - logging failures shouldn't break admin actions
    return null;
  }
}

/**
 * Get admin action logs
 * @param {Object} filters - Query filters
 * @param {string|number} filters.adminId - Filter by admin ID
 * @param {string} filters.action - Filter by action type
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.limit - Maximum number of results (default: 100)
 * @returns {Promise<Array>} Array of log entries
 */
async function getAdminLogs(filters = {}) {
  try {
    let query = db.collection('admin_logs');

    // Apply filters
    if (filters.adminId) {
      query = query.where('adminId', '==', filters.adminId.toString());
    }

    if (filters.action) {
      query = query.where('action', '==', filters.action);
    }

    if (filters.startDate) {
      query = query.where('timestamp', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('timestamp', '<=', filters.endDate);
    }

    // Order by timestamp descending (most recent first)
    query = query.orderBy('timestamp', 'desc');

    // Limit results
    const limit = filters.limit || 100;
    query = query.limit(limit);

    const snapshot = await query.get();

    const logs = [];
    snapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return logs;
  } catch (error) {
    logger.error('Error fetching admin logs:', error);
    throw error;
  }
}

/**
 * Get admin activity summary
 * @param {string|number} adminId - Admin user ID
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Object>} Activity summary
 */
async function getAdminActivitySummary(adminId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshot = await db
      .collection('admin_logs')
      .where('adminId', '==', adminId.toString())
      .where('timestamp', '>=', startDate)
      .get();

    const summary = {
      totalActions: snapshot.size,
      successfulActions: 0,
      failedActions: 0,
      actionsByType: {},
      recentActions: []
    };

    snapshot.forEach(doc => {
      const data = doc.data();

      // Count by result
      if (data.result === 'success') {
        summary.successfulActions++;
      } else {
        summary.failedActions++;
      }

      // Count by action type
      if (!summary.actionsByType[data.action]) {
        summary.actionsByType[data.action] = 0;
      }
      summary.actionsByType[data.action]++;

      // Add to recent actions (limited to last 10)
      if (summary.recentActions.length < 10) {
        summary.recentActions.push({
          id: doc.id,
          action: data.action,
          targetUser: data.targetUser,
          timestamp: data.timestamp,
          result: data.result
        });
      }
    });

    return summary;
  } catch (error) {
    logger.error('Error fetching admin activity summary:', error);
    throw error;
  }
}

/**
 * Delete old admin logs
 * @param {number} daysToKeep - Number of days to keep logs (default: 90)
 * @returns {Promise<number>} Number of logs deleted
 */
async function cleanupOldLogs(daysToKeep = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const snapshot = await db
      .collection('admin_logs')
      .where('timestamp', '<', cutoffDate)
      .limit(500) // Process in batches
      .get();

    if (snapshot.empty) {
      logger.info('No old admin logs to clean up');
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info(`Deleted ${snapshot.size} old admin logs`);
    return snapshot.size;
  } catch (error) {
    logger.error('Error cleaning up old admin logs:', error);
    throw error;
  }
}

// Action types constants for consistency
const ADMIN_ACTIONS = {
  // User management
  MANUAL_ACTIVATION: 'manual_activation',
  USER_BAN: 'user_ban',
  USER_UNBAN: 'user_unban',
  MEMBERSHIP_EXTEND: 'membership_extend',
  MEMBERSHIP_MODIFY: 'membership_modify',
  TIER_UPDATE: 'tier_update',
  USER_SEARCH: 'user_search',
  SEND_MESSAGE: 'send_message',

  // Plan management
  PLAN_CREATE: 'plan_create',
  PLAN_UPDATE: 'plan_update',
  PLAN_DELETE: 'plan_delete',

  // Broadcasting
  BROADCAST_CREATE: 'broadcast_create',
  BROADCAST_SEND: 'broadcast_send',
  BROADCAST_SCHEDULE: 'broadcast_schedule',
  BROADCAST_CANCEL: 'broadcast_cancel',

  // Statistics
  VIEW_STATS: 'view_stats',
  VIEW_USER_LIST: 'view_user_list',
  EXPORT_DATA: 'export_data'
};

module.exports = {
  logAdminAction,
  getAdminLogs,
  getAdminActivitySummary,
  cleanupOldLogs,
  ADMIN_ACTIONS
};
