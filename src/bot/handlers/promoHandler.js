const logger = require("../../utils/logger");
const { db } = require("../../config/firebase");
const { isAdmin } = require("../../config/admin");

const PROMO_CONFIG = {
  amount: 10,
  currency: "USD",
  paymentLink: "https://checkout.nequi.wompi.co/l/xo2XHx",
  groupId: process.env.FREE_GROUP_ID || "-1003291737499"
};

function getPromoMessage(lang = "en") {
  if (lang === "es") {
    return `🎉 **¡PROMOCIÓN ESPECIAL!** 🎉

💰 **$${PROMO_CONFIG.amount} USD**

✨ ¡Aprovecha esta oferta especial por tiempo limitado!

🔹 **Características:**
• Acceso instantáneo
• Verificación rápida
• Soporte 24/7

💳 **Pago fácil y seguro**
Haz clic en el botón de abajo para pagar.

⚡ ¡No te lo pierdas!`;
  } else {
    return `🎉 **SPECIAL PROMOTION!** 🎉

💰 **$${PROMO_CONFIG.amount} USD**

✨ Take advantage of this limited-time special offer!

🔹 **Features:**
• Instant access
• Quick verification
• 24/7 support

💳 **Easy and secure payment**
Click the button below to pay.

⚡ Don't miss out!`;
  }
}

function getPromoKeyboard(lang = "en") {
  return {
    inline_keyboard: [
      [
        {
          text: lang === "es" ? "💳 Pagar Ahora" : "💳 Pay Now",
          url: PROMO_CONFIG.paymentLink
        }
      ],
      [
        {
          text: lang === "es" ? "✅ Ya Pagué - Verificar" : "✅ I Paid - Verify",
          callback_data: "promo_verify_payment"
        }
      ]
    ]
  };
}

async function sendPromoAnnouncement(ctx) {
  try {
    const userId = ctx.from?.id;
    if (!isAdmin(userId)) {
      await ctx.reply("⛔ This command is for administrators only.");
      return;
    }
    logger.info(`[Promo] Admin ${userId} sending promo announcement`);
    const lang = ctx.session?.language || "en";
    const langMessage = lang === "es"
      ? "🌐 **Selecciona el idioma del anuncio:**"
      : "🌐 **Select announcement language:**";
    await ctx.reply(langMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇪🇸 Español", callback_data: "promo_send_es" },
            { text: "🇬🇧 English", callback_data: "promo_send_en" }
          ],
          [
            { text: "🌍 Both / Ambos", callback_data: "promo_send_both" }
          ],
          [
            { text: lang === "es" ? "❌ Cancelar" : "❌ Cancel", callback_data: "promo_cancel" }
          ]
        ]
      }
    });
  } catch (error) {
    logger.error("[Promo] Error:", error);
    await ctx.reply("❌ Error. Please try again.");
  }
}

async function executePromoSend(ctx, targetLang) {
  try {
    const userId = ctx.from?.id;
    if (!isAdmin(userId)) {
      await ctx.answerCbQuery("⛔ Admin only");
      return;
    }
    await ctx.answerCbQuery("📤 Sending...");
    const adminLang = ctx.session?.language || "en";
    if (targetLang === "both") {
      await ctx.telegram.sendMessage(PROMO_CONFIG.groupId, getPromoMessage("es"), {
        parse_mode: "Markdown",
        reply_markup: getPromoKeyboard("es")
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await ctx.telegram.sendMessage(PROMO_CONFIG.groupId, getPromoMessage("en"), {
        parse_mode: "Markdown",
        reply_markup: getPromoKeyboard("en")
      });
      logger.info(`[Promo] Admin ${userId} sent bilingual promo`);
      await ctx.editMessageText(adminLang === "es" ? "✅ ¡Anuncio enviado!" : "✅ Announcement sent!");
    } else {
      await ctx.telegram.sendMessage(PROMO_CONFIG.groupId, getPromoMessage(targetLang), {
        parse_mode: "Markdown",
        reply_markup: getPromoKeyboard(targetLang)
      });
      logger.info(`[Promo] Admin ${userId} sent ${targetLang} promo`);
      await ctx.editMessageText("✅ Announcement sent!");
    }
  } catch (error) {
    logger.error("[Promo] Error:", error);
    await ctx.reply("❌ Error sending announcement.");
  }
}

async function handlePaymentVerification(ctx) {
  try {
    const userId = ctx.from?.id;
    const username = ctx.from?.username || "Unknown";
    const userLang = ctx.session?.language || "en";
    await ctx.answerCbQuery(userLang === "es" ? "📝 Solicitud enviada" : "📝 Request sent");
    logger.info(`[Promo] User ${userId} requested verification`);
    const adminNotification = `🔔 **Payment Verification Request**

👤 @${username}
🆔 \`${userId}\`
💰 $${PROMO_CONFIG.amount} ${PROMO_CONFIG.currency}`;
    const adminKeyboard = {
      inline_keyboard: [
        [{ text: "✅ Confirm", callback_data: `promo_confirm_${userId}` }],
        [{ text: "❌ Reject", callback_data: `promo_reject_${userId}` }]
      ]
    };
    const adminId = process.env.ADMIN_IDS?.split(",")[0] || "8365312597";
    await ctx.telegram.sendMessage(adminId, adminNotification, {
      parse_mode: "Markdown",
      reply_markup: adminKeyboard
    });
    await db.collection("paymentVerifications").add({
      userId: userId.toString(),
      username,
      amount: PROMO_CONFIG.amount,
      currency: PROMO_CONFIG.currency,
      paymentLink: PROMO_CONFIG.paymentLink,
      status: "pending",
      requestedAt: new Date(),
      type: "promo"
    });
    const userMessage = userLang === "es"
      ? "✅ **Solicitud Recibida**\n\n📋 Verificaremos tu pago pronto.\n⏱️ Tiempo: 1-24 horas"
      : "✅ **Request Received**\n\n📋 We'll verify your payment soon.\n⏱️ Time: 1-24 hours";
    await ctx.reply(userMessage, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error("[Promo] Error:", error);
    await ctx.answerCbQuery("❌ Error");
  }
}

async function handleAdminConfirmation(ctx, userId) {
  try {
    const adminId = ctx.from?.id;
    if (!isAdmin(adminId)) {
      await ctx.answerCbQuery("⛔ Admin only");
      return;
    }
    await ctx.answerCbQuery("✅ Confirming...");
    logger.info(`[Promo] Admin ${adminId} confirming payment for ${userId}`);
    const verificationsRef = db.collection("paymentVerifications");
    const snapshot = await verificationsRef
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .where("type", "==", "promo")
      .orderBy("requestedAt", "desc")
      .limit(1)
      .get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        status: "confirmed",
        confirmedAt: new Date(),
        confirmedBy: adminId.toString()
      });
    }
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() || {};
    const userLang = userData.language || "en";
    const userMessage = userLang === "es"
      ? `✅ **¡Pago Confirmado!**\n\n🎉 Tu pago de $${PROMO_CONFIG.amount} USD verificado.`
      : `✅ **Payment Confirmed!**\n\n🎉 Your $${PROMO_CONFIG.amount} USD payment verified.`;
    await ctx.telegram.sendMessage(userId, userMessage, { parse_mode: "Markdown" });
    await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n✅ Payment confirmed", { parse_mode: "Markdown" });
    logger.info(`[Promo] Payment confirmed for ${userId}`);
  } catch (error) {
    logger.error("[Promo] Error:", error);
    await ctx.answerCbQuery("❌ Error");
  }
}

async function handleAdminRejection(ctx, userId) {
  try {
    const adminId = ctx.from?.id;
    if (!isAdmin(adminId)) {
      await ctx.answerCbQuery("⛔ Admin only");
      return;
    }
    await ctx.answerCbQuery("❌ Rejecting...");
    logger.info(`[Promo] Admin ${adminId} rejecting payment for ${userId}`);
    const verificationsRef = db.collection("paymentVerifications");
    const snapshot = await verificationsRef
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .where("type", "==", "promo")
      .orderBy("requestedAt", "desc")
      .limit(1)
      .get();
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: adminId.toString()
      });
    }
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() || {};
    const userLang = userData.language || "en";
    const userMessage = userLang === "es"
      ? "❌ **Verificación de Pago**\n\nNo pudimos verificar tu pago. Contacta al soporte."
      : "❌ **Payment Verification**\n\nCouldn't verify your payment. Contact support.";
    await ctx.telegram.sendMessage(userId, userMessage, { parse_mode: "Markdown" });
    await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n❌ Payment rejected", { parse_mode: "Markdown" });
    logger.info(`[Promo] Payment rejected for ${userId}`);
  } catch (error) {
    logger.error("[Promo] Error:", error);
    await ctx.answerCbQuery("❌ Error");
  }
}

async function handlePromoCancel(ctx) {
  try {
    await ctx.answerCbQuery("❌ Cancelled");
    const lang = ctx.session?.language || "en";
    await ctx.editMessageText(lang === "es" ? "❌ Cancelado" : "❌ Cancelled");
  } catch (error) {
    logger.error("[Promo] Error:", error);
  }
}

module.exports = {
  sendPromoAnnouncement,
  executePromoSend,
  handlePaymentVerification,
  handleAdminConfirmation,
  handleAdminRejection,
  handlePromoCancel,
  PROMO_CONFIG
};
