/**
 * Geolocation Manager
 * Handles location-based discovery, distance calculations, and map features
 */

const geolib = require("geolib");
const { collections } = require("../config/firebase");

class GeolocationManager {
  /**
   * Calculate distance between two coordinates in kilometers
   * @param {object} coords1 - {latitude, longitude}
   * @param {object} coords2 - {latitude, longitude}
   * @returns {number} Distance in kilometers
   */
  static calculateDistance(coords1, coords2) {
    try {
      const distanceInMeters = geolib.getDistance(coords1, coords2);
      return distanceInMeters / 1000; // Convert to kilometers
    } catch (error) {
      console.error("Error calculating distance:", error);
      return 0;
    }
  }

  /**
   * Find nearby users based on location and filters
   * @param {string} userId - Current user ID
   * @param {number} maxDistance - Maximum distance in kilometers (default: 50)
   * @param {object} filters - Optional filters (interests, level, tier)
   * @returns {object} Success status and list of nearby users
   */
  static async findNearbyUsers(userId, maxDistance = 50, filters = {}) {
    try {
      const userDoc = await collections.users.doc(userId).get();
      const currentUser = userDoc.data();

      if (!currentUser.location || !currentUser.location.latitude) {
        return {
          success: false,
          error: "Location not set. Please share your location first.",
        };
      }

      // Get all users with location enabled
      const usersSnapshot = await collections.users
        .where("locationEnabled", "==", true)
        .get();

      const nearbyUsers = [];

      usersSnapshot.forEach((doc) => {
        // Skip current user
        if (doc.id === userId) return;

        const user = doc.data();

        // Skip users without location
        if (!user.location || !user.location.latitude) return;

        // Calculate distance
        const distance = this.calculateDistance(
          {
            latitude: currentUser.location.latitude,
            longitude: currentUser.location.longitude,
          },
          {
            latitude: user.location.latitude,
            longitude: user.location.longitude,
          }
        );

        // Skip if too far
        if (distance > maxDistance) return;

        // Apply interest filters
        if (filters.interests && filters.interests.length > 0) {
          const hasCommonInterest = user.interests?.some((interest) =>
            filters.interests.includes(interest)
          );
          if (!hasCommonInterest) return;
        }

        // Apply level filters
        if (filters.minLevel && user.level < filters.minLevel) return;
        if (filters.maxLevel && user.level > filters.maxLevel) return;

        // Apply tier filters
        if (filters.tier && user.tier !== filters.tier) return;

        // Apply age filters (if available)
        if (filters.minAge && user.age && user.age < filters.minAge) return;
        if (filters.maxAge && user.age && user.age > filters.maxAge) return;

        // Add to nearby users
        nearbyUsers.push({
          userId: doc.id,
          username: user.username,
          bio: user.bio,
          level: user.level,
          tier: user.tier,
          age: user.age,
          interests: user.interests,
          badges: user.badges,
          profilePhoto: user.profilePhoto,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
          lastActive: user.lastActive,
          verified: user.verified || false,
        });
      });

      // Sort by distance (closest first)
      nearbyUsers.sort((a, b) => a.distance - b.distance);

      return {
        success: true,
        users: nearbyUsers,
        count: nearbyUsers.length,
      };
    } catch (error) {
      console.error("Error finding nearby users:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update user's location
   * @param {string} userId - User ID
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {object} Success status
   */
  static async updateUserLocation(userId, latitude, longitude) {
    try {
      // Validate coordinates
      if (!this.isValidCoordinate(latitude, longitude)) {
        return {
          success: false,
          error: "Invalid coordinates provided",
        };
      }

      await collections.users.doc(userId).update({
        location: {
          latitude,
          longitude,
          updatedAt: new Date().toISOString(),
        },
        locationEnabled: true,
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating location:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Toggle location sharing for user
   * @param {string} userId - User ID
   * @param {boolean} enabled - Enable or disable
   * @returns {object} Success status
   */
  static async toggleLocationSharing(userId, enabled) {
    try {
      await collections.users.doc(userId).update({
        locationEnabled: enabled,
      });

      return { success: true, enabled };
    } catch (error) {
      console.error("Error toggling location:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get map URL for static map image
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {number} zoom - Zoom level (default: 14)
   * @returns {string} Map image URL
   */
  static getMapUrl(latitude, longitude, zoom = 14) {
    const mapboxToken = process.env.MAPBOX_API_KEY || "your_token";

    // Mapbox Static Images API
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${longitude},${latitude},${zoom}/600x400@2x?access_token=${mapboxToken}`;
  }

  /**
   * Get map URL with markers for multiple locations
   * @param {array} locations - Array of {lat, lng, color} objects
   * @param {object} center - Center point {latitude, longitude}
   * @param {number} zoom - Zoom level
   * @returns {string} Map image URL with markers
   */
  static getMapUrlWithMarkers(locations, center, zoom = 12) {
    const mapboxToken = process.env.MAPBOX_API_KEY || "your_token";

    // Build markers string
    let markers = locations
      .map((loc) => {
        const color = loc.color || "red";
        return `pin-s-${color}(${loc.lng},${loc.lat})`;
      })
      .join(",");

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${markers}/${center.longitude},${center.latitude},${zoom}/600x400@2x?access_token=${mapboxToken}`;
  }

  /**
   * Validate coordinates
   * @param {number} latitude - Latitude (-90 to 90)
   * @param {number} longitude - Longitude (-180 to 180)
   * @returns {boolean} Valid or not
   */
  static isValidCoordinate(latitude, longitude) {
    return (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Get bounding box for a given point and radius
   * @param {number} latitude - Center latitude
   * @param {number} longitude - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {object} Bounding box {minLat, maxLat, minLng, maxLng}
   */
  static getBoundingBox(latitude, longitude, radiusKm) {
    // Earth's radius in km
    const earthRadius = 6371;

    // Convert radius to radians
    const radLat = (latitude * Math.PI) / 180;
    const radLng = (longitude * Math.PI) / 180;
    const angularDistance = radiusKm / earthRadius;

    const minLat = latitude - (angularDistance * 180) / Math.PI;
    const maxLat = latitude + (angularDistance * 180) / Math.PI;

    const deltaLng = Math.asin(Math.sin(angularDistance) / Math.cos(radLat));
    const minLng = longitude - (deltaLng * 180) / Math.PI;
    const maxLng = longitude + (deltaLng * 180) / Math.PI;

    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
    };
  }

  /**
   * Check if point is within bounding box
   * @param {number} latitude - Point latitude
   * @param {number} longitude - Point longitude
   * @param {object} boundingBox - Bounding box from getBoundingBox
   * @returns {boolean} Inside or outside
   */
  static isInBoundingBox(latitude, longitude, boundingBox) {
    return (
      latitude >= boundingBox.minLat &&
      latitude <= boundingBox.maxLat &&
      longitude >= boundingBox.minLng &&
      longitude <= boundingBox.maxLng
    );
  }

  /**
   * Get center point between multiple coordinates
   * @param {array} coordinates - Array of {latitude, longitude} objects
   * @returns {object} Center point {latitude, longitude}
   */
  static getCenterPoint(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    try {
      const center = geolib.getCenter(coordinates);
      return {
        latitude: center.latitude,
        longitude: center.longitude,
      };
    } catch (error) {
      console.error("Error getting center point:", error);
      return null;
    }
  }

  /**
   * Format distance for display
   * @param {number} distanceKm - Distance in kilometers
   * @param {string} language - Language code (en/es)
   * @returns {string} Formatted distance string
   */
  static formatDistance(distanceKm, language = "en") {
    const translations = {
      en: {
        meters: "m",
        kilometers: "km",
        away: "away",
      },
      es: {
        meters: "m",
        kilometers: "km",
        away: "de distancia",
      },
    };

    const t = translations[language] || translations.en;

    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return `${meters}${t.meters} ${t.away}`;
    }

    return `${distanceKm.toFixed(1)}${t.kilometers} ${t.away}`;
  }

  /**
   * Get location privacy level
   * @param {string} privacyLevel - 'exact', 'approximate', 'city', 'hidden'
   * @param {object} location - Original location
   * @returns {object} Adjusted location based on privacy
   */
  static getPrivateLocation(privacyLevel, location) {
    switch (privacyLevel) {
      case "exact":
        return location;

      case "approximate":
        // Round to 2 decimal places (~1km accuracy)
        return {
          latitude: Math.round(location.latitude * 100) / 100,
          longitude: Math.round(location.longitude * 100) / 100,
        };

      case "city":
        // Round to 1 decimal place (~10km accuracy)
        return {
          latitude: Math.round(location.latitude * 10) / 10,
          longitude: Math.round(location.longitude * 10) / 10,
        };

      case "hidden":
      default:
        return null;
    }
  }

  /**
   * Check if user is near a specific location
   * @param {string} userId - User ID
   * @param {object} targetLocation - {latitude, longitude}
   * @param {number} radiusKm - Radius in kilometers
   * @returns {boolean} True if user is within radius
   */
  static async isUserNearLocation(userId, targetLocation, radiusKm = 5) {
    try {
      const userDoc = await collections.users.doc(userId).get();
      const userData = userDoc.data();

      if (!userData.location) return false;

      const distance = this.calculateDistance(
        userData.location,
        targetLocation
      );

      return distance <= radiusKm;
    } catch (error) {
      console.error("Error checking user proximity:", error);
      return false;
    }
  }
}

module.exports = GeolocationManager;
