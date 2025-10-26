/**
 * Subscription Flow Helpers
 * Handles payment link creation and subscription flow
 */

const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const epayco = require("../../config/epayco");
const daimo = require("../../config/daimo");
const { ensureOnboarding } = require("../../utils/guards");
const planService = require("../../services/planService");
const {
  PaymentGatewayError,
  PlanNotFoundError,
} = require("../../utils/errors");

/**
 * Format plan features list for Markdown rendering
 * @param {object} plan
 * @param {string} lang
 * @returns {string}
 */
function formatPlanFeatures(plan, lang) {
  if (Array.isArray(plan.features) && plan.features.length > 0) {
    return plan.features.map((feature) => `- ${feature}`).join("\n");
  }

  return lang === "es"
    ? "- Acceso premium\n- Beneficios exclusivos"
    : "- Premium access\n- Exclusive benefits";
}

/**
 * Handle subscription workflow for a plan
 * @param {object} ctx - Telegraf context
 * @param {string} planIdentifier - Plan id or slug
 */
async function handleSubscription(ctx, planIdentifier, paymentMethod = null, retryCount = 0) {
  if (!ensureOnboarding(ctx)) return;

  // Answer callback query IMMEDIATELY to prevent timeout
  // This stops the loading spinner while we process
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {}); // Ignore errors if already answered
  }

  try {
    const lang = ctx.session.language || "en";
    const identifier = String(planIdentifier || "").trim();
    const MAX_RETRIES = 3;

    const plan =
      (await planService.getPlanById(identifier)) ||
      (await planService.getPlanBySlug(identifier.toLowerCase()));
    if (!plan) throw new PlanNotFoundError(identifier);

    const userId = ctx.from.id.toString();
    const features = formatPlanFeatures(plan, lang);
    const priceDisplay = `${plan.priceInCOP.toLocaleString()} ${
      plan.currency || "COP"
    }`;
    const planNameDisplay = plan.displayName || plan.name;

    // If no payment method specified, show plan details with payment options
    if (!paymentMethod) {
      // Plan details message
      const planDetails =
        lang === "es"
          ? `${plan.icon || "💎"} **${planNameDisplay}**\n\n` +
            `**Descripción:**\n${plan.description || "Plan de suscripción premium"}\n\n` +
            `**Características:**\n${features}\n\n` +
            `💰 **Precio:** $${plan.price} USD (${plan.priceInCOP.toLocaleString()} COP)\n` +
            `⏱️ **Duración:** ${plan.durationDays || plan.duration} días\n\n` +
            `**Selecciona tu método de pago:**`
          : `${plan.icon || "💎"} **${planNameDisplay}**\n\n` +
            `**Description:**\n${plan.description || "Premium subscription plan"}\n\n` +
            `**Features:**\n${features}\n\n` +
            `💰 **Price:** $${plan.price} USD (${plan.priceInCOP.toLocaleString()} COP)\n` +
            `⏱️ **Duration:** ${plan.durationDays || plan.duration} days\n\n` +
            `**Select your payment method:**`;

      const paymentButtons = [];

      // ePayco option (credit/debit cards - Colombia)
      paymentButtons.push([
        {
          text: lang === "es" ? "💳 Pagar con Tarjeta (ePayco)" : "💳 Pay with Card (ePayco)",
          callback_data: `pay_epayco_${plan.id}`,
        },
      ]);

      // Daimo Pay option (USDC stablecoin)
      if (process.env.DAIMO_APP_ID) {
        paymentButtons.push([
          {
            text: lang === "es" ? "💰 Pagar con USDC (Daimo)" : "💰 Pay with USDC (Daimo)",
            callback_data: `pay_daimo_${plan.id}`,
          },
        ]);
      }

      // Back button
      paymentButtons.push([
        {
          text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
          callback_data: "show_subscription_plans",
        },
      ]);

      // Edit message to show plan details
      try {
        await ctx.editMessageText(planDetails, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: paymentButtons,
          },
        });
      } catch (editError) {
        // If edit fails, send new message
        await ctx.reply(planDetails, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: paymentButtons,
          },
        });
      }
      return;
    }

    // Handle Nequi payment method (manual activation)
    if (plan.paymentMethod === "nequi") {
      const message =
        lang === "es"
          ? `✨ **${planNameDisplay}**\n\n${features}\n\n📃 **Detalles del Pago:**\n- Plan: ${planNameDisplay}\n- Precio: ${priceDisplay}\n- Duración: ${plan.durationDays} días\n\n💳 **Método de Pago: Nequi Negocios**\n\n⚠️ **Importante:** Después de completar el pago, envía tu comprobante al administrador para activar tu suscripción manualmente.\n\nHaz clic en el botón para ir a Nequi:`
          : `✨ **${planNameDisplay}**\n\n${features}\n\n📃 **Payment Details:**\n- Plan: ${planNameDisplay}\n- Price: ${priceDisplay}\n- Duration: ${plan.durationDays} days\n\n💳 **Payment Method: Nequi Negocios**\n\n⚠️ **Important:** After completing payment, send your receipt to the admin for manual subscription activation.\n\nClick the button to go to Nequi:`;

      // Edit message to show Nequi payment
      try {
        await ctx.editMessageText(message, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "💳 Pagar con Nequi" : "💳 Pay with Nequi",
                  url: plan.paymentLink,
                },
              ],
              [
                {
                  text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                  callback_data: "show_subscription_plans",
                },
              ],
            ],
          },
        });
      } catch (editError) {
        await ctx.reply(message, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "💳 Pagar con Nequi" : "💳 Pay with Nequi",
                  url: plan.paymentLink,
                },
              ],
              [
                {
                  text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                  callback_data: "show_subscription_plans",
                },
              ],
            ],
          },
        });
      }
      return;
    }

    // Handle Daimo Pay payment method (USDC stablecoin - automatic activation)
    if (paymentMethod === "daimo" || plan.paymentMethod === "daimo") {
      const daimoConfig = daimo.getConfig();
      if (!daimoConfig.enabled) {
        throw new PaymentGatewayError("Daimo Pay not configured");
      }

      const userEmail = ctx.from.username
        ? `${ctx.from.username}@telegram.user`
        : `user${userId}@telegram.bot`;

      // Convert COP to USD if needed (Daimo uses USDC/USD)
      const amountUSD = plan.currency === "USD" ? plan.price : plan.price / 4000; // Simple conversion, adjust as needed

      try {
        const paymentData = await daimo.createPaymentRequest({
          amount: amountUSD,
          userId,
          plan: plan.id,
        });

        if (!paymentData.success || !paymentData.paymentUrl) {
          throw new PaymentGatewayError(
            "Daimo payment request failed",
            paymentData
          );
        }

        const message =
          lang === "es"
            ? `✨ **${planNameDisplay}**\n\n${features}\n\n📃 **Detalles del Pago:**\n- Plan: ${planNameDisplay}\n- Precio: $${amountUSD.toFixed(2)} USD (USDC)\n- Precio COP: ${priceDisplay}\n- Duración: ${plan.durationDays} días\n\n💰 **Método de Pago: Daimo Pay (Stablecoin USDC)**\n\nPaga con USDC desde cualquier exchange, wallet o app de pago (Cash App, Zelle, Venmo, Revolut y Wise).\n\nTu suscripción se activará automáticamente tras el pago.\n\nHaz clic en el botón para continuar:`
            : `✨ **${planNameDisplay}**\n\n${features}\n\n📃 **Payment Details:**\n- Plan: ${planNameDisplay}\n- Price: $${amountUSD.toFixed(2)} USD (USDC)\n- Price COP: ${priceDisplay}\n- Duration: ${plan.durationDays} days\n\n💰 **Payment Method: Daimo Pay (USDC Stablecoin)**\n\nPay with USDC from any exchange, wallet, or payment app (Cash App, Zelle, Venmo, Revolut and Wise).\n\nYour subscription will be activated automatically after payment.\n\nClick the button to proceed:`;

        // Edit message to show Daimo payment
        try {
          await ctx.editMessageText(message, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: lang === "es" ? "💰 Pagar con USDC" : "💰 Pay with USDC",
                    url: paymentData.paymentUrl,
                  },
                ],
                [
                  {
                    text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                    callback_data: "show_subscription_plans",
                  },
                ],
              ],
            },
          });
        } catch (editError) {
          await ctx.reply(message, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: lang === "es" ? "💰 Pagar con USDC" : "💰 Pay with USDC",
                    url: paymentData.paymentUrl,
                  },
                ],
                [
                  {
                    text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                    callback_data: "show_subscription_plans",
                  },
                ],
              ],
            },
          });
        }
        return;
      } catch (daimoError) {
        logger.error("[Subscription] Daimo payment error:", daimoError);
        throw new PaymentGatewayError(daimoError.message, {
          originalError: daimoError,
        });
      }
    }

    // Handle ePayco payment method (automatic activation)
    if (paymentMethod === "epayco" || plan.paymentMethod === "epayco" || !paymentMethod) {
      if (!process.env.EPAYCO_PUBLIC_KEY) {
        throw new PaymentGatewayError("Payment gateway not configured");
      }
    }

    const userEmail = ctx.from.username
      ? `${ctx.from.username}@telegram.user`
      : `user${userId}@telegram.bot`;

    try {
      const paymentData = await epayco.createPaymentLink({
        name: plan.name,
        description:
          plan.description ||
          `${plan.name} subscription - ${plan.durationDays} days`,
        amount: plan.priceInCOP,
        currency: plan.currency || "COP",
        userId,
        userEmail,
        userName: ctx.from.first_name || ctx.from.username || "User",
        plan: plan.id,
      });

      if (!paymentData.success || !paymentData.paymentUrl) {
        throw new PaymentGatewayError(
          "Payment link creation failed",
          paymentData
        );
      }

      const message =
        lang === "es"
          ? `✨ **${planNameDisplay}**\n\n${features}\n\n📃 **Detalles del Pago:**\n- Plan: ${planNameDisplay}\n- Precio: ${priceDisplay}\n- Duración: ${plan.durationDays} días\n\n💳 **Método de Pago: ePayco (Automático)**\n\nPaga con cualquier tarjeta de débito o crédito.\n\nTu suscripción se activará automáticamente tras el pago.\n\nHaz clic en el botón para continuar con el pago:`
          : `✨ **${planNameDisplay}**\n\n${features}\n\n📃 **Payment Details:**\n- Plan: ${planNameDisplay}\n- Price: ${priceDisplay}\n- Duration: ${plan.durationDays} days\n\n💳 **Payment Method: ePayco (Automatic)**\n\nPay with any debit or credit card.\n\nYour subscription will be activated automatically after payment.\n\nClick the button to proceed with payment:`;

      // Edit message to show ePayco payment
      try {
        await ctx.editMessageText(message, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "🚀 Ir a Pagar" : "🚀 Go to Payment",
                  url: paymentData.paymentUrl,
                },
              ],
              [
                {
                  text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                  callback_data: "show_subscription_plans",
                },
              ],
            ],
          },
        });
      } catch (editError) {
        await ctx.reply(message, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "🚀 Ir a Pagar" : "🚀 Go to Payment",
                  url: paymentData.paymentUrl,
                },
              ],
              [
                {
                  text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                  callback_data: "show_subscription_plans",
                },
              ],
            ],
          },
        });
      }
    } catch (paymentError) {
      if (retryCount < MAX_RETRIES) {
        logger.warn("[Subscription] Retrying payment link creation", {
          attempt: retryCount + 1,
          userId,
          planId: plan.id,
        });
        return handleSubscription(ctx, planIdentifier, retryCount + 1);
      }
      throw new PaymentGatewayError(paymentError.message, {
        attempts: retryCount + 1,
        originalError: paymentError,
      });
    }
  } catch (error) {
    logger.error("[Subscription] Error", {
      type: error.name,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });

    const lang = ctx.session.language || "en";
    let errorMessage;

    switch (error.code) {
      case "PLAN_NOT_FOUND":
        errorMessage =
          lang === "es"
            ? "⚠️ Plan no encontrado. Por favor selecciona otro plan."
            : "⚠️ Plan not found. Please select another plan.";
        break;
      case "PAYMENT_GATEWAY_ERROR":
        errorMessage =
          lang === "es"
            ? "⚠️ Error con el sistema de pago. Por favor intenta más tarde."
            : "⚠️ Payment system error. Please try again later.";
        break;
      default:
        errorMessage =
          lang === "es"
            ? `⚠️ Error inesperado. Por favor contacta a soporte.\n\nError: ${error.message}`
            : `⚠️ Unexpected error. Please contact support.\n\nError: ${error.message}`;
    }

    if (ctx.updateType === "callback_query") {
      // Already answered callback query at the start, but try again in case of early errors
      await ctx.answerCbQuery().catch(() => {});
      try {
        await ctx.editMessageText(errorMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "🔄 Reintentar" : "🔄 Retry",
                  callback_data: `plan_select_${planIdentifier}`,
                },
              ],
              [
                {
                  text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                  callback_data: "show_subscription_plans",
                },
              ],
            ],
          },
        });
      } catch (editError) {
        await ctx.reply(errorMessage, { parse_mode: "Markdown" });
      }
    } else {
      await ctx.reply(errorMessage, { parse_mode: "Markdown" });
    }
  }
}

/**
 * Process plan selection and create payment session
 * @param {string} planId - Selected plan ID
 * @param {string} userId - User ID
 */
async function processPlanSelection(planId, userId) {
  const plans = await planService.getActivePlans();
  const selectedPlan = plans.find((p) => p.id === planId);

  if (!selectedPlan) {
    throw new Error("Plan not found");
  }

  // Create payment session
  const paymentSession = await createPaymentSession({
    amount: selectedPlan.price,
    planId: selectedPlan.id,
    userId,
    duration: selectedPlan.duration,
  });

  return paymentSession;
}

module.exports = {
  handleSubscription,
};
