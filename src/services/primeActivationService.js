const { db } = require("../config/firebase");
const logger = require("../utils/logger");

/**
 * PRIME Channel Membership Activation Service
 * Handles auto-approve and manual review activation flows
 */

const ACTIVATION_TIERS = {
  WEEK: 'week-pass',
  MONTH: 'month-pass',
  QUARTERLY: 'quarterly-pass',
  YEARLY: 'yearly-pass',
  LIFETIME: 'lifetime-pass'
};

const AUTO_APPROVE_TIERS = [ACTIVATION_TIERS.WEEK, ACTIVATION_TIERS.MONTH, ACTIVATION_TIERS.QUARTERLY];
const MANUAL_REVIEW_TIERS = [ACTIVATION_TIERS.YEARLY, ACTIVATION_TIERS.LIFETIME];

// Duration in days
const TIER_DURATIONS = {
  [ACTIVATION_TIERS.WEEK]: 7,
  [ACTIVATION_TIERS.MONTH]: 30,
  [ACTIVATION_TIERS.QUARTERLY]: 90,
  [ACTIVATION_TIERS.YEARLY]: 365,
  [ACTIVATION_TIERS.LIFETIME]: 36500 // ~100 years
};

const TIER_DISPLAY_NAMES = {
  [ACTIVATION_TIERS.WEEK]: 'Week Pass',
  [ACTIVATION_TIERS.MONTH]: 'Month Pass',
  [ACTIVATION_TIERS.QUARTERLY]: 'Quarterly Pass',
  [ACTIVATION_TIERS.YEARLY]: 'Yearly Pass',
  [ACTIVATION_TIERS.LIFETIME]: 'Lifetime Pass'
};

/**
 * Process auto-approved activation (Week, Month, Quarterly)
 */
async function processAutoActivation(userId, username, tier) {
  try {
    if (!AUTO_APPROVE_TIERS.includes(tier)) {
      throw new Error('Tier does not support auto-approval');
    }

    const startDate = new Date();
    const durationDays = TIER_DURATIONS[tier];
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update user document
    const userRef = db.collection('users').doc(userId.toString());
    await userRef.update({
      tier: 'premium',
      membershipTier: tier,
      activatedAt: startDate,
      membershipStartsAt: startDate,
      membershipExpiresAt: endDate,
      nextPaymentDate: tier === ACTIVATION_TIERS.LIFETIME ? null : endDate,
      primeActivationMigration: true,
      primeActivationDate: startDate,
      lastUpdated: startDate
    });

    // Create activation record
    const activationRecord = {
      userId: userId.toString(),
      username: username,
      tier: tier,
      status: 'activated',
      approvalType: 'auto',
      startDate: startDate,
      endDate: endDate,
      createdAt: startDate,
      nextPaymentDate: tier === ACTIVATION_TIERS.LIFETIME ? null : endDate
    };

    await db.collection('primeActivations').add(activationRecord);

    logger.info(`Auto-activated user ${userId} with tier ${tier}`, {
      userId,
      tier,
      expiresAt: endDate
    });

    return {
      success: true,
      tier: tier,
      startDate,
      endDate,
      nextPaymentDate: tier === ACTIVATION_TIERS.LIFETIME ? null : endDate,
      displayName: TIER_DISPLAY_NAMES[tier]
    };
  } catch (error) {
    logger.error('Error processing auto-activation:', error);
    throw error;
  }
}

/**
 * Create manual review ticket for Yearly/Lifetime tiers
 * Creates support ticket and topic in admin chat
 */
async function createManualReviewTicket(userId, username, tier, proofFileId, fileType) {
  try {
    if (!MANUAL_REVIEW_TIERS.includes(tier)) {
      throw new Error('Tier does not require manual review');
    }

    const ticketData = {
      userId: userId.toString(),
      username: username,
      type: 'prime-activation',
      tier: tier,
      status: 'pending_review',
      proofFileId: proofFileId,
      proofFileType: fileType,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewed: false,
      approvalStatus: null,
      reviewNotes: null,
      tierDisplayName: TIER_DISPLAY_NAMES[tier]
    };

    const ticketRef = await db.collection('primeActivationReviews').add(ticketData);
    const ticketId = ticketRef.id;

    logger.info(`Created manual review ticket ${ticketId} for user ${userId}`, {
      userId,
      tier,
      ticketId
    });

    // Create topic in admin group for this specific user
    await createAdminTopicForUser(userId, username, tier, ticketId, proofFileId);

    return {
      success: true,
      ticketId: ticketId,
      status: 'pending_review',
      tier: tier,
      displayName: TIER_DISPLAY_NAMES[tier]
    };
  } catch (error) {
    logger.error('Error creating manual review ticket:', error);
    throw error;
  }
}

/**
 * Create topic in admin group for user review
 */
async function createAdminTopicForUser(userId, username, tier, ticketId, proofFileId) {
  try {
    const { CHANNEL_ID } = process.env;
    const adminChatId = CHANNEL_ID; // Use PRIME channel as admin review location

    if (!adminChatId) {
      logger.error('Admin chat ID not configured');
      return;
    }

    // Create topic/thread for this user's review
    const topicTitle = `🔍 PRIME Activation Review - User ${userId}`;
    const topicMessage = `
📋 **PRIME Membership Activation - Manual Review**

👤 **User Information:**
• ID: \`${userId}\`
• Username: @${username}
• Tier Applied: ${TIER_DISPLAY_NAMES[tier]}
• Ticket ID: \`${ticketId}\`

📝 **Status:** ⏳ Awaiting Admin Review

⚙️ **Actions:**
/approve_prime_${ticketId} - Approve this activation
/reject_prime_${ticketId} - Reject this activation

📎 **Proof of Payment:** [See attachment in chat]
`;

    // Send message to admin group
    try {
      await bot.telegram.sendMessage(parseInt(adminChatId), topicMessage, {
        parse_mode: 'Markdown',
        disable_notification: false
      });

      // If we have a proof file, send it to admin group
      if (proofFileId) {
        try {
          await bot.telegram.forwardMessage(
            parseInt(adminChatId),
            userId.toString(),
            proofFileId
          );
        } catch (fileError) {
          logger.warn('Could not forward proof file to admin:', fileError);
        }
      }

      logger.info(`Created admin notification for user ${userId}`, { userId, ticketId });
    } catch (sendError) {
      logger.error('Error sending admin notification:', sendError);
      // Don't throw - ticket is already created, admin will see it in Firestore
    }
  } catch (error) {
    logger.error('Error creating admin topic:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Approve manual review activation
 */
async function approveActivation(ticketId, adminId) {
  try {
    const ticketRef = db.collection('primeActivationReviews').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new Error('Ticket not found');
    }

    const ticketData = ticketDoc.data();
    const { userId, username, tier } = ticketData;

    const startDate = new Date();
    const durationDays = TIER_DURATIONS[tier];
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Update user document
    await db.collection('users').doc(userId).update({
      tier: 'premium',
      membershipTier: tier,
      activatedAt: startDate,
      membershipStartsAt: startDate,
      membershipExpiresAt: endDate,
      nextPaymentDate: tier === ACTIVATION_TIERS.LIFETIME ? null : endDate,
      primeActivationMigration: true,
      primeActivationDate: startDate,
      lastUpdated: startDate
    });

    // Update ticket
    await ticketRef.update({
      status: 'approved',
      approvalStatus: 'approved',
      reviewed: true,
      reviewedAt: new Date(),
      reviewedBy: adminId.toString(),
      reviewNotes: 'Manually approved by admin',
      activationDate: startDate,
      endDate: endDate
    });

    // Create activation record
    await db.collection('primeActivations').add({
      userId: userId,
      username: username,
      tier: tier,
      status: 'activated',
      approvalType: 'manual',
      startDate: startDate,
      endDate: endDate,
      createdAt: startDate,
      approvedBy: adminId.toString(),
      nextPaymentDate: tier === ACTIVATION_TIERS.LIFETIME ? null : endDate
    });

    logger.info(`Approved activation for user ${userId}`, {
      ticketId,
      userId,
      approvedBy: adminId
    });

    // Notify user
    await notifyUserActivationApproved(userId, tier, startDate, endDate);

    return {
      success: true,
      userId: userId,
      tier: tier,
      activationDate: startDate,
      expirationDate: endDate
    };
  } catch (error) {
    logger.error('Error approving activation:', error);
    throw error;
  }
}

/**
 * Reject manual review activation
 */
async function rejectActivation(ticketId, adminId, rejectReason = '') {
  try {
    const ticketRef = db.collection('primeActivationReviews').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new Error('Ticket not found');
    }

    const ticketData = ticketDoc.data();
    const { userId, username } = ticketData;

    // Update ticket
    await ticketRef.update({
      status: 'rejected',
      approvalStatus: 'rejected',
      reviewed: true,
      reviewedAt: new Date(),
      reviewedBy: adminId.toString(),
      reviewNotes: rejectReason || 'Rejected by admin'
    });

    logger.info(`Rejected activation for user ${userId}`, {
      ticketId,
      userId,
      rejectedBy: adminId
    });

    // Notify user
    await notifyUserActivationRejected(userId, rejectReason);

    return {
      success: true,
      userId: userId,
      status: 'rejected'
    };
  } catch (error) {
    logger.error('Error rejecting activation:', error);
    throw error;
  }
}

/**
 * Send welcome message to user after successful activation
 */
async function notifyUserActivationApproved(userId, tier, startDate, endDate) {
  try {
    const tierName = TIER_DISPLAY_NAMES[tier];
    const nextPaymentDate = tier === ACTIVATION_TIERS.LIFETIME
      ? '♾️ Never'
      : endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const message = `
✅ **PRIME Membership Activated!**

🎉 Welcome to the PRIME channel!

📋 **Activation Details:**
• Tier: ${tierName}
• Status: ✅ Active
• Start Date: ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
• Expiration Date: ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
• Next Payment: ${nextPaymentDate}

🎁 **You now have access to:**
• All media types (videos, images, documents)
• Premium bot features
• Priority support
• Exclusive content

🔔 We'll notify you before your membership expires.

Questions? Use /support to contact our team.

Welcome aboard! 🚀
`;

    await bot.telegram.sendMessage(userId.toString(), message, {
      parse_mode: 'Markdown'
    });

    logger.info(`Sent activation approval notification to user ${userId}`, { userId });
  } catch (error) {
    logger.error('Error sending activation notification:', error);
  }
}

/**
 * Send rejection message to user
 */
async function notifyUserActivationRejected(userId, reason) {
  try {
    const message = `
❌ **PRIME Membership Activation - Rejected**

Unfortunately, your PRIME membership activation request could not be approved.

📋 **Reason:** ${reason || 'Please contact support for more information'}

💡 **Next Steps:**
Please contact our support team using /support to discuss your situation.

We're here to help! 📞
`;

    await bot.telegram.sendMessage(userId.toString(), message, {
      parse_mode: 'Markdown'
    });

    logger.info(`Sent activation rejection notification to user ${userId}`, { userId });
  } catch (error) {
    logger.error('Error sending rejection notification:', error);
  }
}

/**
 * Get activation status for user
 */
async function getActivationStatus(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId.toString()).get();

    if (!userDoc.exists) {
      return { status: 'not_found' };
    }

    const userData = userDoc.data();

    if (userData.primeActivationMigration) {
      return {
        status: 'activated',
        tier: userData.membershipTier,
        startDate: userData.membershipStartsAt,
        expiresAt: userData.membershipExpiresAt,
        nextPaymentDate: userData.nextPaymentDate,
        displayName: TIER_DISPLAY_NAMES[userData.membershipTier]
      };
    }

    return { status: 'not_activated' };
  } catch (error) {
    logger.error('Error getting activation status:', error);
    throw error;
  }
}

/**
 * Get all pending manual reviews
 */
async function getPendingReviews() {
  try {
    const snapshot = await db.collection('primeActivationReviews')
      .where('status', '==', 'pending_review')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    logger.error('Error getting pending reviews:', error);
    throw error;
  }
}

module.exports = {
  processAutoActivation,
  createManualReviewTicket,
  approveActivation,
  rejectActivation,
  notifyUserActivationApproved,
  notifyUserActivationRejected,
  getActivationStatus,
  getPendingReviews,
  ACTIVATION_TIERS,
  AUTO_APPROVE_TIERS,
  MANUAL_REVIEW_TIERS,
  TIER_DISPLAY_NAMES,
  TIER_DURATIONS
};
