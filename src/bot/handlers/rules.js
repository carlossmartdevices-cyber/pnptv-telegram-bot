/**
 * Rules Handler
 * Displays community rules and guidelines to users
 * Works in both private chats and group chats
 */

const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");

/**
 * Show community rules
 */
async function showRules(ctx) {
  try {
    const lang = ctx.session?.language || "en";

    const rulesEn = `
📋 **Community Conduct Rules**

**5.1 Respect & Consent**
• All interactions must be consensual and respectful
• No abusive, intimidating, or discriminatory behavior
• No sharing of private information without consent

**5.2 Prohibited Content**
❌ Minors (pedophilia)
❌ Animals (zoophilia)
❌ Sexual violence or non-consensual acts
❌ Incest, human trafficking, or exploitation
❌ Hate speech, racism, or extreme violence

⚠️ Any violation leads to immediate removal and may be reported to authorities

**5.3 Responsible Geolocation Use**
• Feature is optional; use courteously and responsibly
• Don't share location to track or harass members
• Report suspicious activity to admins

**5.4 Platform Rules**
• Follow Telegram's Terms of Service
• No spam, bots, or commercial exploitation
• No copyright or intellectual property violations
• Respect group admins and their moderation

**5.5 Account Security**
• Protect your account and password
• Don't share account access with others
• Report suspicious activity immediately

**5.6 Consequences**
First violation: Warning
Second violation: Temporary mute
Third violation: Removal from group/ban`;

    const rulesEs = `
📋 **Normas de Conducta de la Comunidad**

**5.1 Respeto y Consentimiento**
• Todas las interacciones deben ser consentidas y respetuosas
• No hay comportamiento abusivo, intimidante o discriminatorio
• No compartir información privada sin consentimiento

**5.2 Contenido Prohibido**
❌ Menores (pedofilia)
❌ Animales (zoofilia)
❌ Violencia sexual o actos no consentidos
❌ Incesto, tráfico humano o explotación
❌ Discurso de odio, racismo o violencia extrema

⚠️ Cualquier violación resulta en expulsión inmediata y puede ser reportada a las autoridades

**5.3 Uso Responsable de Geolocalización**
• La función es opcional; úsala de manera cortés y responsable
• No compartas ubicación para rastrear o acosar a miembros
• Reporta actividad sospechosa a los administradores

**5.4 Reglas de Plataforma**
• Cumple con los Términos de Servicio de Telegram
• No hay spam, bots o explotación comercial
• No violes derechos de autor o propiedad intelectual
• Respeta a los administradores del grupo y su moderación

**5.5 Seguridad de Cuenta**
• Protege tu cuenta y contraseña
• No compartas acceso a tu cuenta con otros
• Reporta actividad sospechosa inmediatamente

**5.6 Consecuencias**
Primer incumplimiento: Advertencia
Segundo incumplimiento: Silencio temporal
Tercer incumplimiento: Expulsión del grupo/prohibición`;

    const message = lang === "es" ? rulesEs : rulesEn;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "🔙 Volver" : "🔙 Back",
            callback_data: "back_to_main",
          },
        ],
      ],
    };

    if (ctx.chat.type === "private") {
      await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } else {
      // In groups, reply without callback buttons
      await ctx.reply(message, {
        parse_mode: "Markdown",
      });
    }

    logger.info(`User ${ctx.from?.id} viewed rules (${lang})`);
  } catch (error) {
    logger.error("Error showing rules:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
}

/**
 * Show group-specific rules menu
 */
async function showGroupRulesMenu(ctx) {
  try {
    const lang = ctx.session?.language || "en";

    const messageEn =
      "📋 **Community Rules**\n\n" +
      "Select a topic to learn more:";

    const messageEs =
      "📋 **Normas de la Comunidad**\n\n" +
      "Selecciona un tema para aprender más:";

    const message = lang === "es" ? messageEs : messageEn;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "📖 Ver Todas" : "📖 View All",
            callback_data: "rules_all",
          },
        ],
        [
          {
            text: lang === "es" ? "✅ Respeto" : "✅ Respect",
            callback_data: "rules_respect",
          },
          {
            text: lang === "es" ? "⚠️ Prohibido" : "⚠️ Prohibited",
            callback_data: "rules_prohibited",
          },
        ],
        [
          {
            text: lang === "es" ? "🗺️ Ubicación" : "🗺️ Location",
            callback_data: "rules_location",
          },
          {
            text: lang === "es" ? "🔒 Seguridad" : "🔒 Security",
            callback_data: "rules_security",
          },
        ],
        [
          {
            text: lang === "es" ? "🔙 Volver" : "🔙 Back",
            callback_data: "back_to_main",
          },
        ],
      ],
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    logger.info(`User ${ctx.from?.id} opened rules menu (${lang})`);
  } catch (error) {
    logger.error("Error showing rules menu:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
}

/**
 * Show specific rule section
 */
async function showRuleSection(ctx, section) {
  try {
    const lang = ctx.session?.language || "en";
    let message = "";

    switch (section) {
      case "respect":
        message = lang === "es"
          ? "✅ **Respeto y Consentimiento**\n\n" +
            "• Todas las interacciones deben ser consentidas y respetuosas\n" +
            "• No hay comportamiento abusivo, intimidante o discriminatorio\n" +
            "• No compartir información privada sin consentimiento"
          : "✅ **Respect & Consent**\n\n" +
            "• All interactions must be consensual and respectful\n" +
            "• No abusive, intimidating, or discriminatory behavior\n" +
            "• No sharing of private information without consent";
        break;

      case "prohibited":
        message = lang === "es"
          ? "⚠️ **Contenido Prohibido**\n\n" +
            "❌ Menores (pedofilia)\n" +
            "❌ Animales (zoofilia)\n" +
            "❌ Violencia sexual o actos no consentidos\n" +
            "❌ Incesto, tráfico humano o explotación\n" +
            "❌ Discurso de odio, racismo o violencia extrema\n\n" +
            "Cualquier violación resulta en expulsión inmediata."
          : "⚠️ **Prohibited Content**\n\n" +
            "❌ Minors (pedophilia)\n" +
            "❌ Animals (zoophilia)\n" +
            "❌ Sexual violence or non-consensual acts\n" +
            "❌ Incest, human trafficking, or exploitation\n" +
            "❌ Hate speech, racism, or extreme violence\n\n" +
            "Any violation leads to immediate removal.";
        break;

      case "location":
        message = lang === "es"
          ? "🗺️ **Uso Responsable de Geolocalización**\n\n" +
            "• La función es opcional\n" +
            "• Úsala de manera cortés y responsable\n" +
            "• No compartas ubicación para rastrear o acosar\n" +
            "• Reporta actividad sospechosa a los administradores"
          : "🗺️ **Responsible Geolocation Use**\n\n" +
            "• Feature is optional\n" +
            "• Use it courteously and responsibly\n" +
            "• Don't share location to track or harass\n" +
            "• Report suspicious activity to admins";
        break;

      case "security":
        message = lang === "es"
          ? "🔒 **Seguridad de Cuenta**\n\n" +
            "• Protege tu cuenta y contraseña\n" +
            "• No compartas acceso a tu cuenta\n" +
            "• Reporta actividad sospechosa inmediatamente\n" +
            "• Usa autenticación de dos factores si está disponible"
          : "🔒 **Account Security**\n\n" +
            "• Protect your account and password\n" +
            "• Don't share account access with others\n" +
            "• Report suspicious activity immediately\n" +
            "• Use two-factor authentication if available";
        break;

      default:
        return;
    }

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "📖 Ver Todas" : "📖 View All",
            callback_data: "rules_all",
          },
        ],
        [
          {
            text: lang === "es" ? "🔙 Volver a Menú" : "🔙 Back to Menu",
            callback_data: "rules_menu",
          },
        ],
      ],
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    logger.info(`User ${ctx.from?.id} viewed rules section: ${section} (${lang})`);
  } catch (error) {
    logger.error("Error showing rule section:", error);
    const lang = ctx.session?.language || "en";
    await ctx.reply(t("error", lang));
  }
}

/**
 * Handle rules callback
 */
async function handleRulesCallback(ctx, action) {
  try {
    const lang = ctx.session?.language || "en";

    if (action === "rules_all") {
      await showRules(ctx);
    } else if (action === "rules_menu") {
      await showGroupRulesMenu(ctx);
    } else if (action === "rules_respect") {
      await showRuleSection(ctx, "respect");
    } else if (action === "rules_prohibited") {
      await showRuleSection(ctx, "prohibited");
    } else if (action === "rules_location") {
      await showRuleSection(ctx, "location");
    } else if (action === "rules_security") {
      await showRuleSection(ctx, "security");
    }

    await ctx.answerCbQuery();
  } catch (error) {
    logger.error("Error handling rules callback:", error);
    await ctx.answerCbQuery(
      ctx.session?.language === "es" ? "❌ Error" : "❌ Error",
      { show_alert: true }
    );
  }
}

module.exports = {
  showRules,
  showGroupRulesMenu,
  showRuleSection,
  handleRulesCallback,
};
