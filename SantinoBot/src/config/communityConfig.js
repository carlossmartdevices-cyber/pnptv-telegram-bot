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
    welcomeTitle: '**Bienvenido al Grupo de Miembros de PNPtv!**',
    santinoPMessage: `Esta es la parte de la comunidad donde empieza a parecer un culto.
**Adora a Santino. El Meth Daddy.**

Aquí eres libre.
Libre para ser tú mismo, para vivir tu sexualidad como quieras,
y para preguntar lo que otros temen decir.

Disfruta tu tiempo, explora, conéctate,
y recuerda: este es un espacio seguro
para la autenticidad, la curiosidad y el placer.`,
    communityDescription: `**Welcome to the PNPtv! Members Group**

This is the part of the community where it starts to look like a cult.
Worship Santino. The Meth Daddy.

Here, you're free.
Free to be yourself, to live your sexuality however you like,
and to ask anything without fear or shame.

Enjoy your time, explore, connect,
and remember: this is a safe space
for authenticity, curiosity, and pleasure.`,
    communityRules: '',
    personalityChoices: [
      { emoji: '�', name: 'Slam Slut', description: 'Party lover' },
      { emoji: '�', name: 'Meth Alpha', description: 'Brainy type' },
      { emoji: '🐚', name: 'Chem Mermaid', description: 'Aquatic vibes' },
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
  
  let message = `${config.welcomeTitle}\n\n`;
  
  if (config.santinoPMessage) {
    message += `${config.santinoPMessage}\n\n`;
  }
  
  if (config.communityDescription) {
    message += `${config.communityDescription}`;
  }
  
  if (config.communityRules) {
    message += `\n\n${config.communityRules}`;
  }
  
  return message;
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
