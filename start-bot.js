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

// Import PRIME deadline scheduler
const { initializePrimeScheduler } = require('./src/services/primeDeadlineScheduler');

// Import message auto-delete cleanup
const { clearAllTimers } = require('./src/utils/messageAutoDelete');

// Import event reminder service
const { startReminderCron } = require('./src/services/eventReminderService');

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
  clearAllTimers(); // Clean up message deletion timers
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  logger.info('Received SIGTERM, stopping bot...');
  clearAllTimers(); // Clean up message deletion timers
  bot.stop('SIGTERM');
  process.exit(0);
});

// Start the bot
async function startBot() {
  try {
    logger.info('🚀 Starting PNPtv Bot...');
    
    // Initialize scheduled tasks (scheduler runs independently)
    initializeScheduler(bot);
    
    // Initialize PRIME membership deadline scheduler
    initializePrimeScheduler(bot);
    
    // Start event reminder cron job
    startReminderCron(bot);
    
    // Launch bot in polling mode
    await bot.launch();
    
    logger.info('✅ Bot started successfully!');
    
    // Get bot info after launching
    try {
      const botInfo = await bot.telegram.getMe();
      logger.info(`Bot username: @${botInfo.username}`);
    } catch (botInfoError) {
      logger.warn('Could not retrieve bot info:', botInfoError.message);
    }
  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Start the application
startBot();