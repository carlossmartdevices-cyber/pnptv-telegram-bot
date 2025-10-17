const { formatMessage } = require("../../utils/formatters");
const { ensureOnboarding } = require("../../utils/guards");
const planService = require("../../services/planService");
const { Markup } = require("telegraf");

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
    const plans = await listPlans();

    if (!plans || plans.length === 0) {
      const message =
        lang === "es"
          ? "Actualmente no hay planes disponibles. Por favor, inténtalo más tarde."
          : "There are no plans available right now. Please try again later.";
      await ctx.reply(message);
      return;
    }

    const intro =
      lang === "es"
        ? "Selecciona el plan que prefieras para continuar."
        : "Select the plan you'd like to continue.";

    const body = plans.map(formatPlanSummary).join("\n\n");
    const message = formatMessage("Subscribe", `${intro}\n\n${body}`, lang);

    const buttons = plans.map((plan) => [
      {
        text: `${
          plan.displayName || plan.name
        } • ${plan.priceInCOP.toLocaleString()} ${plan.currency || "COP"}`,
        callback_data: `plan_select_${plan.id}`,
      },
    ]);

    buttons.push([
      {
        text: lang === "es" ? "Atrás" : "Back",
        callback_data: "back_to_main",
      },
    ]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  } catch (error) {
    await ctx.reply(
      lang === "es"
        ? "No se pudieron cargar los planes. Intenta más tarde."
        : "Could not load subscription plans. Please try again later."
    );
  }
};
