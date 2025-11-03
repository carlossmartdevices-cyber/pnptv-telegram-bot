const { db, admin } = require("../config/firebase");
const logger = require("../utils/logger");
const cacheService = require("./cacheService");
const {
  wrapFirestoreOperation,
  retryFirestoreOperation,
} = require("../utils/firestoreErrorHandler");

let bucket = null;
try {
  bucket = admin.storage().bucket();
} catch (error) {
  logger.warn("Firebase Storage bucket not configured. Plan assets will be disabled.", { error: error.message });
}

class PlanService {
  constructor() {
    this.plansCollection = db.collection("plans");
    // Fallback to static plans if Firestore is empty
    this.staticPlans = require("../config/plans");
  }

  /**
   * Validate plan data
   */
  validatePlanData({ name, price, duration, features, tier, description, priceInCOP, currency }) {
    const errors = [];

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("Plan name is required and must be a non-empty string");
    }

    if (price === undefined || price === null) {
      errors.push("Price is required");
    } else {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0) {
        errors.push("Price must be a non-negative number");
      }
    }

    if (duration === undefined || duration === null) {
      errors.push("Duration is required");
    } else {
      const durationNum = Number(duration);
      if (isNaN(durationNum) || durationNum <= 0 || !Number.isInteger(durationNum)) {
        errors.push("Duration must be a positive integer");
      }
    }

    if (!Array.isArray(features) || features.length === 0) {
      errors.push("Features must be a non-empty array");
    }

    if (!tier || typeof tier !== "string" || tier.trim().length === 0) {
      errors.push("Tier is required and must be a non-empty string");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a new plan
   */
  async createPlan({
    name,
    price,
    duration,
    features,
    tier,
    description,
    priceInCOP,
    currency = "COP",
    displayName,
    icon,
    cryptoBonus,
    recommended = false,
    paymentMethod = // or "nequi"
    paymentLink = null, // For manual Nequi payments
    requiresManualActivation = false
  }) {
    // Validate input
    const validation = this.validatePlanData({ name, price, duration, features, tier, description });
    if (!validation.isValid) {
      throw new Error(`Invalid plan data: ${validation.errors.join(", ")}`);
    }

    // Validate payment method
    if (!["nequi"].includes(paymentMethod)) {
      throw new Error("Payment method must be either 'nequi', or ");
    }

    // If Nequi, require payment link
    if (paymentMethod === "nequi" && !paymentLink) {
      throw new Error("Payment link is required for Nequi payment method");
    }

    // Daimo payment requires USD
    if (paymentMethod === "daimo" && currency !== "USD") {
      logger.warn(`Daimo payment requires USD, converting from ${currency}`);
    }

    // Check for duplicate plan names
    const existingPlan = await this.getPlanByName(name);
    if (existingPlan) {
      throw new Error(`Plan with name "${name}" already exists`);
    }

    const plan = {
      name: name.trim(),
      displayName: displayName || name.trim(),
      price: Number(price),
      priceInCOP: priceInCOP ? Number(priceInCOP) : Math.round(Number(price) * 4000), // Default COP conversion
      currency: currency || "COP",
      duration: Number(duration),
      durationDays: Number(duration),
      features: Array.isArray(features) ? features : [],
      tier: tier.trim(),
      description: description || "",
      icon: icon || "💎",
      cryptoBonus: cryptoBonus || null,
      recommended: Boolean(recommended),
      paymentMethod: paymentMethod,
      paymentLink: paymentLink || null,
      requiresManualActivation: paymentMethod === "nequi" || requiresManualActivation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };

    const docRef = await this.plansCollection.add(plan);
    logger.info(`Plan created: ${name} (${docRef.id}) with ${paymentMethod} payment`);

    // Invalidate plan caches
    await cacheService.invalidatePlanCaches();

    return { id: docRef.id, ...plan };
  }

  /**
   * Get all plans (including inactive)
   */
  async getAllPlans() {
    try {
      const snapshot = await retryFirestoreOperation(
        async () => await this.plansCollection.get(),
        {
          maxRetries: 2,
          initialDelay: 500,
          operationName: 'fetch all plans',
          context: { service: 'PlanService' }
        }
      );

      if (snapshot.empty) {
        logger.info("No plans in Firestore");
        return [];
      }

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      logger.error('Failed to fetch plans from Firestore:', error.message);
      return [];
    }
  }

  /**
   * Get active plans only (with caching)
   */
  async getActivePlans() {
    try {
      // Check cache first
      const cachedPlans = await cacheService.getActivePlans();
      if (cachedPlans) {
        logger.debug("Returning active plans from cache");
        return cachedPlans;
      }

      // Cache miss - fetch from Firestore
      const snapshot = await retryFirestoreOperation(
        async () => await this.plansCollection
          .where("active", "==", true)
          // NOTE: orderBy removed temporarily - requires Firestore composite index
          // To enable sorting by price, create index at:
          // https://console.firebase.google.com/project/pnptv-b8af8/firestore/indexes
          // .orderBy("price", "asc")
          .get(),
        {
          maxRetries: 2,
          initialDelay: 500,
          operationName: 'fetch active plans',
          context: { service: 'PlanService' }
        }
      );

      if (snapshot.empty) {
        logger.info("No active plans in Firestore");
        return [];
      }

      // Sort in memory instead (temporary workaround)
      const plans = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by price ascending
      const sortedPlans = plans.sort((a, b) => (a.price || 0) - (b.price || 0));

      // Cache the result
      await cacheService.cacheActivePlans(sortedPlans);

      return sortedPlans;
    } catch (error) {
      logger.warn("Failed to query Firestore plans:", error.message);
      return [];
    }
  }

  /**
   * List plans (alias for getActivePlans for backward compatibility)
   */
  async listPlans() {
    return this.getActivePlans();
  }

  /**
   * Get plan by ID (with caching)
   */
  async getPlanById(planId) {
    if (!planId) {
      return null;
    }

    try {
      // Check cache first
      const cachedPlan = await cacheService.getPlanById(planId);
      if (cachedPlan) {
        logger.debug(`Returning plan ${planId} from cache`);
        return cachedPlan;
      }

      // Cache miss - fetch from Firestore
      const doc = await this.plansCollection.doc(planId).get();

      if (doc.exists) {
        const plan = {
          id: doc.id,
          ...doc.data(),
        };

        // Cache the result
        await cacheService.cachePlanById(planId, plan);

        return plan;
      }

      return null;
    } catch (error) {
      logger.error(`Error getting plan by ID ${planId}:`, error);
      return null;
    }
  }

  /**
   * Get plan by slug/name (case-insensitive, with caching)
   */
  async getPlanBySlug(slug) {
    if (!slug || typeof slug !== "string") {
      return null;
    }

    const normalizedSlug = slug.toLowerCase().trim();

    try {
      // Check cache first
      const cachedPlan = await cacheService.getPlanBySlug(normalizedSlug);
      if (cachedPlan) {
        logger.debug(`Returning plan (slug: ${normalizedSlug}) from cache`);
        return cachedPlan;
      }

      // Cache miss - search Firestore
      const snapshot = await this.plansCollection
        .where("tier", "==", slug)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const plan = {
          id: doc.id,
          ...doc.data(),
        };

        // Cache the result
        await cacheService.cachePlanBySlug(normalizedSlug, plan);

        return plan;
      }

      // Try searching by name (case-insensitive)
      const allPlans = await this.getAllPlans();
      const match = allPlans.find(
        (p) => p.name.toLowerCase() === normalizedSlug ||
               p.tier.toLowerCase() === normalizedSlug ||
               p.displayName?.toLowerCase() === normalizedSlug
      );

      if (match) {
        // Cache the result
        await cacheService.cachePlanBySlug(normalizedSlug, match);
      }

      return match || null;
    } catch (error) {
      logger.error(`Error getting plan by slug ${slug}:`, error);
      return null;
    }
  }

  /**
   * Get plan by name
   */
  async getPlanByName(name) {
    if (!name || typeof name !== "string") {
      return null;
    }

    try {
      const snapshot = await this.plansCollection
        .where("name", "==", name.trim())
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error getting plan by name ${name}:`, error);
      return null;
    }
  }

  /**
   * Update a plan
   */
  async updatePlan(planId, updates) {
    if (!planId) {
      throw new Error("Plan ID is required");
    }

    // Validate updates if they contain core fields
    if (updates.name || updates.price || updates.duration || updates.features || updates.tier) {
      const currentPlan = await this.getPlanById(planId);
      if (!currentPlan) {
        throw new Error(`Plan with ID ${planId} not found`);
      }

      const planData = {
        name: updates.name || currentPlan.name,
        price: updates.price !== undefined ? updates.price : currentPlan.price,
        duration: updates.duration !== undefined ? updates.duration : currentPlan.duration,
        features: updates.features || currentPlan.features,
        tier: updates.tier || currentPlan.tier,
        description: updates.description !== undefined ? updates.description : currentPlan.description,
      };

      const validation = this.validatePlanData(planData);
      if (!validation.isValid) {
        throw new Error(`Invalid plan data: ${validation.errors.join(", ")}`);
      }
    }

    // Add updatedAt timestamp
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await this.plansCollection.doc(planId).update(updateData);
    logger.info(`Plan updated: ${planId}`);

    // Invalidate plan caches
    await cacheService.invalidatePlanCaches();

    return this.getPlanById(planId);
  }

  /**
   * Delete a plan (soft delete)
   */
  async deletePlan(planId) {
    if (!planId) {
      throw new Error("Plan ID is required");
    }

    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }

    await this.plansCollection.doc(planId).update({
      active: false,
      updatedAt: new Date().toISOString(),
    });

    logger.info(`Plan deleted (soft): ${planId}`);

    // Invalidate plan caches
    await cacheService.invalidatePlanCaches();
  }

  /**
   * Permanently delete a plan
   */
  async hardDeletePlan(planId) {
    if (!planId) {
      throw new Error("Plan ID is required");
    }

    await this.plansCollection.doc(planId).delete();
    logger.info(`Plan deleted (hard): ${planId}`);

    // Invalidate plan caches
    await cacheService.invalidatePlanCaches();
  }

  /**
   * Get plan statistics (with caching)
   */
  async getPlanStats() {
    try {
      // Check cache first
      const cachedStats = await cacheService.getPlanStats();
      if (cachedStats) {
        logger.debug("Returning plan stats from cache");
        return cachedStats;
      }

      // Cache miss - calculate stats
      const [allPlans, usersSnapshot] = await Promise.all([
        this.getAllPlans(),
        db.collection("users").get()]);

      const stats = {};
      const now = new Date();

      // Initialize stats for each plan
      allPlans.forEach(plan => {
        stats[plan.tier] = {
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          priceInCOP: plan.priceInCOP,
          activeSubscribers: 0,
          expiredSubscribers: 0,
          totalRevenue: 0,
          estimatedMonthlyRevenue: 0,
        };
      });

      // Count subscribers
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const tier = userData.tier;

        if (tier && stats[tier]) {
          const membership = userData.membership;
          const isActive = membership &&
            membership.expiresAt &&
            (membership.expiresAt.toDate ? membership.expiresAt.toDate() : new Date(membership.expiresAt)) > now;

          if (isActive) {
            stats[tier].activeSubscribers++;
            stats[tier].totalRevenue += stats[tier].price;
          } else if (tier !== "Free") {
            stats[tier].expiredSubscribers++;
          }
        }
      });

      // Calculate estimated monthly revenue
      Object.keys(stats).forEach(tier => {
        const plan = allPlans.find(p => p.tier === tier);
        if (plan && plan.duration) {
          const monthlyFactor = 30 / plan.duration;
          stats[tier].estimatedMonthlyRevenue = Math.round(
            stats[tier].activeSubscribers * plan.price * monthlyFactor
          );
        }
      });

      // Cache the stats
      await cacheService.cachePlanStats(stats);

      return stats;
    } catch (error) {
      logger.error("Error getting plan stats:", error);
      throw error;
    }
  }
}

module.exports = new PlanService();
