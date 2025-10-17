const { db } = require("../config/firebase");
const { calculateDistance } = require("../utils/geolocation");

class GeoService {
  constructor() {
    this.usersCollection = db.collection("users");
  }

  async getNearbyUsers(coordinates, maxDistance = 50) {
    const snapshot = await this.usersCollection.get();
    const nearbyUsers = [];

    snapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.location?.coordinates) {
        const distance = calculateDistance(
          coordinates,
          userData.location.coordinates
        );
        if (distance <= maxDistance) {
          nearbyUsers.push({
            id: doc.id,
            distance,
            ...userData,
            location: {
              ...userData.location,
              distance,
            },
          });
        }
      }
    });

    return nearbyUsers.sort((a, b) => a.distance - b.distance);
  }
}

module.exports = new GeoService();
