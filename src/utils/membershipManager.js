const { db } = require("../config/firebase");
const logger = require("./logger");

/**
 * Calculate expiration date based on plan duration
 * @param {string} tier - Tier name (Silver or Golden)
 * @returns {Date} Expiration date
 */
function calculateExpirationDate(tier) {
  const now = new Date();
  const duration = tier === "Silver" || tier === "Golden" ? 30 : 0; // 30 days for premium tiers

  if (duration === 0) {
    return null; // Free tier doesn't expire
  }

  const expirationDate = new Date(now);
  expirationDate.setDate(expirationDate.getDate() + duration);
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

    if (!["Free", "Silver", "Golden"].includes(tier)) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const now = new Date();
    let expirationDate = null;

    // Calculate expiration for premium tiers
    if (tier === "Silver" || tier === "Golden") {
      expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + durationDays);
    }

    const updateData = {
      tier: tier,
      tierUpdatedAt: now,
      tierUpdatedBy: activatedBy,
      membershipExpiresAt: expirationDate,
      lastActive: now,
    };

    await db.collection("users").doc(userId).update(updateData);

    logger.info(`Membership activated for user ${userId}: ${tier} until ${expirationDate ? expirationDate.toISOString() : "never"}`);

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
      .where("tier", "in", ["Silver", "Golden"])
      .get();

    if (expiredUsersSnapshot.empty) {
      logger.info("No expired memberships found");
      return {
        checked: 0,
        expired: 0,
        failed: 0,
      };
    }

    let expiredCount = 0;
    let failedCount = 0;

    for (const doc of expiredUsersSnapshot.docs) {
      try {
        const userId = doc.id;
        const userData = doc.data();

        await db.collection("users").doc(userId).update({
          tier: "Free",
          tierUpdatedAt: now,
          tierUpdatedBy: "system",
          previousTier: userData.tier,
          membershipExpiredAt: now,
        });

        expiredCount++;
        logger.info(`Expired membership for user ${userId}: ${userData.tier} -> Free`);
      } catch (error) {
        failedCount++;
        logger.error(`Failed to expire membership for user ${doc.id}:`, error);
      }
    }

    logger.info(`Membership expiration check complete: ${expiredCount} expired, ${failedCount} failed`);

    return {
      checked: expiredUsersSnapshot.size,
      expired: expiredCount,
      failed: failedCount,
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
      .where("tier", "in", ["Silver", "Golden"])
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
