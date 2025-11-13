const cron = require('node-cron');
const logger = require('../utils/logger');
const { enforceMigrationDeadline, sendDeadlineWarning } = require('../bot/handlers/broadcastPrime');

/**
 * PRIME Migration Deadline Scheduler
 * Handles scheduled tasks for migration deadline
 */

let scheduledJobs = [];

/**
 * Initialize PRIME deadline scheduler
 */
function initializePrimeScheduler(bot) {
  try {
    logger.info('Initializing PRIME migration deadline scheduler');

    // Schedule 24-hour warning: Nov 14 @ 12:00 PM Colombia Time (UTC-5)
    // Cron: 0 12 14 11 * (noon on Nov 14)
    const warningJob = cron.schedule('0 12 14 11 *', async () => {
      try {
        logger.info('Running scheduled PRIME deadline warning');
        await sendDeadlineWarning(bot.telegram);
      } catch (error) {
        logger.error('Error in deadline warning job:', error);
      }
    });
    scheduledJobs.push({ name: 'primeDeadlineWarning', job: warningJob });

    // Enforce deadline: Nov 15 @ 12:00 PM Colombia Time (UTC-5)
    // Cron: 0 12 15 11 * (noon on Nov 15)
    const enforcementJob = cron.schedule('0 12 15 11 *', async () => {
      try {
        logger.info('Running scheduled PRIME deadline enforcement');
        const result = await enforceMigrationDeadline(bot.telegram);
        logger.info('PRIME deadline enforcement completed', result);
      } catch (error) {
        logger.error('Error in deadline enforcement job:', error);
      }
    });
    scheduledJobs.push({ name: 'primeDeadlineEnforcement', job: enforcementJob });

    logger.info('PRIME deadline scheduler initialized with 2 scheduled tasks');
  } catch (error) {
    logger.error('Error initializing PRIME scheduler:', error);
  }
}

/**
 * Stop all scheduled jobs
 */
function stopPrimeScheduler() {
  scheduledJobs.forEach(({ name, job }) => {
    job.stop();
    job.destroy();
    logger.info(`Stopped scheduled job: ${name}`);
  });
  scheduledJobs = [];
}

/**
 * Manually trigger deadline warning (for testing)
 */
async function manuallyTriggerWarning(bot) {
  try {
    logger.info('Manually triggering PRIME deadline warning');
    await sendDeadlineWarning(bot.telegram);
    return { success: true };
  } catch (error) {
    logger.error('Error manually triggering warning:', error);
    throw error;
  }
}

/**
 * Manually trigger deadline enforcement (for testing)
 */
async function manuallyTriggerEnforcement(bot) {
  try {
    logger.info('Manually triggering PRIME deadline enforcement');
    const result = await enforceMigrationDeadline(bot.telegram);
    return result;
  } catch (error) {
    logger.error('Error manually triggering enforcement:', error);
    throw error;
  }
}

module.exports = {
  initializePrimeScheduler,
  stopPrimeScheduler,
  manuallyTriggerWarning,
  manuallyTriggerEnforcement
};
