/**
 * Sentry Configuration
 * Centralized error tracking and monitoring for production
 */

const Sentry = require("@sentry/node");
const logger = require("../utils/logger");

/**
 * Initialize Sentry for error tracking
 * @param {Object} options - Configuration options
 * @param {string} options.environment - Environment name (production, development, etc.)
 * @param {string} options.release - Release version
 */
function initSentry(options = {}) {
  const dsn = process.env.SENTRY_DSN;

  // Skip Sentry initialization if DSN is not configured
  if (!dsn) {
    logger.warn(
      "Sentry DSN not configured. Error tracking will not be available."
    );
    return false;
  }

  // Skip Sentry in development unless explicitly enabled
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "development" && !process.env.SENTRY_ENABLE_IN_DEV) {
    logger.info("Sentry disabled in development environment");
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: options.environment || nodeEnv,
      release: options.release || process.env.npm_package_version,

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
      ],
    });

    logger.info("Sentry initialized successfully", {
      environment: options.environment || nodeEnv,
      release: options.release || "unknown",
    });

    return true;
  } catch (error) {
    logger.error("Failed to initialize Sentry:", error);
    return false;
  }
}

/**
 * Get Sentry request handler for Express
 */
function getRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

/**
 * Get Sentry tracing handler for Express
 */
function getTracingHandler() {
  return Sentry.Handlers.tracingHandler();
}

/**
 * Get Sentry error handler for Express
 */
function getErrorHandler() {
  return Sentry.Handlers.errorHandler();
}

/**
 * Capture exception manually
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
function captureException(error, context = {}) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Capture message manually
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (fatal, error, warning, info, debug)
 * @param {Object} context - Additional context
 */
function captureMessage(message, level = "info", context = {}) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
}

/**
 * Set user context for Sentry
 * @param {Object} user - User information
 */
function setUser(user) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.setUser({
    id: user.id || user.userId,
    username: user.username,
  });
}

/**
 * Add breadcrumb for debugging
 * @param {Object} breadcrumb - Breadcrumb data
 */
function addBreadcrumb(breadcrumb) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

module.exports = {
  initSentry,
  getRequestHandler,
  getTracingHandler,
  getErrorHandler,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  Sentry,
};
