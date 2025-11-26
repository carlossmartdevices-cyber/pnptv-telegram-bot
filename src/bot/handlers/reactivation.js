const { t } = require("../../utils/i18n");
const logger = require("../../utils/logger");
const { ensureOnboarding } = require("../../utils/guards");
const { isAdmin } = require("../../config/admin");
const { activateMembership } = require("../../utils/membershipManager");
const { sendAdminNotification } = require("../../services/adminNotificationService");
const {
  createReactivationRequest,
  updateReactivationRequest,
  getReactivationRequest,
} = require("../../services/reactivationService");

const MANAGEMENT_CHAT_ID = process.env.ADMIN_MANAGEMENT_CHAT_ID || "5079624062";

const PLAN_CONFIG = {
  trial: {
    key: "trial",
    label: "Trial Pass",
    durationDays: 7,
    tier: "Basic",
    autoApprove: true,
    shortDescription: "Access for 7 days with full media unlock",
  },
  monthly: {
    key: "monthly",
    label: "Monthly Pass",
    durationDays: 30,
    tier: "Premium",
    autoApprove: true,
    shortDescription: "30 days of PRIME benefits and Zoom rooms",
  },
  quarterly: {
    key: "quarterly",
    label: "Quarterly Pass",
    durationDays: 90,
    tier: "Premium",
    autoApprove: true,
    shortDescription: "90 days, ideal to explore the new platform features",
  },
  yearly: {
    key: "yearly",
    label: "Yearly Pass",
    durationDays: 365,
    tier: "Premium",
    autoApprove: false,
    shortDescription: "365 days, needs quick manual verification",
  },
  lifetime: {
    key: "lifetime",
    label: "Lifetime Pass",
    durationDays: 36500,
    tier: "Premium",
    autoApprove: false,
    shortDescription: "Lifetime upgrade, requires proof of payment",
  },
};

const LANDING_BASE_URL = process.env.REACTIVATION_LANDING_URL || "https://pnptv.app/activate";
const DEADLINE_TEXT = "Nov 15th at 12:00 (COL)";

function buildPlanMenu() {
  const buttons = Object.values(PLAN_CONFIG).map((plan) => ([
    {
      text: `${plan.label}`,
      callback_data: `reactivate_plan_${plan.key}`,
    },
  ]));

  buttons.push([
    {
      text: "🔙 Back",
      callback_data: "reactivate_cancel",
    },
  ]);

  return { inline_keyboard: buttons };
}

function buildLandingMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: "Trial Pass (7 days)",
          url: `${LANDING_BASE_URL}?plan=trial`,
        },
      ],
      [
        {
          text: "Monthly Pass (30 days)",
          url: `${LANDING_BASE_URL}?plan=monthly`,
        },
      ],
      [
        {
          text: "Quarterly Pass (90 days)",
          url: `${LANDING_BASE_URL}?plan=quarterly`,
        },
      ],
      [
        {
          text: "Yearly Pass (365 days)",
          url: `${LANDING_BASE_URL}?plan=yearly`,
        },
      ],
      [
        {
          text: "Lifetime Pass",
          url: `${LANDING_BASE_URL}?plan=lifetime`,
        },
      ],
      [
        {
          text: "🟢 Activate inside Telegram",
          callback_data: "reactivate_start",
        },
      ],
    ],
  };
}

function getReactivationIntroMessage(lang = "en") {
  const isSpanish = lang === "es";
  if (isSpanish) {
    return (
      "💎 *Reactivación obligatoria PRIME*\n\n" +
      "Si te uniste ANTES de la migración al nuevo bot, necesitamos que reactives tu cuenta. Esto nos permite: \n" +
      "• Conectar tu perfil a las nuevas funciones de soporte AI y mapas\n" +
      "• Activar los accesos automáticos a Zoom rooms y al canal PRIME\n" +
      "• Mantener tu membresía al día sin cobrarte nada adicional\n\n" +
      `🕛 *Fecha límite:* ${DEADLINE_TEXT}\n` +
      "⚠️ Después de esa fecha las cuentas sin reactivación serán removidas permanentemente.\n\n" +
      "👇 Elige tu pase para reactivar. No tienes que pagar de nuevo; solo confirma qué plan tenías activo."
    );
  }

  return (
    "💎 *PRIME Reactivation Required*\n\n" +
    "If you joined BEFORE our new bot migration, we need you to reactivate so we can: \n" +
    "• Connect your profile to the latest AI support and map tools\n" +
    "• Unlock auto access to Zoom rooms and the PRIME channel\n" +
    "• Keep your membership valid with *no extra payment*\n\n" +
    `🕛 *Deadline:* ${DEADLINE_TEXT}\n` +
    "⚠️ Accounts that miss this deadline will be permanently removed.\n\n" +
    "👇 Pick the pass you originally paid for. No repurchase needed—just confirm."
  );
}

async function showReactivationIntro(ctx) {
  if (!ensureOnboarding(ctx)) {
    return;
  }

  const lang = ctx.session.language || "en";
  const text = getReactivationIntroMessage(lang);

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: buildPlanMenu(),
  });
}

async function handlePlanSelection(ctx, planKey) {
  const plan = PLAN_CONFIG[planKey];
  if (!plan) {
    await ctx.answerCbQuery("Plan not found", { show_alert: true }).catch(() => {});
    return;
  }

  const lang = ctx.session.language || "en";
  const isSpanish = lang === "es";

  ctx.session.reactivation = {
    planKey,
    requiresProof: !plan.autoApprove,
    label: plan.label,
  };

  if (plan.autoApprove) {
    const confirmMessage = isSpanish
      ? `✅ *${plan.label}* seleccionado\n\nConfirma que ya pagaste este plan recientemente para activar tu acceso.`
      : `✅ *${plan.label}* selected\n\nConfirm you already paid for this plan recently to reactivate your access.`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: isSpanish ? "✅ Sí, ya pagué" : "✅ Yes, I already paid",
            callback_data: `reactivate_confirm_${planKey}`,
          },
        ],
        [
          {
            text: lang === "es" ? "🔙 Regresar" : "🔙 Back",
            callback_data: "reactivate_start",
          },
        ],
      ],
    };

    await ctx.editMessageText(confirmMessage, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
    return;
  }

  const promptMessage = isSpanish
    ? `📄 *${plan.label}* requiere verificación rápida.\n\nSube tu comprobante de pago (captura o PDF).`
    : `📄 *${plan.label}* needs quick verification.\n\nPlease upload your proof of payment (screenshot or PDF).`;

  ctx.session.waitingFor = "reactivation_proof";

  await ctx.editMessageText(promptMessage, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: lang === "es" ? "🔙 Regresar" : "🔙 Back",
            callback_data: "reactivate_start",
          },
        ],
      ],
    },
  });
}

async function completeAutoActivation(ctx, planKey) {
  const plan = PLAN_CONFIG[planKey];
  if (!plan) {
    await ctx.answerCbQuery("Plan not found", { show_alert: true }).catch(() => {});
    return;
  }

  const userId = ctx.from.id.toString();
  const lang = ctx.session.language || "en";
  const isSpanish = lang === "es";

  try {
    const activation = await activateMembership(
      userId,
      plan.tier,
      "reactivation_auto",
      plan.durationDays,
      ctx.telegram,
      {
        paymentMethod: "reactivation",
        reference: `auto-${plan.key}`,
      }
    );

    await createReactivationRequest({
      userId,
      planKey,
      planLabel: plan.label,
      status: "auto_approved",
      autoApprovedAt: new Date(),
      language: lang,
    });

    const confirmation = isSpanish
      ? `🎉 *Reactivación completada*\n\nTu ${plan.label} quedó activo sin costo adicional. Revisa tu mensaje privado para el acceso.`
      : `🎉 *Reactivation completed*\n\nYour ${plan.label} is active again at no extra charge. Check your private message for access.`;

    await ctx.editMessageText(confirmation, {
      parse_mode: "Markdown",
      reply_markup: null,
    });

    await notifyWelcome(ctx, plan, activation);
    await notifyAdminAutoApproval(ctx, plan);
  } catch (error) {
    logger.error("Auto reactivation failed", {
      userId,
      planKey,
      error: error.message,
    });

    const errorMessage = isSpanish
      ? "❌ No pudimos activar tu plan automáticamente. Contacta soporte o intenta de nuevo."
      : "❌ We could not reactivate automatically. Please contact support or try again.";

    await ctx.editMessageText(errorMessage, {
      parse_mode: "Markdown",
    }).catch(() => {});
  }
}

async function notifyWelcome(ctx, plan, options = {}) {
  try {
    const language = options.languageOverride || ctx.session?.language || "en";
    const isSpanish = language === "es";

    const message = isSpanish
      ? `👋 ¡Bienvenido de vuelta a PRIME!\n\nTu ${plan.label} ya está activo y conectado al nuevo bot. Disfruta:\n• Acceso automático al canal PRIME\n• Lanzador de Zoom rooms desde /menu\n• Soporte AI mejorado\n• Beneficios completos sin pagos adicionales`
      : `👋 Welcome back to PRIME!\n\nYour ${plan.label} is active and linked to the new bot. Enjoy:\n• Instant PRIME channel access\n• One-tap Zoom rooms from /menu\n• Upgraded AI support\n• Full benefits with no extra payments`;

    const targetUserId = options.userIdOverride || ctx.from.id;

    await ctx.telegram.sendMessage(targetUserId, message, {
      parse_mode: "Markdown",
    }).catch(() => {});
  } catch (error) {
    logger.warn("Failed to send welcome reminder", error.message);
  }
}

async function notifyAdminAutoApproval(ctx, plan) {
  try {
    await sendAdminNotification({
      telegram: ctx.telegram,
      userId: ctx.from.id,
      username: ctx.from.username,
      message: `✅ Auto-reactivation completed\n\n• User: @${ctx.from.username || ctx.from.id}\n• Plan: ${plan.label}\n• Mode: Auto approval`,
    });
  } catch (error) {
    logger.warn("Failed to send admin auto notification", error.message);
  }
}

async function handleReactivationProofUpload(ctx, filePayload) {
  const sessionData = ctx.session.reactivation;
  if (!sessionData || !sessionData.requiresProof) {
    return false;
  }

  const plan = PLAN_CONFIG[sessionData.planKey];
  if (!plan) {
    return false;
  }

  try {
    const request = await createReactivationRequest({
      userId: ctx.from.id.toString(),
      username: ctx.from.username || null,
      planKey: plan.key,
      planLabel: plan.label,
      status: "pending",
      language: ctx.session.language || "en",
      proof: {
        type: filePayload.type,
        fileId: filePayload.fileId,
        fileUniqueId: filePayload.fileUniqueId,
        caption: ctx.message?.caption || null,
      },
    });

    ctx.session.waitingFor = null;
    ctx.session.reactivation = null;

    const lang = ctx.session.language || "en";
    const confirmation = lang === "es"
      ? "📨 Recibimos tu comprobante. Nuestro equipo lo verificará y te notificará."
      : "📨 We received your proof. Our team will verify it and notify you.";

    await ctx.reply(confirmation, {
      parse_mode: "Markdown",
    });

    const adminMessage = `🆕 *Reactivation Request*\n\n• User: @${ctx.from.username || ctx.from.id}\n• Plan: ${plan.label}\n• Status: Pending review\n• Request ID: \
${request.id}`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Approve",
            callback_data: `approve_reactivation_${request.id}`,
          },
          {
            text: "❌ Deny",
            callback_data: `deny_reactivation_${request.id}`,
          },
        ],
      ],
    };

    await sendAdminNotification({
      telegram: ctx.telegram,
      userId: ctx.from.id,
      username: ctx.from.username,
      message: adminMessage,
      replyMarkup: keyboard,
      attachments: [
        {
          type: filePayload.type,
          fileId: filePayload.fileId,
          caption: ctx.message?.caption || undefined,
        },
      ],
    });

    return true;
  } catch (error) {
    logger.error("Failed to create reactivation request", error);
    await ctx.reply("❌ Error saving your proof. Please try again or contact support.");
    return false;
  }
}

async function approveReactivation(ctx, requestId) {
  const adminId = ctx.from.id;

  if (!isAdmin(adminId)) {
    await ctx.answerCbQuery("⛔ Admin only", { show_alert: true }).catch(() => {});
    return;
  }

  try {
    const request = await getReactivationRequest(requestId);
    if (!request) {
      await ctx.answerCbQuery("Request not found", { show_alert: true }).catch(() => {});
      return;
    }

    if (request.status !== "pending") {
      await ctx.answerCbQuery("Already processed", { show_alert: true }).catch(() => {});
      return;
    }

    const plan = PLAN_CONFIG[request.planKey];
    if (!plan) {
      await ctx.answerCbQuery("Plan not found", { show_alert: true }).catch(() => {});
      return;
    }

    await activateMembership(
      request.userId,
      plan.tier,
      `reactivation_admin_${adminId}`,
      plan.durationDays,
      ctx.telegram,
      {
        paymentMethod: "reactivation_manual",
        reference: `admin-${request.planKey}`,
      }
    );

    await updateReactivationRequest(requestId, {
      status: "approved",
      approvedAt: new Date(),
      approvedBy: adminId.toString(),
    });

    await notifyWelcome(ctx, plan, {
      userIdOverride: request.userId,
      languageOverride: request.language,
    });

    await ctx.answerCbQuery("Approved", { show_alert: false }).catch(() => {});

    await ctx.editMessageText(
      `✅ Reactivation approved\n\n• Request: ${requestId}\n• Plan: ${plan.label}\n• Admin: ${ctx.from.username || adminId}`,
      {
        parse_mode: "Markdown",
      }
    ).catch(() => {});

    await sendAdminNotification({
      telegram: ctx.telegram,
      userId: request.userId,
      username: request.username,
      message: `✅ *Reactivation Approved*\n\n• User: @${request.username || request.userId}\n• Plan: ${plan.label}\n• Approved by: @${ctx.from.username || adminId}`,
    });
  } catch (error) {
    logger.error("Failed to approve reactivation", error);
    await ctx.answerCbQuery("Error approving", { show_alert: true }).catch(() => {});
  }
}

async function denyReactivation(ctx, requestId) {
  const adminId = ctx.from.id;

  if (!isAdmin(adminId)) {
    await ctx.answerCbQuery("⛔ Admin only", { show_alert: true }).catch(() => {});
    return;
  }

  try {
    const request = await getReactivationRequest(requestId);
    if (!request) {
      await ctx.answerCbQuery("Request not found", { show_alert: true }).catch(() => {});
      return;
    }

    if (request.status !== "pending") {
      await ctx.answerCbQuery("Already processed", { show_alert: true }).catch(() => {});
      return;
    }

    await updateReactivationRequest(requestId, {
      status: "denied",
      deniedAt: new Date(),
      deniedBy: adminId.toString(),
    });

    const language = request.language || "en";
    const denialMessage = language === "es"
      ? "❌ Tu solicitud de reactivación fue rechazada. Escríbenos a support@pnptv.app para revisar opciones."
      : "❌ Your reactivation request was denied. Please email support@pnptv.app to review options.";

    await ctx.telegram.sendMessage(request.userId, denialMessage).catch(() => {});

    await removeFromPrimeChannel(ctx.telegram, request.userId);

    await ctx.answerCbQuery("Denied", { show_alert: false }).catch(() => {});
    await ctx.editMessageText(
      `❌ Reactivation denied\n\n• Request: ${requestId}\n• Plan: ${request.planLabel}\n• Admin: ${ctx.from.username || adminId}`,
      {
        parse_mode: "Markdown",
      }
    ).catch(() => {});

    await sendAdminNotification({
      telegram: ctx.telegram,
      userId: request.userId,
      username: request.username,
      message: `❌ *Reactivation Denied*\n\n• User: @${request.username || request.userId}\n• Plan: ${request.planLabel}\n• Denied by: @${ctx.from.username || adminId}`,
    });
  } catch (error) {
    logger.error("Failed to deny reactivation", error);
    await ctx.answerCbQuery("Error denying", { show_alert: true }).catch(() => {});
  }
}

async function removeFromPrimeChannel(telegram, userId) {
  if (!process.env.CHANNEL_ID) {
    return;
  }

  try {
    await telegram.banChatMember(process.env.CHANNEL_ID, Number(userId));
    await telegram.unbanChatMember(process.env.CHANNEL_ID, Number(userId));
  } catch (error) {
    logger.warn("Failed to remove user from PRIME channel", {
      userId,
      error: error.message,
    });
  }
}

async function handleReactivationCallback(ctx) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  if (data === "reactivate_start") {
    await ctx.answerCbQuery().catch(() => {});
    await showReactivationIntro(ctx);
    return;
  }

  if (data === "reactivate_cancel") {
    await ctx.answerCbQuery().catch(() => {});
    ctx.session.reactivation = null;
    ctx.session.waitingFor = null;

    const lang = ctx.session.language || "en";
    await ctx.editMessageText(lang === "es" ? "🚫 Reactivación cancelada." : "🚫 Reactivation cancelled.");
    return;
  }

  if (data.startsWith("reactivate_plan_")) {
    const planKey = data.replace("reactivate_plan_", "");
    await ctx.answerCbQuery().catch(() => {});
    await handlePlanSelection(ctx, planKey);
    return;
  }

  if (data.startsWith("reactivate_confirm_")) {
    const planKey = data.replace("reactivate_confirm_", "");
    await ctx.answerCbQuery().catch(() => {});
    await completeAutoActivation(ctx, planKey);
    return;
  }

  if (data.startsWith("approve_reactivation_")) {
    const requestId = data.replace("approve_reactivation_", "");
    await approveReactivation(ctx, requestId);
    return;
  }

  if (data.startsWith("deny_reactivation_")) {
    const requestId = data.replace("deny_reactivation_", "");
    await denyReactivation(ctx, requestId);
    return;
  }
}

module.exports = {
  showReactivationIntro,
  handleReactivationCallback,
  handleReactivationProofUpload,
  buildLandingMenu,
  getReactivationIntroMessage,
};
