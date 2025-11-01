const { db } = require('../config/firebase');
const logger = require('./logger');

/**
 * Get user subscription tier and check if membership is active
 * @param {string} userId - Telegram user ID
 * @returns {Promise<{tier: string, isActive: boolean, userData: object}>}
 */
async function getUserPermissions(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      logger.info(`User ${userId} not found in database`);
      return { tier: 'Free', isActive: false, userData: null };
    }

    const userData = userDoc.data();
    let tier = userData.tier || 'Free';
    let isActive = true;

    // Check if membership has expired
    if (userData.membershipExpiresAt && tier !== 'Free') {
      const now = new Date();
      const expiresAt = userData.membershipExpiresAt.toDate();
      
      if (now > expiresAt) {
        logger.info(`User ${userId} membership expired on ${expiresAt}`);
        // Update user to Free tier in database
        await db.collection('users').doc(userId).update({
          tier: 'Free',
          membershipIsPremium: false,
          lastTierDowngrade: now
        });
        tier = 'Free';
        isActive = false;
      }
    }

    return { tier, isActive, userData };
  } catch (error) {
    logger.error(`Error getting user permissions for ${userId}:`, error);
    // Return Free tier on error to be safe
    return { tier: 'Free', isActive: false, userData: null };
  }
}

/**
 * Get appropriate Telegram permissions based on user tier
 * @param {string} tier - User subscription tier
 * @returns {object} Telegram permissions object
 */
function getTelegramPermissions(tier) {
  const basePermissions = {
    can_send_messages: true,
    can_send_audios: false,
    can_send_documents: false,
    can_send_photos: false,
    can_send_videos: false,
    can_send_video_notes: false,
    can_send_voice_notes: false,
    can_send_polls: false,
    can_send_other_messages: false, // Stickers, GIFs, games, etc.
    can_add_web_page_previews: true,
    can_change_info: false,
    can_invite_users: false,
    can_pin_messages: false,
    can_manage_topics: false,
  };

  if (tier === 'Free') {
    return basePermissions;
  }

  // Premium users (trial-week, pnp-member, crystal-member, diamond-member) get full permissions
  return {
    ...basePermissions,
    can_send_audios: true,
    can_send_documents: true,
    can_send_photos: true,
    can_send_videos: true,
    can_send_video_notes: true,
    can_send_voice_notes: true,
    can_send_polls: true,
    can_send_other_messages: true,
  };
}

/**
 * Apply permissions to a user in the group
 * @param {object} ctx - Telegraf context
 * @param {string} userId - Telegram user ID
 * @param {string} tier - User subscription tier
 * @returns {Promise<boolean>} Success status
 */
async function applyUserPermissions(ctx, userId, tier) {
  try {
    const permissions = getTelegramPermissions(tier);
    
    await ctx.restrictChatMember(userId, permissions);
    
    logger.info(`Applied ${tier} permissions to user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to apply permissions to user ${userId}:`, error);
    return false;
  }
}

/**
 * Check if a message type is allowed for user's tier
 * @param {string} tier - User subscription tier
 * @param {string} messageType - Type of message (photo, video, document, etc.)
 * @returns {boolean} Whether message type is allowed
 */
function isMessageTypeAllowed(tier, messageType) {
  if (tier !== 'Free') {
    return true; // Premium users can send anything
  }

  // Free users can only send text messages
  const allowedTypes = ['text'];
  return allowedTypes.includes(messageType);
}

module.exports = {
  getUserPermissions,
  getTelegramPermissions,
  applyUserPermissions,
  isMessageTypeAllowed
};