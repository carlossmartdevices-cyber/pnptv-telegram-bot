const { db } = require("../config/firebase");
const logger = require("./logger");
const { batchUpdate } = require("./batchOperations");

/**
 * Calculate expiration date based on plan duration
 * @param {number} durationDays - Duration in days
 * @returns {Date|null} Expiration date or null for non-expiring plans
 */
function calculateExpirationDate(durationDays = 0) {
  const days = Number(durationDays || 0);

  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  const now = new Date();
  const expirationDate = new Date(now);
  expirationDate.setDate(expirationDate.getDate() + Math.round(days));
  return expirationDate;
}

/**
 * Activate membership for a user
 * @param {string} userId - User ID
 * @param {string} tier - Tier to activate (Silver or Golden)
 * @param {string} activatedBy - Who activated it (admin, payment, system)
 * @param {number} durationDays - Optional custom duration in days (default: 30)
 * @returns {Promise<Object>} Updated user data
 */
async function activateMembership(userId, tier, activatedBy = "admin", durationDays = 30) {
  try {
    if (!userId || !tier) {
      throw new Error("userId and tier are required");
    }

    const now = new Date();
    const expirationDate = calculateExpirationDate(durationDays);
    const isPremium = tier !== "Free" && expirationDate !== null;

    const updateData = {
      tier,
      tierUpdatedAt: now,
      tierUpdatedBy: activatedBy,
      membershipExpiresAt: expirationDate,
      membershipIsPremium: isPremium,
      lastActive: now,
    };

    await db.collection("users").doc(userId).update(updateData);

    logger.info(
      `Membership activated for user ${userId}: ${tier} until ${expirationDate ? expirationDate.toISOString() : "never"}`,
      {
        durationDays,
        activatedBy,
      }
    );

    return {
      success: true,
      tier,
      expiresAt: expirationDate,
    };
  } catch (error) {
    logger.error(`Error activating membership for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check and expire memberships that have passed their expiration date
 * Uses Firestore batch operations for better performance and atomicity
 * @returns {Promise<Object>} Results of the cleanup
 */
async function checkAndExpireMemberships() {
  try {
    const now = new Date();
    logger.info("Starting membership expiration check...");

    // Query users with premium tiers that have expired
    const expiredUsersSnapshot = await db
      .collection("users")
      .where("membershipExpiresAt", "<=", now)
      .where("membershipIsPremium", "==", true)
      .get();

    if (expiredUsersSnapshot.empty) {
      logger.info("No expired memberships found");
      return {
        checked: 0,
        expired: 0,
        failed: 0,
      };
    }

    logger.info(`Found ${expiredUsersSnapshot.size} expired memberships to process`);

    // Prepare batch update operations
    const operations = expiredUsersSnapshot.docs.map((doc) => {
      const userId = doc.id;
      const userData = doc.data();

      return {
        ref: db.collection("users").doc(userId),
        data: {
          tier: "Free",
          tierUpdatedAt: now,
          tierUpdatedBy: "system",
          previousTier: userData.tier,
          membershipExpiredAt: now,
          membershipIsPremium: false,
          membershipExpiresAt: null,
        },
      };
    });

    // Execute batch update
    const result = await batchUpdate(operations, "Expire memberships");

    logger.info(
      `Membership expiration complete: ${result.processed} expired, ${result.failed} failed`
    );

    return {
      checked: expiredUsersSnapshot.size,
      expired: result.processed,
      failed: result.failed,
      batches: result.batches,
      batchesFailed: result.batchesFailed,
    };
  } catch (error) {
    logger.error("Error in checkAndExpireMemberships:", error);
    throw error;
  }
}

/**
 * Get membership info for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Membership info
 */
async function getMembershipInfo(userId) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const now = new Date();
    const expiresAt = userData.membershipExpiresAt?.toDate();

    let status = "active";
    let daysRemaining = null;

    if (expiresAt) {
      const diffTime = expiresAt.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0) {
        status = "expired";
      } else if (daysRemaining <= 7) {
        status = "expiring_soon";
      }
    } else {
      status = userData.tier === "Free" ? "free" : "lifetime";
    }

    return {
      tier: userData.tier || "Free",
      expiresAt: expiresAt,
      daysRemaining: daysRemaining,
      status: status,
      updatedAt: userData.tierUpdatedAt?.toDate(),
      updatedBy: userData.tierUpdatedBy,
    };
  } catch (error) {
    logger.error(`Error getting membership info for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get all users with expiring memberships
 * @param {number} daysThreshold - Days before expiration to include (default: 7)
 * @returns {Promise<Array>} List of users with expiring memberships
 */
async function getExpiringMemberships(daysThreshold = 7) {
  try {
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringUsersSnapshot = await db
      .collection("users")
      .where("membershipExpiresAt", "<=", thresholdDate)
      .where("membershipExpiresAt", ">", now)
      .where("membershipIsPremium", "==", true)
      .get();

    const expiringUsers = [];

    expiringUsersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const expiresAt = userData.membershipExpiresAt?.toDate();
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expiringUsers.push({
        userId: doc.id,
        username: userData.username,
        tier: userData.tier,
        expiresAt: expiresAt,
        daysRemaining: daysRemaining,
      });
    });

    return expiringUsers;
  } catch (error) {
    logger.error("Error getting expiring memberships:", error);
    throw error;
  }
}

module.exports = {
  calculateExpirationDate,
  activateMembership,
  checkAndExpireMemberships,
  getMembershipInfo,
  getExpiringMemberships,
};
