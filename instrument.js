/**
 * Sentry Instrumentation
 * IMPORTANT: This file must be imported at the very top of your application entry point
 * to ensure proper error tracking and performance monitoring.
 */

const Sentry = require("@sentry/node");

// Load environment variables
require("./src/config/env");

const dsn = process.env.SENTRY_DSN;

// Initialize Sentry only if DSN is configured
if (dsn) {
  const nodeEnv = process.env.NODE_ENV || "development";

  // Skip Sentry in development unless explicitly enabled
  if (nodeEnv !== "development" || process.env.SENTRY_ENABLE_IN_DEV === "true") {
    Sentry.init({
      dsn,
      environment: nodeEnv,
      release: process.env.npm_package_version || "unknown",

      // Setting this option to true will send default PII data to Sentry.
      // For example, automatic IP address collection on events
      sendDefaultPii: true,

      // Set sample rate for performance monitoring
      tracesSampleRate: nodeEnv === "production" ? 0.1 : 1.0,

      // Automatically capture unhandled promise rejections and other errors
      // Integrations are automatically enabled in Sentry v8+

      // Filter out sensitive data
      beforeSend(event, hint) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers["x-telegram-init-data"];
        }

        // Remove sensitive environment variables
        if (event.contexts?.runtime?.env) {
          const sensitiveKeys = [
            "TELEGRAM_TOKEN",
            "TELEGRAM_BOT_TOKEN",
            "EPAYCO_PRIVATE_KEY",
            "EPAYCO_P_KEY",
            "FIREBASE_PRIVATE_KEY",
            "FIREBASE_CREDENTIALS",
            "SENTRY_DSN",
            "DAIMO_API_KEY",
          ];
          sensitiveKeys.forEach((key) => {
            if (event.contexts.runtime.env[key]) {
              event.contexts.runtime.env[key] = "[FILTERED]";
            }
          });
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Telegram API errors that are expected
        "400: Bad Request: message is not modified",
        "403: Forbidden: bot was blocked by the user",
        "403: Forbidden: bot can't initiate conversation with a user",
        // Network errors
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "fetch failed",
      ],
    });

    console.log(`✓ Sentry initialized (environment: ${nodeEnv})`);
  } else {
    console.log("ℹ Sentry disabled in development environment");
  }
} else {
  console.log("⚠ Sentry DSN not configured. Error tracking will not be available.");
}
