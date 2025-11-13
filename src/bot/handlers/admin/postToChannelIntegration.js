/**
 * Post-to-Channel System Integration
 * Registers all callback handlers and routes
 */

const logger = require('../../../utils/logger');
const {
  showPostToChannelMenu,
  startBroadcastWizard,
  selectTopPosts,
  togglePostSelection,
  confirmPostsAndSelectChannels,
  toggleChannelSelection,
  showSchedulingOptions,
  executeBroadcastNow,
  cancelBroadcastWizard,
  viewScheduledBroadcasts
} = require('./postToChannelAdmin');

/**
 * Register all post-to-channel callback handlers
 */
function registerPostToChannelHandlers(bot) {
  // Main menu
  bot.action('ptc_menu', async (ctx) => {
    try {
      await showPostToChannelMenu(ctx);
    } catch (error) {
      logger.error('Error in ptc_menu handler:', error);
    }
  });

  // Create broadcast
  bot.action('ptc_create_broadcast', async (ctx) => {
    try {
      await startBroadcastWizard(ctx);
    } catch (error) {
      logger.error('Error in ptc_create_broadcast handler:', error);
    }
  });

  // Post selection - Top posts
  bot.action('ptc_posts_popular', async (ctx) => {
    try {
      await selectTopPosts(ctx);
    } catch (error) {
      logger.error('Error in ptc_posts_popular handler:', error);
    }
  });

  // Post selection - Toggle posts
  bot.action(/^ptc_toggle_post_(\d+)$/, async (ctx) => {
    try {
      const postIndex = parseInt(ctx.match[1]);
      await togglePostSelection(ctx, postIndex);
    } catch (error) {
      logger.error('Error in ptc_toggle_post handler:', error);
    }
  });

  // Confirm posts
  bot.action('ptc_confirm_posts', async (ctx) => {
    try {
      await confirmPostsAndSelectChannels(ctx);
    } catch (error) {
      logger.error('Error in ptc_confirm_posts handler:', error);
    }
  });

  // Channel selection - Main channel
  bot.action('ptc_channel_main', async (ctx) => {
    try {
      await toggleChannelSelection(ctx, 'main');
    } catch (error) {
      logger.error('Error in ptc_channel_main handler:', error);
    }
  });

  // Channel selection - Premium channel
  bot.action('ptc_channel_premium', async (ctx) => {
    try {
      await toggleChannelSelection(ctx, 'premium');
    } catch (error) {
      logger.error('Error in ptc_channel_premium handler:', error);
    }
  });

  // Channel selection - Announcements channel
  bot.action('ptc_channel_announce', async (ctx) => {
    try {
      await toggleChannelSelection(ctx, 'announce');
    } catch (error) {
      logger.error('Error in ptc_channel_announce handler:', error);
    }
  });

  // Confirm channels
  bot.action('ptc_confirm_channels', async (ctx) => {
    try {
      await showSchedulingOptions(ctx);
    } catch (error) {
      logger.error('Error in ptc_confirm_channels handler:', error);
    }
  });

  // Scheduling options - Now
  bot.action('ptc_schedule_now', async (ctx) => {
    try {
      await executeBroadcastNow(ctx);
    } catch (error) {
      logger.error('Error in ptc_schedule_now handler:', error);
    }
  });

  // Cancel broadcast
  bot.action('ptc_cancel', async (ctx) => {
    try {
      await cancelBroadcastWizard(ctx);
    } catch (error) {
      logger.error('Error in ptc_cancel handler:', error);
    }
  });

  // View scheduled broadcasts
  bot.action('ptc_view_scheduled', async (ctx) => {
    try {
      await viewScheduledBroadcasts(ctx);
    } catch (error) {
      logger.error('Error in ptc_view_scheduled handler:', error);
    }
  });

  logger.info('Post-to-Channel handlers registered successfully');
}

module.exports = {
  registerPostToChannelHandlers
};
