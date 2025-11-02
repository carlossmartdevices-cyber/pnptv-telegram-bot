const logger = require('../utils/logger');
const communityConfig = require('../config/communityConfig');
const { db } = require('../config/firebase');

/**
 * Personality Choice Handler
 * Manages user personality selection and badge system
 */

/**
 * Save user personality choice to profile
 */
async function savePersonalityChoice(userId, choice) {
  try {
    const emoji = choice.emoji;
    const name = choice.name;
    
    // Update user document with personality choice and badge
    await db.collection('users').doc(userId).set({
      personalityChoice: {
        emoji,
        name,
        description: choice.description,
        selectedAt: new Date()
      },
      badge: `${emoji} ${name}`, // Add badge field for easy display
      updatedAt: new Date()
    }, { merge: true });
    
    logger.info(`User ${userId} selected personality: ${name} ${emoji}`);
    return true;
  } catch (error) {
    logger.error(`Error saving personality choice for ${userId}:`, error);
    return false;
  }
}

/**
 * Get user's personality badge
 */
async function getUserPersonalityBadge(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists || !userDoc.data().personalityChoice) {
      return null;
    }
    
    const choice = userDoc.data().personalityChoice;
    return `${choice.emoji} ${choice.name}`;
  } catch (error) {
    logger.error(`Error getting personality badge for ${userId}:`, error);
    return null;
  }
}

/**
 * Build personality choice inline keyboard
 */
async function buildPersonalityKeyboard() {
  const choices = await communityConfig.getPersonalityChoices();
  
  // Create 2x2 inline keyboard layout
  return {
    inline_keyboard: [
      [
        { text: `${choices[0].emoji} ${choices[0].name}`, callback_data: `personality_${choices[0].name.replace(/\s+/g, '_')}` },
        { text: `${choices[1].emoji} ${choices[1].name}`, callback_data: `personality_${choices[1].name.replace(/\s+/g, '_')}` }
      ],
      [
        { text: `${choices[2].emoji} ${choices[2].name}`, callback_data: `personality_${choices[2].name.replace(/\s+/g, '_')}` },
        { text: `${choices[3].emoji} ${choices[3].name}`, callback_data: `personality_${choices[3].name.replace(/\s+/g, '_')}` }
      ]
    ]
  };
}

/**
 * Handle personality choice callback
 */
async function handlePersonalityChoice(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const callbackData = ctx.callbackQuery.data;
    
    // Extract choice name from callback data (format: personality_Choice_Name)
    const choiceName = callbackData.replace('personality_', '').replace(/_/g, ' ');
    
    // Get all choices
    const choices = await communityConfig.getPersonalityChoices();
    const selectedChoice = choices.find(c => c.name === choiceName);
    
    if (!selectedChoice) {
      await ctx.answerCbQuery('❌ Invalid choice', { show_alert: true });
      return;
    }
    
    // Check if personality selection is still available
    const available = await communityConfig.isPersonalitySelectionAvailable();
    if (!available) {
      await ctx.answerCbQuery('❌ Personality selection limit reached', { show_alert: true });
      return;
    }
    
    // Save choice
    const saved = await savePersonalityChoice(userId, selectedChoice);
    
    if (saved) {
      await communityConfig.incrementPersonalityCounter();
      
      await ctx.answerCbQuery(
        `✅ You are now a ${selectedChoice.emoji} ${selectedChoice.name}!`
      );
      
      // Edit message to show selection
      await ctx.editMessageText(
        `✅ **Tu personalidad / Your personality**\n\n` +
        `${selectedChoice.emoji} **${selectedChoice.name}**\n\n` +
        `This badge has been added to your profile! 🎉`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.answerCbQuery('❌ Error saving choice', { show_alert: true });
    }
  } catch (error) {
    logger.error('Error handling personality choice:', error);
    await ctx.answerCbQuery('❌ Error processing choice', { show_alert: true });
  }
}

module.exports = {
  savePersonalityChoice,
  getUserPersonalityBadge,
  buildPersonalityKeyboard,
  handlePersonalityChoice
};
