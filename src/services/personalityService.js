const { db } = require("../config/firebase");
const logger = require("../utils/logger");
const { isAdmin } = require("../config/admin");

/**
 * Personality Service
 * Manages user personality choices and badges from SantinoBot integration
 */

/**
 * Get available personality choices
 * @param {string} userId - Optional user ID to include admin-only choices
 */
function getPersonalityChoices(userId = null) {
  const baseChoices = [
    { emoji: '🔥', name: 'Slam Slut', description: 'Party lover' },
    { emoji: '🧠', name: 'Meth Alpha', description: 'Brainy type' },
    { emoji: '🐚', name: 'Chem Mermaid', description: 'Aquatic vibes' },
    { emoji: '👑', name: 'Spun Royal', description: 'Elite member' }
  ];

  // Add admin-exclusive personality for admin users
  if (userId && isAdmin(userId)) {
    baseChoices.push({
      emoji: '💀',
      name: 'The Meth Daddy',
      description: 'Supreme Leader - Admin Only',
      isAdminOnly: true
    });
  }

  return baseChoices;
}

/**
 * Get user's personality choice
 */
async function getUserPersonality(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data();
    
    // Check for SantinoBot personality choice format
    if (userData.personalityChoice && userData.personalityChoice.emoji && userData.personalityChoice.name) {
      return userData.personalityChoice;
    }
    
    // Check legacy badge format
    if (userData.badge && typeof userData.badge === "string" && userData.badge.trim()) {
      const badge = userData.badge.trim();
      // Try to extract emoji and name from badge string like "🔥 Slam Slut"
      const match = badge.match(/^(.+?)\s+(.+)$/);
      if (match) {
        return {
          emoji: match[1].trim(),
          name: match[2].trim(),
          description: 'Legacy badge'
        };
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`Error getting user personality for ${userId}:`, error);
    return null;
  }
}

/**
 * Get personality badge display string
 */
async function getPersonalityBadge(userId) {
  try {
    const personality = await getUserPersonality(userId);
    
    if (!personality) {
      return null;
    }
    
    return `${personality.emoji} ${personality.name}`;
  } catch (error) {
    logger.error(`Error getting personality badge for ${userId}:`, error);
    return null;
  }
}

/**
 * Check if user has selected a personality
 */
async function hasPersonality(userId) {
  try {
    const personality = await getUserPersonality(userId);
    return personality !== null;
  } catch (error) {
    logger.error(`Error checking if user ${userId} has personality:`, error);
    return false;
  }
}

/**
 * Set user personality (for admin functions or future features)
 */
async function setUserPersonality(userId, choice) {
  try {
    if (!choice || !choice.emoji || !choice.name) {
      throw new Error('Invalid personality choice');
    }
    
    const personalityData = {
      personalityChoice: {
        emoji: choice.emoji,
        name: choice.name,
        description: choice.description || '',
        selectedAt: new Date()
      },
      badge: `${choice.emoji} ${choice.name}`, // Also set legacy badge field
      updatedAt: new Date()
    };
    
    // Use set with merge to create document if it doesn't exist
    await db.collection('users').doc(userId).set(personalityData, { merge: true });
    
    logger.info(`Set personality for user ${userId}: ${choice.name} ${choice.emoji}`);
    return true;
  } catch (error) {
    logger.error(`Error setting personality for user ${userId}:`, error);
    return false;
  }
}

/**
 * Get personality statistics (for admin)
 */
async function getPersonalityStats() {
  try {
    const usersSnapshot = await db.collection('users')
      .where('personalityChoice', '!=', null)
      .get();
    
    const stats = {};
    const choices = getPersonalityChoices();
    
    // Initialize stats
    choices.forEach(choice => {
      stats[choice.name] = {
        ...choice,
        count: 0,
        users: []
      };
    });
    
    // Count users for each personality
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.personalityChoice && userData.personalityChoice.name) {
        const name = userData.personalityChoice.name;
        if (stats[name]) {
          stats[name].count++;
          stats[name].users.push({
            userId: doc.id,
            username: userData.username || 'Anonymous',
            selectedAt: userData.personalityChoice.selectedAt
          });
        }
      }
    });
    
    return stats;
  } catch (error) {
    logger.error('Error getting personality stats:', error);
    return {};
  }
}

module.exports = {
  getPersonalityChoices,
  getUserPersonality,
  getPersonalityBadge,
  hasPersonality,
  setUserPersonality,
  getPersonalityStats,
  isAdmin
};