/**
 * Geolocation Utilities
 * FREE implementation using only Telegram's location data
 * No external services or paid APIs required
 */

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * This is the most accurate formula for calculating distances on a sphere
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in km

  return distance;
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} lang - Language code (en/es)
 * @returns {string} Formatted distance string
 */
function formatDistance(distanceKm, lang = "en") {
  if (distanceKm < 1) {
    // Less than 1km - show in meters
    const meters = Math.round(distanceKm * 1000);
    return lang === "es" ? `${meters}m` : `${meters}m`;
  } else if (distanceKm < 10) {
    // 1-10km - show with 1 decimal
    return lang === "es"
      ? `${distanceKm.toFixed(1)} km`
      : `${distanceKm.toFixed(1)} km`;
  } else {
    // Over 10km - show as integer
    return lang === "es"
      ? `${Math.round(distanceKm)} km`
      : `${Math.round(distanceKm)} km`;
  }
}

/**
 * Check if a location is valid
 * @param {object} location - Location object with latitude/longitude
 * @returns {boolean} True if valid
 */
function isValidLocation(location) {
  if (!location) return false;

  const { latitude, longitude } = location;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return false;
  }

  // Check if coordinates are within valid ranges
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;

  return true;
}

/**
 * Find users within a specific radius
 * @param {object} userLocation - User's location {latitude, longitude}
 * @param {Array} users - Array of user objects with location data
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Array} Users within radius, sorted by distance
 */
function findUsersWithinRadius(userLocation, users, radiusKm = 50) {
  if (!isValidLocation(userLocation)) {
    return [];
  }

  const usersWithDistance = users
    .filter((user) => isValidLocation(user.location))
    .map((user) => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        user.location.latitude,
        user.location.longitude
      );

      return {
        ...user,
        distance: distance,
        distanceFormatted: formatDistance(distance),
      };
    })
    .filter((user) => user.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance); // Sort by distance (closest first)

  return usersWithDistance;
}

/**
 * Get distance category for grouping
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} lang - Language code
 * @returns {string} Category label
 */
function getDistanceCategory(distanceKm, lang = "en") {
  if (distanceKm < 1) {
    return lang === "es" ? "Muy cerca (< 1km)" : "Very close (< 1km)";
  } else if (distanceKm < 5) {
    return lang === "es" ? "Cerca (1-5km)" : "Close (1-5km)";
  } else if (distanceKm < 10) {
    return lang === "es" ? "Cercano (5-10km)" : "Nearby (5-10km)";
  } else if (distanceKm < 25) {
    return lang === "es" ? "En tu área (10-25km)" : "In your area (10-25km)";
  } else if (distanceKm < 50) {
    return lang === "es" ? "En tu región (25-50km)" : "In your region (25-50km)";
  } else {
    return lang === "es" ? "Lejos (> 50km)" : "Far (> 50km)";
  }
}

/**
 * Create bounding box for efficient database queries
 * This reduces the number of users we need to check
 *
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {object} Bounding box {minLat, maxLat, minLon, maxLon}
 */
function getBoundingBox(lat, lon, radiusKm) {
  // Approximate degrees per kilometer
  const latDegreePerKm = 1 / 111; // 1 degree latitude ≈ 111 km
  const lonDegreePerKm = 1 / (111 * Math.cos(toRadians(lat))); // Varies by latitude

  const latDelta = radiusKm * latDegreePerKm;
  const lonDelta = radiusKm * lonDegreePerKm;

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

/**
 * Check if user is within bounding box (quick filter before precise calculation)
 * @param {object} userLocation - User location
 * @param {object} boundingBox - Bounding box
 * @returns {boolean} True if within box
 */
function isInBoundingBox(userLocation, boundingBox) {
  if (!isValidLocation(userLocation)) return false;

  const { latitude, longitude } = userLocation;
  const { minLat, maxLat, minLon, maxLon } = boundingBox;

  return (
    latitude >= minLat &&
    latitude <= maxLat &&
    longitude >= minLon &&
    longitude <= maxLon
  );
}

/**
 * Generate a simple geohash for grouping nearby locations
 * This is a simplified version for basic spatial indexing
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} precision - Hash precision (1-5, default 3)
 * @returns {string} Geohash string
 */
function simpleGeohash(lat, lon, precision = 3) {
  // Normalize to 0-1 range
  const latNorm = (lat + 90) / 180;
  const lonNorm = (lon + 180) / 360;

  // Create hash by dividing space into grid
  const gridSize = Math.pow(10, precision);
  const latGrid = Math.floor(latNorm * gridSize);
  const lonGrid = Math.floor(lonNorm * gridSize);

  return `${latGrid}_${lonGrid}`;
}

/**
 * Get all geohash neighbors for expanded search
 * This helps find users near the edges of geohash cells
 *
 * @param {string} geohash - Center geohash
 * @param {number} precision - Hash precision
 * @returns {string[]} Array of geohashes (center + 8 neighbors)
 */
function getGeohashNeighbors(geohash, precision = 3) {
  const [latGrid, lonGrid] = geohash.split('_').map(Number);

  const neighbors = [
    geohash, // center
    `${latGrid - 1}_${lonGrid - 1}`, // top-left
    `${latGrid - 1}_${lonGrid}`,     // top
    `${latGrid - 1}_${lonGrid + 1}`, // top-right
    `${latGrid}_${lonGrid - 1}`,     // left
    `${latGrid}_${lonGrid + 1}`,     // right
    `${latGrid + 1}_${lonGrid - 1}`, // bottom-left
    `${latGrid + 1}_${lonGrid}`,     // bottom
    `${latGrid + 1}_${lonGrid + 1}`, // bottom-right
  ];

  return neighbors;
}

/**
 * Get geohash precision for a given radius
 * Larger radius = lower precision (larger grid cells)
 *
 * @param {number} radiusKm - Search radius in km
 * @returns {number} Appropriate precision level
 */
function getGeohashPrecision(radiusKm) {
  if (radiusKm <= 5) return 4;   // ~12.5km grid cells
  if (radiusKm <= 25) return 3;  // ~125km grid cells
  if (radiusKm <= 50) return 2;  // ~1250km grid cells
  return 1;                       // ~12500km grid cells
}

/**
 * Get readable location name from coordinates (approximate)
 * This is a very basic approximation - for production, use Google Maps Geocoding API
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} Approximate location
 */
function approximateLocation(lat, lon) {
  // Very basic continent/region detection
  // For production, use a proper geocoding service

  if (lat >= -90 && lat <= -60) return "Antarctica";
  if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 45) return "Europe";
  if (lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52) return "Africa";
  if (lat >= 10 && lat <= 55 && lon >= 60 && lon <= 150) return "Asia";
  if (lat >= -50 && lat <= -10 && lon >= 110 && lon <= 180)
    return "Australia/Oceania";
  if (lat >= 15 && lat <= 70 && lon >= -170 && lon <= -50)
    return "North America";
  if (lat >= -60 && lat <= 15 && lon >= -85 && lon <= -30)
    return "South America";

  return "Unknown Region";
}

/**
 * Optimized nearby user search using geohashing
 * This reduces database queries by filtering users based on geohash first
 *
 * @param {object} db - Firestore database instance
 * @param {number} lat - User latitude
 * @param {number} lon - User longitude
 * @param {number} radiusKm - Search radius
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Users within radius with distance
 */
async function findNearbyUsersOptimized(db, lat, lon, radiusKm = 25, limit = 100) {
  const precision = getGeohashPrecision(radiusKm);
  const centerHash = simpleGeohash(lat, lon, precision);
  const searchHashes = getGeohashNeighbors(centerHash, precision);

  // Query users with matching geohashes
  const usersSnapshot = await db
    .collection('users')
    .where('locationGeohash', 'in', searchHashes.slice(0, 10)) // Firestore 'in' limit is 10
    .limit(limit * 2) // Get more for filtering
    .get();

  const users = [];
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    if (isValidLocation(userData.location)) {
      users.push({
        userId: doc.id,
        ...userData,
      });
    }
  });

  // Calculate distances and filter by radius
  return findUsersWithinRadius({ latitude: lat, longitude: lon }, users, radiusKm)
    .slice(0, limit);
}

module.exports = {
  calculateDistance,
  formatDistance,
  isValidLocation,
  findUsersWithinRadius,
  getDistanceCategory,
  getBoundingBox,
  isInBoundingBox,
  simpleGeohash,
  getGeohashNeighbors,
  getGeohashPrecision,
  findNearbyUsersOptimized,
  approximateLocation,
  toRadians,
};
