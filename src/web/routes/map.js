const express = require("express");
const router = express.Router();
const geoService = require("../../services/geoService");
const { authMiddleware } = require("../middleware/auth");

router.get("/nearby", authMiddleware, async (req, res) => {
  try {
    const { lat, lng, distance } = req.query;
    const coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const maxDistance = parseInt(distance) || 50;

    const nearbyUsers = await geoService.getNearbyUsers(
      coordinates,
      maxDistance
    );
    res.json({ users: nearbyUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
