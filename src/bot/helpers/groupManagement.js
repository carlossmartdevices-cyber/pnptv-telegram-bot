const logger = require("../../utils/logger");
const { db } = require("../../config/firebase");
const { t } = require("../../utils/i18n");
const { generateWelcomeMessage } = require("./welcomeMessageHelper");

/**
 * Group Management Functions
 * Handles group permissions, media restrictions, and member management
 */

/**
 * Get user permissions based on subscription tier
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
    return { tier: 'Free', isActive: false, userData: null };
  }
}

/**
 * Get appropriate Telegram permissions based on user tier
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

  // Premium users get full permissions
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
 */
async function applyUserPermissions(ctx, userId, tier) {
  try {
    const permissions = getTelegramPermissions(tier);
    
    await ctx.restrictChatMember(userId, permissions);
    
    logger.info(`Applied ${tier} permissions to user ${userId}`);
    return true;
  } catch (error) {
    // Silently handle "not enough rights" errors - bot may not have admin rights
    if (error.code === 400 && error.message && error.message.includes('not enough rights')) {
      logger.warn(`Bot doesn't have permission rights in this group: ${error.message}`);
      return false;
    }
    logger.error(`Failed to apply permissions to user ${userId}:`, error);
    return false;
  }
}

/**
 * Check if a message type is allowed for user's tier
 */
function isMessageTypeAllowed(tier, messageType) {
  if (tier !== 'Free') {
    return true; // Premium users can send anything
  }

  // Free users can only send text messages
  const allowedTypes = ['text'];
  return allowedTypes.includes(messageType);
}

/**
 * Handle new members joining the group
 */
async function handleNewMember(ctx) {
  try {
    const newMembers = ctx.message.new_chat_members;
    const groupId = ctx.chat.id;

    logger.info(`New members joined group ${groupId}: ${newMembers.map(m => m.id).join(', ')}`);

    for (const member of newMembers) {
      if (member.is_bot) {
        logger.info(`Skipping bot member: ${member.id}`);
        continue;
      }

      const userId = member.id.toString();
      
      // Get user permissions and subscription info
      const { tier, userData } = await getUserPermissions(userId);
      const userLanguage = userData?.language || 'en';

      // Apply permissions
      await applyUserPermissions(ctx, member.id, tier);

      // Send welcome message - this should stay in group
      try {
        // Allow group response for welcome messages
        if (ctx.allowGroupResponse) {
          ctx.allowGroupResponse();
        }
        
        const welcomeMsg = await ctx.reply(
          generateWelcomeMessage(member, tier, userLanguage),
          { parse_mode: 'Markdown' }
        );
        
        // Auto-delete after 60 seconds
        setTimeout(() => {
          ctx.deleteMessage(welcomeMsg.message_id).catch(() => {});
        }, 60000);
      } catch (error) {
        logger.error('Error sending welcome message:', error);
      }

      // Log activity
      await logUserActivity(userId, 'joined_group');
    }
  } catch (error) {
    logger.error('Error handling new member:', error);
  }
}

/**
 * Handle media messages from users
 */
async function handleMediaMessage(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const messageType = getMessageType(ctx.message);
    
    logger.info(`User ${userId} sent ${messageType} message`);

    const { tier } = await getUserPermissions(userId);
    
    // Check if user is allowed to send this message type
    if (!isMessageTypeAllowed(tier, messageType)) {
      // Delete the unauthorized message immediately
      await ctx.deleteMessage();
      
      // Allow group response for media restriction warnings
      if (ctx.allowGroupResponse) {
        ctx.allowGroupResponse();
      }
      
      // Send friendly warning message
      const warningMsg = await ctx.reply(
        `⚠️ Hey @${ctx.from.username || ctx.from.first_name}!\n\n` +
        `Only premium members can send media (photos, videos, etc.).\n\n` +
        `💎 *Want to upgrade?*\n` +
        `Premium members get:\n` +
        `• Send photos & videos\n` +
        `• Access premium content\n` +
        `• Find nearby members\n` +
        `• And much more!\n\n` +
        `📱 Send /plans to see subscription options.`,
        { parse_mode: 'Markdown' }
      ).catch(() => null);

      // Auto-delete warning after 20 seconds
      if (warningMsg) {
        setTimeout(() => {
          ctx.deleteMessage(warningMsg.message_id).catch(() => {});
        }, 20000);
      }

      logger.info(`Deleted ${messageType} from free user ${userId}`);
    }
  } catch (error) {
    logger.error('Error handling media message:', error);
  }
}

/**
 * Log user activity
 */
async function logUserActivity(userId, action) {
  try {
    // First check if user document exists
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      logger.info(`User ${userId} document doesn't exist yet, skipping activity log`);
      return false;
    }

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
 * Determine message type from Telegram message object
 */
function getMessageType(message) {
  if (message.photo) return 'photo';
  if (message.video) return 'video';
  if (message.document) return 'document';
  if (message.audio) return 'audio';
  if (message.voice) return 'voice';
  if (message.video_note) return 'video_note';
  if (message.sticker) return 'sticker';
  if (message.animation) return 'animation';
  if (message.poll) return 'poll';
  if (message.text) return 'text';
  return 'other';
}

module.exports = {
  getUserPermissions,
  getTelegramPermissions,
  applyUserPermissions,
  isMessageTypeAllowed,
  handleNewMember,
  handleMediaMessage,
  logUserActivity,
  getMessageType
};