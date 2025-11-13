/**
 * Express Server with Telegram Webhook Support
 * Handles both Telegram webhooks and payment API routes
 */

require('./config/env');
const express = require('express');
const logger = require('./utils/logger');
const bot = require('./bot/index');
const daimoRoutes = require('./api/daimo-routes');
const apiRoutes = require('./bot/api/routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const BOT_URL = process.env.BOT_URL; // Should be https://yourdomain.com

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount API routes
app.use(daimoRoutes);
app.use('/api', apiRoutes);

// Telegram Webhook endpoint
// Path: /webhook/telegram
// This is where Telegram will send updates
const WEBHOOK_PATH = '/webhook/telegram';

app.use(bot.webhookCallback(WEBHOOK_PATH));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

/**
 * Start server and set up webhook
 */
async function startServer() {
  try {
    // Validate environment
    if (!BOT_URL) {
      throw new Error('BOT_URL environment variable is required for webhook mode');
    }

    if (!BOT_URL.startsWith('https://')) {
      throw new Error('BOT_URL must use HTTPS (Telegram requirement)');
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server started on port ${PORT}`);
      logger.info(`Webhook URL: ${BOT_URL}${WEBHOOK_PATH}`);
    });

    // Set up Telegram webhook
    const webhookUrl = `${BOT_URL}${WEBHOOK_PATH}`;
    await bot.telegram.setWebhook(webhookUrl, {
      drop_pending_updates: false, // Keep pending updates
      allowed_updates: [
        'message',
        'callback_query',
        'inline_query',
        'chosen_inline_result',
        'channel_post',
        'edited_message'
      ]
    });

    logger.info('✅ Telegram webhook configured successfully');
    logger.info(`Webhook active at: ${webhookUrl}`);

    // Verify webhook info
    const webhookInfo = await bot.telegram.getWebhookInfo();
    logger.info('Webhook info:', {
      url: webhookInfo.url,
      has_custom_certificate: webhookInfo.has_custom_certificate,
      pending_update_count: webhookInfo.pending_update_count,
      max_connections: webhookInfo.max_connections,
      allowed_updates: webhookInfo.allowed_updates
    });

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      // Close Express server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Remove webhook and stop bot
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: false });
        logger.info('Webhook removed');
      } catch (err) {
        logger.error('Error removing webhook:', err);
      }

      bot.stop(signal);
      process.exit(0);
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    throw error;
  }
}

// Export for use in start-bot.js
module.exports = { app, startServer };
