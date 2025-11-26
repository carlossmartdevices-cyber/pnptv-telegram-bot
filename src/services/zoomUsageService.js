const { db, admin } = require("../config/firebase");
const logger = require("../utils/logger");

/**
 * Zoom Usage Service
 * Tracks monthly zoom room creations per user based on their subscription tier
 */

/**
 * Get zoom usage quota for a tier
 * @param {string} tier - User tier (Free, Basic, Premium)
 * @param {string} planId - User's current plan ID (optional)
 * @returns {number} Monthly quota for zoom rooms
 */
function getZoomQuotaForTier(tier, planId = null) {
  // Free tier: 1 zoom room per month
  if (tier === 'Free') {
    return 1;
  }
  
  // Basic tier (trial-week, pnp-member): 1 zoom room per month
  if (tier === 'Basic') {
    return 1;
  }
  
  // Premium tier: Check specific plan for quota
  if (tier === 'Premium') {
    // Monthly/pnp-member-equivalent plans: 3 per month
    // Crystal/multi-month plans: 5 per month
    // Diamond/annual/lifetime: 5 per month
    
    // Default: 5 for all premium
    return 5;
  }
  
  // Default for unknown tiers
  return 1;
}

/**
 * Get current month start date (UTC)
 * @returns {Date} Start of current month in UTC
 */
function getCurrentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Get next month start date (UTC)
 * @returns {Date} Start of next month in UTC
 */
function getNextMonthStart() {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return nextMonth;
}

/**
 * Get zoom usage for current month
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Usage data: { used, quota, remaining, resetDate }
 */
async function getZoomUsage(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return {
        used: 0,
        quota: 1,
        remaining: 1,
        resetDate: getNextMonthStart(),
        tier: 'Free'
      };
    }

    const userData = userDoc.data();
    const tier = userData.tier || 'Free';
    const quota = getZoomQuotaForTier(tier, userData.membershipPlanId);

    // Get usage data
    const usageDoc = await db.collection('zoom_usage').doc(userId).get();
    let used = 0;
    let lastResetMonth = null;

    if (usageDoc.exists) {
      const usageData = usageDoc.data();
      lastResetMonth = usageData.monthStart;
      
      // Check if we're still in the same month
      const currentMonthStart = getCurrentMonthStart();
      if (lastResetMonth && lastResetMonth.toDate) {
        const lastResetDate = lastResetMonth.toDate();
        
        if (lastResetDate.getTime() === currentMonthStart.getTime()) {
          // Same month - use current usage
          used = usageData.used || 0;
        } else {
          // Different month - reset usage
          used = 0;
        }
      }
    }

    const remaining = Math.max(0, quota - used);
    const resetDate = getNextMonthStart();

    return {
      used,
      quota,
      remaining,
      resetDate,
      tier
    };
  } catch (error) {
    logger.error(`Error getting zoom usage for user ${userId}:`, error);
    return {
      used: 0,
      quota: 1,
      remaining: 1,
      resetDate: getNextMonthStart(),
      tier: 'Free',
      error: error.message
    };
  }
}

/**
 * Check if user can create zoom room
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { canCreate: boolean, reason?: string, usage?: Object }
 */
async function canCreateZoomRoom(userId) {
  try {
    const usage = await getZoomUsage(userId);
    
    if (usage.remaining > 0) {
      return {
        canCreate: true,
        usage
      };
    }

    // Format reset date
    const resetDate = usage.resetDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      canCreate: false,
      reason: `Monthly zoom room limit reached. You have used ${usage.used}/${usage.quota} rooms. Limit resets on ${resetDate}.`,
      usage
    };
  } catch (error) {
    logger.error(`Error checking zoom room permission for user ${userId}:`, error);
    return {
      canCreate: false,
      reason: 'Error checking quota',
      error: error.message
    };
  }
}

/**
 * Record zoom room creation
 * @param {string} userId - User ID
 * @param {string} meetingId - Zoom meeting ID
 * @param {string} title - Room title
 * @returns {Promise<Object>} Updated usage stats
 */
async function recordZoomRoomCreation(userId, meetingId, title = 'Zoom Room') {
  try {
    const currentMonthStart = getCurrentMonthStart();
    
    // Get current usage
    let usageDoc = await db.collection('zoom_usage').doc(userId).get();
    let used = 0;

    if (usageDoc.exists) {
      const usageData = usageDoc.data();
      const lastResetMonth = usageData.monthStart;
      
      // Check if same month
      if (lastResetMonth && lastResetMonth.toDate) {
        const lastResetDate = lastResetMonth.toDate();
        
        if (lastResetDate.getTime() === currentMonthStart.getTime()) {
          // Same month - increment
          used = (usageData.used || 0) + 1;
        } else {
          // New month - reset to 1
          used = 1;
        }
      } else {
        used = 1;
      }
    } else {
      // First usage
      used = 1;
    }

    // Update zoom usage
    await db.collection('zoom_usage').doc(userId).set({
      monthStart: admin.firestore.Timestamp.fromDate(currentMonthStart),
      used,
      lastCreatedAt: admin.firestore.Timestamp.now(),
      lastMeetingId: meetingId,
      lastMeetingTitle: title,
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });

    // Also store individual room record
    const roomId = `room_${meetingId}_${Date.now()}`;
    await db.collection('zoom_usage').doc(userId)
      .collection('rooms').doc(roomId).set({
      meetingId,
      title,
      createdAt: admin.firestore.Timestamp.now(),
      monthStart: admin.firestore.Timestamp.fromDate(currentMonthStart)
    });

    // Get updated usage
    const usage = await getZoomUsage(userId);
    
    logger.info(`Recorded zoom room creation for user ${userId}: ${meetingId} (${used}/${usage.quota})`);

    return usage;
  } catch (error) {
    logger.error(`Error recording zoom room creation for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Reset zoom usage for a user (admin function)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function resetZoomUsage(userId) {
  try {
    await db.collection('zoom_usage').doc(userId).set({
      monthStart: admin.firestore.Timestamp.fromDate(getCurrentMonthStart()),
      used: 0,
      updatedAt: admin.firestore.Timestamp.now(),
      resetBy: 'admin'
    }, { merge: true });

    logger.info(`Reset zoom usage for user ${userId}`);
  } catch (error) {
    logger.error(`Error resetting zoom usage for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get zoom usage stats for admin (all users in current month)
 * @returns {Promise<Array>} Array of user usage stats
 */
async function getZoomUsageStats() {
  try {
    const currentMonthStart = getCurrentMonthStart();
    
    const snapshot = await db.collection('zoom_usage')
      .where('monthStart', '==', admin.firestore.Timestamp.fromDate(currentMonthStart))
      .orderBy('used', 'desc')
      .limit(100)
      .get();

    const stats = [];
    for (const doc of snapshot.docs) {
      const usageData = doc.data();
      const userId = doc.id;
      
      // Get user info
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      
      stats.push({
        userId,
        username: userData.username || userData.firstName || 'Unknown',
        tier: userData.tier || 'Free',
        used: usageData.used || 0,
        quota: getZoomQuotaForTier(userData.tier, userData.membershipPlanId),
        lastCreatedAt: usageData.lastCreatedAt?.toDate() || null,
        lastMeetingTitle: usageData.lastMeetingTitle || null
      });
    }

    return stats;
  } catch (error) {
    logger.error('Error getting zoom usage stats:', error);
    return [];
  }
}

module.exports = {
  getZoomQuotaForTier,
  getZoomUsage,
  canCreateZoomRoom,
  recordZoomRoomCreation,
  resetZoomUsage,
  getZoomUsageStats,
  getCurrentMonthStart,
  getNextMonthStart
};
