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

    // Build comprehensive plan list message with all details inline
    let planListMessage = "";
    
    if (lang === "es") {
      planListMessage = `💎 **Planes Premium PNPtv**\n\n` +
        `💰 **Paga con crypto (USDC) usando Daimo:**\n` +
        `✅ Activación instantánea\n` +
        `• 🏦 Coinbase / Binance\n` +
        `• 💰 Venmo / Cash App\n` +
        `• 💎 Crypto Wallets\n` +
        `• 📱 Transferencia Directa\n\n` +
        `🎥 **Lo que obtienes:**\n` +
        `• Acceso al mejor contenido amateur PNP en Telegram\n` +
        `• Disfruta videos completos de Santino y sus amigos\n` +
        `• Conoce otros miembros cerca de ti\n` +
        `• Sé parte de nuestros grupos comunitarios vibrantes\n` +
        `• ¡Ponte high con nosotros y más!\n\n` +
        `**Selecciona tu plan:**\n\n`;
    } else {
      planListMessage = `� **PNPtv Premium Plans**\n\n` +
        `💰 **Pay with crypto (USDC) using Daimo:**\n` +
        `✅ Instant activation\n` +
        `• � Coinbase / Binance\n` +
        `• 💰 Venmo / Cash App\n` +
        `• 💎 Crypto Wallets\n` +
        `• 📱 Direct Transfer\n\n` +
        `🎥 **What you get:**\n` +
        `• Access to the best amateur PNP content on Telegram\n` +
        `• Enjoy full length videos of Santino and his boys\n` +
        `• Meet other members nearby you\n` +
        `• Be part of our vibrant community groups\n` +
        `• Get spun with us and more!\n\n` +
        `**Select your plan:**\n\n`;
    }

    // Add each plan with details inline
    plans.forEach((plan, index) => {
      const duration = plan.durationDays || plan.duration;
      let durationText = "";
      
      if (lang === "es") {
        if (duration === 7) durationText = "semana";
        else if (duration === 30) durationText = "mes";
        else if (duration === 120) durationText = "4 meses";
        else if (duration === 365) durationText = "año";
        else durationText = `${duration} días`;
      } else {
        if (duration === 7) durationText = "week";
        else if (duration === 30) durationText = "month";
        else if (duration === 120) durationText = "4 months";
        else if (duration === 365) durationText = "year";
        else durationText = `${duration} days`;
      }

      planListMessage += `${plan.icon || "💎"} **${plan.displayName || plan.name}** — $${plan.price} / ${durationText}\n`;
      
      if (index < plans.length - 1) {
        planListMessage += `\n`;
      }
    });

    // Build inline keyboard with one button per plan
    const buttons = plans.map((plan) => {
      const duration = plan.durationDays || plan.duration;
      let durationText = "";
      
      if (lang === "es") {
        if (duration === 7) durationText = "semana";
        else if (duration === 30) durationText = "mes";
        else if (duration === 120) durationText = "4 meses";
        else if (duration === 365) durationText = "año";
        else durationText = `${duration} días`;
      } else {
        if (duration === 7) durationText = "week";
        else if (duration === 30) durationText = "month";
        else if (duration === 120) durationText = "4 months";
        else if (duration === 365) durationText = "year";
        else durationText = `${duration} days`;
      }

      return [
        {
          text: `${plan.icon || "💎"} ${plan.displayName || plan.name} — $${plan.price} / ${durationText}`,
          callback_data: `daimo_plan_${plan.id}`,
        },
      ];
    });

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
        await ctx.editMessageText(planListMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      } catch (editError) {
        // If edit fails, delete old and send new message
        try {
          await ctx.deleteMessage();
        } catch (deleteError) {
          // Ignore delete errors
        }
        await ctx.reply(planListMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      }
    } else {
      await ctx.reply(planListMessage, {
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
