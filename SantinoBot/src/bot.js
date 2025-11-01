require('dotenv').config();
const { Telegraf } = require('telegraf');
const logger = require('./utils/logger');
const { 
  handleNewMember, 
  handleLeftMember, 
  handleMediaMessage, 
  handleTextMessage, 
  handleAdminCommand 
} = require('./handlers/groupHandlers');
const { startPermissionSync, startCleanupTasks } = require('./services/syncService');
const userDataService = require('./services/userDataService');
const userDataSync = require('./utils/userDataSync');
const {
  cmdUserProfile,
  cmdNearby,
  cmdSubscription,
  cmdTrackSearch,
  cmdUpdateProfile,
  cmdDataInfo
} = require('./handlers/dataCommands');
const {
  cmdConfigWelcome,
  cmdScheduleVideoCall,
  cmdScheduleLiveStream,
  cmdBroadcast,
  cmdListScheduled
} = require('./handlers/adminCommands');
const { handlePersonalityChoice } = require('./handlers/personalityHandler');

// Validate environment variables
const requiredEnvVars = ['BOT_TOKEN', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Group ID validation (optional - can work in any group)
const allowedGroupId = process.env.GROUP_ID;

// Middleware to ensure bot only works in specified group (if configured)
bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id?.toString();
  
  // Skip private chats and allow all groups if no specific group configured
  if (ctx.chat?.type === 'private' || !allowedGroupId) {
    return next();
  }
  
  // Check if message is from allowed group
  if (chatId !== allowedGroupId) {
    logger.warn(`Bot used in unauthorized group: ${chatId}`);
    return; // Ignore messages from other groups
  }
  
  return next();
});

// Error handling middleware
bot.catch((err, ctx) => {
  logger.error('Bot error occurred:', {
    error: err.message,
    stack: err.stack,
    update: ctx.update
  });
});

// ===== EVENT HANDLERS =====

// Handle new members
bot.on('new_chat_members', handleNewMember);

// Handle members leaving
bot.on('left_chat_member', handleLeftMember);

// Handle media messages (photos, videos, documents, etc.)
bot.on(['photo', 'video', 'document', 'audio', 'voice', 'video_note', 'sticker', 'animation'], handleMediaMessage);

// Handle text messages
bot.on('text', (ctx) => {
  const text = ctx.message.text;
  
  // Check for admin commands
  if (text.startsWith('/')) {
    return handleAdminCommand(ctx);
  }
  
  // Regular text message
  return handleTextMessage(ctx);
});

// Handle polls (restrict for free users)
bot.on('poll', handleMediaMessage);

// ===== BOT COMMANDS =====

// Status command
bot.command('status', handleAdminCommand);

// Refresh permissions command
bot.command('refresh', handleAdminCommand);

// Info command
bot.command('info', async (ctx) => {
  try {
    await ctx.reply(
      `🤖 **Santino Group Bot**\n\n` +
      `This bot manages group permissions based on PNPtv subscription tiers.\n\n` +
      `**Free Users:** Text messages only\n` +
      `**Premium Users:** All media types allowed\n\n` +
      `Type /status to check your current permissions.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error in info command:', error);
  }
});

// Data service commands
bot.command('userprofile', cmdUserProfile);
bot.command('nearby', cmdNearby);
bot.command('subscription', cmdSubscription);
bot.command('tracksearch', cmdTrackSearch);
bot.command('updateprofile', cmdUpdateProfile);
bot.command('datainfo', cmdDataInfo);

// Admin/Community Management Commands
bot.command('configwelcome', cmdConfigWelcome);
bot.command('schedulevideocall', cmdScheduleVideoCall);
bot.command('schedulelivestream', cmdScheduleLiveStream);
bot.command('broadcast', cmdBroadcast);
bot.command('listscheduled', cmdListScheduled);

// Callback query handler for inline buttons (personality choices, etc)
bot.on('callback_query', async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    
    if (data.startsWith('personality_')) {
      await handlePersonalityChoice(ctx);
    } else {
      await ctx.answerCbQuery('Unknown action');
    }
  } catch (error) {
    logger.error('Error handling callback query:', error);
    await ctx.answerCbQuery('Error processing action', { show_alert: true });
  }
});

// Start bot
async function startBot() {
  try {
    // Start background services
    startPermissionSync(bot);
    startCleanupTasks();
    
    // Start bot
    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      // Use webhooks in production
      const port = process.env.PORT || 3000;
      await bot.launch({
        webhook: {
          domain: process.env.WEBHOOK_URL,
          port: port
        }
      });
      logger.info(`Bot started with webhook on port ${port}`);
    } else {
      // Use long polling in development
      await bot.launch();
      logger.info('Bot started with long polling');
    }

    logger.info(`🤖 Santino Group Bot is running!`);
    logger.info(`📊 Monitoring group: ${allowedGroupId || 'All groups'}`);
    
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  bot.stop('SIGTERM');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Cleanup on shutdown
process.on('exit', () => {
  userDataSync.stopAllListeners();
  logger.info('Bot shutdown - cleaned up all listeners');
});

// Start the bot
startBot();