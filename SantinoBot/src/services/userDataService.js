const { db } = require('../config/firebase');
const logger = require('../utils/logger');
const userDataSync = require('../utils/userDataSync');

/**
 * User Data Service
 * Handles all read/write operations for user data from main bot
 */

/**
 * Get complete user profile including nearby and location info
 * @param {string} userId - Telegram user ID
 * @returns {Promise<Object>} Complete user data
 */
async function getUserProfile(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      logger.warn(`User profile not found: ${userId}`);
      return null;
    }

    return userDoc.data();
  } catch (error) {
    logger.error(`Error getting user profile for ${userId}:`, error);
    return null;
  }
}

/**
 * Get user's nearby members (from main bot data)
 * @param {string} userId - Telegram user ID
 * @returns {Promise<Array>} Array of nearby users
 */
async function getNearbyUsers(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return [];
    }

    const userData = userDoc.data();
    const userLocation = userData?.location;

    if (!userLocation || !userLocation.latitude) {
      logger.info(`User ${userId} has no location data`);
      return [];
    }

    // Query nearby users within 10km (configurable)
    const nearbyUsers = await db.collection('users')
      .where('location.latitude', '!=', null)
      .get();

    const nearbyList = [];
    nearbyUsers.forEach((doc) => {
      if (doc.id === userId) return; // Skip self

      const otherUser = doc.data();
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        otherUser.location.latitude,
        otherUser.location.longitude
      );

      if (distance <= 10) { // 10km radius
        nearbyList.push({
          userId: doc.id,
          username: otherUser.username,
          firstName: otherUser.firstName,
          distance,
          tier: otherUser.tier,
          lastActive: otherUser.lastActive
        });
      }
    });

    // Sort by distance and return top 3 for free users, all for premium
    nearbyList.sort((a, b) => a.distance - b.distance);
    
    return nearbyList;
  } catch (error) {
    logger.error(`Error getting nearby users for ${userId}:`, error);
    return [];
  }
}

/**
 * Update user's profile information from group
 * @param {string} userId - Telegram user ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
async function updateUserProfile(userId, updates) {
  try {
    const allowedFields = ['bio', 'photoFileId', 'location', 'lastActive'];
    
    // Only allow specific fields to be updated from group bot
    const filteredUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      logger.warn(`No valid fields to update for user ${userId}`);
      return false;
    }

    await db.collection('users').doc(userId).update({
      ...filteredUpdates,
      lastModifiedByGroupBot: new Date()
    });

    logger.info(`Updated profile for user ${userId}:`, Object.keys(filteredUpdates));
    return true;
  } catch (error) {
    logger.error(`Error updating user profile for ${userId}:`, error);
    return false;
  }
}

/**
 * Log user activity (group interactions)
 * @param {string} userId - Telegram user ID
 * @param {string} action - Action type (message, media, etc.)
 * @returns {Promise<boolean>} Success status
 */
async function logUserActivity(userId, action) {
  try {
    const userRef = db.collection('users').doc(userId);
    const now = new Date();

    await userRef.update({
      lastActive: now,
      lastActivityInGroup: action,
      groupActivityLog: {
        lastMessageTime: now,
        action: action
      }
    });

    logger.debug(`Logged ${action} activity for user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error logging activity for user ${userId}:`, error);
    return false;
  }
}

/**
 * Track user's nearby searches
 * @param {string} userId - Telegram user ID
 * @returns {Promise<Object>} Search info with remaining count
 */
async function trackNearbySearch(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const tier = userData?.tier || 'Free';

    // If premium, no limits
    if (tier !== 'Free') {
      return { allowed: true, remaining: -1 }; // -1 means unlimited
    }

    // For free users, check 3-search weekly limit
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const searches = userData.searches || [];
    const recentSearches = searches.filter(timestamp => 
      new Date(timestamp.toDate()).getTime() > weekAgo.getTime()
    );

    if (recentSearches.length >= 3) {
      return { allowed: false, remaining: 0 };
    }

    // Record new search
    recentSearches.push(now);
    await db.collection('users').doc(userId).update({
      searches: recentSearches
    });

    return { allowed: true, remaining: 3 - recentSearches.length };
  } catch (error) {
    logger.error(`Error tracking nearby search for ${userId}:`, error);
    return { allowed: false, remaining: 0 };
  }
}

/**
 * Get user's subscription status
 * @param {string} userId - Telegram user ID
 * @returns {Promise<Object>} Subscription info
 */
async function getSubscriptionStatus(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return { tier: 'Free', isActive: false };
    }

    const userData = userDoc.data();
    let tier = userData.tier || 'Free';
    let isActive = true;

    // Check if membership expired
    if (userData.membershipExpiresAt && tier !== 'Free') {
      const now = new Date();
      const expiresAt = userData.membershipExpiresAt.toDate();
      
      if (now > expiresAt) {
        tier = 'Free';
        isActive = false;
      }
    }

    return {
      tier,
      isActive,
      expiresAt: userData.membershipExpiresAt?.toDate() || null,
      email: userData.email,
      joinedDate: userData.createdAt?.toDate() || null
    };
  } catch (error) {
    logger.error(`Error getting subscription status for ${userId}:`, error);
    return { tier: 'Free', isActive: false };
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @private
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Setup real-time listener for user data updates
 * @param {string} userId - Telegram user ID
 * @param {Function} onUpdate - Callback when data changes
 */
function setupUserListener(userId, onUpdate) {
  userDataSync.startListening(userId, onUpdate);
}

/**
 * Remove listener for user
 * @param {string} userId - Telegram user ID
 */
function removeUserListener(userId) {
  userDataSync.stopListening(userId);
}

module.exports = {
  getUserProfile,
  getNearbyUsers,
  updateUserProfile,
  logUserActivity,
  trackNearbySearch,
  getSubscriptionStatus,
  setupUserListener,
  removeUserListener
};
