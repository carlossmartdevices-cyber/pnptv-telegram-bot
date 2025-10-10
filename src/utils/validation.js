/**
 * Input validation utilities
 */

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 500); // Limit length
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

module.exports = {
  sanitizeInput,
  isValidEmail,
  isValidBio,
  isValidLocation,
  isValidUsername,
  isValidAge,
};
