const axios = require("axios");
const { collections, FieldValue } = require("./firebase");
const plans = require("./plans");

class PaymentManager {
  static async createTelegramStarsPayment(userId, tier, bot) {
    try {
      const plan = plans[tier];
      if (!plan || !plan.starPrice) {
        return { success: false, error: "Invalid plan" };
      }

      const invoice = {
        title: `PNPtv ${plan.name} Subscription`,
        description: `${plan.name} tier - ${plan.features
          .slice(0, 3)
          .join(", ")}`,
        payload: JSON.stringify({
          userId,
          tier,
          type: "subscription",
          timestamp: Date.now(),
        }),
        provider_token: "", // Empty for Telegram Stars
        currency: "XTR", // Telegram Stars currency
        prices: [
          {
            label: `${plan.name} Subscription`,
            amount: plan.starPrice,
          },
        ],
      };

      return { success: true, invoice };
    } catch (error) {
      console.error("Error creating Stars payment:", error);
      return { success: false, error: error.message };
    }
  }

  static async createCryptoPayment(userId, tier, cryptoType = "USDT") {
    try {
      const plan = plans[tier];
      if (!plan) {
        return { success: false, error: "Invalid plan" };
      }

      const amount = plan.priceUSD + (plan.cryptoBonus || 0);

      // Integration with TON Connect or similar
      const paymentData = {
        userId,
        tier,
        amount,
        currency: cryptoType,
        reference: `PNPTV-${userId}-${Date.now()}`,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await collections.transactions.add(paymentData);

      return {
        success: true,
        paymentData,
        message: "Crypto payment initiated. Please complete the transaction.",
      };
    } catch (error) {
      console.error("Error creating crypto payment:", error);
      return { success: false, error: error.message };
    }
  }

  static async createBoldPayment(
    amount,
    currency,
    reference,
    email,
    successUrl,
    cancelUrl
  ) {
    try {
      const response = await axios.post(
        "https://api.bold.co/v1/payments",
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          reference,
          customer: { email },
          redirect_url: successUrl,
          cancel_url: cancelUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.BOLD_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error creating Bold payment:", error);
      return { success: false, error: error.message };
    }
  }

  static async processSuccessfulPayment(
    userId,
    tier,
    transactionId,
    paymentMethod
  ) {
    try {
      const plan = plans[tier];
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await collections.users.doc(userId).update({
        tier,
        tierExpiresAt: expiresAt.toISOString(),
        lastPayment: {
          method: paymentMethod,
          amount: plan.price,
          transactionId,
          date: new Date().toISOString(),
        },
      });

      // Award badge
      const { GamificationManager } = require("./gamification");
      if (tier === "silver") {
        await GamificationManager.awardBadge(userId, "SILVER");
      } else if (tier === "golden") {
        await GamificationManager.awardBadge(userId, "GOLDEN");
      }

      // Log transaction
      await collections.transactions.add({
        userId,
        tier,
        amount: plan.price,
        method: paymentMethod,
        transactionId,
        status: "completed",
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error("Error processing payment:", error);
      return { success: false, error: error.message };
    }
  }

  static async checkSubscriptionStatus(userId) {
    try {
      const userDoc = await collections.users.doc(userId).get();
      const userData = userDoc.data();

      if (!userData.tier || userData.tier === "free") {
        return { active: false, tier: "free" };
      }

      const expiresAt = new Date(userData.tierExpiresAt);
      const now = new Date();

      if (expiresAt < now) {
        // Subscription expired, downgrade to free
        await collections.users.doc(userId).update({
          tier: "free",
          tierExpiresAt: null,
        });

        return { active: false, tier: "free", expired: true };
      }

      return {
        active: true,
        tier: userData.tier,
        expiresAt: userData.tierExpiresAt,
        daysRemaining: Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)),
      };
    } catch (error) {
      console.error("Error checking subscription:", error);
      return { active: false, tier: "free", error: error.message };
    }
  }

  static async giftStarsToUser(
    fromUserId,
    toUserId,
    stars,
    giftType = "custom"
  ) {
    try {
      const fromDoc = await collections.users.doc(fromUserId).get();
      const fromUser = fromDoc.data();

      if (!fromUser.starsBalance || fromUser.starsBalance < stars) {
        return { success: false, error: "Insufficient Stars balance" };
      }

      // Deduct from sender
      await collections.users.doc(fromUserId).update({
        starsBalance: FieldValue.increment(-stars),
        totalStarsGifted: FieldValue.increment(stars),
      });

      // Add to recipient
      await collections.users.doc(toUserId).update({
        starsBalance: FieldValue.increment(stars),
        totalStarsReceived: FieldValue.increment(stars),
      });

      // Log transaction
      await collections.transactions.add({
        type: "gift",
        fromUserId,
        toUserId,
        amount: stars,
        giftType,
        createdAt: new Date().toISOString(),
      });

      // Award XP to sender
      const { GamificationManager } = require("./gamification");
      await GamificationManager.addXP(fromUserId, "RECEIVE_GIFT", 8);

      return { success: true, stars };
    } catch (error) {
      console.error("Error gifting Stars:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PaymentManager;
