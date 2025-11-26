/**
 * Session Manager with JWT tokens
 * Implements access tokens and refresh tokens for secure session management
 */

const crypto = require('crypto');
const { db } = require('../config/firebase');
const logger = require('./logger');

// Session configuration
const SESSION_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 60 * 60, // 1 hour in seconds
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60, // 30 days in seconds
  MAX_SESSIONS_PER_USER: 5, // Maximum concurrent sessions
  TOKEN_ROTATION_THRESHOLD: 15 * 60, // Rotate tokens if older than 15 minutes
};

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} - Hex encoded token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create session tokens for a user
 * @param {string} userId - Telegram user ID
 * @param {Object} userData - Additional user data
 * @returns {Promise<Object>} - Session tokens
 */
async function createSession(userId, userData = {}) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const now = Date.now();
    const accessToken = generateSecureToken();
    const refreshToken = generateSecureToken();

    const sessionData = {
      userId,
      username: userData.username || null,
      firstName: userData.firstName || null,
      accessToken,
      refreshToken,
      accessTokenExpiry: new Date(now + SESSION_CONFIG.ACCESS_TOKEN_EXPIRY * 1000),
      refreshTokenExpiry: new Date(now + SESSION_CONFIG.REFRESH_TOKEN_EXPIRY * 1000),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      ipAddress: userData.ipAddress || null,
      userAgent: userData.userAgent || null,
      active: true,
    };

    // Store session in Firestore
    const sessionRef = await db.collection('sessions').add(sessionData);

    // Cleanup old sessions for this user (keep only MAX_SESSIONS_PER_USER most recent)
    await cleanupOldSessions(userId);

    logger.info(`[SESSION] Created new session for user ${userId}`, {
      sessionId: sessionRef.id,
      accessTokenExpiry: sessionData.accessTokenExpiry.toISOString(),
    });

    return {
      success: true,
      sessionId: sessionRef.id,
      accessToken,
      refreshToken,
      expiresIn: SESSION_CONFIG.ACCESS_TOKEN_EXPIRY,
      refreshExpiresIn: SESSION_CONFIG.REFRESH_TOKEN_EXPIRY,
    };
  } catch (error) {
    logger.error('[SESSION] Error creating session:', {
      error: error.message,
      userId,
    });
    throw error;
  }
}

/**
 * Validate access token
 * @param {string} accessToken - Access token to validate
 * @returns {Promise<Object|null>} - Session data if valid, null otherwise
 */
async function validateAccessToken(accessToken) {
  try {
    if (!accessToken) {
      return null;
    }

    const now = new Date();

    // Query session by access token
    const sessionsSnapshot = await db
      .collection('sessions')
      .where('accessToken', '==', accessToken)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (sessionsSnapshot.empty) {
      logger.debug('[SESSION] No active session found for access token');
      return null;
    }

    const sessionDoc = sessionsSnapshot.docs[0];
    const sessionData = sessionDoc.data();

    // Check if access token is expired
    const accessTokenExpiry = sessionData.accessTokenExpiry.toDate();
    if (now > accessTokenExpiry) {
      logger.warn('[SESSION] Access token expired', {
        userId: sessionData.userId,
        expiredAt: accessTokenExpiry.toISOString(),
      });
      return null;
    }

    // Update last used timestamp
    await sessionDoc.ref.update({
      lastUsedAt: now,
    });

    logger.debug('[SESSION] Access token validated successfully', {
      userId: sessionData.userId,
      sessionId: sessionDoc.id,
    });

    return {
      sessionId: sessionDoc.id,
      userId: sessionData.userId,
      username: sessionData.username,
      firstName: sessionData.firstName,
      expiresAt: accessTokenExpiry,
    };
  } catch (error) {
    logger.error('[SESSION] Error validating access token:', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object|null>} - New access token if valid, null otherwise
 */
async function refreshAccessToken(refreshToken) {
  try {
    if (!refreshToken) {
      return null;
    }

    const now = new Date();

    // Query session by refresh token
    const sessionsSnapshot = await db
      .collection('sessions')
      .where('refreshToken', '==', refreshToken)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (sessionsSnapshot.empty) {
      logger.warn('[SESSION] No active session found for refresh token');
      return null;
    }

    const sessionDoc = sessionsSnapshot.docs[0];
    const sessionData = sessionDoc.data();

    // Check if refresh token is expired
    const refreshTokenExpiry = sessionData.refreshTokenExpiry.toDate();
    if (now > refreshTokenExpiry) {
      logger.warn('[SESSION] Refresh token expired', {
        userId: sessionData.userId,
        expiredAt: refreshTokenExpiry.toISOString(),
      });

      // Deactivate expired session
      await sessionDoc.ref.update({ active: false });
      return null;
    }

    // Generate new access token
    const newAccessToken = generateSecureToken();
    const newAccessTokenExpiry = new Date(Date.now() + SESSION_CONFIG.ACCESS_TOKEN_EXPIRY * 1000);

    // Optionally rotate refresh token if it's older than threshold
    const sessionAge = now - sessionData.createdAt.toDate();
    const shouldRotateRefreshToken = sessionAge > SESSION_CONFIG.TOKEN_ROTATION_THRESHOLD * 1000;

    const updateData = {
      accessToken: newAccessToken,
      accessTokenExpiry: newAccessTokenExpiry,
      lastUsedAt: now,
    };

    if (shouldRotateRefreshToken) {
      const newRefreshToken = generateSecureToken();
      const newRefreshTokenExpiry = new Date(Date.now() + SESSION_CONFIG.REFRESH_TOKEN_EXPIRY * 1000);

      updateData.refreshToken = newRefreshToken;
      updateData.refreshTokenExpiry = newRefreshTokenExpiry;

      logger.info('[SESSION] Rotating refresh token', {
        userId: sessionData.userId,
        sessionId: sessionDoc.id,
      });
    }

    await sessionDoc.ref.update(updateData);

    logger.info('[SESSION] Access token refreshed', {
      userId: sessionData.userId,
      sessionId: sessionDoc.id,
      newExpiry: newAccessTokenExpiry.toISOString(),
      refreshTokenRotated: shouldRotateRefreshToken,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: updateData.refreshToken || refreshToken,
      expiresIn: SESSION_CONFIG.ACCESS_TOKEN_EXPIRY,
      refreshExpiresIn: SESSION_CONFIG.REFRESH_TOKEN_EXPIRY,
    };
  } catch (error) {
    logger.error('[SESSION] Error refreshing access token:', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Revoke a session (logout)
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<boolean>} - True if revoked successfully
 */
async function revokeSession(sessionId) {
  try {
    if (!sessionId) {
      return false;
    }

    await db.collection('sessions').doc(sessionId).update({
      active: false,
      revokedAt: new Date(),
    });

    logger.info('[SESSION] Session revoked', { sessionId });
    return true;
  } catch (error) {
    logger.error('[SESSION] Error revoking session:', {
      error: error.message,
      sessionId,
    });
    return false;
  }
}

/**
 * Revoke all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of sessions revoked
 */
async function revokeAllUserSessions(userId) {
  try {
    if (!userId) {
      return 0;
    }

    const sessionsSnapshot = await db
      .collection('sessions')
      .where('userId', '==', userId)
      .where('active', '==', true)
      .get();

    if (sessionsSnapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    sessionsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        active: false,
        revokedAt: new Date(),
      });
    });

    await batch.commit();

    logger.info(`[SESSION] Revoked all sessions for user ${userId}`, {
      count: sessionsSnapshot.size,
    });

    return sessionsSnapshot.size;
  } catch (error) {
    logger.error('[SESSION] Error revoking all user sessions:', {
      error: error.message,
      userId,
    });
    return 0;
  }
}

/**
 * Cleanup old sessions for a user (keep only MAX_SESSIONS_PER_USER most recent)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function cleanupOldSessions(userId) {
  try {
    const sessionsSnapshot = await db
      .collection('sessions')
      .where('userId', '==', userId)
      .where('active', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    if (sessionsSnapshot.size <= SESSION_CONFIG.MAX_SESSIONS_PER_USER) {
      return;
    }

    // Deactivate sessions beyond the limit
    const sessionsToDeactivate = sessionsSnapshot.docs.slice(SESSION_CONFIG.MAX_SESSIONS_PER_USER);
    const batch = db.batch();

    sessionsToDeactivate.forEach((doc) => {
      batch.update(doc.ref, {
        active: false,
        revokedAt: new Date(),
      });
    });

    await batch.commit();

    logger.info(`[SESSION] Cleaned up old sessions for user ${userId}`, {
      deactivated: sessionsToDeactivate.length,
    });
  } catch (error) {
    logger.warn('[SESSION] Error cleaning up old sessions:', {
      error: error.message,
      userId,
    });
  }
}

/**
 * Cleanup expired sessions (run periodically)
 * @returns {Promise<number>} - Number of sessions cleaned up
 */
async function cleanupExpiredSessions() {
  try {
    const now = new Date();

    const expiredSessions = await db
      .collection('sessions')
      .where('active', '==', true)
      .where('refreshTokenExpiry', '<', now)
      .limit(100) // Process in batches
      .get();

    if (expiredSessions.empty) {
      return 0;
    }

    const batch = db.batch();
    expiredSessions.docs.forEach((doc) => {
      batch.update(doc.ref, {
        active: false,
        expiredAt: now,
      });
    });

    await batch.commit();

    logger.info(`[SESSION] Cleaned up expired sessions`, {
      count: expiredSessions.size,
    });

    return expiredSessions.size;
  } catch (error) {
    logger.error('[SESSION] Error cleaning up expired sessions:', {
      error: error.message,
    });
    return 0;
  }
}

module.exports = {
  createSession,
  validateAccessToken,
  refreshAccessToken,
  revokeSession,
  revokeAllUserSessions,
  cleanupOldSessions,
  cleanupExpiredSessions,
  SESSION_CONFIG,
};
