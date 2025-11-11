const moderationService = require('../../services/moderationService');
const logger = require('../../utils/logger');
const { isAdmin } = require('../../config/admin');
const { escapeMdV2 } = require('../../utils/telegramEscapes');

/**
 * Moderation Middleware
 * Automatically checks messages for blacklisted content and applies punishments
 */

/**
 * Check if user is admin (admins bypass moderation)
 */

/**
 * Apply punishment to user
 */
async function applyPunishment(ctx, punishment, violations) {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const chatType = ctx.chat.type;

  try {
    // Only apply punishments in groups/supergroups
    if (chatType !== 'group' && chatType !== 'supergroup') {
      return;
    }

  const userName = ctx.from.first_name || ctx.from.username || 'User';
  const safeUserName = escapeMdV2(String(userName));

    switch (punishment.action) {
      case 'warn':
        await ctx.reply(
          `⚠️ *Warning*\n\n` +
          `${safeUserName}, your message violated our community rules.\n\n` +
          `*Violation:* ${escapeMdV2(String(violations[0].type.replace(/_/g, ' ')))}\n` +
          `*Warnings:* ${punishment.violationCount}/5\n\n` +
          `Please follow the community guidelines. Further violations will result in restrictions.`,
          { parse_mode: 'Markdown' }
        );
        break;

      case 'mute':
        const muteDuration = punishment.duration;
        const muteMinutes = Math.floor(muteDuration / (60 * 1000));

        // Restrict user from sending messages
        await ctx.telegram.restrictChatMember(chatId, userId, {
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false
          },
          until_date: Math.floor((Date.now() + muteDuration) / 1000)
        });

        await ctx.reply(
          `🔇 *User Muted*\n\n` +
          `${safeUserName} has been muted for ${muteMinutes} minute(s).\n\n` +
          `*Reason:* ${escapeMdV2(String(violations[0].type.replace(/_/g, ' ')))}\n` +
          `*Violations:* ${punishment.violationCount}/5`,
          { parse_mode: 'Markdown' }
        );
        break;

      case 'kick':
        await ctx.telegram.banChatMember(chatId, userId);
        // Immediately unban to allow them to rejoin
        await ctx.telegram.unbanChatMember(chatId, userId);

        await ctx.reply(
          `👢 *User Kicked*\n\n` +
          `${safeUserName} has been removed from the group.\n\n` +
          `*Reason:* ${escapeMdV2(String(violations[0].type.replace(/_/g, ' ')))}\n` +
          `*Violations:* ${punishment.violationCount}/5\n\n` +
          `They can rejoin if invited.`,
          { parse_mode: 'Markdown' }
        );
        break;

      case 'ban':
        const banDuration = punishment.duration;

        if (banDuration === 0) {
          // Permanent ban
          await ctx.telegram.banChatMember(chatId, userId);
          await ctx.reply(
            `🚫 *User Banned Permanently*\n\n` +
            `${safeUserName} has been permanently banned.\n\n` +
            `*Reason:* Multiple serious violations\n` +
            `*Total Violations:* ${punishment.violationCount}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          // Temporary ban
          const banDays = Math.floor(banDuration / (24 * 60 * 60 * 1000));
          await ctx.telegram.banChatMember(chatId, userId, {
            until_date: Math.floor((Date.now() + banDuration) / 1000)
          });

          await ctx.reply(
            `🚫 *User Banned*\n\n` +
            `${safeUserName} has been banned for ${banDays} day(s).\n\n` +
            `*Reason:* ${escapeMdV2(String(violations[0].type.replace(/_/g, ' ')))}\n` +
            `*Violations:* ${punishment.violationCount}/5`,
            { parse_mode: 'Markdown' }
          );
        }
        break;
    }

    logger.info(
      `Applied punishment ${punishment.action} to user ${userId} in chat ${chatId} ` +
      `(violation count: ${punishment.violationCount}, severity: ${punishment.severity})`
    );
  } catch (error) {
    logger.error('Error applying punishment:', error);
    // If punishment fails, at least delete the message
    try {
      await ctx.deleteMessage();
    } catch (delError) {
      logger.error('Error deleting message:', delError);
    }
  }
}

/**
 * Check if message contains any links
 */
function hasLinks(messageText, entities) {
  // Check for URL patterns in text
  const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|io|co|app|tv|me|gg|xyz|link)[^\s]*)/gi;
  if (urlPattern.test(messageText)) {
    return true;
  }

  // Check entities for URLs and text links
  if (entities && entities.length > 0) {
    for (const entity of entities) {
      if (entity.type === 'url' || entity.type === 'text_link' || entity.type === 'mention') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Ban user for sharing links and send security warning
 */
async function banForLinks(ctx) {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const userName = ctx.from.first_name || ctx.from.username || 'User';

  try {
    // Delete the message immediately
    try {
      await ctx.deleteMessage();
    } catch (error) {
      logger.error('Error deleting link message:', error);
    }

    // Ban the user permanently
    await ctx.telegram.banChatMember(chatId, userId);

    // Send security warning
    const warningMessage =
      `🚨 *SECURITY ALERT*\n\n` +
      `⛔ ${userName} has been permanently banned and removed from the group.\n\n` +
      `*Reason:* Sharing unauthorized links\n\n` +
      `⚠️ *DANGER:* Links in groups may contain:\n` +
      `• Viruses and malware\n` +
      `• Trojans and spyware\n` +
      `• Phishing attempts\n` +
      `• Scams and fraud\n` +
      `• Data theft\n\n` +
      `🛡️ *This user has been reported to Telegram for suspicious activity.*\n\n` +
      `📋 For your safety, never click on unauthorized links.\n` +
      `Use /rules to learn more about our community guidelines.`;

    await ctx.reply(warningMessage, { parse_mode: 'Markdown' });

    // Record the violation
    await moderationService.recordViolation(userId, chatId, {
      type: 'unauthorized_link',
      content: 'User shared link in group',
      severity: 'critical',
      messageText: ctx.message.text?.substring(0, 100) || 'Link in caption',
      violations: [{
        type: 'unauthorized_link',
        content: 'banned',
        severity: 'critical'
      }]
    });

    logger.warn(`User ${userId} (${userName}) banned from chat ${chatId} for sharing links`);
  } catch (error) {
    logger.error('Error banning user for links:', error);
  }
}

/**
 * Moderation middleware function
 */
async function moderationMiddleware(ctx, next) {
  try {
    // Skip if no message text
    if (!ctx.message?.text && !ctx.message?.caption) {
      return next();
    }

    // Skip if user is admin
    if (isAdmin(ctx.from.id)) {
      return next();
    }

    // Only moderate in groups/supergroups
    const chatType = ctx.chat.type;
    if (chatType !== 'group' && chatType !== 'supergroup') {
      return next();
    }

    const messageText = ctx.message.text || ctx.message.caption || '';
    const entities = ctx.message.entities || ctx.message.caption_entities || [];

    // FIRST CHECK: Any links = instant ban
    if (hasLinks(messageText, entities)) {
      await banForLinks(ctx);
      // Don't call next() - stop processing this message
      return;
    }

    // SECOND CHECK: Regular moderation (blacklist, spam, etc.)
    const check = await moderationService.checkMessage(messageText, entities);

    if (check.hasViolation) {
      // Delete the message immediately
      try {
        await ctx.deleteMessage();
      } catch (error) {
        logger.error('Error deleting violating message:', error);
      }

      // Record the violation
      await moderationService.recordViolation(ctx.from.id, ctx.chat.id, {
        type: check.violations[0].type,
        content: check.violations[0].content,
        severity: check.highestSeverity,
        messageText: messageText.substring(0, 100), // Store first 100 chars
        violations: check.violations
      });

      // Determine and apply punishment
      const punishment = await moderationService.determinePunishment(
        ctx.from.id,
        check.highestSeverity
      );

      await applyPunishment(ctx, punishment, check.violations);

      // Don't call next() - stop processing this message
      return;
    }

    // No violation, continue
    return next();
  } catch (error) {
    logger.error('Error in moderation middleware:', error);
    // Continue processing even if moderation fails
    return next();
  }
}

module.exports = moderationMiddleware;
