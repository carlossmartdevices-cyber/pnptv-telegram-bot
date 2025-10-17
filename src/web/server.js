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
  approximateLocation,
  isValidLocation,
  simpleGeohash,
  getGeohashNeighbors,
  getGeohashPrecision,
} = require("../utils/geolocation");
const {
  buildUserResponse,
  prepareLocationUpdate,
} = require("../services/profileService");
const { getMembershipInfo } = require("../utils/membershipManager");
const planService = require("../services/planService");
const epayco = require("../config/epayco");
const {
  authenticateTelegramUser,
  validateTelegramLoginPayload,
} = require("./middleware/auth");
const { errorHandler, asyncHandler } = require("../utils/errorHandler");
const {
  handleFirestoreError,
  wrapFirestoreOperation,
} = require("../utils/firestoreErrorHandler");
const {
  initSentry,
  getRequestHandler,
  getTracingHandler,
  getErrorHandler,
} = require("../config/sentry");

const app = express();

// Initialize Sentry (must be before any other middleware)
const sentryEnabled = initSentry({
  environment: process.env.NODE_ENV || "production",
  release: process.env.npm_package_version,
});

// Sentry request handler (must be first middleware)
if (sentryEnabled) {
  app.use(getRequestHandler());
  app.use(getTracingHandler());
}
// Railway sets PORT automatically, fallback to WEB_PORT or 3000
const PORT = process.env.PORT || process.env.WEB_PORT || 3000;

// Constants
const MAX_BIO_LENGTH = 500;
const MAX_NEARBY_USERS = 100;

// Middleware
app.use(express.json({ limit: '100mb' })); // Increase limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // For form data

// Cache-busting middleware for static files
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, path) => {
      // Disable caching for HTML, CSS, and JS files to ensure users always get latest version
      if (
        path.endsWith(".html") ||
        path.endsWith(".css") ||
        path.endsWith(".js")
      ) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  })
);

// CORS for Telegram Mini Apps
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Telegram-Init-Data");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
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

function serializeProfileResponse(profile) {
  if (!profile) {
    return null;
  }

  const membership = profile.membership
    ? {
        ...profile.membership,
        expiresAt: serializeDate(profile.membership.expiresAt),
        updatedAt: serializeDate(profile.membership.updatedAt),
      }
    : null;

  return {
    ...profile,
    createdAt: serializeDate(profile.createdAt),
    lastActive: serializeDate(profile.lastActive),
    locationUpdatedAt: serializeDate(profile.locationUpdatedAt),
    membership,
  };
}

/**
 * Public configuration for client bootstrap
 */
app.get("/api/config/public", (req, res) => {
  res.json({
    success: true,
    telegramLoginBot:
      process.env.TELEGRAM_LOGIN_BOT ||
      process.env.TELEGRAM_BOT_USERNAME ||
      null,
    miniAppUrl: process.env.WEB_APP_URL || null,
  });
});

/**
 * API: Telegram Login Widget callback
 */
app.post(
  "/api/auth/telegram-login",
  asyncHandler(async (req, res) => {
    const botToken =
      process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({
        success: false,
        error: "Telegram bot token is not configured on the server",
      });
    }

    const loginData = validateTelegramLoginPayload(req.body || {}, botToken);

    if (!loginData || !loginData.id) {
      return res.status(401).json({
        success: false,
        error: "Invalid Telegram login payload",
      });
    }

    const userId = loginData.id;
    const userRef = db.collection("users").doc(userId);
    const existingDoc = await userRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;
    const now = new Date();

    const updateData = {
      userId,
      username: loginData.username || existingData?.username || null,
      firstName: loginData.firstName || existingData?.firstName || null,
      lastName: loginData.lastName || existingData?.lastName || null,
      photoUrl: loginData.photoUrl || existingData?.photoUrl || null,
      language: (req.body && req.body.language) || existingData?.language || "en",
      lastLoginViaWeb: now,
      lastActive: now,
    };

    if (!existingDoc.exists) {
      updateData.createdAt = now;
      updateData.onboardingComplete = false;
      updateData.ageVerified = false;
    }

    await userRef.set(updateData, { merge: true });

    logger.info("[Auth] Telegram login widget success", { userId });

    res.json({
      success: true,
      user: {
        userId,
        username: updateData.username,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        requiresTelegramOnboarding: !existingData?.onboardingComplete,
      },
    });
  })
);

/**
 * API: Get user profile
 */
app.get("/api/profile/:userId", authenticateTelegramUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format (must be a positive integer)
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Wrap Firestore operation with error handling
    const doc = await wrapFirestoreOperation(
      async () => {
        const userRef = db.collection("users").doc(userId);
        return await userRef.get();
      },
      'fetch user profile',
      { userId, path: req.path }
    );

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

    const profile = buildUserResponse(userId, userData, membershipInfo);

    res.json({
      success: true,
      user: serializeProfileResponse(profile),
    });

    logger.info(`API: Profile fetched for user ${userId}`);
  } catch (error) {
    // Handle Firestore-specific errors
    const errorResponse = handleFirestoreError(error, 'fetch user profile', {
      userId: req.params.userId,
      path: req.path
    });

    return res.status(errorResponse.statusCode).json({
      success: false,
      error: errorResponse.error,
      retryable: errorResponse.retryable
    });
  }
});

/**
 * API: Update user profile
 */
app.put("/api/profile/:userId", authenticateTelegramUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format (must be a positive integer)
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Validate req.body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: "Request body is required"
      });
    }

    const { bio, location } = req.body;

    // Wrap Firestore operations with error handling
    const { updatedData } = await wrapFirestoreOperation(
      async () => {
        const userRef = db.collection("users").doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
          const error = new Error("User not found");
          error.statusCode = 404;
          throw error;
        }

        const updateData = {};

        if (bio !== undefined) {
          if (typeof bio !== "string" || bio.length > MAX_BIO_LENGTH) {
            const error = new Error(`Bio must be a string of up to ${MAX_BIO_LENGTH} characters`);
            error.statusCode = 400;
            throw error;
          }
          updateData.bio = bio.trim();
        }

        if (location !== undefined) {
          try {
            Object.assign(updateData, prepareLocationUpdate(location));
          } catch (locationError) {
            locationError.statusCode = 400;
            throw locationError;
          }
        }

        if (Object.keys(updateData).length === 0) {
          const error = new Error("No valid fields provided for update");
          error.statusCode = 400;
          throw error;
        }

        updateData.updatedAt = new Date();

        await userRef.update(updateData);

        const updatedDoc = await userRef.get();
        return { updatedData: updatedDoc.data() };
      },
      'update user profile',
      { userId, path: req.path }
    );

    let membershipInfo = null;
    try {
      membershipInfo = await getMembershipInfo(userId);
    } catch (membershipError) {
      logger.warn(
        `API: Failed to refresh membership info for user ${userId}:`,
        membershipError.message
      );
    }

    const profile = buildUserResponse(userId, updatedData, membershipInfo);

    res.json({
      success: true,
      message: "Profile updated",
      user: serializeProfileResponse(profile),
    });
    logger.info(`API: Profile updated for user ${userId}`);
  } catch (error) {
    // Handle Firestore-specific errors
    const errorResponse = handleFirestoreError(error, 'update user profile', {
      userId: req.params.userId,
      path: req.path
    });

    return res.status(errorResponse.statusCode).json({
      success: false,
      error: errorResponse.error,
      retryable: errorResponse.retryable
    });
  }
});

/**
 * API: Get nearby users
 */
app.post("/api/map/nearby", authenticateTelegramUser, async (req, res) => {
  try {
    // Validate req.body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: "Request body is required"
      });
    }

    const { userId, latitude, longitude, radius = 25 } = req.body;

    const userLocation = {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };

    if (!isValidLocation(userLocation)) {
      return res
        .status(400)
        .json({ error: "Valid latitude and longitude required" });
    }

    const searchRadius = Number(radius) || 25;

    // OPTIMIZED: Use geohash-based querying for better performance
    const precision = getGeohashPrecision(searchRadius);
    const centerHash = simpleGeohash(
      userLocation.latitude,
      userLocation.longitude,
      precision
    );
    const searchHashes = getGeohashNeighbors(centerHash, precision);

    // Query users with matching geohashes (up to 10 due to Firestore 'in' limit)
    const usersSnapshot = await wrapFirestoreOperation(
      async () => {
        return await db
          .collection("users")
          .where("locationGeohash", "in", searchHashes.slice(0, 10))
          .limit(MAX_NEARBY_USERS * 2) // Get more for filtering
          .get();
      },
      'query nearby users',
      { userId, searchRadius, path: req.path }
    );

    const candidates = [];
    usersSnapshot.forEach((doc) => {
      if (doc.id === userId) {
        return;
      }

      const data = doc.data();
      if (!isValidLocation(data.location)) {
        return;
      }

      const locationName =
        data.locationName ||
        approximateLocation(data.location.latitude, data.location.longitude);

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
      });
    });

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

    res.json({
      success: true,
      users: nearbyUsers,
    });

    logger.info(
      `API: Nearby users fetched for ${
        userId || "unknown"
      } within ${searchRadius}km`
    );
  } catch (error) {
    // Handle Firestore-specific errors
    const errorResponse = handleFirestoreError(error, 'query nearby users', {
      userId: req.body.userId,
      searchRadius,
      path: req.path
    });

    return res.status(errorResponse.statusCode).json({
      success: false,
      error: errorResponse.error,
      retryable: errorResponse.retryable
    });
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
app.get(
  "/api/plans",
  asyncHandler(async (req, res) => {
    const plans = await planService.listPlans();
    res.json({
      success: true,
      plans,
    });
  })
);

/**
 * API: Create payment link for subscription
 */
app.post(
  "/api/payment/create",
  authenticateTelegramUser,
  asyncHandler(async (req, res) => {
    // Validate req.body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        error: "Request body is required"
      });
    }

    const { userId, planId, planType } = req.body;
    const planIdentifier = planId || planType;

    logger.info("[API] Payment link creation requested", {
      userId,
      planIdentifier,
    });

    if (!userId || !planIdentifier) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: userId, planId",
      });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const plan =
      (await planService.getPlanById(planIdentifier)) ||
      (await planService.getPlanBySlug(String(planIdentifier).toLowerCase()));

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: `Invalid plan identifier: ${planIdentifier}`,
      });
    }

    const userData = userDoc.data();
    const userEmail = userData.email || `${userId}@telegram.user`;
    const userName = userData.username || `User${userId}`;

    const paymentData = await epayco.createPaymentLink({
      name: plan.name,
      description:
        plan.description ||
        `${plan.name} subscription - ${plan.durationDays} days`,
      amount: plan.priceInCOP,
      currency: plan.currency || "COP",
      userId,
      userEmail,
      userName,
      plan: plan.id,
    });

    if (!paymentData.success) {
      throw new Error(paymentData.error || "Failed to create payment link");
    }

    logger.info("[API] Payment link created successfully", {
      userId,
      planId: plan.id,
      reference: paymentData.reference,
    });

    res.json({
      success: true,
      paymentUrl: paymentData.paymentUrl,
      reference: paymentData.reference,
      plan,
    });
  })
);
/**
 * Posts Routes
 */
const postsRouter = require("./routes/posts");
app.use("/api/posts", postsRouter);

/**
 * Admin Routes
 */
const adminRouter = require("./routes/admin");
app.use("/api/admin", adminRouter);

/**
 * Monitoring Routes
 */
const monitoringRouter = require("./routes/monitoring");
app.use("/api/monitoring", monitoringRouter);

/**
 * ePayco Webhook Routes
 */
const epaycoWebhook = require("./epaycoWebhook");
app.use("/epayco", epaycoWebhook);

/**
 * Debug: Test ePayco payment link creation
 */
app.get(
  "/debug/test-payment",
  asyncHandler(async (req, res) => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.EPAYCO_TEST_MODE === "true" ? "test" : "production",
      credentials: {},
      validation: {},
      paymentLink: {},
    };

    try {
      // Step 1: Check credentials configuration
      logger.info("[DEBUG] Step 1: Checking ePayco credentials configuration");

      const credentials = {
        EPAYCO_PUBLIC_KEY: process.env.EPAYCO_PUBLIC_KEY ? "✓ Configured" : "✗ Missing",
        EPAYCO_PRIVATE_KEY: process.env.EPAYCO_PRIVATE_KEY ? "✓ Configured" : "✗ Missing",
        EPAYCO_P_CUST_ID: process.env.EPAYCO_P_CUST_ID ? "✓ Configured" : "✗ Missing",
        EPAYCO_P_KEY: process.env.EPAYCO_P_KEY ? "✓ Configured" : "✗ Missing",
        EPAYCO_TEST_MODE: process.env.EPAYCO_TEST_MODE || "not set",
        EPAYCO_RESPONSE_URL: process.env.EPAYCO_RESPONSE_URL || "not set",
        EPAYCO_CONFIRMATION_URL: process.env.EPAYCO_CONFIRMATION_URL || "not set",
        BOT_URL: process.env.BOT_URL || "not set",
      };

      diagnostics.credentials = credentials;

      // Check if all credentials are configured
      const missingCredentials = Object.entries(credentials)
        .filter(([key, value]) => value.includes("Missing"))
        .map(([key]) => key);

      if (missingCredentials.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing ePayco credentials: ${missingCredentials.join(", ")}`,
          message: "Please configure all required ePayco credentials in your .env file",
          diagnostics,
          instructions: {
            step1: "Check your .env file",
            step2: "Ensure all EPAYCO_* variables are set",
            step3: "Restart your application after updating .env",
            requiredVariables: [
              "EPAYCO_PUBLIC_KEY",
              "EPAYCO_PRIVATE_KEY",
              "EPAYCO_P_CUST_ID",
              "EPAYCO_P_KEY",
              "EPAYCO_TEST_MODE",
              "BOT_URL (for webhook URLs)",
            ],
          },
        });
      }

      // Step 2: Validate credentials using the validation function
      logger.info("[DEBUG] Step 2: Validating credentials");
      try {
        epayco.validateCredentials();
        diagnostics.validation.credentials = "✓ Valid";
      } catch (validationError) {
        diagnostics.validation.credentials = `✗ ${validationError.message}`;
        throw validationError;
      }

      // Step 3: Get available plans
      logger.info("[DEBUG] Step 3: Fetching available plans");
      const plans = await planService.listPlans();

      if (!plans || plans.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No active plans available",
          diagnostics,
        });
      }

      const plan = plans[0];
      diagnostics.validation.plansAvailable = `✓ ${plans.length} plan(s) found`;
      diagnostics.validation.testPlan = {
        id: plan.id,
        name: plan.name,
        price: plan.priceInCOP,
        currency: plan.currency || "COP",
      };

      // Step 4: Create test payment link
      logger.info("[DEBUG] Step 4: Creating test payment link", {
        planId: plan.id,
        planName: plan.name,
        priceInCOP: plan.priceInCOP,
      });

      const testUserId = "123456789";
      const testParams = {
        name: plan.name,
        description:
          plan.description ||
          `${plan.name} subscription - ${plan.durationDays} days`,
        amount: plan.priceInCOP,
        currency: plan.currency || "COP",
        userId: testUserId,
        userEmail: "test@telegram.user",
        userName: "Test User",
        plan: plan.id,
      };

      // Validate parameters
      try {
        epayco.validatePaymentParams(testParams);
        diagnostics.validation.parameters = "✓ Valid";
      } catch (validationError) {
        diagnostics.validation.parameters = `✗ ${validationError.message}`;
        throw validationError;
      }

      const paymentData = await epayco.createPaymentLink(testParams);

      diagnostics.paymentLink = {
        success: paymentData.success,
        paymentUrl: paymentData.paymentUrl,
        reference: paymentData.reference,
        invoiceId: paymentData.invoiceId,
        urlPreview: paymentData.paymentUrl ? paymentData.paymentUrl.substring(0, 100) + "..." : "N/A",
      };

      res.json({
        success: true,
        message: "✓ All ePayco integration checks passed successfully!",
        diagnostics,
        testData: {
          paymentUrl: paymentData.paymentUrl,
          reference: paymentData.reference,
          invoiceId: paymentData.invoiceId,
        },
        nextSteps: [
          "1. Click the payment URL to test the checkout flow",
          "2. Complete a test transaction (use test credit cards in test mode)",
          "3. Verify webhook receives confirmation at /epayco/confirmation",
          "4. Check user membership is activated after payment",
        ],
      });
    } catch (error) {
      logger.error("[DEBUG] Payment link test failed:", {
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        diagnostics,
        troubleshooting: {
          commonIssues: [
            "Missing or incorrect credentials in .env file",
            "EPAYCO_TEST_MODE not set to 'true' for testing",
            "BOT_URL not configured correctly for webhooks",
            "Network connectivity issues with ePayco API",
          ],
          documentation: [
            "Check EPAYCO_INTEGRATION.md for setup instructions",
            "Verify credentials at https://dashboard.epayco.co/",
            "Ensure all environment variables are loaded correctly",
          ],
        },
      });
    }
  })
);
/**
 * Serve Mini App main page
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * Serve Nearby Users Mini App
 */
app.get("/nearby", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "nearby.html"));
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
  });
});

// Sentry error handler (must be before other error handlers)
if (sentryEnabled) {
  app.use(getErrorHandler());
}

// Global error handler (must be last)
app.use(errorHandler);

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
      console.log(`Mini App available at: http://localhost:${PORT}`);
      serverInstance = server;
      resolve(server);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        logger.warn(
          `Port ${PORT} already in use, server may already be running`
        );
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
