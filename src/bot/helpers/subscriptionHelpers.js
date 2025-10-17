/**
 * Subscription Flow Helpers
 * Handles payment link creation and subscription flow
 */

const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const epayco = require("../../config/epayco");
const { ensureOnboarding } = require("../../utils/guards");
const { getPlanById, getPlanBySlug } = require("../../services/planService");
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
async function handleSubscription(ctx, planIdentifier, retryCount = 0) {
  if (!ensureOnboarding(ctx)) return;

  try {
    const lang = ctx.session.language || "en";
    const identifier = String(planIdentifier || "").trim();
    const MAX_RETRIES = 3;

    const plan =
      (await getPlanById(identifier)) ||
      (await getPlanBySlug(identifier.toLowerCase()));
    if (!plan) throw new PlanNotFoundError(identifier);

    if (!process.env.EPAYCO_PUBLIC_KEY) {
      throw new PaymentGatewayError("Payment gateway not configured");
    }

    const userId = ctx.from.id.toString();
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

      const features = formatPlanFeatures(plan, lang);
      const priceDisplay = `${plan.priceInCOP.toLocaleString()} ${
        plan.currency || "COP"
      }`;
      const planNameDisplay = plan.displayName || plan.name;
      const message =
        lang === "es"
          ? `✨ **${planNameDisplay}**\n\n${features}\n\n📃 **Detalles del Pago:**\n- Plan: ${planNameDisplay}\n- Precio: ${priceDisplay}\n- Duración: ${plan.durationDays} días\n\nHaz clic en el botón para continuar con el pago:`
          : `✨ **${planNameDisplay}**\n\n${features}\n\n📃 **Payment Details:**\n- Plan: ${planNameDisplay}\n- Price: ${priceDisplay}\n- Duration: ${plan.durationDays} days\n\nClick the button to proceed with payment:`;

      await ctx.answerCbQuery();
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
                text: lang === "es" ? "🔙 Volver" : "🔙 Back",
                callback_data: "back_to_main",
              },
            ],
          ],
        },
      });
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
      await ctx.answerCbQuery();
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
                  text: lang === "es" ? "🔙 Volver" : "🔙 Back",
                  callback_data: "back_to_main",
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
