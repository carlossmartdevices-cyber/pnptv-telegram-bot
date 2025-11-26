const { Telegraf } = require('telegraf');
require('./src/config/env');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

/**
 * Clean up old command messages from group chats
 * This script will delete command messages that are still visible
 */
async function cleanupOldCommandMessages() {
  console.log('🧹 Starting cleanup of old command messages...');
  
  try {
    // Get bot info to identify our messages
    const botInfo = await bot.telegram.getMe();
    console.log(`Bot username: @${botInfo.username}`);
    
    // Note: Telegram API doesn't allow getting chat history directly
    // We can only delete messages we have message_id for
    // This script demonstrates the cleanup approach
    
    console.log('⚠️  Manual Cleanup Required');
    console.log('');
    console.log('Unfortunately, Telegram Bot API limitations prevent automatic cleanup of old messages.');
    console.log('');
    console.log('📋 Manual cleanup options:');
    console.log('');
    console.log('1. 👨‍💼 Admin Action:');
    console.log('   - Group admins can manually delete old command messages');
    console.log('   - Select messages and use "Delete" option');
    console.log('');
    console.log('2. 🔄 Bot Restart Effect:');
    console.log('   - New automation will handle all future messages');
    console.log('   - Old messages will naturally scroll up over time');
    console.log('');
    console.log('3. 📱 Group Settings:');
    console.log('   - Enable "Delete messages" for group admins');
    console.log('   - Set auto-delete timer for all messages (if available)');
    console.log('');
    console.log('✅ Current Status:');
    console.log('   - ✅ New command messages: Auto-deleted after 10 seconds');
    console.log('   - ✅ Bot responses: Auto-deleted after 5 minutes (groups)');
    console.log('   - ✅ Private redirection: Working for personal commands');
    console.log('   - ✅ Group commands: Stay in group as intended');
    console.log('');
    console.log('🎯 Recommendation:');
    console.log('   Let the new automation handle future messages and old ones will');
    console.log('   naturally become less visible as new activity occurs.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Alternative: Create a one-time admin command to help with cleanup
function createCleanupCommand() {
  console.log('');
  console.log('🔧 Alternative: Admin Cleanup Command');
  console.log('');
  console.log('You could add this to your bot for admins to trigger cleanup:');
  console.log('');
  console.log('```javascript');
  console.log('bot.command("cleanup", async (ctx) => {');
  console.log('  const { isAdmin } = require("../config/admin");');
  console.log('  if (!isAdmin(ctx.from.id)) return;');
  console.log('  ');
  console.log('  await ctx.reply(');
  console.log('    "🧹 *Cleanup Notice*\\n\\n" +');
  console.log('    "The bot now automatically manages message cleanup:\\n\\n" +');
  console.log('    "✅ User commands: Deleted after 10 seconds\\n" +');
  console.log('    "✅ Bot responses: Deleted after 5 minutes\\n" +');
  console.log('    "✅ Private commands: Redirected to private chat\\n\\n" +');
  console.log('    "Old messages will scroll up naturally. For immediate cleanup, " +');
  console.log('    "admins can manually delete old command messages.",');
  console.log('    { parse_mode: "Markdown" }');
  console.log('  );');
  console.log('});');
  console.log('```');
}

if (require.main === module) {
  cleanupOldCommandMessages()
    .then(() => {
      createCleanupCommand();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupOldCommandMessages };