/**
 * Admin Cleanup Command - Add this to your bot for manual cleanup assistance
 * This helps admins understand the current cleanup status and what to do about old messages
 */

const { isAdmin } = require("../config/admin");

async function handleCleanupCommand(ctx) {
  try {
    const userId = ctx.from.id.toString();
    
    // Check if user is admin
    if (!isAdmin(userId)) {
      await ctx.reply(
        `🔒 *Permission Denied*\n\n` +
        `Only administrators can use cleanup commands.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Allow group response for admin commands
    if (ctx.allowGroupResponse) {
      ctx.allowGroupResponse();
    }

    await ctx.reply(
      `🧹 *Message Cleanup Status*\n\n` +
      `*Current Automation:* ✅ Active\n\n` +
      `*What's Working:*\n` +
      `✅ User commands: Auto-deleted after 10 seconds\n` +
      `✅ Bot responses: Auto-deleted after 5 minutes\n` +
      `✅ Private commands: Redirected to private chat\n` +
      `✅ Group commands: Stay in group as needed\n\n` +
      `*Old Messages:*\n` +
      `⚠️ Messages sent before bot restart remain visible\n` +
      `📱 Admins can manually delete them if needed\n` +
      `⏳ They will naturally scroll up as new activity occurs\n\n` +
      `*For Immediate Cleanup:*\n` +
      `1. Select old command messages individually\n` +
      `2. Use Telegram's "Delete" option\n` +
      `3. Or wait for natural scroll-up\n\n` +
      `*Future Messages:* All automatically managed! 🎉`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📋 View Command List',
                callback_data: 'cleanup_commands'
              }
            ],
            [
              {
                text: '🔧 Cleanup Guide',
                callback_data: 'cleanup_guide'
              }
            ]
          ]
        }
      }
    );

  } catch (error) {
    console.error('Error in handleCleanupCommand:', error);
    await ctx.reply('❌ Error processing cleanup command.');
  }
}

// Callback handlers for the cleanup command
async function handleCleanupCallbacks(ctx) {
  const action = ctx.callbackQuery.data;
  
  if (action === 'cleanup_commands') {
    await ctx.editMessageText(
      `📋 *Command Categories*\n\n` +
      `*✅ GROUP COMMANDS (Stay in group):*\n` +
      `/library, /toptracks, /addtrack, /deletetrack\n` +
      `/schedulecall, /schedulestream, /upcoming\n` +
      `/status, /refresh, /info\n\n` +
      `*❌ PRIVATE COMMANDS (Redirect to DM):*\n` +
      `/start, /help, /profile, /subscribe\n` +
      `/nearby, /map, /admin, /plans\n` +
      `/aichat, /endchat, /playlist\n\n` +
      `*Auto-Delete Timing:*\n` +
      `• User commands: 10 seconds\n` +
      `• Bot responses: 5 minutes\n` +
      `• Private redirects: Instant`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '← Back', callback_data: 'cleanup_back' }
          ]]
        }
      }
    );
  }
  
  if (action === 'cleanup_guide') {
    await ctx.editMessageText(
      `🔧 *Manual Cleanup Guide*\n\n` +
      `*For Group Admins:*\n\n` +
      `1. **Select Messages**\n` +
      `   • Long-press on old command messages\n` +
      `   • Select multiple messages at once\n\n` +
      `2. **Delete Selected**\n` +
      `   • Tap trash/delete icon\n` +
      `   • Choose "Delete for everyone"\n\n` +
      `3. **Alternative: Wait**\n` +
      `   • New activity will push old messages up\n` +
      `   • Cleanup happens naturally over time\n\n` +
      `*Note:* Only messages visible in current chat history\n` +
      `can be manually deleted. Very old messages may have\n` +
      `already scrolled out of reach.`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '← Back', callback_data: 'cleanup_back' }
          ]]
        }
      }
    );
  }
  
  if (action === 'cleanup_back') {
    // Re-show the main cleanup message
    await handleCleanupCommand(ctx);
  }
}

module.exports = {
  handleCleanupCommand,
  handleCleanupCallbacks
};