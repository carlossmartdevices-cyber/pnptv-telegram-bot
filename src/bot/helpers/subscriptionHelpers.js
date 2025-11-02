/**
 * Subscription Flow Helpers
 * Handles payment link creation and subscription flow
 * 
 * Architecture:
 * - Message Builders: Format user-facing messages
 * - Payment Handlers: Process different payment methods
 * - Main Handler: Orchestrates the subscription flow
 */

const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const daimo = require("../../config/daimo");
const { ensureOnboarding } = require("../../utils/guards");
const planService = require("../../services/planService");
const {
  PaymentGatewayError,
  PlanNotFoundError,
} = require("../../utils/errors");

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_RETRIES = 3;
const MIN_DAIMO_AMOUNT = 0.01;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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
 * Format price display with currency
 * @param {object} plan
 * @returns {string}
 */
function formatPriceDisplay(plan) {
  if (plan.priceInCOP) {
    return `${plan.priceInCOP.toLocaleString()} ${plan.currency || "COP"}`;
  }
  return plan.price ? `$${plan.price} USD` : "Contact for pricing";
}

/**
 * Answer callback query safely (ignore errors)
 * @param {object} ctx
 */
async function answerCallbackQuery(ctx) {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery().catch(() => {});
  }
}

/**
 * Edit or send new message based on context
 * @param {object} ctx
 * @param {string} message
 * @param {object} options
 */
async function editOrSendMessage(ctx, message, options = {}) {
  try {
    await ctx.editMessageText(message, options);
  } catch (editError) {
    // If edit fails, delete old and send new message
    try {
      await ctx.deleteMessage();
    } catch (deleteError) {
      // Ignore delete errors
    }
    await ctx.reply(message, options);
  }
}

// =============================================================================
// MESSAGE BUILDERS
// =============================================================================

/**
 * Build plan details message
 * @param {object} plan
 * @param {string} lang
 * @returns {string}
 */
function buildPlanDetailsMessage(plan, lang) {
  const features = formatPlanFeatures(plan, lang);
  const planName = plan.displayName || plan.name;
  const duration = plan.durationDays || plan.duration;

  if (lang === "es") {
    return `${plan.icon || "💎"} **${planName}**\n\n` +
      `💰 **Precio:** $${plan.price} USDC\n` +
      `👤 **Duración:** ${duration === 30 ? 'mes (30 días)' : duration === 7 ? 'semana (7 días)' : duration === 120 ? '4 meses (120 días)' : duration === 365 ? 'año (365 días)' : `${duration} días`}\n` +
      `📃 **Descripción:** ${plan.description || "Acceso premium a contenido exclusivo"}\n\n` +
      `✨ **Características:**\n${features}\n\n` +
      `💎 **Paga con Daimo (USDC Stablecoin):**\n` +
      `• 💵 **Venmo / Cash App** — Fácil y rápido\n` +
      `• 🏦 **Coinbase / Binance** — Exchanges populares\n` +
      `• 💎 **Crypto Wallets** — MetaMask, Trust, etc.\n` +
      `• 📱 **Transferencia Directa** — USDC en Base/Optimism\n\n` +
      `🔒 **Seguro e Instantáneo:**\n` +
      `✓ Verificación en blockchain\n` +
      `✓ Activación automática tras pago\n` +
      `✓ Protección completa de reembolso\n\n` +
      `Haz clic abajo para proceder al pago:`;
  }

  return `${plan.icon || "💎"} **${planName}**\n\n` +
    `💰 **Price:** $${plan.price} USDC\n` +
    `👤 **Duration:** ${duration === 30 ? 'month (30 days)' : duration === 7 ? 'week (7 days)' : duration === 120 ? '4 months (120 days)' : duration === 365 ? 'year (365 days)' : `${duration} days`}\n` +
    `📃 **Description:** ${plan.description || "Premium access to exclusive content"}\n\n` +
    `✨ **Features:**\n${features}\n\n` +
    `💎 **Pay with Daimo (USDC Stablecoin):**\n` +
    `• 💵 **Venmo / Cash App** — Easy and fast\n` +
    `• 🏦 **Coinbase / Binance** — Popular exchanges\n` +
    `• 💎 **Crypto Wallets** — MetaMask, Trust, etc.\n` +
    `• 📱 **Direct Transfer** — USDC on Base/Optimism\n\n` +
    `🔒 **Secure & Instant:**\n` +
    `✓ Blockchain verification\n` +
    `✓ Automatic activation after payment\n` +
    `✓ Full refund protection\n\n` +
    `Click below to proceed with payment:`;
}

/**
 * Build Nequi payment message
 * @param {object} plan
 * @param {string} lang
 * @returns {string}
 */
function buildNequiPaymentMessage(plan, lang) {
  const planName = plan.displayName || plan.name;
  const features = formatPlanFeatures(plan, lang);
  const priceDisplay = formatPriceDisplay(plan);

  if (lang === "es") {
    return `✨ **${planName}**\n\n${features}\n\n` +
      `📃 **Detalles del Pago:**\n` +
      `- Plan: ${planName}\n` +
      `- Precio: ${priceDisplay}\n` +
      `- Duración: ${plan.durationDays} días\n\n` +
      `💳 **Método de Pago: Nequi Negocios**\n\n` +
      `⚠️ **Importante:** Después de completar el pago, envía tu comprobante al administrador para activar tu suscripción manualmente.\n\n` +
      `Haz clic en el botón para ir a Nequi:`;
  }

  return `✨ **${planName}**\n\n${features}\n\n` +
    `📃 **Payment Details:**\n` +
    `- Plan: ${planName}\n` +
    `- Price: ${priceDisplay}\n` +
    `- Duration: ${plan.durationDays} days\n\n` +
    `💳 **Payment Method: Nequi Negocios**\n\n` +
    `⚠️ **Important:** After completing payment, send your receipt to the admin for manual subscription activation.\n\n` +
    `Click the button to go to Nequi:`;
}

/**
 * Build Daimo payment message
 * @param {object} plan
 * @param {number} amountUSD
 * @param {string} lang
 * @returns {string}
 */
function buildDaimoPaymentMessage(plan, amountUSD, lang) {
  const planName = plan.displayName || plan.name;
  const duration = plan.durationDays || plan.duration;

  if (lang === "es") {
    return `💳 **Proceder al Pago**\n\n` +
      `${plan.icon || "💎"} **Plan:** ${planName}\n` +
      `💰 **Precio:** $${amountUSD.toFixed(2)} USDC\n` +
      `👤 **Duración:** ${duration === 30 ? 'mes (30 días)' : duration === 7 ? 'semana (7 días)' : duration === 120 ? '4 meses (120 días)' : duration === 365 ? 'año (365 días)' : `${duration} días`}\n\n` +
      `� **Pago Seguro con Daimo:**\n` +
      `Haz clic en el botón de abajo para abrir la página de pago segura de Daimo.\n\n` +
      `✓ Acepta pagos desde Venmo, Cash App, Coinbase, Binance y más\n` +
      `✓ Tu suscripción se activará automáticamente tras el pago\n` +
      `✓ Protección completa de reembolso garantizada\n\n` +
      `Presiona el botón para continuar:`;
  }

  return `💳 **Proceed to Payment**\n\n` +
    `${plan.icon || "💎"} **Plan:** ${planName}\n` +
    `💰 **Price:** $${amountUSD.toFixed(2)} USDC\n` +
    `👤 **Duration:** ${duration === 30 ? 'month (30 days)' : duration === 7 ? 'week (7 days)' : duration === 120 ? '4 months (120 days)' : duration === 365 ? 'year (365 days)' : `${duration} days`}\n\n` +
    `� **Secure Payment with Daimo:**\n` +
    `Click the button below to open Daimo's secure payment page.\n\n` +
    `✓ Accepts payments from Venmo, Cash App, Coinbase, Binance and more\n` +
    `✓ Your subscription will activate automatically after payment\n` +
    `✓ Full refund protection guaranteed\n\n` +
    `Press the button to continue:`;
}

/**
 * Build error message based on error type
 * @param {Error} error
 * @param {string} lang
 * @returns {string}
 */
function buildErrorMessage(error, lang) {
  switch (error.code) {
    case "PLAN_NOT_FOUND":
      return lang === "es"
        ? "⚠️ Plan no encontrado. Por favor selecciona otro plan."
        : "⚠️ Plan not found. Please select another plan.";
    
    case "PAYMENT_GATEWAY_ERROR":
      return lang === "es"
        ? "⚠️ Error con el sistema de pago. Por favor intenta más tarde."
        : "⚠️ Payment system error. Please try again later.";
    
    default:
      return lang === "es"
        ? `⚠️ Error inesperado. Por favor contacta a soporte.\n\nError: ${error.message}`
        : `⚠️ Unexpected error. Please contact support.\n\nError: ${error.message}`;
  }
}

// =============================================================================
// KEYBOARD BUILDERS
// =============================================================================

/**
 * Build payment method selection keyboard
 * @param {object} plan
 * @param {string} lang
 * @returns {Array}
 */
function buildPaymentMethodKeyboard(plan, lang) {
  const buttons = [];

  // Direct payment button (Daimo)
  if (process.env.DAIMO_APP_ID) {
    buttons.push([
      {
        text: lang === "es" ? `💰 Pagar $${plan.price} USDC` : `💰 Pay $${plan.price} USDC`,
        callback_data: `pay_daimo_${plan.id}`,
      },
    ]);
  }

  // Back button to plan list
  buttons.push([
    {
      text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
      callback_data: "show_subscription_plans",
    },
  ]);

  return buttons;
}

/**
 * Build Nequi payment keyboard
 * @param {object} plan
 * @param {string} lang
 * @returns {Array}
 */
function buildNequiKeyboard(plan, lang) {
  return [
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
  ];
}

/**
 * Build Daimo payment keyboard
 * @param {string} paymentUrl
 * @param {string} lang
 * @returns {Array}
 */
function buildDaimoKeyboard(paymentUrl, lang) {
  return [
    [
      {
        text: lang === "es" ? "� Pagar Ahora" : "� Pay Now",
        url: paymentUrl,
      },
    ],
    [
      {
        text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
        callback_data: "show_subscription_plans",
      },
    ],
  ];
}

/**
 * Build error retry keyboard
 * @param {string} planIdentifier
 * @param {string} lang
 * @returns {Array}
 */
function buildErrorKeyboard(planIdentifier, lang) {
  return [
    [
      {
        text: lang === "es" ? "🔄 Reintentar" : "🔄 Retry",
        callback_data: `daimo_plan_${planIdentifier}`,
      },
    ],
    [
      {
        text: lang === "es" ? "« Volver a Planes" : "« Back to Plans",
        callback_data: "show_subscription_plans",
      },
    ],
  ];
}

// =============================================================================
// PAYMENT HANDLERS
// =============================================================================

/**
 * Show plan details with payment method selection
 * @param {object} ctx
 * @param {object} plan
 * @param {string} lang
 */
async function showPaymentMethodSelection(ctx, plan, lang) {
  const message = buildPlanDetailsMessage(plan, lang);
  const keyboard = buildPaymentMethodKeyboard(plan, lang);

  await editOrSendMessage(ctx, message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });
}

/**
 * Handle Nequi payment method
 * @param {object} ctx
 * @param {object} plan
 * @param {string} lang
 */
async function handleNequiPayment(ctx, plan, lang) {
  const message = buildNequiPaymentMessage(plan, lang);
  const keyboard = buildNequiKeyboard(plan, lang);

  await editOrSendMessage(ctx, message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });
}

/**
 * Handle Daimo payment method
 * @param {object} ctx
 * @param {object} plan
 * @param {string} userId
 * @param {string} lang
 */
async function handleDaimoPayment(ctx, plan, userId, lang) {
  // Validate Daimo configuration
  const daimoConfig = daimo.getConfig();
  if (!daimoConfig.enabled) {
    throw new PaymentGatewayError("Daimo Pay not configured");
  }

  // Validate amount
  const amountUSD = plan.price;
  if (amountUSD < MIN_DAIMO_AMOUNT) {
    throw new PaymentGatewayError(
      `Amount too small for Daimo: $${amountUSD}. Minimum is $${MIN_DAIMO_AMOUNT} USD`,
      { amount: amountUSD, plan: plan.id }
    );
  }

  try {
    // Create payment request
    const paymentData = await daimo.createPaymentRequest({
      amount: amountUSD,
      userId,
      plan: plan.id,
    });

    if (!paymentData.success || !paymentData.paymentUrl) {
      throw new PaymentGatewayError("Daimo payment request failed", paymentData);
    }

    // Send payment message
    const message = buildDaimoPaymentMessage(plan, amountUSD, lang);
    const keyboard = buildDaimoKeyboard(paymentData.paymentUrl, lang);

    await editOrSendMessage(ctx, message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });

  } catch (daimoError) {
    logger.error("[Subscription] Daimo payment error:", daimoError);

    // Handle HTTPS requirement error in development
    if (daimoError.message && daimoError.message.includes('HTTPS')) {
      const devMessage = lang === "es"
        ? `⚠️ **Daimo Pay no disponible en desarrollo local**\n\n` +
          `Daimo Pay requiere HTTPS para funcionar en Telegram.\n\n` +
          `💡 **Alternativa:**\n- Contacta al administrador para activación manual\n\n` +
          `Disculpa las molestias.`
        : `⚠️ **Daimo Pay not available in local development**\n\n` +
          `Daimo Pay requires HTTPS to work in Telegram.\n\n` +
          `💡 **Alternative:**\n- Contact admin for manual activation\n\n` +
          `Sorry for the inconvenience.`;

      await ctx.reply(devMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                callback_data: "show_subscription_plans",
              },
            ],
          ],
        },
      });
      return;
    }

    throw new PaymentGatewayError(daimoError.message, {
      originalError: daimoError,
    });
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

/**
 * Handle subscription workflow for a plan
 * @param {object} ctx - Telegraf context
 * @param {string} planIdentifier - Plan id or slug
 * @param {string} paymentMethod - Selected payment method (optional)
 * @param {number} retryCount - Retry attempt number
 */
async function handleSubscription(ctx, planIdentifier, paymentMethod = null, retryCount = 0) {
  // Ensure user has completed onboarding
  if (!ensureOnboarding(ctx)) return;

  // Answer callback query immediately to prevent timeout
  await answerCallbackQuery(ctx);

  try {
    const lang = ctx.session.language || "en";
    const userId = ctx.from.id.toString();
    const identifier = String(planIdentifier || "").trim();

    // Fetch plan by ID or slug
    const plan =
      (await planService.getPlanById(identifier)) ||
      (await planService.getPlanBySlug(identifier.toLowerCase()));
    
    if (!plan) {
      throw new PlanNotFoundError(identifier);
    }

    // Route to appropriate handler based on payment method
    if (!paymentMethod) {
      // Show plan details with payment method selection
      await showPaymentMethodSelection(ctx, plan, lang);
      return;
    }

    if (plan.paymentMethod === "nequi") {
      // Handle Nequi manual payment
      await handleNequiPayment(ctx, plan, lang);
      return;
    }

    if (paymentMethod === "daimo" || plan.paymentMethod === "daimo") {
      // Handle Daimo automatic payment
      await handleDaimoPayment(ctx, plan, userId, lang);
      return;
    }

    // No valid payment method found
    throw new PaymentGatewayError("No payment method configured");

  } catch (error) {
    logger.error("[Subscription] Error", {
      type: error.name,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });

    await handleSubscriptionError(ctx, error, planIdentifier);
  }
}

/**
 * Handle subscription errors
 * @param {object} ctx
 * @param {Error} error
 * @param {string} planIdentifier
 */
async function handleSubscriptionError(ctx, error, planIdentifier) {
  const lang = ctx.session.language || "en";
  const errorMessage = buildErrorMessage(error, lang);
  const keyboard = buildErrorKeyboard(planIdentifier, lang);

  if (ctx.updateType === "callback_query") {
    await answerCallbackQuery(ctx);
    
    await editOrSendMessage(ctx, errorMessage, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  } else {
    await ctx.reply(errorMessage, { parse_mode: "Markdown" });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  handleSubscription,
};
