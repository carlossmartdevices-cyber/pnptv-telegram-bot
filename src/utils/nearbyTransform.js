const { db } = require('../config/firebase');

const FREE_VISIBLE_LIMIT = 3;

/**
 * Transform nearby search results based on user tier
 * @param {string} userId - User's Telegram ID
 * @param {Array} results - Array of nearby users
 * @returns {Promise<Array>} - Filtered and limited results
 */
async function transformNearbyResults(userId, results) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // If user is not free tier, return all results
    if (userData.tier !== 'Free') {
      return results;
    }

    // For free users, limit to top 3 results
    // Sort by distance if available, otherwise return first 3
    const sortedResults = results.sort((a, b) => {
      if (a.distance && b.distance) {
        return a.distance - b.distance;
      }
      return 0;
    });

    return sortedResults.slice(0, FREE_VISIBLE_LIMIT);
  } catch (error) {
    console.error('Error transforming nearby results:', error);
    // On error, return limited results to be safe
    return results.slice(0, FREE_VISIBLE_LIMIT);
  }
}

module.exports = {
  transformNearbyResults,
  FREE_VISIBLE_LIMIT
};