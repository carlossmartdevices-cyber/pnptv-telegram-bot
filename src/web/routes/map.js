const express = require("express");
const router = express.Router();
const geoService = require("../../services/geoService");
// Use authenticateTelegramUser from auth middleware
const { authenticateTelegramUser } = require("../middleware/auth");

// Protect the nearby users endpoint with Telegram authentication.  This was
// previously using an `authMiddleware` import which did not exist in
// middleware/auth.js, causing a runtime error.  Use the exported
// `authenticateTelegramUser` function instead.
router.get("/nearby", authenticateTelegramUser, async (req, res) => {
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
