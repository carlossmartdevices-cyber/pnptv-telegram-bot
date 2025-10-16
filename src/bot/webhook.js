/**
 * Webhook mode configuration for production deployment
 * Use this instead of long polling for better performance
 */

require("../config/env");
const express = require("express");
const { Telegraf } = require("telegraf");
const logger = require("../utils/logger");

// Initialize bot
const bot = require("./index");

// Express app for webhook
const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Webhook endpoint for Telegram
app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Set webhook
async function setupWebhook() {
  const webhookUrl = process.env.WEBHOOK_URL || "https://yourdomain.com";
  const path = `/bot${process.env.TELEGRAM_TOKEN}`;

  try {
    await bot.telegram.setWebhook(`${webhookUrl}${path}`);
    logger.info(`Webhook set to ${webhookUrl}${path}`);
  } catch (error) {
    logger.error("Failed to set webhook:", error);
    throw error;
  }
}

// Start server
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  setupWebhook()
    .then(() => {
      app.listen(PORT, () => {
        logger.info(`Webhook server running on port ${PORT}`);
        console.log(`🚀 Server is running on port ${PORT}`);
      });
    })
    .catch((error) => {
      logger.error("Failed to start webhook server:", error);
      process.exit(1);
    });
}

module.exports = { app, setupWebhook };
