/**
 * Timezone Helper Utility
 * Handles user timezone detection, storage, and conversion
 */

const { db } = require('../config/firebase');
const logger = require('./logger');

// Common timezone mappings by country/region
const TIMEZONE_MAP = {
  // Americas
  'US': 'America/New_York',      // Default to Eastern (could detect more precisely)
  'CA': 'America/Toronto',
  'MX': 'America/Mexico_City',
  'BR': 'America/Sao_Paulo',
  'AR': 'America/Argentina/Buenos_Aires',
  'CL': 'America/Santiago',
  'CO': 'America/Bogota',
  'VE': 'America/Caracas',
  'PE': 'America/Lima',

  // Europe
  'GB': 'Europe/London',
  'FR': 'Europe/Paris',
  'DE': 'Europe/Berlin',
  'ES': 'Europe/Madrid',
  'IT': 'Europe/Rome',
  'PT': 'Europe/Lisbon',
  'RU': 'Europe/Moscow',
  'UA': 'Europe/Kiev',
  'PL': 'Europe/Warsaw',

  // Asia
  'CN': 'Asia/Shanghai',
  'JP': 'Asia/Tokyo',
  'IN': 'Asia/Kolkata',
  'KR': 'Asia/Seoul',
  'TH': 'Asia/Bangkok',
  'SG': 'Asia/Singapore',
  'HK': 'Asia/Hong_Kong',
  'PH': 'Asia/Manila',
  'ID': 'Asia/Jakarta',

  // Oceania
  'AU': 'Australia/Sydney',
  'NZ': 'Pacific/Auckland',

  // Africa
  'ZA': 'Africa/Johannesburg',
  'EG': 'Africa/Cairo',
  'NG': 'Africa/Lagos',
};

// Default timezone if detection fails
const DEFAULT_TIMEZONE = 'America/Bogota';

/**
 * Get user's timezone from database or detect from language_code
 * @param {string} userId - Telegram user ID
 * @param {Object} from - Telegram from object (contains language_code)
 * @returns {Promise<string>} - IANA timezone string
 */
async function getUserTimezone(userId, from = null) {
  try {
    // First, try to get from user's profile in database
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();

      // If user has explicitly set timezone, use that
      if (userData.timezone) {
        logger.info(`Using stored timezone for user ${userId}: ${userData.timezone}`);
        return userData.timezone;
      }

      // If user has country code stored, use that
      if (userData.countryCode && TIMEZONE_MAP[userData.countryCode]) {
        const timezone = TIMEZONE_MAP[userData.countryCode];
        logger.info(`Using country-based timezone for user ${userId}: ${timezone}`);
        return timezone;
      }
    }

    // Try to detect from Telegram language_code (format: en-US, es-CO, etc.)
    if (from?.language_code) {
      const langParts = from.language_code.split('-');
      if (langParts.length > 1) {
        const countryCode = langParts[1].toUpperCase();
        if (TIMEZONE_MAP[countryCode]) {
          const timezone = TIMEZONE_MAP[countryCode];
          logger.info(`Detected timezone from language_code for user ${userId}: ${timezone}`);

          // Store this detection for future use
          try {
            await db.collection('users').doc(userId).update({
              timezone: timezone,
              timezoneDetected: true,
              timezoneDetectedAt: new Date()
            });
          } catch (err) {
            logger.warn(`Could not store detected timezone for user ${userId}:`, err.message);
          }

          return timezone;
        }
      }
    }

    // Fallback to default timezone
    logger.info(`Using default timezone for user ${userId}: ${DEFAULT_TIMEZONE}`);
    return DEFAULT_TIMEZONE;

  } catch (error) {
    logger.error(`Error getting timezone for user ${userId}:`, error);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Set user's timezone preference
 * @param {string} userId - Telegram user ID
 * @param {string} timezone - IANA timezone string
 * @returns {Promise<boolean>} - Success status
 */
async function setUserTimezone(userId, timezone) {
  try {
    // Validate timezone
    if (!isValidTimezone(timezone)) {
      logger.warn(`Invalid timezone provided for user ${userId}: ${timezone}`);
      return false;
    }

    await db.collection('users').doc(userId).update({
      timezone: timezone,
      timezoneDetected: false, // User explicitly set this
      timezoneUpdatedAt: new Date()
    });

    logger.info(`Timezone set for user ${userId}: ${timezone}`);
    return true;
  } catch (error) {
    logger.error(`Error setting timezone for user ${userId}:`, error);
    return false;
  }
}

/**
 * Validate if a timezone string is valid
 * @param {string} timezone - IANA timezone string
 * @returns {boolean}
 */
function isValidTimezone(timezone) {
  try {
    // Try to create a date with the timezone
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Parse date/time string in user's timezone
 * @param {string} dateTimeStr - Date string in format YYYY-MM-DD HH:MM
 * @param {string} timezone - IANA timezone string
 * @returns {Date|null} - Parsed date or null if invalid
 */
function parseDateInTimezone(dateTimeStr, timezone) {
  try {
    // Parse the date string
    const dateMatch = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);

    if (!dateMatch) {
      return null;
    }

    const [, year, month, day, hour, minute] = dateMatch;

    // Get timezone offset for the given timezone at this date
    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:00`;
    const date = new Date(dateStr);

    // Create a formatter for the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Format the date in the target timezone to get parts
    const parts = formatter.formatToParts(date);
    const tzYear = parts.find(p => p.type === 'year').value;
    const tzMonth = parts.find(p => p.type === 'month').value;
    const tzDay = parts.find(p => p.type === 'day').value;
    const tzHour = parts.find(p => p.type === 'hour').value;
    const tzMinute = parts.find(p => p.type === 'minute').value;

    // Calculate the offset between input and formatted
    const inputDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    const tzDate = new Date(`${tzYear}-${tzMonth}-${tzDay}T${tzHour}:${tzMinute}:00`);
    const offset = inputDate.getTime() - tzDate.getTime();

    // Apply offset to get correct UTC time
    const utcDate = new Date(inputDate.getTime() - offset);

    // Alternative simpler approach: use timezone offset string
    // Get the current offset for this timezone
    const offsetMinutes = getTimezoneOffset(timezone, date);
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

    // Create ISO string with timezone offset
    const isoStr = `${year}-${month}-${day}T${hour}:${minute}:00${offsetStr}`;
    const resultDate = new Date(isoStr);

    if (isNaN(resultDate.getTime())) {
      return null;
    }

    return resultDate;
  } catch (error) {
    logger.error('Error parsing date in timezone:', error);
    return null;
  }
}

/**
 * Get timezone offset in minutes for a given timezone at a specific date
 * @param {string} timezone - IANA timezone string
 * @param {Date} date - Date to check offset for
 * @returns {number} - Offset in minutes (negative for ahead of UTC)
 */
function getTimezoneOffset(timezone, date) {
  try {
    // Format date in UTC and in target timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    // Calculate offset in minutes
    const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
    return -offset; // Negate to match standard offset convention
  } catch (error) {
    logger.error('Error calculating timezone offset:', error);
    return 0;
  }
}

/**
 * Format date in user's timezone
 * @param {Date} date - Date to format
 * @param {string} timezone - IANA timezone string
 * @returns {string} - Formatted date string
 */
function formatDateInTimezone(date, timezone) {
  try {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch (error) {
    logger.error('Error formatting date in timezone:', error);
    return date.toISOString();
  }
}

/**
 * Get friendly timezone name
 * @param {string} timezone - IANA timezone string
 * @returns {string} - Friendly name
 */
function getTimezoneName(timezone) {
  const names = {
    'America/New_York': 'Eastern Time (US)',
    'America/Chicago': 'Central Time (US)',
    'America/Denver': 'Mountain Time (US)',
    'America/Los_Angeles': 'Pacific Time (US)',
    'America/Toronto': 'Eastern Time (Canada)',
    'America/Mexico_City': 'Central Time (Mexico)',
    'America/Bogota': 'Colombia Time',
    'America/Caracas': 'Venezuela Time',
    'America/Lima': 'Peru Time',
    'America/Sao_Paulo': 'Brazil Time',
    'America/Argentina/Buenos_Aires': 'Argentina Time',
    'Europe/London': 'UK Time',
    'Europe/Paris': 'Central European Time',
    'Europe/Berlin': 'Central European Time',
    'Europe/Madrid': 'Central European Time',
    'Europe/Moscow': 'Moscow Time',
    'Asia/Tokyo': 'Japan Time',
    'Asia/Shanghai': 'China Time',
    'Asia/Kolkata': 'India Time',
    'Asia/Dubai': 'Gulf Time',
    'Australia/Sydney': 'Australian Eastern Time',
  };

  return names[timezone] || timezone;
}

/**
 * Get list of common timezones for user selection
 * @returns {Array} - Array of timezone objects
 */
function getCommonTimezones() {
  return [
    { value: 'America/New_York', label: 'Eastern Time (US/Canada)', offset: 'UTC-5' },
    { value: 'America/Chicago', label: 'Central Time (US)', offset: 'UTC-6' },
    { value: 'America/Denver', label: 'Mountain Time (US)', offset: 'UTC-7' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US)', offset: 'UTC-8' },
    { value: 'America/Bogota', label: 'Colombia, Peru, Ecuador', offset: 'UTC-5' },
    { value: 'America/Mexico_City', label: 'Mexico City', offset: 'UTC-6' },
    { value: 'America/Caracas', label: 'Venezuela', offset: 'UTC-4' },
    { value: 'America/Sao_Paulo', label: 'Brazil (São Paulo)', offset: 'UTC-3' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Argentina', offset: 'UTC-3' },
    { value: 'Europe/London', label: 'London, UK', offset: 'UTC+0' },
    { value: 'Europe/Paris', label: 'Paris, Madrid, Berlin', offset: 'UTC+1' },
    { value: 'Europe/Moscow', label: 'Moscow', offset: 'UTC+3' },
    { value: 'Asia/Dubai', label: 'Dubai, UAE', offset: 'UTC+4' },
    { value: 'Asia/Kolkata', label: 'India', offset: 'UTC+5:30' },
    { value: 'Asia/Shanghai', label: 'China', offset: 'UTC+8' },
    { value: 'Asia/Tokyo', label: 'Japan, Korea', offset: 'UTC+9' },
    { value: 'Australia/Sydney', label: 'Sydney, Australia', offset: 'UTC+10' },
  ];
}

module.exports = {
  getUserTimezone,
  setUserTimezone,
  isValidTimezone,
  parseDateInTimezone,
  formatDateInTimezone,
  getTimezoneName,
  getCommonTimezones,
  getTimezoneOffset
};
