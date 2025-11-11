/**
 * Subscription Flow Helpers
 * Handles subscription flow with Daimo Pay integration
 */

const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
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
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }

  try {
    const lang = ctx.session.language || "en";
    const identifier = String(planIdentifier || "").trim();

    const plan =
      (await planService.getPlanById(identifier)) ||
      (await planService.getPlanBySlug(identifier.toLowerCase()));
    if (!plan) throw new PlanNotFoundError(identifier);

    const userId = ctx.from.id.toString();
    const features = formatPlanFeatures(plan, lang);
    const priceDisplay = plan.priceInCOP 
      ? `${plan.priceInCOP.toLocaleString()} ${plan.currency || "COP"}`
      : plan.price || "Contact for pricing";
    const planNameDisplay = plan.displayName || plan.name;

    // Show plan details with payment options
    const copPrice = plan.priceInCOP ? `(${plan.priceInCOP.toLocaleString()} COP)` : '';
    const planDetails =
      lang === "es"
        ? `${plan.icon || "💎"} **${planNameDisplay}**\n\n` +
          `**Descripción:**\n${plan.description || "Plan de suscripción premium"}\n\n` +
          `**Características:**\n${features}\n\n` +
          `💰 **Precio:** $${plan.price} USD ${copPrice}\n` +
          `⏱️ **Duración:** ${plan.durationDays || plan.duration} días\n\n` +
          `**Selecciona tu método de pago:**`
        : `${plan.icon || "💎"} **${planNameDisplay}**\n\n` +
          `**Description:**\n${plan.description || "Premium subscription plan"}\n\n` +
          `**Features:**\n${features}\n\n` +
          `💰 **Price:** $${plan.price} USD ${copPrice}\n` +
          `⏱️ **Duration:** ${plan.durationDays || plan.duration} days\n\n` +
          `**Select your payment method:**`;

    const paymentButtons = [
      [
        {
          text: lang === "es"
            ? "💳 Pagar (Cash App, Venmo, Zelle, USDC)"
            : "💳 Pay (Cash App, Venmo, Zelle, USDC)",
          callback_data: `daimo_plan_${plan.id}`,
        }
      ],
      [
        {
          text: lang === "es"
            ? "🪙 Pagar con Criptomonedas"
            : "🪙 Pay with Cryptocurrency",
          callback_data: `kyrrex_plan_${plan.id}`,
        }
      ],
      [
        {
          text: lang === "es"
            ? "💳 Pagar con Tarjeta COP"
            : "💳 Pay with COP Card",
          callback_data: `cop_card_plan_${plan.id}`,
        }
      ],
      [
        {
          text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
          callback_data: "show_subscription_plans",
        }
      ]
    ];

    // Edit message to show plan details
    try {
      await ctx.editMessageText(planDetails, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: paymentButtons,
        },
      });
    } catch (editError) {
      // If edit fails, delete old and send new message
      try {
        await ctx.deleteMessage();
      } catch (deleteError) {
        // Ignore delete errors
      }
      await ctx.reply(planDetails, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: paymentButtons,
        },
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
      default:
        errorMessage =
          lang === "es"
            ? `⚠️ Error inesperado. Por favor contacta a soporte.\n\nError: ${error.message}`
            : `⚠️ Unexpected error. Please contact support.\n\nError: ${error.message}`;
    }

    if (ctx.updateType === "callback_query") {
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
                }
              ],
              [
                {
                  text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                  callback_data: "show_subscription_plans",
                }
              ]
            ],
          },
        });
      } catch (editError) {
        try {
          await ctx.deleteMessage();
        } catch (deleteError) {
          // Ignore delete errors
        }
        await ctx.reply(errorMessage, { parse_mode: "Markdown" });
      }
    } else {
      await ctx.reply(errorMessage, { parse_mode: "Markdown" });
    }
  }
}

module.exports = {
  handleSubscription,
};
