/**
 * Webhook mode configuration for production deployment
 * Optimized for Railway deployment with health checks and graceful shutdown
 */

require("../config/env");
const express = require("express");
const { Telegraf } = require("telegraf");
const logger = require("../utils/logger");
const daimo = require("../config/daimo");
const { db } = require("../config/firebase");

// Initialize bot
const bot = require("./index");

// Express app for webhook
const app = express();

// Trust Railway proxy
app.set("trust proxy", 1);

// JSON body parser with size limits
app.use(express.json({ limit: "10mb" }));

// Request logging middleware (production optimized)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/health") {
      logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "PNPtv Telegram Bot",
    status: "running",
    version: process.env.npm_package_version || "2.0.0",
    environment: process.env.NODE_ENV || "production",
  });
});

// Enhanced health check endpoint for Railway
app.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || "production",
  };
  res.json(health);
});

// Readiness check (checks if bot is connected)
app.get("/ready", async (req, res) => {
  try {
    const botInfo = await bot.telegram.getMe();
    res.json({
      ready: true,
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
      },
    });
  } catch (error) {
    logger.error("Readiness check failed:", error);
    res.status(503).json({
      ready: false,
      error: error.message,
    });
  }
});

// API routes for payment page
const apiRoutes = require('./api/routes');
app.use('/api', apiRoutes);

// Webhook endpoint for Telegram
app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Daimo Pay webhook endpoint (official webhook from Daimo dashboard)
app.post("/daimo/webhook", async (req, res) => {
  try {
    logger.info("Received Daimo Pay webhook", {
      event: req.body.type,
      reference: req.body.reference,
    });

    // Verify webhook authentication
    const authHeader = req.headers.authorization;
    const expectedAuth = `Basic ${process.env.DAIMO_WEBHOOK_TOKEN}`;

    if (!process.env.DAIMO_WEBHOOK_TOKEN) {
      logger.warn('DAIMO_WEBHOOK_TOKEN not configured - skipping authentication check');
    } else if (authHeader !== expectedAuth) {
      logger.warn('Invalid Daimo webhook authentication', {
        received: authHeader ? 'present' : 'missing',
      });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = req.body;

    // Handle payment_completed event
    if (event.type === 'payment_completed') {
      const { reference, metadata, amount } = event;
      const userId = metadata?.userId;
      const planId = metadata?.plan;

      logger.info('Daimo payment completed', {
        userId,
        planId,
        amount,
        reference,
      });

      if (userId && planId) {
        try {
          // Update payment intent in database
          await db.collection('payment_intents').doc(reference).update({
            status: 'completed_webhook',
            webhookReceivedAt: Date.now(),
          });

          // Get plan details
          const planService = require('../../services/planService');
          const plan = await planService.getPlanById(planId);

          if (!plan) {
            logger.error('Plan not found for payment', { planId, userId });
            return res.status(404).json({ error: 'Plan not found' });
          }

          // Activate subscription
          const userRef = db.collection('users').doc(userId);
          const userDoc = await userRef.get();

          if (!userDoc.exists) {
            logger.error('User not found for payment', { userId, planId });
            return res.status(404).json({ error: 'User not found' });
          }

          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + (plan.duration || plan.durationDays || 30));

          await userRef.update({
            tier: plan.tier,
            membership: {
              planId: plan.id,
              planName: plan.displayName || plan.name,
              tier: plan.tier,
              activatedAt: Date.now(),
              expiresAt: expiresAt.getTime(),
              paymentMethod: 'daimo',
              paymentReference: reference,
            },
            updatedAt: Date.now(),
          });

          logger.info('Subscription activated via Daimo webhook', {
            userId,
            planId,
            tier: plan.tier,
            expiresAt: expiresAt.toISOString(),
          });

          // Notify user in Telegram
          try {
            await bot.telegram.sendMessage(
              userId,
              `✅ Payment confirmed!\n\n` +
              `Your ${plan.displayName || plan.name} subscription is now active.\n` +
              `Duration: ${plan.duration || plan.durationDays} days\n` +
              `Expires: ${expiresAt.toLocaleDateString()}\n\n` +
              `Enjoy your premium features! 💎`
            );
          } catch (notifyError) {
            logger.warn('Failed to notify user', { userId, error: notifyError.message });
          }
        } catch (activationError) {
          logger.error('Error activating subscription', activationError);
          return res.status(500).json({ error: 'Failed to activate subscription' });
        }
      }
    }

    // Handle other event types
    else if (event.type === 'payment_started') {
      logger.info('Payment started webhook received', event);
    } else if (event.type === 'payment_bounced') {
      logger.warn('Payment bounced', event);
    } else if (event.type === 'payment_refunded') {
      logger.info('Payment refunded', event);
    }

    // Process the webhook
    const webhookData = req.body;
    const processedData = await daimo.processWebhook(webhookData);

    if (!processedData.success) {
      logger.error("Daimo webhook processing failed:", processedData);
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    const { reference, status, userId, plan, amount } = processedData;

    // Handle successful payment
    if (status === "completed") {
      logger.info("Daimo payment completed:", {
        reference,
        userId,
        plan,
        amount,
      });

      // Update user subscription in Firestore
      try {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          logger.error("User not found for Daimo payment:", userId);
          return res.status(404).json({ error: "User not found" });
        }

        const planRef = db.collection("plans").doc(plan);
        const planDoc = await planRef.get();

        if (!planDoc.exists) {
          logger.error("Plan not found for Daimo payment:", plan);
          return res.status(404).json({ error: "Plan not found" });
        }

        const planData = planDoc.data();
        const expiresAt = new Date(
          Date.now() + planData.durationDays * 24 * 60 * 60 * 1000
        );

        // Update user membership
        await userRef.update({
          tier: planData.tier,
          membership: {
            plan: plan,
            startedAt: new Date(),
            expiresAt: expiresAt,
            autoRenew: false,
            paymentMethod: "daimo",
            paymentReference: reference,
            amount: amount,
            currency: "USDC",
          },
          updatedAt: Date.now(),
        });

        logger.info("User subscription activated via Daimo Pay:", {
          userId,
          plan: planData.name,
          tier: planData.tier,
          expiresAt,
        });

        // Send confirmation message to user via bot
        try {
          await bot.telegram.sendMessage(
            userId,
            `✅ Payment confirmed!\n\nYour ${planData.displayName || planData.name} subscription has been activated.\n\nExpires: ${expiresAt.toLocaleDateString()}\n\nThank you for using Daimo Pay! 💰`,
            { parse_mode: "Markdown" }
          );
        } catch (msgError) {
          logger.warn("Failed to send confirmation message:", msgError);
        }

        return res.json({ success: true, message: "Payment processed" });
      } catch (dbError) {
        logger.error("Database error processing Daimo payment:", dbError);
        return res.status(500).json({ error: "Database error" });
      }
    }

    // Handle failed payment
    if (status === "failed") {
      logger.warn("Daimo payment failed:", {
        reference,
        userId,
        plan,
      });

      try {
        await bot.telegram.sendMessage(
          userId,
          `⚠️ Payment failed\n\nYour payment via Daimo Pay could not be completed. Please try again or contact support.\n\nReference: ${reference}`,
          { parse_mode: "Markdown" }
        );
      } catch (msgError) {
        logger.warn("Failed to send failure message:", msgError);
      }

      return res.json({ success: true, message: "Payment failed notification sent" });
    }

    // Handle other statuses (pending, expired, etc.)
    logger.info("Daimo payment status update:", {
      reference,
      status,
      userId,
    });

    return res.json({ success: true, message: "Webhook received" });
  } catch (error) {
    logger.error("Error processing Daimo webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Daimo payment success redirect
app.get("/payment/success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 400px;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 30px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.3s;
        }
        .button:hover {
          background: #764ba2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Payment Successful!</h1>
        <p>Your subscription has been activated. You'll receive a confirmation in the bot shortly.</p>
        <p>Thank you for using Daimo Pay!</p>
        <a href="https://t.me/${bot.botInfo?.username || 'PNPtvbot'}" class="button">Return to Bot</a>
      </div>
    </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error("Express error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Set webhook with Railway URL detection
async function setupWebhook() {
  // Railway provides RAILWAY_PUBLIC_DOMAIN or construct from service
  const webhookUrl =
    process.env.WEBHOOK_URL ||
    process.env.BOT_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://yourdomain.com");

  const path = `/bot${process.env.TELEGRAM_TOKEN}`;

  try {
    await bot.telegram.setWebhook(`${webhookUrl}${path}`);
    logger.info(`Webhook configured: ${webhookUrl}${path}`);
    console.log(`✅ Webhook set to: ${webhookUrl}${path}`);
  } catch (error) {
    logger.error("Failed to set webhook:", error);
    throw error;
  }
}

// Graceful shutdown handler
function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    console.log(`\n${signal} received, shutting down gracefully...`);

    // Stop accepting new requests
    server.close(() => {
      logger.info("HTTP server closed");
      console.log("HTTP server closed");
    });

    // Stop the bot
    try {
      await bot.stop(signal);
      logger.info("Bot stopped");
      console.log("Bot stopped");
    } catch (error) {
      logger.error("Error stopping bot:", error);
    }

    // Give active requests time to finish
    setTimeout(() => {
      logger.info("Forcing shutdown");
      process.exit(0);
    }, 10000); // 10 second grace period
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

// Start server
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // Required for Railway

if (require.main === module) {
  setupWebhook()
    .then(() => {
      const server = app.listen(PORT, HOST, () => {
        logger.info(`Webhook server running on ${HOST}:${PORT}`);
        console.log(`\n🚀 PNPtv Bot Server Started`);
        console.log(`   - Environment: ${process.env.NODE_ENV || "production"}`);
        console.log(`   - Host: ${HOST}`);
        console.log(`   - Port: ${PORT}`);
        console.log(`   - Health Check: http://localhost:${PORT}/health`);
        console.log(`   - Bot Username: @${bot.botInfo?.username || "PNPtvbot"}\n`);
      });

      // Setup graceful shutdown
      setupGracefulShutdown(server);
    })
    .catch((error) => {
      logger.error("Failed to start webhook server:", error);
      console.error("❌ Failed to start server:", error.message);
      process.exit(1);
    });
}

module.exports = { app, setupWebhook };
