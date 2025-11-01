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

  // Treat 999999 or any duration >= 36500 days (100 years) as lifetime
  if (days >= 36500) {
    return null;
  }

  const now = new Date();
  const expirationDate = new Date(now);
  expirationDate.setDate(expirationDate.getDate() + Math.round(days));
  return expirationDate;
}

/**
 * Generate standardized membership confirmation message
 * @param {Object} params - Message parameters
 * @param {string} params.userName - User's name
 * @param {string} params.planName - Plan display name
 * @param {number} params.durationDays - Duration in days
 * @param {Date|null} params.expiresAt - Expiration date
 * @param {string} params.paymentAmount - Payment amount (optional)
 * @param {string} params.paymentCurrency - Payment currency (optional)
 * @param {string} params.paymentMethod - Payment method (optional)
 * @param {string} params.reference - Payment reference (optional)
 * @param {string} params.inviteLink - Unique channel invite link (optional)
 * @param {string} params.language - User language (en/es)
 * @returns {string} Formatted confirmation message
 */
function generateConfirmationMessage({
  userName,
  planName,
  durationDays,
  expiresAt,
  paymentAmount = null,
  paymentCurrency = null,
  paymentMethod = null,
  reference = null,
  inviteLink = null,
  language = 'en'
}) {
  const isSpanish = language === 'es';
  
  // Header
  let message = isSpanish 
    ? `✅ *¡Pago Confirmado!*\n\n¡Hola ${userName}! Tu suscripción *${planName}* ha sido activada exitosamente.\n\n`
    : `✅ *Payment Confirmed!*\n\nHello ${userName}! Your *${planName}* subscription has been successfully activated.\n\n`;

  // Details section
  message += isSpanish ? `📋 *Detalles:*\n` : `📋 *Details:*\n`;
  message += isSpanish ? `• Plan: ${planName}\n` : `• Plan: ${planName}\n`;
  message += isSpanish ? `• Duración: ${durationDays} días\n` : `• Duration: ${durationDays} days\n`;
  
  // Activation date
  const activationDate = new Date().toLocaleDateString(isSpanish ? 'es-CO' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  message += isSpanish ? `• Activado: ${activationDate}\n` : `• Activated: ${activationDate}\n`;

  // Expiration date
  if (expiresAt) {
    const expirationDate = expiresAt.toLocaleDateString(isSpanish ? 'es-CO' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    message += isSpanish ? `• Expira: ${expirationDate}\n` : `• Expires: ${expirationDate}\n`;
    message += isSpanish ? `• Próximo Pago: ${expirationDate}\n` : `• Next Payment: ${expirationDate}\n`;
  } else {
    message += isSpanish ? `• Expira: Nunca (Vitalicio)\n` : `• Expires: Never (Lifetime)\n`;
    message += isSpanish ? `• Próximo Pago: Nunca (Vitalicio)\n` : `• Next Payment: Never (Lifetime)\n`;
  }

  // Payment information (if provided)
  if (paymentAmount && paymentCurrency) {
    const formattedAmount = parseFloat(paymentAmount).toLocaleString(isSpanish ? 'es-CO' : 'en-US');
    message += isSpanish ? `• Monto Pagado: $${formattedAmount} ${paymentCurrency}\n` : `• Amount Paid: $${formattedAmount} ${paymentCurrency}\n`;
  }

  if (paymentMethod) {
    const methodDisplay = paymentMethod === 'daimo' 
      ? (isSpanish ? 'Daimo Pay (Crypto)' : 'Daimo Pay (Crypto)')
      : paymentMethod === 'epayco' 
      ? (isSpanish ? 'ePayco (Tarjeta)' : 'ePayco (Card)')
      : paymentMethod;
    message += isSpanish ? `• Método de Pago: ${methodDisplay}\n` : `• Payment Method: ${methodDisplay}\n`;
  }

  if (reference) {
    message += isSpanish ? `• Referencia: ${reference}\n` : `• Reference: ${reference}\n`;
  }

  // Thank you message
  message += isSpanish 
    ? `\n🎉 ¡Gracias por tu suscripción!\n\n¡Disfruta de tus beneficios premium! 💎`
    : `\n🎉 Thank you for your subscription!\n\nEnjoy your premium features! 💎`;

  // Unique channel invite link
  if (inviteLink) {
    message += isSpanish 
      ? `\n\n🔗 *Únete al Canal Premium:*\n${inviteLink}\n\n⚠️ Este es tu link único de acceso. No lo compartas con nadie.`
      : `\n\n🔗 *Join the Premium Channel:*\n${inviteLink}\n\n⚠️ This is your unique access link. Do not share it with anyone.`;
  }

  return message;
}

/**
 * Activate membership for a user
 * @param {string} userId - User ID
 * @param {string} tier - Tier to activate (e.g. 'trial-week', 'pnp-member', 'crystal-member', 'diamond-member')
 * @param {string} activatedBy - Who activated it (admin, payment, system)
 * @param {number} durationDays - Optional custom duration in days (default: 30)
 * @param {Object} bot - Telegram bot instance for generating invite links
 * @returns {Promise<Object>} Updated user data with invite link
 */
async function activateMembership(userId, tier, activatedBy = "admin", durationDays = 30, bot = null) {
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

    // Generate unique invite link to channel if bot instance is provided
    let inviteLink = null;
    if (bot && isPremium && process.env.CHANNEL_ID) {
      try {
        const channelId = process.env.CHANNEL_ID;
        const expireDate = expirationDate ? Math.floor(expirationDate.getTime() / 1000) : null;

        // Create a unique invite link that expires when membership expires
        const invite = await bot.telegram.createChatInviteLink(channelId, {
          member_limit: 1, // One-time use link
          expire_date: expireDate,
          name: `${tier} - User ${userId}`,
        });

        inviteLink = invite.invite_link;
        logger.info(`Generated invite link for user ${userId}: ${inviteLink}`);
      } catch (inviteError) {
        logger.warn(`Failed to generate invite link for user ${userId}:`, inviteError.message);
        // Continue even if invite link generation fails
      }
    }

    return {
      success: true,
      tier,
      expiresAt: expirationDate,
      inviteLink,
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
  generateConfirmationMessage,
  activateMembership,
  checkAndExpireMemberships,
  getMembershipInfo,
  getExpiringMemberships,
};
