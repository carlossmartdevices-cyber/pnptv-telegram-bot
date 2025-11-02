/**
 * Webhook mode configuration for production deployment
 * Optimized for Railway deployment with health checks and graceful shutdown
 */

require("../config/env");
const express = require("express");
const { Telegraf } = require("telegraf");
const logger = require("../utils/logger");
const { db } = require("../config/firebase");

// Initialize bot
const bot = require("./index");

// Express app for webhook
const app = express();

// Trust Railway proxy
app.set("trust proxy", 1);

// JSON body parser with size limits
app.use(express.json({ limit: "10mb" }));

// Serve static files from public directory (for payment page)
const path = require("path");

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

// Serve static assets for payment page
app.use("/assets", express.static(path.join(__dirname, "../../public/payment/assets")));

// Legal pages - Terms of Service, Privacy Policy, Refund Policy
app.get("/terms-en", (req, res) => {
  const termsPath = path.join(__dirname, "../../public/legal/terms-en.html");
  res.sendFile(termsPath);
});

app.get("/terms-es", (req, res) => {
  const termsPath = path.join(__dirname, "../../public/legal/terms-es.html");
  res.sendFile(termsPath);
});

app.get("/privacy-en", (req, res) => {
  // Privacy policy is included in terms page, redirect to #privacy section
  res.redirect("/terms-en#privacy");
});

app.get("/privacy-es", (req, res) => {
  // Privacy policy is included in terms page, redirect to #privacidad section
  res.redirect("/terms-es#privacidad");
});

app.get("/refunds-en", (req, res) => {
  // Refund policy is included in terms page, redirect to #refund section
  res.redirect("/terms-en#refund");
});

app.get("/refunds-es", (req, res) => {
  // Refund policy is included in terms page, redirect to #reembolsos section
  res.redirect("/terms-es#reembolsos");
});

// Webhook endpoint for Telegram
app.post(`/bot${process.env.TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    // Respond immediately to avoid timeout
    res.sendStatus(200);

    // Process update asynchronously
    await bot.handleUpdate(req.body);
  } catch (error) {
    logger.error('Webhook error:', error);
  }
});

// Payment success redirect
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
        <p>Thank you for subscribing!</p>
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

// Set webhook with BOT_URL configuration
async function setupWebhook() {
  // Use WEBHOOK_URL (preferred) or BOT_URL from environment
  const webhookUrl =
    process.env.WEBHOOK_URL ||
    process.env.BOT_URL ||
    "https://yourdomain.com";

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
  const isDevelopment = process.env.NODE_ENV === 'development';

  // In development mode, start Express server without webhook (use polling mode from bot)
  if (isDevelopment) {
    logger.info("Starting in development mode (polling) - webhook disabled");
    console.log("\n⚙️  Development Mode: Starting server without webhook");
    console.log("   Bot will use polling mode from index.js");
    console.log("   Express server available for payment endpoints\n");

    // Start Express server only (bot runs separately via index.js in polling mode)
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Development server running on ${HOST}:${PORT}`);
      console.log(`\n🚀 PNPtv Development Server Started`);
      console.log(`   - Environment: development`);
      console.log(`   - Host: ${HOST}`);
      console.log(`   - Port: ${PORT}`);
      console.log(`   - Health Check: http://localhost:${PORT}/health`);
      console.log(`   - Payment Page: http://localhost:${PORT}/pay`);
      console.log(`   - Run 'npm start' in another terminal for bot polling mode\n`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);
  } else {
    // Production mode: use webhook
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
}

module.exports = { app, setupWebhook };
