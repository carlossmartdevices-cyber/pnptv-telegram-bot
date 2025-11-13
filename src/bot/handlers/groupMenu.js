/**
 * Group Menu Handler
 * Displays menu options specifically for group chat contexts
 * Includes help, rules, and other community commands
 */

const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");
const { showRules, showGroupRulesMenu } = require("./rules");

/**
 * Show group menu with community options
 */
async function showGroupMenu(ctx) {
  try {
    const lang = ctx.session?.language || "en";

    const messageEn =
      "👥 **Group Menu**\n\n" +
      "Select an option to learn more about the community:";

    const messageEs =
      "👥 **Menú del Grupo**\n\n" +
      "Selecciona una opción para aprender más sobre la comunidad:";

    const message = lang === "es" ? messageEs : messageEn;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "📖 Reglas" : "📖 Rules",
            callback_data: "group_menu_rules",
          },
          {
            text: lang === "es" ? "❓ Ayuda" : "❓ Help",
            callback_data: "group_menu_help",
          },
        ],
        [
          {
            text: lang === "es" ? "💎 Planes" : "💎 Plans",
            callback_data: "group_menu_plans",
          },
          {
            text: lang === "es" ? "🤖 Chat IA" : "🤖 AI Chat",
            callback_data: "group_menu_ai_chat",
          },
        ],
        [
          {
            text: lang === "es" ? "🔙 Cerrar" : "🔙 Close",
            callback_data: "group_menu_close",
          },
        ],
      ],
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    logger.info(`User ${ctx.from?.id} opened group menu in ${ctx.chat?.id}`);
  } catch (error) {
    logger.error("Error showing group menu:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
}

/**
 * Show help in group context
 */
async function showGroupHelp(ctx) {
  try {
    const lang = ctx.session?.language || "en";

    const helpEn =
      "❓ **Help & Support**\n\n" +
      "**Available Commands:**\n" +
      "/rules - View community rules\n" +
      "/library - Access music library\n" +
      "/nearby - Find members nearby\n" +
      "/map - View member locations\n" +
      "/live - View live streams\n" +
      "/app - Open community mini-app\n\n" +
      "**Need More Help?**\n" +
      "Contact support via /help in private chat";

    const helpEs =
      "❓ **Ayuda y Soporte**\n\n" +
      "**Comandos Disponibles:**\n" +
      "/rules - Ver normas de la comunidad\n" +
      "/library - Acceder a la biblioteca de música\n" +
      "/nearby - Encontrar miembros cercanos\n" +
      "/map - Ver ubicaciones de miembros\n" +
      "/live - Ver transmisiones en vivo\n" +
      "/app - Abrir la aplicación mini de comunidad\n\n" +
      "**¿Necesitas Más Ayuda?**\n" +
      "Contacta soporte usando /help en chat privado";

    const message = lang === "es" ? helpEs : helpEn;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "🔙 Volver" : "🔙 Back",
            callback_data: "group_menu",
          },
        ],
      ],
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    logger.info(`User ${ctx.from?.id} viewed group help`);
  } catch (error) {
    logger.error("Error showing group help:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
}

/**
 * Handle group menu callbacks
 */
async function handleGroupMenuCallback(ctx, action) {
  try {
    const lang = ctx.session?.language || "en";

    if (action === "group_menu_rules") {
      await showGroupRulesMenu(ctx);
    } else if (action === "group_menu_help") {
      await showGroupHelp(ctx);
    } else if (action === "group_menu_plans") {
      const messageEn =
        "💎 **Premium Plans**\n\n" +
        "To view and purchase premium plans, please send /subscribe in private chat with the bot.";
      const messageEs =
        "💎 **Planes Premium**\n\n" +
        "Para ver y comprar planes premium, envía /subscribe en el chat privado con el bot.";
      await ctx.reply(lang === "es" ? messageEs : messageEn, {
        parse_mode: "Markdown",
      });
    } else if (action === "group_menu_ai_chat") {
      const messageEn =
        "🤖 **AI Chat Support**\n\n" +
        "Open a private chat with the bot and send /help to start an AI conversation.";
      const messageEs =
        "🤖 **Chat de Soporte IA**\n\n" +
        "Abre un chat privado con el bot y envía /help para iniciar una conversación IA.";
      await ctx.reply(lang === "es" ? messageEs : messageEn, {
        parse_mode: "Markdown",
      });
    } else if (action === "group_menu_close") {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore if message can't be deleted
      }
    } else if (action === "group_menu") {
      await showGroupMenu(ctx);
    }

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error("Error handling group menu callback:", error);
    await ctx.answerCbQuery(
      ctx.session?.language === "es" ? "❌ Error" : "❌ Error",
      { show_alert: true }
    );
  }
}

module.exports = {
  showGroupMenu,
  showGroupHelp,
  handleGroupMenuCallback,
};
