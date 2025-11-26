const { db } = require("../config/firebase");
const admin = require("firebase-admin");
const logger = require("../utils/logger");

/**
 * Get filtered users based on segmentation criteria
 * @param {Object} criteria - Segmentation criteria
 * @param {string[]} criteria.tiers - Tiers to include ('Free', 'Basic', 'Premium')
 * @param {string[]} criteria.statuses - Statuses to include ('active', 'expired', 'expiring_soon', 'new', 'returning')
 * @param {number} criteria.joinedWithinDays - Users joined within X days (optional)
 * @param {boolean} criteria.hasExpired - Include users who have expired memberships
 * @param {boolean} criteria.neverPaid - Include users who never had premium
 * @returns {Promise<Array>} Array of user objects with targeting info
 */
async function getSegmentedUsers(criteria = {}) {
  try {
    logger.info('Getting segmented users with criteria:', criteria);
    
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    // Start with all users query
    let query = db.collection('users');
    
    // Apply basic filters that can be done at database level
    if (criteria.tiers && criteria.tiers.length > 0 && criteria.tiers.length < 3) {
      // Only apply if not all tiers are selected (optimization)
      if (criteria.tiers.length === 1) {
        query = query.where('tier', '==', criteria.tiers[0]);
      } else {
        query = query.where('tier', 'in', criteria.tiers);
      }
    }
    
    const snapshot = await query.get();
    logger.info(`Retrieved ${snapshot.size} users from database`);
    
    const filteredUsers = [];
    const currentTime = admin.firestore.Timestamp.now();
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      
      // Skip if user doesn't have basic required fields
      if (!userData.tier) {
        userData.tier = 'Free'; // Set default
      }
      
      // Calculate user status
      const userStatus = calculateUserStatus(userData, now, sevenDaysFromNow);
      
      // Apply filters
      if (!matchesCriteria(userData, userStatus, criteria, now)) {
        return; // Skip this user
      }
      
      // Add user to filtered list with additional info
      filteredUsers.push({
        userId,
        username: userData.username,
        firstName: userData.firstName,
        tier: userData.tier,
        status: userStatus.status,
        expiresAt: userStatus.expiresAt,
        daysRemaining: userStatus.daysRemaining,
        joinedAt: userData.createdAt?.toDate(),
        language: userData.language || 'en',
        previousTier: userData.previousTier,
        hasEverPaid: userData.previousTier && userData.previousTier !== 'Free',
        // Additional segmentation data
        segmentInfo: {
          isNew: userStatus.isNew,
          isExpiring: userStatus.isExpiring,
          isExpired: userStatus.isExpired,
          isReturning: userStatus.isReturning,
          daysSinceJoin: userStatus.daysSinceJoin
        }
      });
    });
    
    logger.info(`Filtered to ${filteredUsers.length} users matching criteria`);
    return filteredUsers;
    
  } catch (error) {
    logger.error('Error getting segmented users:', error);
    throw error;
  }
}

/**
 * Calculate user status based on membership and activity data
 */
function calculateUserStatus(userData, now, sevenDaysFromNow) {
  let status = 'active';
  let expiresAt = null;
  let daysRemaining = null;
  let isNew = false;
  let isExpiring = false;
  let isExpired = false;
  let isReturning = false;
  let daysSinceJoin = null;
  
  // Calculate join date info
  if (userData.createdAt) {
    const joinedAt = userData.createdAt.toDate();
    daysSinceJoin = Math.ceil((now - joinedAt) / (1000 * 60 * 60 * 24));
    isNew = daysSinceJoin <= 30; // New if joined within 30 days
  }
  
  // Calculate membership expiration info
  if (userData.membershipExpiresAt) {
    expiresAt = userData.membershipExpiresAt.toDate();
    const diffTime = expiresAt.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
      status = 'expired';
      isExpired = true;
    } else if (daysRemaining <= 7) {
      status = 'expiring_soon';
      isExpiring = true;
    }
  } else if (userData.tier === 'Free') {
    status = 'free';
  } else {
    status = 'lifetime'; // Premium without expiration
  }
  
  // Check if returning customer (had premium before, now free)
  if (userData.tier === 'Free' && userData.previousTier && userData.previousTier !== 'Free') {
    isReturning = true;
    status = 'returning'; // Override status for returning customers
  }
  
  return {
    status,
    expiresAt,
    daysRemaining,
    isNew,
    isExpiring,
    isExpired,
    isReturning,
    daysSinceJoin
  };
}

/**
 * Check if user matches the segmentation criteria
 */
function matchesCriteria(userData, userStatus, criteria, now) {
  // Check tier filter
  if (criteria.tiers && criteria.tiers.length > 0) {
    if (!criteria.tiers.includes(userData.tier)) {
      return false;
    }
  }
  
  // Check status filter
  if (criteria.statuses && criteria.statuses.length > 0) {
    if (!criteria.statuses.includes(userStatus.status)) {
      return false;
    }
  }
  
  // Check join date filter
  if (criteria.joinedWithinDays && userStatus.daysSinceJoin !== null) {
    if (userStatus.daysSinceJoin > criteria.joinedWithinDays) {
      return false;
    }
  }
  
  // Check expired filter
  if (criteria.hasExpired !== undefined) {
    if (criteria.hasExpired && !userStatus.isExpired) {
      return false;
    }
    if (!criteria.hasExpired && userStatus.isExpired) {
      return false;
    }
  }
  
  // Check never paid filter
  if (criteria.neverPaid !== undefined) {
    const hasEverPaid = userData.previousTier && userData.previousTier !== 'Free';
    if (criteria.neverPaid && hasEverPaid) {
      return false;
    }
    if (!criteria.neverPaid && !hasEverPaid) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get predefined segment configurations
 */
function getSegmentPresets() {
  return {
    all_users: {
      name: "🌍 All Users",
      description: "Send to everyone",
      criteria: {}
    },
    free_users: {
      name: "🆓 Free Users",
      description: "Users on free tier only",
      criteria: { tiers: ['Free'] }
    },
    premium_users: {
      name: "💎 Premium Users", 
      description: "Current paying customers",
      criteria: { tiers: ['Basic', 'Premium'], statuses: ['active', 'lifetime'] }
    },
    expiring_soon: {
      name: "⏰ Expiring Soon",
      description: "Premium users expiring in 7 days",
      criteria: { statuses: ['expiring_soon'] }
    },
    expired_users: {
      name: "⚠️ Expired Users",
      description: "Recently expired premium users",
      criteria: { statuses: ['expired'] }
    },
    new_users: {
      name: "🆕 New Users",
      description: "Joined in last 30 days",
      criteria: { joinedWithinDays: 30 }
    },
    returning_customers: {
      name: "🔄 Previous Customers",
      description: "Had premium before, now free",
      criteria: { tiers: ['Free'], statuses: ['returning'] }
    },
    never_paid: {
      name: "👀 Prospects",
      description: "Never had premium membership",
      criteria: { neverPaid: true }
    },
    new_free_users: {
      name: "🎯 New Prospects",
      description: "New users who never paid",
      criteria: { tiers: ['Free'], neverPaid: true, joinedWithinDays: 30 }
    },
    loyal_customers: {
      name: "⭐ Loyal Customers", 
      description: "Premium users for 90+ days",
      criteria: { tiers: ['Basic', 'Premium'], statuses: ['active', 'lifetime'] }
    }
  };
}

/**
 * Get segment statistics without fetching all users
 */
async function getSegmentStats(segmentKey) {
  try {
    const presets = getSegmentPresets();
    const preset = presets[segmentKey];
    
    if (!preset) {
      throw new Error(`Unknown segment: ${segmentKey}`);
    }
    
    // For now, get actual count (optimize later with aggregation if needed)
    const users = await getSegmentedUsers(preset.criteria);
    
    return {
      segmentKey,
      name: preset.name,
      description: preset.description,
      userCount: users.length,
      criteria: preset.criteria
    };
  } catch (error) {
    logger.error(`Error getting segment stats for ${segmentKey}:`, error);
    return {
      segmentKey,
      name: presets[segmentKey]?.name || 'Unknown',
      userCount: 0,
      error: error.message
    };
  }
}

/**
 * Get stats for all segments
 */
async function getAllSegmentStats() {
  const presets = getSegmentPresets();
  const stats = [];
  
  for (const segmentKey of Object.keys(presets)) {
    const stat = await getSegmentStats(segmentKey);
    stats.push(stat);
  }
  
  return stats;
}

module.exports = {
  getSegmentedUsers,
  getSegmentPresets,
  getSegmentStats,
  getAllSegmentStats,
  calculateUserStatus,
  matchesCriteria
};