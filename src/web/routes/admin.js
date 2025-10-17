/**
 * Admin API Routes
 * Protected routes for admin-only operations
 */

const express = require("express");
const router = express.Router();
const planService = require("../../services/planService");
const logger = require("../../utils/logger");
const { asyncHandler } = require("../../utils/errorHandler");
const { authenticateTelegramUser, requireAdmin } = require("../middleware/auth");

// All admin routes require authentication and admin privileges
router.use(authenticateTelegramUser);
router.use(requireAdmin);

/**
 * GET /api/admin/plans
 * Get all plans (including inactive)
 */
router.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const plans = await planService.getAllPlans();

    res.json({
      success: true,
      plans,
      count: plans.length,
    });
  })
);

/**
 * GET /api/admin/plans/stats
 * Get plan statistics
 */
router.get(
  "/plans/stats",
  asyncHandler(async (req, res) => {
    const stats = await planService.getPlanStats();

    res.json({
      success: true,
      stats,
    });
  })
);

/**
 * GET /api/admin/plans/:id
 * Get a specific plan by ID
 */
router.get(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const plan = await planService.getPlanById(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: `Plan not found: ${id}`,
      });
    }

    res.json({
      success: true,
      plan,
    });
  })
);

/**
 * POST /api/admin/plans
 * Create a new plan
 */
router.post(
  "/plans",
  asyncHandler(async (req, res) => {
    const {
      name,
      displayName,
      price,
      priceInCOP,
      currency,
      duration,
      features,
      tier,
      description,
      icon,
      cryptoBonus,
      recommended,
    } = req.body;

    // Validate required fields
    if (!name || !price || !duration || !features || !tier) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, price, duration, features, tier",
      });
    }

    try {
      const plan = await planService.createPlan({
        name,
        displayName,
        price,
        priceInCOP,
        currency,
        duration,
        features,
        tier,
        description,
        icon,
        cryptoBonus,
        recommended,
      });

      logger.info(`Admin ${req.telegramUser.id} created plan: ${plan.id}`);

      res.status(201).json({
        success: true,
        message: "Plan created successfully",
        plan,
      });
    } catch (error) {
      logger.error("Error creating plan:", error);

      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          error: error.message,
        });
      }

      if (error.message.includes("Invalid plan data")) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      throw error;
    }
  })
);

/**
 * PUT /api/admin/plans/:id
 * Update an existing plan
 */
router.put(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Remove id from updates if present
    delete updates.id;
    delete updates.createdAt;

    // Check if plan exists
    const existingPlan = await planService.getPlanById(id);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: `Plan not found: ${id}`,
      });
    }

    try {
      const updatedPlan = await planService.updatePlan(id, updates);

      logger.info(`Admin ${req.telegramUser.id} updated plan: ${id}`);

      res.json({
        success: true,
        message: "Plan updated successfully",
        plan: updatedPlan,
      });
    } catch (error) {
      logger.error(`Error updating plan ${id}:`, error);

      if (error.message.includes("Invalid plan data")) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      throw error;
    }
  })
);

/**
 * DELETE /api/admin/plans/:id
 * Soft delete a plan (set active to false)
 */
router.delete(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { permanent } = req.query;

    // Check if plan exists
    const existingPlan = await planService.getPlanById(id);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: `Plan not found: ${id}`,
      });
    }

    try {
      if (permanent === "true") {
        // Permanent deletion
        await planService.hardDeletePlan(id);
        logger.warn(`Admin ${req.telegramUser.id} permanently deleted plan: ${id}`);

        res.json({
          success: true,
          message: "Plan permanently deleted",
        });
      } else {
        // Soft deletion
        await planService.deletePlan(id);
        logger.info(`Admin ${req.telegramUser.id} soft deleted plan: ${id}`);

        res.json({
          success: true,
          message: "Plan deactivated successfully",
        });
      }
    } catch (error) {
      logger.error(`Error deleting plan ${id}:`, error);
      throw error;
    }
  })
);

/**
 * POST /api/admin/plans/:id/activate
 * Reactivate a soft-deleted plan
 */
router.post(
  "/plans/:id/activate",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const plan = await planService.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: `Plan not found: ${id}`,
      });
    }

    const updatedPlan = await planService.updatePlan(id, { active: true });

    logger.info(`Admin ${req.telegramUser.id} reactivated plan: ${id}`);

    res.json({
      success: true,
      message: "Plan reactivated successfully",
      plan: updatedPlan,
    });
  })
);

module.exports = router;
