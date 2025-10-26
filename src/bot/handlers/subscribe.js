const { formatMessage } = require("../../utils/formatters");
const { ensureOnboarding } = require("../../utils/guards");
const planService = require("../../services/planService");
const { Markup } = require("telegraf");
const logger = require("../../utils/logger");

// Import formatPlanSummary from planManager
const { formatPlanSummary } = require("./admin/planManager");

async function showPlans(ctx) {
  const plans = await planService.getActivePlans();

  const buttons = plans.map((plan) => [
    Markup.button.callback(
      `${plan.name} - $${plan.price}`,
      `select_plan:${plan.id}`
    ),
  ]);

  return ctx.reply(ctx.i18n.t("selectPlan"), Markup.inlineKeyboard(buttons));
}

module.exports = async (ctx) => {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  const lang = ctx.session.language || "en";

  try {
    const plans = await planService.listPlans();

    if (!plans || plans.length === 0) {
      const message =
        lang === "es"
          ? "Actualmente no hay planes disponibles. Por favor, inténtalo más tarde."
          : "There are no plans available right now. Please try again later.";
      await ctx.reply(message);
      return;
    }

    // Channel content description
    const channelDescription =
      lang === "es"
        ? "🎥 Canal con contenido exclusivo.\n\nÚnete a PNPtv! PRIME y al parche más chimba de todos: latinos fumando, slammeando y gozando sin filtros en Telegram.\n\n🔥 Lo que te espera:\n\n-Videos completos y sin censura de Santino y su combo.\n\n-Acceso al grupo privado solo para miembros activos.\n\n-Encuentra panas cerca de ti con la opción de geolocalización.\n\n\n💫 Peguémonos el viaje juntos."
        : "🎥 Exclusive Channel Content\n\nBecome a member of PNPtv PRIME and enjoy the best amateur content — Latino men smoking and slamming on Telegram.\n\n🔥 What you'll get:\n\n-Dozens of full-length adult videos featuring Santino and his boys.\n\n-Access to our exclusive Telegram members group.\n\n-Connect with other members in your area using our geolocation tool.\n\n\nLet's get spun together! 💎";

    // Build inline keyboard with plans showing USD prices
    const buttons = plans.map((plan) => [
      {
        text: `${plan.icon || "💎"} ${plan.displayName || plan.name} - $${plan.price} USD`,
        callback_data: `plan_select_${plan.id}`,
      },
    ]);

    buttons.push([
      {
        text: lang === "es" ? "🔙 Atrás" : "🔙 Back",
        callback_data: "back_to_main",
      },
    ]);

    // Try to edit the message if it's from a callback, otherwise send new message
    if (ctx.callbackQuery) {
      try {
        await ctx.answerCbQuery();
        await ctx.editMessageText(channelDescription, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      } catch (editError) {
        // If edit fails, send new message
        await ctx.reply(channelDescription, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      }
    } else {
      await ctx.reply(channelDescription, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    }
  } catch (error) {
    logger.error("Error in subscribe handler:", error);
    await ctx.reply(
      lang === "es"
        ? `No se pudieron cargar los planes. Intenta más tarde.\nError: ${error.message}`
        : `Could not load subscription plans. Please try again later.\nError: ${error.message}`
    );
  }
};
