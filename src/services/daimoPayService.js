const { db } = require("../config/firebase");
const logger = require("../utils/logger");

/**
 * Daimo Pay Service - USDC Stablecoin Payment Integration
 * Handles USDC payments via Daimo Pay API (Base Network)
 */

class DaimoPayService {
  constructor() {
    this.baseUrl = process.env.DAIMO_API_URL || "https://api.daimo.com/v1";
    this.apiKey = process.env.DAIMO_API_KEY;
    this.webhookSecret = process.env.DAIMO_WEBHOOK_SECRET;
    this.enabled = process.env.DAIMO_ENABLED === "true";
    
    // Supported blockchain networks
    this.SUPPORTED_CHAINS = {
      BASE: 8453,      // Base Network (recommended - lowest fees)
      ETHEREUM: 1,     // Ethereum Mainnet
      ARBITRUM: 42161, // Arbitrum One
    };
    
    if (this.enabled && !this.apiKey) {
      logger.warn("[DaimoPayService] DAIMO_API_KEY not configured");
      this.enabled = false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      enabled: this.enabled,
      baseUrl: this.baseUrl,
      supportedChains: this.SUPPORTED_CHAINS,
    };
  }

  /**
   * Create a new payment request
   * @param {Object} params - Payment parameters
   * @param {string} params.planName - Name of the subscription plan
   * @param {number} params.amount - Amount in USD
   * @param {string} params.userId - Telegram user ID
   * @param {string} params.planId - Plan ID
   * @param {string} params.userName - User's display name
   * @param {number} params.chainId - Blockchain network ID (default: Base)
   * @returns {Promise<Object>} Payment creation result
   */
  async createPayment({ planName, amount, userId, planId, userName, chainId = this.SUPPORTED_CHAINS.BASE }) {
    if (!this.enabled) {
      throw new Error("Daimo Pay is not enabled");
    }

    if (!this.apiKey) {
      throw new Error("Daimo API key not configured");
    }

    try {
      const paymentId = `pnptv_${userId}_${Date.now()}`;
      const metadata = {
        userId,
        planId,
        userName,
        platform: "telegram",
        bot: "pnptv",
        reference: paymentId,
        botName: "PNPtv Bot",
      };

      // USDC token address on Base Network
      const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

      // Prepare payment request in Daimo format
      const paymentRequest = {
        display: {
          intent: `PNPtv PRIME - ${planName}`,
          preferredChains: [chainId],
          preferredTokens: [
            { chain: chainId, address: BASE_USDC }
          ],
          redirectUri: `https://${process.env.BOT_DOMAIN || 'pnptv.app'}/payment/success`,
        },
        destination: {
          destinationAddress: process.env.DAIMO_DESTINATION_ADDRESS,
          chainId: chainId,
          tokenAddress: BASE_USDC,
          amountUnits: amount.toString(),
        },
        refundAddress: process.env.DAIMO_REFUND_ADDRESS,
        metadata: metadata,
      };

      logger.info("[DaimoPayService] Creating payment request", {
        paymentId,
        amount,
        planName,
        userId,
        chainId,
      });

      // Make API call to Daimo - use correct endpoint
      const response = await fetch("https://pay.daimo.com/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": this.apiKey,
          "User-Agent": "PNPtv-Bot/1.0",
        },
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error("[DaimoPayService] API error", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`Daimo API error: ${response.status} ${response.statusText}`);
      }

      const paymentData = await response.json();

      // Store payment in database
      await this.storePayment({
        paymentId,
        userId,
        planId,
        amount,
        status: "pending",
        chainId,
        daimoPaymentId: paymentData.id,
        checkoutUrl: paymentData.url || paymentData.checkoutUrl,
        metadata,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      logger.info("[DaimoPayService] Payment created successfully", {
        paymentId,
        daimoPaymentId: paymentData.id,
        checkoutUrl: paymentData.url ? "URL_PROVIDED" : "NO_URL",
      });

      return {
        paymentId,
        id: paymentData.id,
        checkoutUrl: paymentData.url || paymentData.checkoutUrl,
        amount,
        currency: "USDC",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      };

    } catch (error) {
      logger.error("[DaimoPayService] Payment creation failed", {
        error: error.message,
        stack: error.stack,
        userId,
        planId,
        amount,
      });
      throw error;
    }
  }

  /**
   * Store payment record in Firestore
   * @private
   */
  async storePayment(paymentData) {
    try {
      await db.collection("daimo_payments").doc(paymentData.paymentId).set(paymentData);
      logger.info("[DaimoPayService] Payment stored in database", {
        paymentId: paymentData.paymentId,
      });
    } catch (error) {
      logger.error("[DaimoPayService] Failed to store payment", {
        error: error.message,
        paymentId: paymentData.paymentId,
      });
      throw error;
    }
  }

  /**
   * Get payment by ID
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object|null>} Payment data or null
   */
  async getPayment(paymentId) {
    try {
      const doc = await db.collection("daimo_payments").doc(paymentId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      logger.error("[DaimoPayService] Failed to get payment", {
        error: error.message,
        paymentId,
      });
      return null;
    }
  }

  /**
   * Update payment status
   * @param {string} paymentId - Payment ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to store
   */
  async updatePaymentStatus(paymentId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        updatedAt: new Date(),
        ...additionalData,
      };

      await db.collection("daimo_payments").doc(paymentId).update(updateData);
      
      logger.info("[DaimoPayService] Payment status updated", {
        paymentId,
        status,
        additionalData,
      });
    } catch (error) {
      logger.error("[DaimoPayService] Failed to update payment status", {
        error: error.message,
        paymentId,
        status,
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - Webhook signature header
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      logger.warn("[DaimoPayService] Webhook secret not configured");
      return false;
    }

    try {
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(payload, "utf8")
        .digest("hex");

      const providedSignature = signature.replace("sha256=", "");
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(providedSignature, "hex")
      );
    } catch (error) {
      logger.error("[DaimoPayService] Webhook signature verification failed", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Process webhook event
   * @param {Object} event - Webhook event data
   * @returns {Promise<void>}
   */
  async processWebhookEvent(event) {
    try {
      logger.info("[DaimoPayService] Processing webhook event", {
        type: event.type,
        paymentId: event.data?.externalId,
      });

      switch (event.type) {
        case "payment.succeeded":
          await this.handlePaymentSuccess(event.data);
          break;
        case "payment.failed":
          await this.handlePaymentFailure(event.data);
          break;
        case "payment.cancelled":
          await this.handlePaymentCancellation(event.data);
          break;
        default:
          logger.info("[DaimoPayService] Unhandled webhook event type", {
            type: event.type,
          });
      }
    } catch (error) {
      logger.error("[DaimoPayService] Webhook processing failed", {
        error: error.message,
        event,
      });
      throw error;
    }
  }

  /**
   * Handle successful payment
   * @private
   */
  async handlePaymentSuccess(paymentData) {
    const paymentId = paymentData.externalId;
    const txHash = paymentData.transactionHash;

    logger.info("[DaimoPayService] Processing successful payment", {
      paymentId,
      txHash,
    });

    // Update payment record
    await this.updatePaymentStatus(paymentId, "completed", {
      transactionHash: txHash,
      completedAt: new Date(),
      daimoData: paymentData,
    });

    // Get payment details
    const payment = await this.getPayment(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    // Activate user subscription
    const planService = require("./planService");
    await planService.activateUserPlan(payment.userId, payment.planId);

    logger.info("[DaimoPayService] User subscription activated", {
      userId: payment.userId,
      planId: payment.planId,
      paymentId,
    });
  }

  /**
   * Handle failed payment
   * @private
   */
  async handlePaymentFailure(paymentData) {
    const paymentId = paymentData.externalId;
    const reason = paymentData.failureReason;

    logger.info("[DaimoPayService] Processing failed payment", {
      paymentId,
      reason,
    });

    await this.updatePaymentStatus(paymentId, "failed", {
      failureReason: reason,
      failedAt: new Date(),
      daimoData: paymentData,
    });
  }

  /**
   * Handle cancelled payment
   * @private
   */
  async handlePaymentCancellation(paymentData) {
    const paymentId = paymentData.externalId;

    logger.info("[DaimoPayService] Processing cancelled payment", {
      paymentId,
    });

    await this.updatePaymentStatus(paymentId, "cancelled", {
      cancelledAt: new Date(),
      daimoData: paymentData,
    });
  }

  /**
   * Get payment statistics
   * @returns {Promise<Object>} Payment statistics
   */
  async getPaymentStats() {
    try {
      const paymentsRef = db.collection("daimo_payments");
      
      const [totalQuery, successQuery, failedQuery] = await Promise.all([
        paymentsRef.get(),
        paymentsRef.where("status", "==", "completed").get(),
        paymentsRef.where("status", "==", "failed").get(),
      ]);

      const totalRevenue = successQuery.docs.reduce((sum, doc) => {
        return sum + (doc.data().amount || 0);
      }, 0);

      return {
        totalPayments: totalQuery.size,
        successfulPayments: successQuery.size,
        failedPayments: failedQuery.size,
        totalRevenue: totalRevenue,
        successRate: totalQuery.size > 0 ? (successQuery.size / totalQuery.size) * 100 : 0,
      };
    } catch (error) {
      logger.error("[DaimoPayService] Failed to get payment stats", {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
const daimoPayService = new DaimoPayService();
module.exports = daimoPayService;