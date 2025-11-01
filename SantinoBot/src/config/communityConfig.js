const { db } = require('./firebase');
const logger = require('../utils/logger');

/**
 * Community Configuration Service
 * Manages welcome messages, rules, and community settings from Firestore
 */

const CONFIG_DOC = 'config/community';

/**
 * Get community welcome configuration
 */
async function getCommunityConfig() {
  try {
    const doc = await db.collection('config').doc('community').get();
    
    if (!doc.exists) {
      logger.warn('Community config not found, creating default');
      return getDefaultConfig();
    }
    
    return doc.data();
  } catch (error) {
    logger.error('Error getting community config:', error);
    return getDefaultConfig();
  }
}

/**
 * Update community welcome configuration
 */
async function updateCommunityConfig(updates) {
  try {
    await db.collection('config').doc('community').update(updates);
    logger.info('Community config updated:', updates);
    return true;
  } catch (error) {
    logger.error('Error updating community config:', error);
    return false;
  }
}

/**
 * Get default community configuration template
 */
function getDefaultConfig() {
  return {
    welcomeTitle: '👋 Welcome to PNPtv! The Telegram Community',
    santinoPMessage: '[Personal message from Santino will be here]',
    communityDescription: '[Community description will be here]',
    communityRules: `
📋 **Community Rules:**
1. Respect all members
2. No spam or promotional content
3. Keep conversations relevant
4. No hate speech or discrimination
5. Follow Telegram guidelines

[More rules can be added here]
    `.trim(),
    personalityChoices: [
      { emoji: '🧜', name: 'Chem Mermaid', description: 'Aquatic vibes' },
      { emoji: '👯', name: 'Slam Slut', description: 'Party lover' },
      { emoji: '🧮', name: 'M*th Alpha', description: 'Brainy type' },
      { emoji: '👑', name: 'Spun Royal', description: 'Elite member' }
    ],
    maxPersonalityMembers: 1000,
    currentPersonalityMemberCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Get all personality choices
 */
async function getPersonalityChoices() {
  const config = await getCommunityConfig();
  return config.personalityChoices || getDefaultConfig().personalityChoices;
}

/**
 * Check if personality selection is still available
 */
async function isPersonalitySelectionAvailable() {
  const config = await getCommunityConfig();
  return (config.currentPersonalityMemberCount || 0) < (config.maxPersonalityMembers || 1000);
}

/**
 * Increment personality member counter
 */
async function incrementPersonalityCounter() {
  try {
    const config = await getCommunityConfig();
    const newCount = (config.currentPersonalityMemberCount || 0) + 1;
    
    await updateCommunityConfig({
      currentPersonalityMemberCount: newCount,
      updatedAt: new Date()
    });
    
    return newCount;
  } catch (error) {
    logger.error('Error incrementing personality counter:', error);
    return 0;
  }
}

/**
 * Build formatted welcome message
 */
async function buildWelcomeMessage() {
  const config = await getCommunityConfig();
  
  return `${config.welcomeTitle}\n\n` +
    `💬 **From Santino:**\n${config.santinoPMessage}\n\n` +
    `ℹ️ **About Us:**\n${config.communityDescription}\n\n` +
    `${config.communityRules}`;
}

module.exports = {
  getCommunityConfig,
  updateCommunityConfig,
  getDefaultConfig,
  getPersonalityChoices,
  isPersonalitySelectionAvailable,
  incrementPersonalityCounter,
  buildWelcomeMessage
};
