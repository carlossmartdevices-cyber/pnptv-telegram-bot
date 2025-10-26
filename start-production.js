/**
 * Production Bot Launcher for Railway/Heroku
 * Uses webhook mode with Express server
 *
 * This file simply sets NODE_ENV=production and loads webhook.js
 * which has all the logic for production webhook mode
 */

// Ensure production environment
process.env.NODE_ENV = "production";

// IMPORTANT: Import instrument.js at the very top for Sentry error tracking
require("./instrument.js");

// Load environment configuration
require("./src/config/env");

// Start webhook server (handles everything)
require("./src/bot/webhook.js");
