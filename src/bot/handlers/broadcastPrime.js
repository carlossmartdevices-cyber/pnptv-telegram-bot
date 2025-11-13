const logger = require("../../utils/logger");
const { db } = require("../../config/firebase");

/**
 * Send PRIME Channel Migration Broadcast
 * Sends the initial notification message with activation button
 */

async function sendPrimeChannelBroadcast(ctx) {
  try {
    const { CHANNEL_ID, WEBAPP_URL } = process.env;

    if (!CHANNEL_ID) {
      throw new Error('CHANNEL_ID not configured');
    }

    const channelId = parseInt(CHANNEL_ID);
    const webAppUrl = `${WEBAPP_URL}/prime-activation`;

    const broadcastMessage = `
🎉 **IMPORTANT: PRIME Channel Membership Activation Required**

Dear PRIME Members,

Thank you for your loyalty and valuable feedback! Your suggestions help us continuously improve the bot and enhance your experience.

**⚠️ ACTION REQUIRED - DEADLINE: NOV 15 @ 12:00 PM COLOMBIA TIME**

If you purchased your PRIME membership **before the bot implementation**, you must **activate it in our new system** to maintain access and unlock new benefits.

**Important**: This does NOT require purchasing a new membership. Simply activate your existing membership to enjoy:
✅ Unrestricted media access
✅ Premium bot features  
✅ Priority support

**Failure to activate by the deadline will result in:**
❌ Removal from PRIME channel
❌ Membership revocation

**No exceptions will be made.**

👇 **Activate Your Membership Now:**
`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🔓 Activate Membership',
            web_app: { url: webAppUrl }
          }
        ],
        [
          {
            text: '📞 Need Help?',
            callback_data: 'prime_help'
          }
        ]
      ]
    };

    // Send to PRIME channel
    await ctx.telegram.sendMessage(channelId, broadcastMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_notification: false
    });

    // Log broadcast
    await db.collection('broadcasts').add({
      type: 'prime-activation',
      channel: 'PRIME',
      channelId: channelId,
      message: broadcastMessage,
      sentAt: new Date(),
      status: 'sent',
      deadline: new Date('2025-11-15T12:00:00-05:00'), // Colombia time
      recipientCount: null // Will be populated when delivery confirmed
    });

    logger.info('PRIME channel broadcast sent successfully', {
      channelId,
      timestamp: new Date()
    });

    // Send confirmation to admin
    if (ctx) {
      await ctx.reply('✅ PRIME channel broadcast sent successfully!\n\n📊 The activation message has been posted to the PRIME channel.');
    }

    return {
      success: true,
      channelId: channelId,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('Error sending PRIME channel broadcast:', error);
    if (ctx) {
      await ctx.reply('❌ Failed to send broadcast. Error: ' + error.message);
    }
    throw error;
  }
}

/**
 * Send final deadline warning (optional - 24 hours before)
 */
async function sendDeadlineWarning(telegramApi) {
  try {
    const { CHANNEL_ID, WEBAPP_URL } = process.env;

    if (!CHANNEL_ID) {
      throw new Error('CHANNEL_ID not configured');
    }

    const channelId = parseInt(CHANNEL_ID);
    const webAppUrl = `${WEBAPP_URL}/prime-activation`;

    const warningMessage = `
⏰ **FINAL DEADLINE WARNING**

🚨 You have **24 HOURS LEFT** to activate your PRIME membership!

**Deadline**: Tomorrow @ 12:00 PM Colombia Time

If you have not yet activated your account, please do so immediately to avoid being removed from the PRIME channel and having your membership revoked.

[🔓 ACTIVATE NOW](${webAppUrl})

After the deadline, we will:
1. Remove all non-activated members from the PRIME channel
2. Revoke their memberships
3. No exceptions or extensions will be granted

Act now! ⏱️
`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🔓 Activate Now - Final Chance!',
            web_app: { url: webAppUrl }
          }
        ]
      ]
    };

    await telegramApi.sendMessage(channelId, warningMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_notification: false
    });

    logger.info('PRIME deadline warning sent', {
      channelId,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error sending deadline warning:', error);
  }
}

/**
 * Post-deadline actions - remove non-activated members
 */
async function enforceMigrationDeadline(telegramApi) {
  try {
    const { CHANNEL_ID } = process.env;

    if (!CHANNEL_ID) {
      throw new Error('CHANNEL_ID not configured');
    }

    const channelId = parseInt(CHANNEL_ID);

    // Get all users NOT activated
    const nonActivatedSnapshot = await db.collection('users')
      .where('primeActivationMigration', '!=', true)
      .get();

    const usersToRemove = nonActivatedSnapshot.docs.map(doc => doc.id);

    if (usersToRemove.length === 0) {
      logger.info('No non-activated users to remove');
      return {
        success: true,
        removedCount: 0
      };
    }

    // Remove each user from PRIME channel
    let removedCount = 0;
    for (const userId of usersToRemove) {
      try {
        await telegramApi.restrictChatMember(channelId, userId, {
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
            can_change_info: false,
            can_invite_users: false,
            can_pin_messages: false
          }
        });

        // Send farewell message
        try {
          await telegramApi.sendMessage(userId, `
❌ **PRIME Membership Revoked**

Your membership has been revoked because you did not activate it by the November 15 deadline.

If you believe this is an error, please contact support using /support command.
`, { parse_mode: 'Markdown' });
        } catch (msgError) {
          logger.warn('Could not send farewell message to user', { userId });
        }

        removedCount++;
      } catch (removeError) {
        logger.warn('Failed to remove user from PRIME channel', {
          userId,
          error: removeError.message
        });
      }
    }

    logger.info('PRIME channel deadline enforcement completed', {
      totalNonActivated: usersToRemove.length,
      successfullyRemoved: removedCount,
      timestamp: new Date()
    });

    return {
      success: true,
      removedCount: removedCount,
      totalChecked: usersToRemove.length
    };
  } catch (error) {
    logger.error('Error enforcing migration deadline:', error);
    throw error;
  }
}

module.exports = {
  sendPrimeChannelBroadcast,
  sendDeadlineWarning,
  enforceMigrationDeadline
};
