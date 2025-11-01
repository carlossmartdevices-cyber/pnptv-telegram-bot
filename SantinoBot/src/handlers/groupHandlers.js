const logger = require('../utils/logger');
const { getUserPermissions, applyUserPermissions, isMessageTypeAllowed } = require('../utils/permissions');
const userDataService = require('../services/userDataService');
const communityConfig = require('../config/communityConfig');
const personalityHandler = require('./personalityHandler');

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
      
      // Get full profile and subscription info
      const { tier } = await getUserPermissions(userId);
      const subscription = await userDataService.getSubscriptionStatus(userId);
      const profile = await userDataService.getUserProfile(userId);

      // Apply permissions
      await applyUserPermissions(ctx, member.id, tier);

      // Setup real-time listener for permission updates
      userDataService.setupUserListener(userId, async (userData) => {
        const newTier = userData.tier || 'Free';
        await applyUserPermissions(ctx, member.id, newTier);
        logger.info(`Auto-updated permissions for user ${userId} to ${newTier}`);
      });

      // Send welcome message with community info
      try {
        const welcomeMessage = await communityConfig.buildWelcomeMessage();
        const welcomeMsg = await ctx.reply(
          `👋 Welcome @${member.username || member.first_name}!\n\n${welcomeMessage}`,
          { parse_mode: 'Markdown' }
        );
        
        // Auto-delete after 60 seconds
        setTimeout(() => {
          ctx.deleteMessage(welcomeMsg.message_id).catch(() => {});
        }, 60000);
      } catch (error) {
        logger.error('Error sending welcome message:', error);
      }

      // Send personality choice question (only if still available for first 1000 members)
      const personalityAvailable = await communityConfig.isPersonalitySelectionAvailable();
      if (personalityAvailable) {
        try {
          const keyboard = await personalityHandler.buildPersonalityKeyboard();
          await ctx.reply(
            `🎭 **Who Are You?**\n\n` +
            `Choose your personality type to get a special badge! ✨\n\n` +
            `This feature is limited to the first 1000 members.`,
            {
              reply_markup: keyboard,
              parse_mode: 'Markdown'
            }
          );
        } catch (error) {
          logger.error('Error sending personality choice:', error);
        }
      }

      // Send user tier info
      let tierMessage = `👤 **Your Account**\n\n`;
      
      if (tier === 'Free') {
        tierMessage += `🆓 **Free Tier**\n` +
          `• Text messages only\n` +
          `• Access to free channel\n` +
          `• Basic features\n\n` +
          `💎 Upgrade to premium to unlock photos, videos, and more!`;
      } else {
        tierMessage += `💎 **${tier} Member**\n` +
          `• Full media access (photos, videos)\n` +
          `• Nearby members feature\n` +
          `• Extended features\n` +
          `• Status: ${subscription.isActive ? '✅ Active' : '⏳ Expiring soon'}\n`;
        
        if (subscription.expiresAt) {
          tierMessage += `• Expires: ${subscription.expiresAt.toLocaleDateString()}`;
        }
      }

      const tierMsg = await ctx.reply(tierMessage, { parse_mode: 'Markdown' });
      
      // Auto-delete after 45 seconds
      setTimeout(() => {
        ctx.deleteMessage(tierMsg.message_id).catch(() => {});
      }, 45000);

      // Log activity
      await userDataService.logUserActivity(userId, 'joined_group');
    }
  } catch (error) {
    logger.error('Error handling new member:', error);
  }
}

/**
 * Handle member leaving the group
 */
async function handleLeftMember(ctx) {
  try {
    const leftMember = ctx.message.left_chat_member;
    logger.info(`Member left group: ${leftMember.id} (@${leftMember.username})`);
  } catch (error) {
    logger.error('Error handling left member:', error);
  }
}

/**
 * Monitor and restrict media messages from free users
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
        `📱 Contact support to upgrade your account.`,
        { parse_mode: 'Markdown' }
      ).catch(() => null);

      // Auto-delete warning after 20 seconds to keep chat clean
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
 * Handle text messages (monitor for spam/inappropriate content if needed)
 */
async function handleTextMessage(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const text = ctx.message.text;

    // Check user permissions (mainly for logging)
    const { tier } = await getUserPermissions(userId);
    
    logger.debug(`User ${userId} (${tier}) sent text: ${text.substring(0, 50)}...`);

    // Here you could add text filtering, spam detection, etc.
    // For now, we just log it
  } catch (error) {
    logger.error('Error handling text message:', error);
  }
}

/**
 * Handle admin commands (for debugging/management)
 */
async function handleAdminCommand(ctx) {
  try {
    const command = ctx.message.text;
    const userId = ctx.from.id.toString();

    logger.info(`Admin command from ${userId}: ${command}`);

    if (command === '/status') {
      const { tier, isActive, userData } = await getUserPermissions(userId);
      await ctx.reply(
        `🔍 Status Check:\n` +
        `User: ${userId}\n` +
        `Tier: ${tier}\n` +
        `Active: ${isActive}\n` +
        `Username: @${ctx.from.username || 'none'}`
      );
    }

    if (command === '/refresh') {
      const { tier } = await getUserPermissions(userId);
      await applyUserPermissions(ctx, userId, tier);
      await ctx.reply(`✅ Permissions refreshed for ${tier} tier`);
    }
  } catch (error) {
    logger.error('Error handling admin command:', error);
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
  handleNewMember,
  handleLeftMember,
  handleMediaMessage,
  handleTextMessage,
  handleAdminCommand
};