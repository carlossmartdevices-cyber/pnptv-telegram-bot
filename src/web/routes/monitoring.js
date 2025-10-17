/**
 * Monitoring and Health Check Routes
 * Provides endpoints for system health, metrics, and alerts
 */

const express = require("express");
const router = express.Router();
const logger = require("../../utils/logger");
const { db } = require("../../config/firebase");
const { sessionCleanup } = require("../../utils/sessionCleanup");
const { rateLimiterStats } = require("../middleware/webhookRateLimit");
const { requireAdmin } = require("../middleware/auth");

/**
 * Basic health check
 * Public endpoint for uptime monitoring
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * Detailed system status
 * Protected endpoint with comprehensive metrics
 */
router.get("/status", requireAdmin, async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      nodejs: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        unit: "MB",
      },
      services: {
        firebase: "connected",
        telegram: "connected",
        epayco: process.env.EPAYCO_PUBLIC_KEY ? "configured" : "not configured",
      },
    };

    // Get session stats
    try {
      const sessionStats = await sessionCleanup.getStats();
      status.sessions = sessionStats;
    } catch (error) {
      status.sessions = { error: error.message };
    }

    // Get rate limiter stats
    try {
      status.rateLimiting = rateLimiterStats();
    } catch (error) {
      status.rateLimiting = { error: error.message };
    }

    // Get Firestore stats
    try {
      const usersCount = await db.collection("users").count().get();
      const paymentsCount = await db.collection("payments").count().get();

      status.database = {
        users: usersCount.data().count,
        payments: paymentsCount.data().count,
      };
    } catch (error) {
      status.database = { error: error.message };
    }

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error("[MONITORING] Error getting system status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get system status",
      message: error.message,
    });
  }
});

/**
 * Session statistics and management
 * Protected endpoint for session monitoring
 */
router.get("/sessions/stats", requireAdmin, async (req, res) => {
  try {
    const stats = await sessionCleanup.getStats();

    res.json({
      success: true,
      stats,
      recommendations:
        stats.expired > 100
          ? ["Consider running manual cleanup - high number of expired sessions"]
          : [],
    });
  } catch (error) {
    logger.error("[MONITORING] Error getting session stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get session statistics",
    });
  }
});

/**
 * Manual session cleanup trigger
 * Protected endpoint for manual cleanup
 */
router.post("/sessions/cleanup", requireAdmin, async (req, res) => {
  try {
    logger.info("[MONITORING] Manual session cleanup triggered by admin");

    const result = await sessionCleanup.manualCleanup();

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error) {
    logger.error("[MONITORING] Error during manual cleanup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cleanup sessions",
    });
  }
});

/**
 * Webhook security audit log
 * Protected endpoint for security monitoring
 */
router.get("/security/webhook-audit", requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Get recent webhook requests from payments collection
    const paymentsSnapshot = await db
      .collection("payments")
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const auditLog = [];
    paymentsSnapshot.forEach((doc) => {
      const data = doc.data();
      auditLog.push({
        id: doc.id,
        reference: data.reference,
        userId: data.userId,
        amount: data.amount,
        status: data.status,
        createdAt: data.createdAt?.toDate().toISOString(),
        webhookReceivedAt: data.webhookReceivedAt?.toDate().toISOString(),
      });
    });

    res.json({
      success: true,
      auditLog,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        returned: auditLog.length,
      },
    });
  } catch (error) {
    logger.error("[MONITORING] Error fetching webhook audit log:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch webhook audit log",
    });
  }
});

/**
 * Rate limiting statistics
 * Protected endpoint for rate limit monitoring
 */
router.get("/rate-limiting/stats", requireAdmin, (req, res) => {
  try {
    const stats = rateLimiterStats();

    res.json({
      success: true,
      stats,
      alerts:
        stats.totalRequests > 1000
          ? [
              {
                level: "warning",
                message: "High volume of webhook requests detected",
                recommendation: "Review webhook security logs",
              },
            ]
          : [],
    });
  } catch (error) {
    logger.error("[MONITORING] Error getting rate limit stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get rate limiting statistics",
    });
  }
});

/**
 * System alerts and warnings
 * Protected endpoint for proactive monitoring
 */
router.get("/alerts", requireAdmin, async (req, res) => {
  try {
    const alerts = [];

    // Check memory usage
    const memoryUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
    if (memoryUsage > 0.9) {
      alerts.push({
        level: "critical",
        category: "memory",
        message: "High memory usage detected",
        value: `${Math.round(memoryUsage * 100)}%`,
        recommendation: "Consider restarting the application",
      });
    } else if (memoryUsage > 0.75) {
      alerts.push({
        level: "warning",
        category: "memory",
        message: "Memory usage above 75%",
        value: `${Math.round(memoryUsage * 100)}%`,
        recommendation: "Monitor closely",
      });
    }

    // Check session health
    try {
      const sessionStats = await sessionCleanup.getStats();
      if (sessionStats.expired > 500) {
        alerts.push({
          level: "warning",
          category: "sessions",
          message: "Large number of expired sessions",
          value: sessionStats.expired,
          recommendation: "Run manual cleanup",
        });
      }
    } catch (error) {
      alerts.push({
        level: "error",
        category: "sessions",
        message: "Failed to check session health",
        error: error.message,
      });
    }

    // Check environment configuration
    const criticalEnvVars = [
      "TELEGRAM_TOKEN",
      "FIREBASE_PROJECT_ID",
      "EPAYCO_PUBLIC_KEY",
      "EPAYCO_PRIVATE_KEY",
    ];

    const missingVars = criticalEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      alerts.push({
        level: "critical",
        category: "configuration",
        message: "Missing critical environment variables",
        value: missingVars.join(", "),
        recommendation: "Configure missing variables immediately",
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      alertCount: alerts.length,
      alerts,
      overallStatus: alerts.some((a) => a.level === "critical")
        ? "critical"
        : alerts.some((a) => a.level === "warning")
        ? "warning"
        : "healthy",
    });
  } catch (error) {
    logger.error("[MONITORING] Error getting system alerts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get system alerts",
    });
  }
});

module.exports = router;
