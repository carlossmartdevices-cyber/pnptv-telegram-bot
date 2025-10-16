/**
 * Web Server for Telegram Mini App
 * Serves the Mini App interface and API endpoints
 */

const express = require("express");
const path = require("path");
const { db } = require("../config/firebase");
const logger = require("../utils/logger");
const {
  calculateDistance,
  formatDistance,
  findUsersWithinRadius,
} = require("../utils/geolocation");

const app = express();
// Railway sets PORT automatically, fallback to WEB_PORT or 3000
const PORT = process.env.PORT || process.env.WEB_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data
app.use(express.static(path.join(__dirname, "public")));

// CORS for Telegram Mini Apps
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

/**
 * API: Get user profile
 */
app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = doc.data();
    res.json({
      success: true,
      user: {
        userId: userData.userId,
        username: userData.username || "Anonymous",
        bio: userData.bio || null,
        location: userData.location || null,
        tier: userData.tier || "Free",
        xp: userData.xp || 0,
        badges: userData.badges || [],
        photoFileId: userData.photoFileId || null,
        createdAt: userData.createdAt,
      },
    });

    logger.info(`API: Profile fetched for user ${userId}`);
  } catch (error) {
    logger.error("API Error fetching profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * API: Update user profile
 */
app.put("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { bio, location } = req.body;

    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;

    await db.collection("users").doc(userId).update(updateData);

    res.json({ success: true, message: "Profile updated" });
    logger.info(`API: Profile updated for user ${userId}`);
  } catch (error) {
    logger.error("API Error updating profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * API: Get nearby users
 */
app.post("/api/map/nearby", async (req, res) => {
  try {
    const { userId, latitude, longitude, radius = 25 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Location required" });
    }

    const userLocation = { latitude, longitude };

    // Fetch all users with location
    const usersSnapshot = await db
      .collection("users")
      .where("location", "!=", null)
      .limit(100)
      .get();

    let allUsers = [];
    usersSnapshot.forEach((doc) => {
      if (doc.id !== userId) {
        const data = doc.data();
        allUsers.push({
          userId: doc.id,
          username: data.username || "Anonymous",
          tier: data.tier || "Free",
          location: data.location,
          bio: data.bio || null,
          xp: data.xp || 0,
          photoFileId: data.photoFileId || null,
        });
      }
    });

    const nearbyUsers = findUsersWithinRadius(userLocation, allUsers, radius);

    res.json({
      success: true,
      count: nearbyUsers.length,
      radius,
      users: nearbyUsers.slice(0, 50), // Limit to 50 users
    });

    logger.info(
      `API: Found ${nearbyUsers.length} users within ${radius}km for user ${userId}`
    );
  } catch (error) {
    logger.error("API Error finding nearby users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * API: Get live streams (placeholder for now)
 */
app.get("/api/live/streams", async (req, res) => {
  try {
    // Placeholder - will be implemented with actual streaming functionality
    res.json({
      success: true,
      streams: [],
      message: "Live streaming coming soon!",
    });

    logger.info("API: Live streams fetched");
  } catch (error) {
    logger.error("API Error fetching streams:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * API: Get subscription plans
 */
app.get("/api/plans", (req, res) => {
  const plans = require("../config/plans");
  res.json({ success: true, plans });
});

/**
 * ePayco Webhook Routes
 */
const epaycoWebhook = require("./epaycoWebhook");
app.use("/epayco", epaycoWebhook);

/**
 * Serve Mini App main page
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Track if server is already running
let serverInstance = null;

/**
 * Start server (only once)
 */
function startServer() {
  return new Promise((resolve, reject) => {
    // Prevent duplicate server instances
    if (serverInstance) {
      logger.info("Web server already running, skipping duplicate start");
      return resolve(serverInstance);
    }

    const server = app.listen(PORT, () => {
      logger.info(`Web server running on port ${PORT}`);
      console.log(`🌐 Mini App available at: http://localhost:${PORT}`);
      serverInstance = server;
      resolve(server);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.warn(`Port ${PORT} already in use, server may already be running`);
        // Don't reject, just resolve null
        resolve(null);
      } else {
        logger.error("Failed to start web server:", error);
        reject(error);
      }
    });
  });
}

// Export for use in bot
module.exports = { app, startServer };
