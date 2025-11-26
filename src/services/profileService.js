/**
 * Shared Profile Service
 * Utilities to keep profile data consistent between bot and web app
 */

const {
  approximateLocation,
  isValidLocation,
  simpleGeohash,
} = require("../utils/geolocation");

/**
 * Build API-friendly user profile response
 * @param {string} userId - User ID
 * @param {Object} userData - User document data
 * @param {Object|null} membershipInfo - Membership metadata
 * @returns {Object} Structured profile payload
 */
function buildUserResponse(userId, userData, membershipInfo = null) {
  const location =
    userData.location && isValidLocation(userData.location)
      ? {
          latitude: Number(userData.location.latitude),
          longitude: Number(userData.location.longitude),
        }
      : null;

  const locationName =
    userData.locationName ||
    (location
      ? approximateLocation(location.latitude, location.longitude)
      : null);

  return {
    userId,
    username: userData.username || "Anonymous",
    firstName: userData.firstName || null,
    lastName: userData.lastName || null,
    bio: userData.bio || null,
    location,
    locationName,
    tier: userData.tier || "Free",
    xp: userData.xp || 0,
    badges: Array.isArray(userData.badges) ? userData.badges : [],
    photoFileId: userData.photoFileId || null,
    createdAt: userData.createdAt || null,
    lastActive: userData.lastActive || null,
    locationUpdatedAt: userData.locationUpdatedAt || null,
    membership: membershipInfo
      ? {
          tier: membershipInfo.tier,
          status: membershipInfo.status,
          expiresAt: membershipInfo.expiresAt,
          daysRemaining: membershipInfo.daysRemaining,
          updatedAt: membershipInfo.updatedAt,
          updatedBy: membershipInfo.updatedBy || null,
        }
      : null,
  };
}

/**
 * Prepare location update payload from raw coordinates
 * @param {Object|null|undefined} rawLocation - Location request payload
 * @returns {Object} Firestore update object
 */
function prepareLocationUpdate(rawLocation) {
  if (rawLocation === undefined) {
    return {};
  }

  if (rawLocation === null) {
    return {
      location: null,
      locationName: null,
      locationGeohash: null,
      locationUpdatedAt: new Date(),
    };
  }

  if (
    typeof rawLocation !== "object" ||
    rawLocation === null ||
    typeof rawLocation.latitude === "undefined" ||
    typeof rawLocation.longitude === "undefined"
  ) {
    throw new Error("Location must include latitude and longitude");
  }

  const latitude = Number(rawLocation.latitude);
  const longitude = Number(rawLocation.longitude);

  const parsedLocation = { latitude, longitude };

  if (!isValidLocation(parsedLocation)) {
    throw new Error("Invalid location coordinates");
  }

  return {
    location: parsedLocation,
    locationName: approximateLocation(latitude, longitude),
    locationGeohash: simpleGeohash(latitude, longitude),
    locationUpdatedAt: new Date(),
  };
}

/**
 * Prepare location update from descriptive text (no coordinates)
 * @param {string} description - Location text entered by user
 * @returns {Object} Firestore update object
 */
function prepareTextLocationUpdate(description) {
  if (description === undefined) {
    return {};
  }

  if (description === null || description === "") {
    return {
      location: null,
      locationName: null,
      locationGeohash: null,
      locationUpdatedAt: new Date(),
    };
  }

  return {
    location: null,
    locationName: description,
    locationGeohash: null,
    locationUpdatedAt: new Date(),
  };
}

/**
 * Get localized location display label for bot messages
 * @param {Object} userData - User document data
 * @param {string} lang - Language code (en/es)
 * @returns {string} Location text
 */
function getLocationDisplay(userData, lang = "en") {
  const fallback = lang === "es" ? "No establecida" : "Not set";

  if (!userData) {
    return fallback;
  }

  if (userData.locationName) {
    return userData.locationName;
  }

  if (isValidLocation(userData.location)) {
    const { latitude, longitude } = userData.location;
    return approximateLocation(latitude, longitude);
  }

  return fallback;
}

module.exports = {
  buildUserResponse,
  prepareLocationUpdate,
  prepareTextLocationUpdate,
  getLocationDisplay,
};

