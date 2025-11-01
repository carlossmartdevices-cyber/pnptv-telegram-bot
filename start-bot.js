/**
 * PNPtv Bot Launcher
 * Main entry point for the Telegram bot application
 */

// Initialize Sentry first (before any other imports)
require('./instrument.js');

const logger = require('./src/utils/logger');

// Import the bot instance
const bot = require('./src/bot/index');

// Import scheduler
const { initializeScheduler } = require('./src/services/scheduler');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  logger.info('Received SIGINT, stopping bot...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  logger.info('Received SIGTERM, stopping bot...');
  bot.stop('SIGTERM');
  process.exit(0);
});

// Start the bot
async function startBot() {
  try {
    logger.info('🚀 Starting PNPtv Bot...');
    
    // Initialize scheduled tasks (scheduler runs independently)
    initializeScheduler(bot);
    
    // Launch bot in polling mode
    await bot.launch();
    
    logger.info('✅ Bot started successfully!');
    logger.info(`Bot username: @${bot.botInfo.username}`);
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Start the application
startBot();