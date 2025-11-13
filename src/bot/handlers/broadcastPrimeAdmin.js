const { isAdmin } = require("../../config/admin");
const logger = require("../../utils/logger");
const { sendPrimeChannelBroadcast } = require("./broadcastPrime");
const { t } = require("../../utils/i18n");

/**
 * Admin command to send PRIME channel activation broadcast
 * Usage: /broadcastprime
 */
async function handleBroadcastPrime(ctx) {
  try {
    // Check admin permissions
    if (!isAdmin(ctx.from.id)) {
      return await ctx.reply(t(ctx, 'errors.unauthorized'));
    }

    // Confirmation inline keyboard
    const confirmKeyboard = {
      inline_keyboard: [
        [
          {
            text: '✅ Send Broadcast',
            callback_data: 'confirm_prime_broadcast'
          },
          {
            text: '❌ Cancel',
            callback_data: 'cancel_prime_broadcast'
          }
        ]
      ]
    };

    await ctx.reply(
      `🎉 **PRIME Channel Activation Broadcast**

This will send the migration notification to ALL PRIME channel members.

**Broadcast Details:**
• Channel: PRIME (#${process.env.CHANNEL_ID})
• Deadline: Nov 15 @ 12:00 PM Colombia Time
• Content: Membership activation instructions

**Are you sure you want to proceed?**`,
      {
        parse_mode: 'Markdown',
        reply_markup: confirmKeyboard
      }
    );

    logger.info('Admin initiated PRIME broadcast setup', {
      adminId: ctx.from.id,
      username: ctx.from.username
    });
  } catch (error) {
    logger.error('Error in handleBroadcastPrime:', error);
    await ctx.reply('❌ Error: ' + error.message);
  }
}

/**
 * Handle broadcast confirmation callback
 */
async function handleBroadcastConfirmation(ctx) {
  try {
    const actionType = ctx.callbackQuery.data;

    if (actionType === 'confirm_prime_broadcast') {
      // Show loading state
      await ctx.editMessageText('⏳ Sending broadcast...', {
        parse_mode: 'Markdown'
      });

      // Send broadcast
      const result = await sendPrimeChannelBroadcast(ctx);

      // Update admin with success
      await ctx.editMessageText(
        `✅ **Broadcast Sent Successfully!**

📊 **Delivery Report:**
• Channel: PRIME
• Time: ${result.timestamp.toLocaleString()}
• Status: Sent
• Members: Will receive activation notification
• Deadline: November 15, 2025 @ 12:00 PM Colombia Time

The PRIME channel members will now see the activation message with a link to the web interface.`,
        {
          parse_mode: 'Markdown'
        }
      );

      logger.info('PRIME broadcast successfully sent', {
        adminId: ctx.from.id,
        result
      });
    } else if (actionType === 'cancel_prime_broadcast') {
      await ctx.editMessageText(
        '❌ **Broadcast Cancelled**\n\nNo messages were sent.',
        { parse_mode: 'Markdown' }
      );

      logger.info('Admin cancelled PRIME broadcast', {
        adminId: ctx.from.id
      });
    }

    // Answer callback query
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error in handleBroadcastConfirmation:', error);
    await ctx.answerCbQuery('❌ Error: ' + error.message, { show_alert: true });
  }
}

module.exports = {
  handleBroadcastPrime,
  handleBroadcastConfirmation
};
