/**
 * Telegram WebApp Authentication Middleware
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');

/**
 * Verify Telegram WebApp initData
 */
function verifyTelegramWebAppData(initData, botToken) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        return hash === calculatedHash;
    } catch (error) {
        logger.error('Error verifying Telegram data:', error);
        return false;
    }
}

/**
 * Authentication middleware for Telegram users
 */
function authenticateTelegramUser(req, res, next) {
    const initData = req.headers['x-telegram-init-data'];
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;

    // Skip auth in development mode or if no initData
    if (process.env.NODE_ENV === 'development' || !initData) {
        logger.warn('Skipping Telegram auth (development mode or no initData)');
        return next();
    }

    if (!botToken) {
        logger.error('Bot token not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const isValid = verifyTelegramWebAppData(initData, botToken);

    if (!isValid) {
        logger.warn('Invalid Telegram WebApp data');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

module.exports = {
    authenticateTelegramUser,
    verifyTelegramWebAppData
};
