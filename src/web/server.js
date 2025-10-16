/**
 * Web Server for Telegram Mini App
 * Serves the Mini App interface and API endpoints
 */

const express = require("express");
const path = require("path");
const { db } = require("../config/firebase");
const logger = require("../utils/logger");
const {
  findUsersWithinRadius,
  getDistanceCategory,
  getBoundingBox,
  isInBoundingBox,
  approximateLocation,
  isValidLocation,
  simpleGeohash,
} = require("../utils/geolocation");
const { getMembershipInfo } = require("../utils/membershipManager");

const app = express();
// Railway sets PORT automatically, fallback to WEB_PORT or 3000
const PORT = process.env.PORT || process.env.WEB_PORT || 3000;

// Constants
const MAX_BIO_LENGTH = 500;
const MAX_NEARBY_USERS = 100;

// Constants
const MAX_BIO_LENGTH = 500;

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
 * Helpers
 */
function serializeDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return null;
}

function buildUserResponse(userId, userData, membershipInfo = null) {
  const location =
    userData.location && isValidLocation(userData.location)
      ? userData.location
      : null;

  const locationName =
    userData.locationName ||
    (location
      ? approximateLocation(location.latitude, location.longitude)
      : null);

  return {
    userId: userId,
    username: userData.username || "Anonymous",
    bio: userData.bio || null,
    location,
    locationName,
    tier: userData.tier || "Free",
    xp: userData.xp || 0,
    badges: userData.badges || [],
    photoFileId: userData.photoFileId || null,
    createdAt: serializeDate(userData.createdAt),
    lastActive: serializeDate(userData.lastActive),
    locationUpdatedAt: serializeDate(userData.locationUpdatedAt),
    membership: membershipInfo
      ? {
          tier: membershipInfo.tier,
          status: membershipInfo.status,
          expiresAt: serializeDate(membershipInfo.expiresAt),
          daysRemaining: membershipInfo.daysRemaining,
          updatedAt: serializeDate(membershipInfo.updatedAt),
          updatedBy: membershipInfo.updatedBy || null,
        }
      : null,
  };
}

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

  const parsedLocation = {
    latitude: Number(rawLocation.latitude),
    longitude: Number(rawLocation.longitude),
  };

  if (!isValidLocation(parsedLocation)) {
    throw new Error("Invalid location coordinates");
  }

  return {
    location: parsedLocation,
    locationName: approximateLocation(
      parsedLocation.latitude,
      parsedLocation.longitude
    ),
    locationGeohash: simpleGeohash(
      parsedLocation.latitude,
      parsedLocation.longitude
    ),
    locationUpdatedAt: new Date(),
  };
}

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

    let membershipInfo = null;
    try {
      membershipInfo = await getMembershipInfo(userId);
    } catch (membershipError) {
      logger.warn(
        `API: Failed to load membership info for user ${userId}:`,
        membershipError.message
      );
    }

    res.json({
      success: true,
      user: buildUserResponse(userId, userData, membershipInfo),
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
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData = {};

    if (bio !== undefined) {
      if (typeof bio !== "string" || bio.length > MAX_BIO_LENGTH) {
        return res
          .status(400)
          .json({ error: `Bio must be a string of up to ${MAX_BIO_LENGTH} characters` });
      }
      updateData.bio = bio.trim();
    }

    if (location !== undefined) {
      try {
        Object.assign(updateData, prepareLocationUpdate(location));
      } catch (locationError) {
        return res.status(400).json({ error: locationError.message });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }

    updateData.updatedAt = new Date();

    await userRef.update(updateData);

    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();

    let membershipInfo = null;
    try {
      membershipInfo = await getMembershipInfo(userId);
    } catch (membershipError) {
      logger.warn(
        `API: Failed to refresh membership info for user ${userId}:`,
        membershipError.message
      );
    }

    res.json({
      success: true,
      message: "Profile updated",
      user: buildUserResponse(userId, updatedData, membershipInfo),
    });
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

    const userLocation = {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };

    if (!isValidLocation(userLocation)) {
      return res.status(400).json({ error: "Valid latitude and longitude required" });
    }

    const searchRadius = Number(radius) || 25;
    const boundingBox = getBoundingBox(
      userLocation.latitude,
      userLocation.longitude,
    const usersSnapshot = await db
      .collection("users")
      .where("location", "!=", null)
      .limit(MAX_CANDIDATE_USERS)
      .get();
      .where("location", "!=", null)
      .limit(300)
      .get();

    const candidates = [];
    usersSnapshot.forEach((doc) => {
      if (doc.id === userId) {
        return;
      }

      const data = doc.data();
      if (!isValidLocation(data.location)) {
        return;
      }

      if (!isInBoundingBox(data.location, boundingBox)) {
        return;
      }

      const locationName =
        data.locationName ||
        approximateLocation(
          data.location.latitude,
          data.location.longitude
        );

      const lastActive = data.lastActive?.toDate
        ? data.lastActive.toDate()
        : data.lastActive || null;

      candidates.push({
        userId: doc.id,
        username: data.username || "Anonymous",
        tier: data.tier || "Free",
        location: data.location,
        locationName,
        bio: data.bio || null,
        xp: data.xp || 0,
        photoFileId: data.photoFileId || null,
        lastActive,
    const nearbyUsers = findUsersWithinRadius(
      userLocation,
      candidates,
      searchRadius
    )
      .slice(0, MAX_NEARBY_USERS)
      .map((user) => ({
        userId: user.userId,
        username: user.username,
        tier: user.tier,
        bio: user.bio,
        xp: user.xp,
        photoFileId: user.photoFileId,
        location: user.location,
        locationName: user.locationName,
        distance: user.distance,
        distanceFormatted: user.distanceFormatted,
        distanceCategory: getDistanceCategory(user.distance),
        lastActive: serializeDate(user.lastActive),
      }));
        distanceCategory: getDistanceCategory(user.distance),
        lastActive: serializeDate(user.lastActive),
      }));

    res.json({
      success: true,
      users: nearbyUsers,
    });

    logger.info(
      `API: Nearby users fetched for ${userId || "unknown"} within ${searchRadius}km`
    );
  } catch (error) {
    logger.error("API Error fetching nearby users:", error);
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
 * API: Create payment link for subscription
 */
app.post("/api/payment/create", async (req, res) => {
  try {
    const { userId, planType } = req.body;

    logger.info(`[API] Payment link creation requested`, {
      userId,
      planType,
    });

    // Validate inputs
    if (!userId || !planType) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: userId, planType",
      });
    }

    // Get user data
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const userData = userDoc.data();
    const userEmail = userData.email || `${userId}@telegram.user`;
    const userName = userData.username || `User${userId}`;

    // Get plan configuration
    const plans = require("../config/plans");
    const planKey = planType.toUpperCase();
    const plan = plans[planKey];

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: `Invalid plan type: ${planType}`,
      });
    }

    // Check if user already has this tier
    if (userData.tier === plan.tier) {
      return res.status(400).json({
        success: false,
        error: `You already have the ${plan.tier} plan`,
      });
    }

    // Create payment link
    const epayco = require("../config/epayco");
    const paymentData = await epayco.createPaymentLink({
      name: plan.name,
      description: plan.description,
      amount: plan.priceInCOP,
      currency: "COP",
      userId: userId,
      userEmail: userEmail,
      userName: userName,
      plan: planType.toLowerCase(),
    });

    logger.info(`[API] Payment link created successfully`, {
      userId,
      planType,
      reference: paymentData.reference,
    });

    res.json({
      success: true,
      paymentUrl: paymentData.paymentUrl,
      reference: paymentData.reference,
      plan: {
        name: plan.name,
        price: plan.priceInCOP,
        currency: "COP",
        tier: plan.tier,
      },
    });
  } catch (error) {
    logger.error("[API] Error creating payment link:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create payment link",
      message: error.message,
    });
  }
});

/**
 * ePayco Webhook Routes
 */
const epaycoWebhook = require("./epaycoWebhook");
app.use("/epayco", epaycoWebhook);

/**
 * Debug: Test ePayco payment link creation
 */
app.get("/debug/test-payment", async (req, res) => {
  try {
    const epayco = require("../config/epayco");
    const plans = require("../config/plans");

    const testUserId = "123456789";
    const plan = plans.SILVER;

    logger.info("[DEBUG] Testing ePayco payment link creation");
    logger.info("[DEBUG] Environment check:", {
      publicKey: !!process.env.EPAYCO_PUBLIC_KEY,
      privateKey: !!process.env.EPAYCO_PRIVATE_KEY,
      testMode: process.env.EPAYCO_TEST_MODE,
    });

    const paymentData = await epayco.createPaymentLink({
      name: plan.name,
      description: plan.description || `${plan.name} subscription`,
      amount: plan.priceInCOP,
      currency: "COP",
      userId: testUserId,
      userEmail: "test@telegram.user",
      userName: "Test User",
      plan: "silver",
    });

    res.json({
      success: true,
      message: "Payment link created successfully",
      data: {
        paymentUrl: paymentData.paymentUrl,
        reference: paymentData.reference,
        invoiceId: paymentData.invoiceId,
      },
    });

    logger.info("[DEBUG] Payment link test successful");
  } catch (error) {
    logger.error("[DEBUG] Payment link test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

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
