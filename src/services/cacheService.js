/**
 * Redis Cache Service
 * Provides caching layer for subscription plans, locale data, and other static/semi-static data
 */

const Redis = require("ioredis");
const logger = require("../utils/logger");

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.isEnabled = false;

    // TTL configurations (in seconds)
    this.TTL = {
      PLANS_LIST: 60 * 60, // 1 hour - active plans list
      PLAN_BY_ID: 60 * 60 * 2, // 2 hours - individual plans
      PLAN_STATS: 60 * 5, // 5 minutes - plan statistics
      LOCALE_DATA: 60 * 60 * 24, // 24 hours - locale strings
      MENU_CONFIG: 60 * 60 * 12, // 12 hours - menu configurations
      USER_SESSION: 60 * 30, // 30 minutes - user session data
    };

    // Cache key prefixes
    this.KEYS = {
      PLANS_ACTIVE: "plans:active",
      PLAN_BY_ID: "plan:id:",
      PLAN_BY_SLUG: "plan:slug:",
      PLAN_STATS: "plans:stats",
      LOCALE: "locale:",
      MENU: "menu:",
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  initializeRedis() {
    try {
      // Check if Redis is enabled via environment variable
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl || process.env.REDIS_ENABLED === "false") {
        logger.info("Redis caching disabled. Set REDIS_URL and REDIS_ENABLED=true to enable.");
        return;
      }

      // Parse Redis URL or use individual config
      const redisConfig = this.parseRedisConfig(redisUrl);

      this.redis = new Redis({
        ...redisConfig,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis reconnecting... attempt ${times}, delay ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      // Connection event handlers
      this.redis.on("connect", () => {
        logger.info("Redis: Connection established");
      });

      this.redis.on("ready", () => {
        this.isConnected = true;
        this.isEnabled = true;
        logger.info("Redis: Ready to accept commands");
      });

      this.redis.on("error", (error) => {
        logger.error("Redis error:", {
          message: error.message,
          code: error.code,
        });
        // Don't throw - let the app continue without caching
      });

      this.redis.on("close", () => {
        this.isConnected = false;
        logger.warn("Redis: Connection closed");
      });

      this.redis.on("reconnecting", () => {
        logger.info("Redis: Reconnecting...");
      });

    } catch (error) {
      logger.error("Failed to initialize Redis:", error);
      this.isEnabled = false;
    }
  }

  /**
   * Parse Redis configuration from URL or environment variables
   */
  parseRedisConfig(redisUrl) {
    if (redisUrl && redisUrl.startsWith("redis://")) {
      // Use URL parsing
      return {
        connectionName: "pnptv-bot",
      };
    }

    // Use individual config
    return {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || "0", 10),
      connectionName: "pnptv-bot",
    };
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.isEnabled && this.isConnected && this.redis;
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null
   */
  async get(key) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (!value) {
        logger.debug(`Cache MISS: ${key}`);
        return null;
      }

      logger.debug(`Cache HIT: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = 3600) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis.del(key);
      logger.debug(`Cache DEL: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Redis key pattern (e.g., "plan:*")
   */
  async delPattern(pattern) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      }
      return true;
    } catch (error) {
      logger.error(`Cache DEL pattern error for ${pattern}:`, error.message);
      return false;
    }
  }

  /**
   * Cache active plans
   */
  async cacheActivePlans(plans) {
    return this.set(this.KEYS.PLANS_ACTIVE, plans, this.TTL.PLANS_LIST);
  }

  /**
   * Get cached active plans
   */
  async getActivePlans() {
    return this.get(this.KEYS.PLANS_ACTIVE);
  }

  /**
   * Cache a single plan by ID
   */
  async cachePlanById(planId, plan) {
    return this.set(`${this.KEYS.PLAN_BY_ID}${planId}`, plan, this.TTL.PLAN_BY_ID);
  }

  /**
   * Get cached plan by ID
   */
  async getPlanById(planId) {
    return this.get(`${this.KEYS.PLAN_BY_ID}${planId}`);
  }

  /**
   * Cache a plan by slug
   */
  async cachePlanBySlug(slug, plan) {
    return this.set(`${this.KEYS.PLAN_BY_SLUG}${slug.toLowerCase()}`, plan, this.TTL.PLAN_BY_ID);
  }

  /**
   * Get cached plan by slug
   */
  async getPlanBySlug(slug) {
    return this.get(`${this.KEYS.PLAN_BY_SLUG}${slug.toLowerCase()}`);
  }

  /**
   * Cache plan statistics
   */
  async cachePlanStats(stats) {
    return this.set(this.KEYS.PLAN_STATS, stats, this.TTL.PLAN_STATS);
  }

  /**
   * Get cached plan statistics
   */
  async getPlanStats() {
    return this.get(this.KEYS.PLAN_STATS);
  }

  /**
   * Invalidate all plan-related caches
   * Called when a plan is created, updated, or deleted
   */
  async invalidatePlanCaches() {
    if (!this.isAvailable()) {
      return false;
    }

    logger.info("Invalidating all plan caches");

    await Promise.all([
      this.del(this.KEYS.PLANS_ACTIVE),
      this.del(this.KEYS.PLAN_STATS),
      this.delPattern(`${this.KEYS.PLAN_BY_ID}*`),
      this.delPattern(`${this.KEYS.PLAN_BY_SLUG}*`),
    ]);

    return true;
  }

  /**
   * Cache locale data
   */
  async cacheLocale(lang, data) {
    return this.set(`${this.KEYS.LOCALE}${lang}`, data, this.TTL.LOCALE_DATA);
  }

  /**
   * Get cached locale data
   */
  async getLocale(lang) {
    return this.get(`${this.KEYS.LOCALE}${lang}`);
  }

  /**
   * Cache menu configuration
   */
  async cacheMenu(menuType, lang, config) {
    return this.set(`${this.KEYS.MENU}${menuType}:${lang}`, config, this.TTL.MENU_CONFIG);
  }

  /**
   * Get cached menu configuration
   */
  async getMenu(menuType, lang) {
    return this.get(`${this.KEYS.MENU}${menuType}:${lang}`);
  }

  /**
   * Flush all caches (use with caution)
   */
  async flushAll() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis.flushdb();
      logger.warn("Cache: All keys flushed");
      return true;
    } catch (error) {
      logger.error("Cache FLUSH error:", error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isAvailable()) {
      return {
        enabled: false,
        connected: false,
      };
    }

    try {
      const info = await this.redis.info("stats");
      const keyspace = await this.redis.info("keyspace");

      return {
        enabled: this.isEnabled,
        connected: this.isConnected,
        info: {
          stats: info,
          keyspace: keyspace,
        },
      };
    } catch (error) {
      logger.error("Failed to get cache stats:", error);
      return {
        enabled: this.isEnabled,
        connected: this.isConnected,
        error: error.message,
      };
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      logger.info("Redis connection closed gracefully");
    }
  }
}

// Export singleton instance
module.exports = new CacheService();
