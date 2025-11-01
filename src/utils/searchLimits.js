const { db } = require('../config/firebase');
const logger = require('./logger');

const WEEKLY_SEARCH_LIMIT = 3;

/**
 * Check and update search usage for free users
 * @param {string} userId - User's Telegram ID
 * @returns {Promise<boolean>} - Returns true if user can perform search, false if limit reached
 */
async function checkSearchLimit(userId) {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // Premium users have no limits
    if (userData.tier !== 'Free') {
      return true;
    }

    const searches = userData.searches || [];
    
    // Filter out searches older than a week
    const recentSearches = searches.filter(timestamp => 
      new Date(timestamp.toDate()).getTime() > weekAgo.getTime()
    );

    if (recentSearches.length >= WEEKLY_SEARCH_LIMIT) {
      return false;
    }

    // Add new search timestamp
    recentSearches.push(now);
    await userRef.update({ searches: recentSearches });

    return true;
  } catch (error) {
    logger.error(`Error checking search limit for user ${userId}:`, error);
    // On error, let's allow the search to proceed
    return true;
  }
}

module.exports = {
  checkSearchLimit,
  WEEKLY_SEARCH_LIMIT
};