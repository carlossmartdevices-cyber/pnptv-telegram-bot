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

// Global raw request logger (runs early to capture originalUrl before mounts)
app.use((req, res, next) => {
  try {
    // Print to stdout so PM2 captures it reliably
    console.log('[Global Request] ', req.method, req.originalUrl);
    logger.info('[Global Request]', { method: req.method, originalUrl: req.originalUrl, headers: { host: req.headers.host, 'content-type': req.headers['content-type'] } });
  } catch (e) {
    // ignore logging failures
  }
  next();
});

// Serve static files from public directory (for payment page)
const path = require("path");
const fs = require('fs');

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
logger.info('Loading API routes from ./api/routes');
const apiRoutes = require('./api/routes');
logger.info('API routes loaded', { type: typeof apiRoutes, stackLength: apiRoutes.stack ? apiRoutes.stack.length : 'No stack' });
app.use('/api', apiRoutes);
logger.info('API routes mounted at /api');

// Mount Kyrrex routes (payments webhooks and admin endpoints)
try {
  const kyrrexRoutes = require('../api/kyrrex-routes');
  app.use('/kyrrex', kyrrexRoutes);
  logger.info('Kyrrex routes mounted at /kyrrex');
} catch (e) {
  logger.warn('Kyrrex routes not mounted (module missing or error):', e.message);
}

// Daimo Pay webhook routes (optional - some deployments may not include Daimo integration)
try {
  const daimoPayRoutes = require('../api/daimo-pay-routes');
  app.use('/daimo', daimoPayRoutes);
  logger.info('Daimo Pay routes mounted at /daimo');
} catch (e) {
  logger.warn('Daimo Pay routes not mounted (module missing or error):', e.message);
}

// Make bot instance available to routes
app.set('bot', bot);

// Serve static assets for payment page
app.use("/assets", express.static(path.join(__dirname, "../../public/payment/assets")));

// Serve public directory for static files (guide, etc.)
app.use(express.static(path.join(__dirname, "../../public")));

// Guide/Instructions page
app.get("/guide", (req, res) => {
  const guidePath = path.join(__dirname, "../../public/guide.html");
  res.sendFile(guidePath);
});

// Attempt to serve the built Next.js Telegram WebApp (if present)
// The webapp is built into `src/webapp/.next`. If the deployment places
// the Node server behind the pnptv.app domain, mounting these routes
// will make the mini app available at https://pnptv.app/app as expected.
try {
  const webappNextStatic = path.join(__dirname, "../webapp/.next/static");
  const webappServerApp = path.join(__dirname, "../webapp/.next/server/app/index.html");

  if (fs.existsSync(webappNextStatic) && fs.existsSync(webappServerApp)) {
    // Serve the _next static assets
    app.use('/_next/static', express.static(webappNextStatic));

    // Serve any other _next assets (best-effort)
    app.use('/_next', express.static(path.join(__dirname, '../webapp/.next')));

    // Serve manifest and other public files from the webapp public folder if present
    const webappPublic = path.join(__dirname, '../webapp/public');
    if (fs.existsSync(webappPublic)) {
      app.use('/app', express.static(webappPublic));
    }

    // Serve the webapp entry at /app and any subpath /app/* (client-side routing)
    // NOTE: Next.js apps require their own server. Serving as fallback for now.
    app.get('/app', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>PNPtv WebApp</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 20px;
            }
            .container {
              max-width: 500px;
            }
            h1 {
              font-size: 2.5em;
              margin-bottom: 0.5em;
            }
            p {
              font-size: 1.2em;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🌟 PNPtv WebApp</h1>
            <p>Telegram mini app coming soon!</p>
            <p style="font-size: 0.9em; margin-top: 2em;">Use the bot commands to access features for now.</p>
          </div>
        </body>
        </html>
      `);
    });
    app.get('/app/*', (req, res) => {
      res.redirect('/app');
    });

    logger.info('Mounted compiled WebApp at /app (serving _next static assets)');
    console.log('✅ WebApp static mount: /app -> src/webapp/.next/server/app/index.html');
  } else {
    logger.warn('WebApp build not found under src/webapp/.next — skipping mount of /app');
  }
} catch (e) {
  logger.warn('Failed to mount WebApp static routes:', e.message);
}

// Debug endpoint: WebApp diagnostics
// Returns whether the built webapp exists, key env vars, and mounted routes
app.get('/debug/webapp', (req, res) => {
  try {
    const webappRoot = path.join(__dirname, '../webapp');
    const nextStatic = path.join(webappRoot, '.next', 'static');
    const serverIndex = path.join(webappRoot, '.next', 'server', 'app', 'index.html');
    const webappPublic = path.join(webappRoot, 'public');

    const exists = {
      webappRoot: fs.existsSync(webappRoot),
      nextStatic: fs.existsSync(nextStatic),
      serverIndex: fs.existsSync(serverIndex),
      webappPublic: fs.existsSync(webappPublic),
    };

    const env = {
      WEB_APP_URL: process.env.WEB_APP_URL || null,
      WEBAPP_URL: process.env.WEBAPP_URL || null,
      NEXT_PUBLIC_WEBAPP_URL: process.env.NEXT_PUBLIC_WEBAPP_URL || null,
      NODE_ENV: process.env.NODE_ENV || null,
      PORT: process.env.PORT || null,
    };

    // Collect top-level mounted routes (best-effort)
    const routes = [];
    if (app && app._router && Array.isArray(app._router.stack)) {
      app._router.stack.forEach((layer) => {
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase()).join(',');
          routes.push(`${methods} ${layer.route.path}`);
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          // nested router — summarize
          routes.push(`<router> ${layer.regexp ? String(layer.regexp) : '<unknown>'}`);
        } else if (layer.name === 'serveStatic') {
          // static middleware
          const staticPath = layer.regexp ? String(layer.regexp) : '<static>';
          routes.push(`<static> ${staticPath}`);
        }
      });
    }

    // Find a sample asset to test
    let sampleAsset = null;
    try {
      if (exists.nextStatic) {
        const chunksDir = path.join(nextStatic, 'chunks');
        if (fs.existsSync(chunksDir)) {
          const files = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js'));
          if (files.length > 0) {
            sampleAsset = `/_next/static/chunks/${files[0]}`;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    res.json({ ok: true, exists, env, routes, sampleAsset });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Enhanced diagnostic endpoint: verify _next asset serving
// Tests that a real _next static asset returns 200 and correct content-type
app.get('/debug/webapp/verify-assets', async (req, res) => {
  try {
    const webappRoot = path.join(__dirname, '../webapp');
    const nextStatic = path.join(webappRoot, '.next', 'static');
    
    const results = {
      staticExists: fs.existsSync(nextStatic),
      tests: [],
    };

    if (results.staticExists) {
      // Find sample assets
      const chunksDir = path.join(nextStatic, 'chunks');
      const cssDir = path.join(nextStatic, 'css');

      const samples = [];
      
      if (fs.existsSync(chunksDir)) {
        const jsFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js')).slice(0, 2);
        jsFiles.forEach(f => samples.push({ path: `/_next/static/chunks/${f}`, type: 'application/javascript' }));
      }

      if (fs.existsSync(cssDir)) {
        const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).slice(0, 1);
        cssFiles.forEach(f => samples.push({ path: `/_next/static/css/${f}`, type: 'text/css' }));
      }

      // Test each sample by reading from filesystem (simulating what Express static does)
      for (const sample of samples) {
        const diskPath = path.join(__dirname, '..', 'webapp', '.next', sample.path.replace('/_next/', ''));
        const fileExists = fs.existsSync(diskPath);
        const fileSize = fileExists ? fs.statSync(diskPath).size : 0;

        results.tests.push({
          url: sample.path,
          expectedType: sample.type,
          fileExists,
          fileSize,
          diskPath: diskPath.replace('/root/bot 1/', ''),
        });
      }
    }

    res.json({ ok: true, ...results });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

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
          // Print Express route table for debugging
          try {
            const routeList = [];
            function extractRoutes(stack, prefix = '') {
              stack.forEach((layer) => {
                if (layer.route && layer.route.path) {
                  const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(',');
                  routeList.push(`${methods} ${prefix}${layer.route.path}`);
                } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
                  // nested router
                  const mountPath = layer.regexp && layer.regexp.fast_slash ? '' : (layer.regexp && layer.regexp.source ? '' : '');
                  extractRoutes(layer.handle.stack, prefix + (layer.regexp && layer.regexp.fast_slash ? '' : ''));
                }
              });
            }

            if (app._router && app._router.stack) {
              extractRoutes(app._router.stack);
              console.log('\n=== Mounted Express Routes ===');
              routeList.slice(0, 200).forEach(r => console.log(r));
              console.log('=== End Routes ===\n');
              logger.info('Mounted Express routes printed to stdout for debugging', { count: routeList.length });
            }
          } catch (e) {
            console.warn('Failed to enumerate routes:', e.message);
          }
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
