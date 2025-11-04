const { db } = require("../config/firebase");
const admin = require("firebase-admin");
const logger = require("../utils/logger");

/**
 * Record broadcast analytics when a broadcast is sent
 * @param {Object} broadcastData - Broadcast information
 * @param {string} broadcastData.adminId - Admin who sent the broadcast
 * @param {string} broadcastData.segment - Target segment key
 * @param {string} broadcastData.segmentName - Human-readable segment name
 * @param {number} broadcastData.targetCount - Number of users targeted
 * @param {number} broadcastData.sentCount - Number of messages sent successfully
 * @param {number} broadcastData.failedCount - Number of failed sends
 * @param {string} broadcastData.type - Broadcast type (text, media, multi-language)
 * @param {boolean} broadcastData.hasMedia - Whether broadcast included media
 * @param {Object} broadcastData.segmentCriteria - Segmentation criteria used
 * @returns {Promise<string>} Broadcast analytics document ID
 */
async function recordBroadcastAnalytics(broadcastData) {
  try {
    const analyticsDoc = {
      adminId: broadcastData.adminId,
      segment: broadcastData.segment,
      segmentName: broadcastData.segmentName,
      targetCount: broadcastData.targetCount,
      sentCount: broadcastData.sentCount,
      failedCount: broadcastData.failedCount,
      successRate: broadcastData.targetCount > 0 ? (broadcastData.sentCount / broadcastData.targetCount * 100) : 0,
      type: broadcastData.type,
      hasMedia: broadcastData.hasMedia || false,
      segmentCriteria: broadcastData.segmentCriteria || {},
      createdAt: admin.firestore.Timestamp.now(),
      // Additional metrics
      deliveryTime: broadcastData.deliveryTime || null, // Time taken to deliver
      messageLength: broadcastData.messageLength || 0,
      languageBreakdown: broadcastData.languageBreakdown || {},
      errorTypes: broadcastData.errorTypes || {}
    };

    const docRef = await db.collection('broadcast_analytics').add(analyticsDoc);
    
    logger.info(`Broadcast analytics recorded: ${docRef.id}`, {
      segment: broadcastData.segment,
      targetCount: broadcastData.targetCount,
      sentCount: broadcastData.sentCount,
      successRate: analyticsDoc.successRate.toFixed(1) + '%'
    });

    return docRef.id;
  } catch (error) {
    logger.error('Error recording broadcast analytics:', error);
    throw error;
  }
}

/**
 * Get broadcast analytics summary for admin dashboard
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Object>} Analytics summary
 */
async function getBroadcastAnalytics(days = 30) {
  try {
    const startDate = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
    );

    const snapshot = await db.collection('broadcast_analytics')
      .where('createdAt', '>=', startDate)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return {
        totalBroadcasts: 0,
        totalMessagesSent: 0,
        totalTargeted: 0,
        averageSuccessRate: 0,
        segmentBreakdown: {},
        typeBreakdown: {},
        recentBroadcasts: []
      };
    }

    let totalBroadcasts = 0;
    let totalMessagesSent = 0;
    let totalTargeted = 0;
    let totalSuccessRate = 0;
    const segmentBreakdown = {};
    const typeBreakdown = {};
    const recentBroadcasts = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      
      totalBroadcasts++;
      totalMessagesSent += data.sentCount;
      totalTargeted += data.targetCount;
      totalSuccessRate += data.successRate;

      // Segment breakdown
      if (!segmentBreakdown[data.segment]) {
        segmentBreakdown[data.segment] = {
          name: data.segmentName,
          count: 0,
          totalSent: 0,
          totalTargeted: 0,
          averageSuccessRate: 0
        };
      }
      segmentBreakdown[data.segment].count++;
      segmentBreakdown[data.segment].totalSent += data.sentCount;
      segmentBreakdown[data.segment].totalTargeted += data.targetCount;

      // Type breakdown
      if (!typeBreakdown[data.type]) {
        typeBreakdown[data.type] = {
          count: 0,
          totalSent: 0,
          averageSuccessRate: 0
        };
      }
      typeBreakdown[data.type].count++;
      typeBreakdown[data.type].totalSent += data.sentCount;

      // Recent broadcasts (last 10)
      if (recentBroadcasts.length < 10) {
        recentBroadcasts.push({
          id: doc.id,
          segment: data.segmentName,
          type: data.type,
          sent: data.sentCount,
          targeted: data.targetCount,
          successRate: data.successRate,
          createdAt: data.createdAt.toDate(),
          hasMedia: data.hasMedia
        });
      }
    });

    // Calculate averages for segments
    Object.keys(segmentBreakdown).forEach(segment => {
      const data = segmentBreakdown[segment];
      data.averageSuccessRate = data.totalTargeted > 0 
        ? (data.totalSent / data.totalTargeted * 100) 
        : 0;
    });

    // Calculate averages for types
    Object.keys(typeBreakdown).forEach(type => {
      const data = typeBreakdown[type];
      data.averageSuccessRate = totalBroadcasts > 0
        ? (totalSuccessRate / totalBroadcasts)
        : 0;
    });

    return {
      totalBroadcasts,
      totalMessagesSent,
      totalTargeted,
      averageSuccessRate: totalBroadcasts > 0 ? (totalSuccessRate / totalBroadcasts) : 0,
      overallSuccessRate: totalTargeted > 0 ? (totalMessagesSent / totalTargeted * 100) : 0,
      segmentBreakdown,
      typeBreakdown,
      recentBroadcasts,
      periodDays: days
    };
  } catch (error) {
    logger.error('Error getting broadcast analytics:', error);
    throw error;
  }
}

/**
 * Get detailed analytics for a specific segment
 * @param {string} segment - Segment key
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Segment analytics
 */
async function getSegmentAnalytics(segment, days = 30) {
  try {
    const startDate = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
    );

    const snapshot = await db.collection('broadcast_analytics')
      .where('segment', '==', segment)
      .where('createdAt', '>=', startDate)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return {
        segment,
        broadcastCount: 0,
        totalSent: 0,
        totalTargeted: 0,
        averageSuccessRate: 0,
        broadcasts: []
      };
    }

    let broadcastCount = 0;
    let totalSent = 0;
    let totalTargeted = 0;
    let totalSuccessRate = 0;
    const broadcasts = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      
      broadcastCount++;
      totalSent += data.sentCount;
      totalTargeted += data.targetCount;
      totalSuccessRate += data.successRate;

      broadcasts.push({
        id: doc.id,
        type: data.type,
        sent: data.sentCount,
        targeted: data.targetCount,
        successRate: data.successRate,
        createdAt: data.createdAt.toDate(),
        hasMedia: data.hasMedia,
        adminId: data.adminId
      });
    });

    return {
      segment,
      broadcastCount,
      totalSent,
      totalTargeted,
      averageSuccessRate: broadcastCount > 0 ? (totalSuccessRate / broadcastCount) : 0,
      overallSuccessRate: totalTargeted > 0 ? (totalSent / totalTargeted * 100) : 0,
      broadcasts,
      periodDays: days
    };
  } catch (error) {
    logger.error(`Error getting analytics for segment ${segment}:`, error);
    throw error;
  }
}

/**
 * Get top performing segments
 * @param {number} limit - Number of top segments to return
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Top performing segments
 */
async function getTopPerformingSegments(limit = 5, days = 30) {
  try {
    const analytics = await getBroadcastAnalytics(days);
    
    const segments = Object.entries(analytics.segmentBreakdown)
      .map(([key, data]) => ({
        segment: key,
        name: data.name,
        broadcastCount: data.count,
        totalSent: data.totalSent,
        totalTargeted: data.totalTargeted,
        successRate: data.averageSuccessRate
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);

    return segments;
  } catch (error) {
    logger.error('Error getting top performing segments:', error);
    throw error;
  }
}

/**
 * Clean up old broadcast analytics (older than specified days)
 * @param {number} retentionDays - Days to retain analytics (default: 90)
 * @returns {Promise<number>} Number of records deleted
 */
async function cleanupOldAnalytics(retentionDays = 90) {
  try {
    const cutoffDate = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000))
    );

    const snapshot = await db.collection('broadcast_analytics')
      .where('createdAt', '<', cutoffDate)
      .get();

    if (snapshot.empty) {
      logger.info('No old broadcast analytics to cleanup');
      return 0;
    }

    const batch = db.batch();
    let deleteCount = 0;

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    await batch.commit();
    
    logger.info(`Cleaned up ${deleteCount} old broadcast analytics records`);
    return deleteCount;
  } catch (error) {
    logger.error('Error cleaning up old analytics:', error);
    throw error;
  }
}

module.exports = {
  recordBroadcastAnalytics,
  getBroadcastAnalytics,
  getSegmentAnalytics,
  getTopPerformingSegments,
  cleanupOldAnalytics
};