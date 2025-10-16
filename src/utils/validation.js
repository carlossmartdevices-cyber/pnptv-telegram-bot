/**
 * Input validation utilities
 */

const { ValidationError } = require('./errorHandler');

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input - User input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
function sanitizeInput(input, maxLength = 500) {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .substring(0, maxLength); // Limit length
}

/**
 * Sanitize HTML for display (more aggressive)
 * @param {string} input - User input
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(input) {
  if (typeof input !== "string") return "";

  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'\/]/g, char => htmlEntities[char]);
}

/**
 * Validate and sanitize text with length constraints
 * @param {string} text - Input text
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error messages
 * @returns {string} Sanitized text
 */
function validateText(text, minLength = 0, maxLength = 500, fieldName = 'Text') {
  if (typeof text !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName.toLowerCase());
  }

  const trimmed = text.trim();

  if (minLength > 0 && trimmed.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName.toLowerCase()
    );
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
      fieldName.toLowerCase()
    );
  }

  return sanitizeInput(trimmed, maxLength);
}

/**
 * Validate user ID (Telegram ID format)
 * @param {string|number} userId - User ID
 * @returns {string} Validated user ID
 */
function validateUserId(userId) {
  const id = String(userId);

  if (!/^\d+$/.test(id)) {
    throw new ValidationError('Invalid user ID format', 'userId');
  }

  if (id.length < 1 || id.length > 20) {
    throw new ValidationError('User ID length out of range', 'userId');
  }

  return id;
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate bio text
 * @param {string} bio - User bio
 * @returns {boolean} True if valid
 */
function isValidBio(bio) {
  return (
    typeof bio === "string" &&
    bio.trim().length > 0 &&
    bio.length <= 500
  );
}

/**
 * Validate location string
 * @param {string} location - User location
 * @returns {boolean} True if valid
 */
function isValidLocation(location) {
  return (
    typeof location === "string" &&
    location.trim().length > 0 &&
    location.length <= 100
  );
}

/**
 * Validate username
 * @param {string} username - Telegram username
 * @returns {boolean} True if valid
 */
function isValidUsername(username) {
  if (!username) return false;
  const usernameRegex = /^[a-zA-Z0-9_]{5,32}$/;
  return usernameRegex.test(username);
}

/**
 * Validate user age (must be 18+)
 * @param {number} age - User age
 * @returns {boolean} True if 18 or older
 */
function isValidAge(age) {
  return typeof age === "number" && age >= 18 && age <= 120;
}

/**
 * Validate coordinates
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} True if valid
 */
function validateCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    throw new ValidationError('Coordinates must be valid numbers', 'location');
  }

  if (lat < -90 || lat > 90) {
    throw new ValidationError('Latitude must be between -90 and 90', 'latitude');
  }

  if (lon < -180 || lon > 180) {
    throw new ValidationError('Longitude must be between -180 and 180', 'longitude');
  }

  return { latitude: lat, longitude: lon };
}

/**
 * Validate numeric value within range
 * @param {*} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Field name
 * @returns {number} Validated number
 */
function validateNumberRange(value, min, max, fieldName = 'Value') {
  const num = Number(value);

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName.toLowerCase());
  }

  if (num < min || num > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName.toLowerCase()
    );
  }

  return num;
}

module.exports = {
  sanitizeInput,
  sanitizeHtml,
  validateText,
  validateUserId,
  validateCoordinates,
  validateNumberRange,
  isValidEmail,
  isValidBio,
  isValidLocation,
  isValidUsername,
  isValidAge,
};
