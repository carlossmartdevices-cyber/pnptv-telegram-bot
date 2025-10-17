/**
 * Authentication Middleware for Telegram Mini App API
 * Validates Telegram WebApp initData to prevent user ID spoofing
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');

/**
 * Validate Telegram WebApp initData
 * @param {string} initData - The initData string from Telegram WebApp
 * @param {string} botToken - The bot token
 * @returns {Object|null} - Parsed user data if valid, null otherwise
 */
function validateTelegramWebAppData(initData, botToken) {
  try {
    if (!initData || !botToken) {
      return null;
    }

    // Parse the initData query string
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    // Sort parameters alphabetically and create data-check-string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key from bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash matches
    if (calculatedHash !== hash) {
      return null;
    }

    // Parse user data
    const userJson = params.get('user');
    if (!userJson) {
      return null;
    }

    const userData = JSON.parse(userJson);

    // Check auth_date is not too old (within 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours

    if (now - authDate > maxAge) {
      logger.warn('Auth data expired', { authDate, now, age: now - authDate });
      return null;
    }

    return {
      id: userData.id?.toString(),
      username: userData.username,
      firstName: userData.first_name,
      lastName: userData.last_name,
      authDate,
    };
  } catch (error) {
    logger.error('Error validating Telegram WebApp data:', error);
    return null;
  }
}

/**
 * Validate Telegram Login Widget payload
 * @param {Object} payload - Data returned by the Telegram login widget
 * @param {string} botToken - Telegram bot token
 * @returns {Object|null} Sanitized user data or null when invalid
 */
function validateTelegramLoginPayload(payload, botToken) {
  try {
    if (!payload || typeof payload !== "object" || !botToken) {
      return null;
    }

    const { hash } = payload;

    if (!hash) {
      return null;
    }

    const dataEntries = Object.entries(payload)
      .filter(([key, value]) => key !== "hash" && value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
      .sort(([a], [b]) => a.localeCompare(b));

    const dataCheckString = dataEntries
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash !== hash) {
      return null;
    }

    const authDate = Number(payload.auth_date || payload.authDate || 0);
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours

    if (!Number.isFinite(authDate) || now - authDate > maxAge) {
      logger.warn("Login widget auth data expired", {
        authDate,
        now,
        age: now - authDate,
      });
      return null;
    }

    return {
      id: payload.id ? String(payload.id) : null,
      username: payload.username || null,
      firstName: payload.first_name || null,
      lastName: payload.last_name || null,
      photoUrl: payload.photo_url || null,
      authDate,
    };
  } catch (error) {
    logger.error("Error validating Telegram login payload:", error);
    return null;
  }
}

/**
 * Middleware to validate Telegram Mini App authentication
 */
function authenticateTelegramUser(req, res, next) {
  try {
    // Get initData from header or body
    const initData = req.headers['x-telegram-init-data'] || req.body.initData;

    if (!initData) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing Telegram init data.',
      });
    }

    // Validate the data
    const botToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const userData = validateTelegramWebAppData(initData, botToken);

    if (!userData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication. Telegram data verification failed.',
      });
    }

    // Attach authenticated user to request
    req.telegramUser = userData;

    // For route params like /api/profile/:userId, verify it matches authenticated user
    if (req.params.userId && req.params.userId !== userData.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. You can only access your own data.',
      });
    }

    // For body params, verify userId matches authenticated user
    if (req.body.userId && req.body.userId !== userData.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. User ID mismatch.',
      });
    }

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal authentication error',
    });
  }
}

/**
 * Optional authentication - allows unauthenticated requests but validates if data is present
 */
function optionalAuth(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData;

  if (!initData) {
    // No auth data provided, continue without user
    req.telegramUser = null;
    return next();
  }

  const botToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const userData = validateTelegramWebAppData(initData, botToken);

  if (userData) {
    req.telegramUser = userData;
  } else {
    req.telegramUser = null;
  }

  next();
}

module.exports = {
  authenticateTelegramUser,
  optionalAuth,
  validateTelegramWebAppData,
  validateTelegramLoginPayload,
};
