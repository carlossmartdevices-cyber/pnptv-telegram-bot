/**
 * Subscription Flow Helpers
 * Handles payment link creation and subscription flow
 */

const { t } = require('../../utils/i18n');
const logger = require('../../utils/logger');
const epayco = require('../../config/epayco');
const plans = require('../../config/plans');
const { ensureOnboarding } = require('../../utils/guards');

/**
 * Handle subscription to a plan
 * @param {object} ctx - Telegraf context
 * @param {string} planKey - Plan key (silver, golden, etc.)
 */
async function handleSubscription(ctx, planKey) {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  try {
    const lang = ctx.session.language || "en";
    const planLookup = planKey.toUpperCase();
    const plan = plans[planLookup] || plans[planKey];

    if (!plan) {
      logger.warn(`Plan ${planKey} not found in plans config`);
      await ctx.answerCbQuery(t("error", lang), { show_alert: true });
      return;
    }

    const userId = ctx.from.id.toString();

    logger.info(`User ${userId} initiated ${planKey} subscription - Plan: ${plan.name}, Price: ${plan.priceInCOP} COP`);

    // Validate required environment variables
    if (!process.env.EPAYCO_PUBLIC_KEY) {
      logger.error("EPAYCO_PUBLIC_KEY not configured");
      throw new Error("Payment gateway not configured");
    }

    // Use ePayco for payment processing
    const paymentData = await epayco.createPaymentLink({
      name: plan.name,
      description: plan.description || `${plan.name} subscription - ${plan.duration} days`,
      amount: plan.priceInCOP, // ePayco works with Colombian Pesos
      currency: "COP",
      userId: userId,
      userEmail: ctx.from.username
        ? `${ctx.from.username}@telegram.user`
        : `user${userId}@telegram.bot`,
      userName: ctx.from.first_name || ctx.from.username || "User",
      plan: planKey,
    });

    if (!paymentData.success || !paymentData.paymentUrl) {
      logger.error("Payment link creation failed:", paymentData);
      throw new Error("Payment link creation failed");
    }

    const linkUrl = paymentData.paymentUrl;

    logger.info(`Payment link created successfully for user ${userId}: ${linkUrl.substring(0, 50)}...`);

    const featuresKey =
      planKey === "golden" ? "goldenFeatures" : "silverFeatures";
    const features = t(featuresKey, lang);

    const message = lang === "es"
      ? `${features}\n\n💳 **Detalles del Pago:**\n• Plan: ${plan.displayName || plan.name}\n• Precio: $${plan.price} USD / ${plan.priceInCOP.toLocaleString()} COP\n• Duración: ${plan.duration} días\n\nHaz clic en el botón para continuar con el pago:`
      : `${features}\n\n💳 **Payment Details:**\n• Plan: ${plan.displayName || plan.name}\n• Price: $${plan.price} USD / ${plan.priceInCOP.toLocaleString()} COP\n• Duration: ${plan.duration} days\n\nClick the button to proceed with payment:`;

    await ctx.answerCbQuery();
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "💳 Ir a Pagar" : "💳 Go to Payment",
              url: linkUrl,
            },
          ],
          [
            {
              text: lang === "es" ? "« Volver" : "« Back",
              callback_data: "back_to_main",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error(`Error creating ${planKey} payment link:`, error);
    logger.error("Error stack:", error.stack);

    const lang = ctx.session.language || "en";
    const errorMessage = lang === "es"
      ? `❌ Error al crear el link de pago.\n\nPor favor intenta de nuevo o contacta a soporte.\n\nError: ${error.message}`
      : `❌ Error creating payment link.\n\nPlease try again or contact support.\n\nError: ${error.message}`;

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
                  callback_data: `subscribe_${planKey}`,
                },
              ],
              [
                {
                  text: lang === "es" ? "« Volver" : "« Back",
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

module.exports = {
  handleSubscription,
};
