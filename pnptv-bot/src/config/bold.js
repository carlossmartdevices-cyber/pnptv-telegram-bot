const axios = require("axios");

/**
 * Bold.co Payment Integration
 * Colombian payment gateway for credit cards, bank transfers, and more
 */

const BOLD_BASE_URL = "https://api.bold.co/v1";

class BoldPaymentGateway {
  constructor() {
    this.apiKey = process.env.BOLD_API_KEY;
    this.secretKey = process.env.BOLD_SECRET_KEY;

    if (!this.apiKey || !this.secretKey) {
      console.warn(
        "⚠️  Bold payment credentials not configured. Payment features will be limited."
      );
    }
  }

  /**
   * Create a payment link for subscription
   */
  async createPaymentLink(options) {
    const {
      amount,
      currency = "COP",
      reference,
      email,
      description,
      successUrl,
      cancelUrl,
      customerName,
      customerPhone,
      metadata = {},
    } = options;

    try {
      const response = await axios.post(
        `${BOLD_BASE_URL}/payments`,
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          reference,
          description,
          customer: {
            email,
            name: customerName,
            phone: customerPhone,
          },
          redirect_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            ...metadata,
            source: "telegram_bot",
            bot_name: "PNPtv",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "X-Bold-Signature": this.generateSignature(reference),
          },
        }
      );

      return {
        success: true,
        paymentLink: response.data.payment_url,
        paymentId: response.data.payment_id,
        reference: response.data.reference,
      };
    } catch (error) {
      console.error(
        "Bold payment creation error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Create subscription payment
   */
  async createSubscription(options) {
    const {
      userId,
      tier,
      amount,
      email,
      customerName,
      currency = "COP",
    } = options;

    const reference = `PNPTV-SUB-${userId}-${tier}-${Date.now()}`;
    const description = `PNPtv ${tier} Subscription`;

    const successUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/payment/success?ref=${reference}`
      : "https://pnp.tv/payment/success";

    const cancelUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/payment/cancel?ref=${reference}`
      : "https://pnp.tv/payment/cancel";

    return await this.createPaymentLink({
      amount,
      currency,
      reference,
      email,
      description,
      successUrl,
      cancelUrl,
      customerName,
      metadata: {
        userId,
        tier,
        subscriptionType: "monthly",
      },
    });
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId) {
    try {
      const response = await axios.get(
        `${BOLD_BASE_URL}/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const payment = response.data;

      return {
        success: true,
        status: payment.status, // 'pending', 'approved', 'rejected', 'cancelled'
        amount: payment.amount / 100, // Convert from cents
        currency: payment.currency,
        reference: payment.reference,
        paidAt: payment.paid_at,
        metadata: payment.metadata,
      };
    } catch (error) {
      console.error(
        "Bold payment verification error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Process refund
   */
  async refundPayment(paymentId, amount = null, reason = "") {
    try {
      const response = await axios.post(
        `${BOLD_BASE_URL}/payments/${paymentId}/refund`,
        {
          amount: amount ? Math.round(amount * 100) : undefined, // Partial refund if amount specified
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        refundId: response.data.refund_id,
        amount: response.data.amount / 100,
        status: response.data.status,
      };
    } catch (error) {
      console.error(
        "Bold refund error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get payment methods available
   */
  async getAvailablePaymentMethods(currency = "COP") {
    try {
      const response = await axios.get(`${BOLD_BASE_URL}/payment-methods`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        params: { currency },
      });

      return {
        success: true,
        methods: response.data.payment_methods,
      };
    } catch (error) {
      console.error(
        "Bold payment methods error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        methods: [],
      };
    }
  }

  /**
   * List all payments for a customer
   */
  async listPayments(filters = {}) {
    const { email, status, startDate, endDate, limit = 10 } = filters;

    try {
      const response = await axios.get(`${BOLD_BASE_URL}/payments`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        params: {
          email,
          status,
          start_date: startDate,
          end_date: endDate,
          limit,
        },
      });

      return {
        success: true,
        payments: response.data.payments.map((p) => ({
          id: p.payment_id,
          reference: p.reference,
          amount: p.amount / 100,
          currency: p.currency,
          status: p.status,
          createdAt: p.created_at,
          paidAt: p.paid_at,
        })),
        total: response.data.total,
      };
    } catch (error) {
      console.error(
        "Bold list payments error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        payments: [],
      };
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload, signature) {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(JSON.stringify(payload))
      .digest("hex");

    return signature === expectedSignature;
  }

  /**
   * Generate payment signature
   */
  generateSignature(reference) {
    const crypto = require("crypto");
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(reference)
      .digest("hex");
  }

  /**
   * Convert USD to COP (Colombian Pesos)
   * Note: In production, use a real exchange rate API
   */
  usdToCop(usdAmount) {
    const exchangeRate = 4000; // Approximate rate, update with real API
    return Math.round(usdAmount * exchangeRate);
  }

  /**
   * Format amount for display
   */
  formatAmount(amount, currency = "COP") {
    const formatter = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency,
    });
    return formatter.format(amount);
  }

  /**
   * Check if Bold is configured
   */
  isConfigured() {
    return !!(this.apiKey && this.secretKey);
  }
}

// Export singleton instance
const boldGateway = new BoldPaymentGateway();

module.exports = boldGateway;

// Also export class for testing
module.exports.BoldPaymentGateway = BoldPaymentGateway;
