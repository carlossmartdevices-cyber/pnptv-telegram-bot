const express = require('express');
const router = express.Router();
const multer = require('multer');
const logger = require('../utils/logger');
const primeActivationService = require('../services/primeActivationService');
const { isAdmin } = require('../config/admin');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * POST /api/prime-activation/auto
 * Process auto-approved activation (Week, Month, Quarterly)
 */
router.post('/auto', async (req, res) => {
  try {
    const { userId, username, tier } = req.body;

    logger.info('Prime activation auto request received', { userId, username, tier });

    if (!userId || !tier) {
      logger.error('Missing required fields in prime activation', { userId, tier, bodyKeys: Object.keys(req.body) });
      return res.status(400).json({
        success: false,
        error: 'Missing userId or tier'
      });
    }

    const result = await primeActivationService.processAutoActivation(
      userId,
      username,
      tier
    );

    logger.info('Prime activation auto success', { userId, result });
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in auto-activation endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Activation failed'
    });
  }
});

/**
 * POST /api/prime-activation/manual
 * Submit manual review activation (Yearly, Lifetime)
 */
router.post('/manual', upload.single('proof'), async (req, res) => {
  try {
    const { userId, username, tier } = req.body;
    const proofFile = req.file;

    if (!userId || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or tier'
      });
    }

    if (!proofFile) {
      return res.status(400).json({
        success: false,
        error: 'Proof of payment file is required'
      });
    }

    // For now, store file reference - in production, you'd upload to Cloud Storage
    const result = await primeActivationService.createManualReviewTicket(
      userId,
      username,
      tier,
      proofFile.originalname, // Use filename as reference
      proofFile.mimetype
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error in manual-activation endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Submission failed'
    });
  }
});

/**
 * GET /api/prime-activation/status/:userId
 * Get activation status for a user
 */
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const status = await primeActivationService.getActivationStatus(userId);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('Error getting activation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status'
    });
  }
});

/**
 * POST /api/prime-activation/approve/:ticketId
 * Admin endpoint to approve manual review
 */
router.post('/approve/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { adminId } = req.body;

    if (!isAdmin(adminId)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - admin access required'
      });
    }

    const result = await primeActivationService.approveActivation(ticketId, adminId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error approving activation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Approval failed'
    });
  }
});

/**
 * POST /api/prime-activation/reject/:ticketId
 * Admin endpoint to reject manual review
 */
router.post('/reject/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { adminId, reason } = req.body;

    if (!isAdmin(adminId)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - admin access required'
      });
    }

    const result = await primeActivationService.rejectActivation(
      ticketId,
      adminId,
      reason
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error rejecting activation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Rejection failed'
    });
  }
});

/**
 * GET /api/prime-activation/pending-reviews
 * Admin endpoint to get all pending manual reviews
 */
router.get('/pending-reviews', async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!isAdmin(adminId)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - admin access required'
      });
    }

    const reviews = await primeActivationService.getPendingReviews();

    res.json({
      success: true,
      reviews: reviews,
      count: reviews.length
    });
  } catch (error) {
    logger.error('Error getting pending reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reviews'
    });
  }
});

module.exports = router;
