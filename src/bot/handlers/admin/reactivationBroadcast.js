const logger = require("../../../utils/logger");
const { buildLandingMenu } = require("../reactivation");

const CHANNEL_ID = process.env.CHANNEL_ID;

function buildBroadcastMessage() {
  const english = "📣 *PRIME Reactivation Update*\n\n" +
    "If you joined the PRIME channel before our new bot migration, please confirm your pass so we can finish the transfer.\n\n" +
    "🔥 *Why this matters:*\n" +
    "• Unlocks the new AI support + auto Zoom room launcher\n" +
    "• Syncs your membership with instant channel approvals\n" +
    "• Keeps your paid perks active with *no extra payment*\n\n" +
    "🕛 *Deadline:* Nov 15th at 12:00 (COL) — after that we must remove inactive accounts.\n" +
    "🚫 Removals for missing the deadline are final and cannot be reversed.\n\n" +
    "✅ Pick the pass you already paid for.\n" +
    "• Trial / Monthly / Quarterly: instant reactivation when you tap the button\n" +
    "• Yearly / Lifetime: upload your proof once and the team will approve it\n\n" +
    "Tap **Activate inside Telegram** for self-service or choose the landing page links.";

  const spanish = "\n\n———\n\n" +
    "📣 *Actualización PRIME – Acción Necesaria*\n\n" +
    "Si entraste al canal PRIME antes de la migración al nuevo bot, confirma tu pase para completar la transferencia.\n\n" +
    "🔥 *Por qué es importante:*\n" +
    "• Habilita el soporte AI y el lanzador automático de Zoom\n" +
    "• Sincroniza tu membresía con las aprobaciones instantáneas\n" +
    "• Mantiene tus beneficios pagados sin costo adicional\n\n" +
    "🕛 *Fecha límite:* 15 de noviembre a las 12:00 (COL) — después se removerán cuentas inactivas.\n" +
    "🚫 Las cuentas removidas por incumplir no serán reactivadas.\n\n" +
    "✅ Elige el pase que ya pagaste.\n" +
    "• Trial / Mensual / Trimestral: reactivación inmediata desde el botón\n" +
    "• Anual / Lifetime: sube tu comprobante y el equipo lo aprueba\n\n" +
    "Toca **Activar dentro de Telegram** para hacerlo en segundos o usa los enlaces de la landing.";

  return english + spanish;
}

async function sendReactivationBroadcast(ctx) {
  if (!CHANNEL_ID) {
    await ctx.reply("❌ CHANNEL_ID is not configured. Set it in the environment first.");
    return;
  }

  try {
    const message = buildBroadcastMessage();
    const keyboard = buildLandingMenu();

    await ctx.telegram.sendMessage(CHANNEL_ID, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });

    await ctx.reply("✅ Reactivation broadcast sent to PRIME channel.");
    logger.info("Reactivation broadcast delivered", {
      adminId: ctx.from.id,
    });
  } catch (error) {
    logger.error("Failed to send reactivation broadcast", {
      adminId: ctx.from.id,
      error: error.message,
    });
    await ctx.reply("❌ Could not send broadcast. Check logs for details.");
  }
}

module.exports = {
  sendReactivationBroadcast,
  buildBroadcastMessage,
};
