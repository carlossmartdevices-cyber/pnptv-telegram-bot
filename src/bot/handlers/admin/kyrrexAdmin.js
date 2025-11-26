const { db } = require("../../../config/firebase");
const logger = require("../../../utils/logger");
const kyrrexService = require("../../../services/kyrrexService");
const { escapeMdV2 } = require("../../../utils/telegramEscapes");

/**
 * Admin Kyrrex Management Functions
 * Handles cryptocurrency payment monitoring and management
 */

/**
 * Show Kyrrex admin dashboard
 * @param {Object} ctx - Telegraf context
 */
async function showKyrrexDashboard(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    
    // Get Kyrrex configuration status
    const config = kyrrexService.getConfig();
    
    // Get payment statistics
    const stats = await getKyrrexStats();
    
    const dashboardMsg = lang === "es"
      ? `🪙 *Panel de Administración Kyrrex*\n\n` +
        `📊 *Estadísticas:*\n` +
        `• Total pagos: ${escapeMdV2(String(stats.totalPayments))}\n` +
        `• Pagos completados: ${escapeMdV2(String(stats.completedPayments))}\n` +
        `• Pagos pendientes: ${escapeMdV2(String(stats.pendingPayments))}\n` +
        `• Pagos expirados: ${escapeMdV2(String(stats.expiredPayments))}\n` +
        `• Ingresos totales: $${escapeMdV2((stats.totalRevenue || 0).toFixed(2))} USD\n\n` +
        `⚙️ *Configuración:*\n` +
        `• Estado: ${config.enabled ? '✅ Activo' : '❌ Inactivo'}\n` +
        `• API Key: ${escapeMdV2(config.apiKey || 'No configurada')}\n` +
        `• Wallet: ${config.walletAddress ? '✅ Configurada' : '❌ No configurada'}\n` +
        `• Webhook: ${escapeMdV2(config.webhookUrl || 'No configurado')}\n\n` +
        `*Selecciona una opción:*`
      : `🪙 *Kyrrex Admin Dashboard*\n\n` +
        `📊 *Statistics:*\n` +
        `• Total payments: ${escapeMdV2(String(stats.totalPayments))}\n` +
        `• Completed payments: ${escapeMdV2(String(stats.completedPayments))}\n` +
        `• Pending payments: ${escapeMdV2(String(stats.pendingPayments))}\n` +
        `• Expired payments: ${escapeMdV2(String(stats.expiredPayments))}\n` +
        `• Total revenue: $${escapeMdV2((stats.totalRevenue || 0).toFixed(2))} USD\n\n` +
        `⚙️ *Configuration:*\n` +
        `• Status: ${config.enabled ? '✅ Active' : '❌ Inactive'}\n` +
        `• API Key: ${escapeMdV2(config.apiKey || 'Not configured')}\n` +
        `• Wallet: ${config.walletAddress ? '✅ Configured' : '❌ Not configured'}\n` +
        `• Webhook: ${escapeMdV2(config.webhookUrl || 'Not configured')}\n\n` +
        `*Select an option:*`;

    const buttons = [
      [
        {
          text: lang === "es" ? "📋 Ver Pagos Recientes" : "📋 View Recent Payments",
          callback_data: "admin_kyrrex_recent",
        },
        {
          text: lang === "es" ? "⏳ Pagos Pendientes" : "⏳ Pending Payments",
          callback_data: "admin_kyrrex_pending",
        },
      ],
      [
        {
          text: lang === "es" ? "✅ Confirmar Pago" : "✅ Confirm Payment",
          callback_data: "admin_kyrrex_confirm",
        },
        {
          text: lang === "es" ? "💰 Ver Balances" : "💰 View Balances",
          callback_data: "admin_kyrrex_balances",
        },
      ],
      [
        {
          text: lang === "es" ? "📊 Estadísticas Detalladas" : "📊 Detailed Stats",
          callback_data: "admin_kyrrex_stats",
        },
        {
          text: lang === "es" ? "⚙️ Configuración" : "⚙️ Configuration",
          callback_data: "admin_kyrrex_config",
        },
      ],
      [
        {
          text: lang === "es" ? "🔙 Volver al Admin" : "🔙 Back to Admin",
          callback_data: "admin_panel",
        },
      ],
    ];

    // Answer callback query if this is from a callback
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }

    // Edit message if callback, reply if command
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      try {
        await ctx.editMessageText(dashboardMsg, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      } catch (editError) {
        await ctx.reply(dashboardMsg, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      }
    } else {
      await ctx.reply(dashboardMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    }

  } catch (error) {
    logger.error("[Admin Kyrrex] Dashboard error:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al cargar el panel de Kyrrex."
        : "❌ Error loading Kyrrex dashboard."
    );
  }
}

/**
 * Show recent Kyrrex payments
 * @param {Object} ctx - Telegraf context
 */
async function showRecentPayments(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    
    await ctx.answerCbQuery();
    
    // Get recent payments from Firestore
    const paymentsSnapshot = await db.collection('kyrrex_payments')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (paymentsSnapshot.empty) {
      const noPaymentsMsg = lang === "es"
        ? "📋 *Pagos Recientes*\n\nNo hay pagos registrados."
        : "📋 *Recent Payments*\n\nNo payments found.";
      
      await ctx.editMessageText(noPaymentsMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{
              text: lang === "es" ? "🔙 Volver" : "🔙 Back",
              callback_data: "admin_kyrrex_dashboard",
            }],
          ],
        },
      });
      return;
    }

    let paymentsMsg = lang === "es"
      ? "📋 *Pagos Recientes (Últimos 10)*\n\n"
      : "📋 *Recent Payments (Last 10)*\n\n";

    const payments = [];
    paymentsSnapshot.forEach(doc => {
      const payment = { id: doc.id, ...doc.data() };
      payments.push(payment);
    });

    payments.forEach((payment, index) => {
      const statusEmoji = {
        'pending': '⏳',
        'completed': '✅',
        'expired': '❌',
        'cancelled': '🚫',
      }[payment.status] || '❓';

      const createdAt = payment.createdAt?.toDate?.() || new Date(payment.createdAt);
      const timeAgo = getTimeAgo(createdAt, lang);

      paymentsMsg += `${index + 1}. ${statusEmoji} \`${escapeMdV2(payment.paymentId?.slice(-8) || payment.id.slice(-8))}\`\n`;
      paymentsMsg += `   💰 ${escapeMdV2(String(payment.cryptoAmount))} ${escapeMdV2(payment.cryptocurrency)}\n`;
      paymentsMsg += `   👤 Usuario: ${escapeMdV2(String(payment.userId))}\n`;
      paymentsMsg += `   📦 Plan: ${escapeMdV2(payment.planName)}\n`;
      paymentsMsg += `   🕐 ${escapeMdV2(timeAgo)}\n\n`;
    });

    const buttons = [
      [
        {
          text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
          callback_data: "admin_kyrrex_recent",
        },
        {
          text: lang === "es" ? "⏳ Solo Pendientes" : "⏳ Pending Only",
          callback_data: "admin_kyrrex_pending",
        },
      ],
      [
        {
          text: lang === "es" ? "🔙 Volver" : "🔙 Back",
          callback_data: "admin_kyrrex_dashboard",
        },
      ],
    ];

    await ctx.editMessageText(paymentsMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });

  } catch (error) {
    logger.error("[Admin Kyrrex] Recent payments error:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al cargar pagos recientes."
        : "❌ Error loading recent payments."
    );
  }
}

/**
 * Show pending payments only
 * @param {Object} ctx - Telegraf context
 */
async function showPendingPayments(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    
    await ctx.answerCbQuery();
    
    // Get pending payments from Firestore
    const paymentsSnapshot = await db.collection('kyrrex_payments')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (paymentsSnapshot.empty) {
      const noPaymentsMsg = lang === "es"
        ? "⏳ *Pagos Pendientes*\n\nNo hay pagos pendientes."
        : "⏳ *Pending Payments*\n\nNo pending payments found.";
      
      await ctx.editMessageText(noPaymentsMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{
              text: lang === "es" ? "🔙 Volver" : "🔙 Back",
              callback_data: "admin_kyrrex_dashboard",
            }],
          ],
        },
      });
      return;
    }

    let paymentsMsg = lang === "es"
      ? "⏳ *Pagos Pendientes*\n\n"
      : "⏳ *Pending Payments*\n\n";

    const payments = [];
    paymentsSnapshot.forEach(doc => {
      const payment = { id: doc.id, ...doc.data() };
      payments.push(payment);
    });

    const buttons = [];

    payments.forEach((payment, index) => {
      const createdAt = payment.createdAt?.toDate?.() || new Date(payment.createdAt);
      const expiresAt = payment.expiresAt?.toDate?.() || new Date(payment.expiresAt);
      const timeLeft = Math.max(0, Math.floor((expiresAt - new Date()) / (1000 * 60)));

  paymentsMsg += `${index + 1}. \`${escapeMdV2(payment.paymentId?.slice(-8) || payment.id.slice(-8))}\`\n`;
  paymentsMsg += `   💰 ${escapeMdV2(String(payment.cryptoAmount))} ${escapeMdV2(payment.cryptocurrency)}\n`;
  paymentsMsg += `   👤 Usuario: ${escapeMdV2(String(payment.userId))}\n`;
  paymentsMsg += `   📦 Plan: ${escapeMdV2(payment.planName)}\n`;
  paymentsMsg += `   ⏰ Expira en: ${escapeMdV2(String(timeLeft))} min\n`;
  paymentsMsg += `   📍 \`${escapeMdV2(payment.depositAddress)}\`\n\n`;

      // Add confirm button for each payment
      buttons.push([{
        text: `✅ Confirmar #${index + 1}`,
        callback_data: `admin_kyrrex_confirm_${payment.id}`,
      }]);
    });

    buttons.push([
      {
        text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
        callback_data: "admin_kyrrex_pending",
      },
      {
        text: lang === "es" ? "🔙 Volver" : "🔙 Back",
        callback_data: "admin_kyrrex_dashboard",
      },
    ]);

    await ctx.editMessageText(paymentsMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });

  } catch (error) {
    logger.error("[Admin Kyrrex] Pending payments error:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al cargar pagos pendientes."
        : "❌ Error loading pending payments."
    );
  }
}

/**
 * Handle manual payment confirmation
 * @param {Object} ctx - Telegraf context
 */
async function handlePaymentConfirmation(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const adminUserId = ctx.from.id;
    
    // Extract payment ID from callback data
    const match = ctx.callbackQuery?.data?.match(/^admin_kyrrex_confirm_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery("Invalid payment ID");
      return;
    }
    
    const paymentId = match[1];
    
    await ctx.answerCbQuery(
      lang === "es" ? "⏳ Confirmando pago..." : "⏳ Confirming payment..."
    );

    // Get payment details
    const paymentDoc = await db.collection('kyrrex_payments').doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      await ctx.reply(
        lang === "es"
          ? "❌ Pago no encontrado."
          : "❌ Payment not found."
      );
      return;
    }

    const paymentData = paymentDoc.data();

    if (paymentData.status === 'completed') {
      await ctx.reply(
        lang === "es"
          ? "⚠️ Este pago ya está confirmado."
          : "⚠️ This payment is already confirmed."
      );
      return;
    }

    // Show confirmation dialog
    const confirmMsg = lang === "es"
      ? `🔍 *Confirmar Pago Manualmente*\n\n` +
        `📦 *Plan:* ${paymentData.planName}\n` +
        `👤 *Usuario:* ${paymentData.userId}\n` +
        `💰 *Cantidad:* ${paymentData.cryptoAmount} ${paymentData.cryptocurrency}\n` +
        `📍 *Dirección:* \`${paymentData.depositAddress}\`\n` +
        `🕐 *Creado:* ${paymentData.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}\n\n` +
        `⚠️ *ADVERTENCIA:* Confirma solo si has verificado que el pago fue recibido en la blockchain.\n\n` +
        `¿Estás seguro de que quieres confirmar este pago?`
      : `🔍 *Manually Confirm Payment*\n\n` +
        `📦 *Plan:* ${paymentData.planName}\n` +
        `👤 *User:* ${paymentData.userId}\n` +
        `💰 *Amount:* ${paymentData.cryptoAmount} ${paymentData.cryptocurrency}\n` +
        `📍 *Address:* \`${paymentData.depositAddress}\`\n` +
        `🕐 *Created:* ${paymentData.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}\n\n` +
        `⚠️ *WARNING:* Only confirm if you have verified the payment was received on the blockchain.\n\n` +
        `Are you sure you want to confirm this payment?`;

    const buttons = [
      [
        {
          text: lang === "es" ? "✅ Sí, Confirmar" : "✅ Yes, Confirm",
          callback_data: `admin_kyrrex_confirm_yes_${paymentId}`,
        },
        {
          text: lang === "es" ? "❌ Cancelar" : "❌ Cancel",
          callback_data: "admin_kyrrex_pending",
        },
      ],
    ];

    await ctx.editMessageText(confirmMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });

  } catch (error) {
    logger.error("[Admin Kyrrex] Payment confirmation error:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al confirmar pago."
        : "❌ Error confirming payment."
    );
  }
}

/**
 * Execute manual payment confirmation
 * @param {Object} ctx - Telegraf context
 */
async function executePaymentConfirmation(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const adminUserId = ctx.from.id;
    
    // Extract payment ID from callback data
    const match = ctx.callbackQuery?.data?.match(/^admin_kyrrex_confirm_yes_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery("Invalid payment ID");
      return;
    }
    
    const paymentId = match[1];
    
    await ctx.answerCbQuery(
      lang === "es" ? "⏳ Procesando confirmación..." : "⏳ Processing confirmation..."
    );

    // Call the admin API endpoint to confirm payment
    const axios = require('axios');
    const BOT_URL = process.env.BOT_URL;
    
    const response = await axios.post(`${BOT_URL}/kyrrex/admin/payments/${paymentId}/confirm`, {
      adminUserId: adminUserId,
      txHash: 'manual_admin_confirmation',
      amount: null, // Will use stored amount
    });

    if (response.data.success) {
      const successMsg = lang === "es"
        ? `✅ *Pago Confirmado Exitosamente*\n\n` +
          `El pago ha sido confirmado manualmente y la suscripción del usuario ha sido activada.\n\n` +
          `📦 Plan: ${response.data.payment.planName}\n` +
          `👤 Usuario: ${response.data.payment.userId}\n` +
          `💰 Cantidad: ${response.data.payment.confirmedAmount} ${response.data.payment.cryptocurrency}`
        : `✅ *Payment Confirmed Successfully*\n\n` +
          `The payment has been manually confirmed and the user's subscription has been activated.\n\n` +
          `📦 Plan: ${response.data.payment.planName}\n` +
          `👤 User: ${response.data.payment.userId}\n` +
          `💰 Amount: ${response.data.payment.confirmedAmount} ${response.data.payment.cryptocurrency}`;

      await ctx.editMessageText(successMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{
              text: lang === "es" ? "🔙 Volver a Pendientes" : "🔙 Back to Pending",
              callback_data: "admin_kyrrex_pending",
            }],
          ],
        },
      });

      logger.info("[Admin Kyrrex] Payment manually confirmed:", {
        paymentId,
        adminUserId,
        userId: response.data.payment.userId,
        planName: response.data.payment.planName,
      });

    } else {
      throw new Error(response.data.message || 'Confirmation failed');
    }

  } catch (error) {
    logger.error("[Admin Kyrrex] Execute confirmation error:", error);
    
    const errorMsg = ctx.session?.language === "es"
      ? `❌ Error al confirmar pago:\n\n${error.response?.data?.message || error.message}`
      : `❌ Error confirming payment:\n\n${error.response?.data?.message || error.message}`;
    
    await ctx.editMessageText(errorMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{
            text: ctx.session?.language === "es" ? "🔙 Volver" : "🔙 Back",
            callback_data: "admin_kyrrex_pending",
          }],
        ],
      },
    });
  }
}

/**
 * Show Kyrrex account balances
 * @param {Object} ctx - Telegraf context
 */
async function showBalances(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    
    await ctx.answerCbQuery();
    
    // Get account balances from Kyrrex API
    const balances = await kyrrexService.getAccountBalance();
    
    let balanceMsg = lang === "es"
      ? "💰 *Balances de Kyrrex*\n\n"
      : "💰 *Kyrrex Balances*\n\n";

    if (Object.keys(balances).length === 0) {
      balanceMsg += lang === "es"
        ? "No hay balances disponibles o error al obtener datos."
        : "No balances available or error fetching data.";
    } else {
      const currencies = Object.keys(balances);
      currencies.forEach(currency => {
        const balance = parseFloat(balances[currency]);
        if (balance > 0) {
          balanceMsg += `• ${currency}: ${balance.toFixed(6)}\n`;
        }
      });
    }

    const buttons = [
      [
        {
          text: lang === "es" ? "🔄 Actualizar" : "🔄 Refresh",
          callback_data: "admin_kyrrex_balances",
        },
        {
          text: lang === "es" ? "🔙 Volver" : "🔙 Back",
          callback_data: "admin_kyrrex_dashboard",
        },
      ],
    ];

    await ctx.editMessageText(balanceMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });

  } catch (error) {
    logger.error("[Admin Kyrrex] Balances error:", error);
    
    const errorMsg = ctx.session?.language === "es"
      ? "❌ Error al obtener balances. Verifica la configuración de la API."
      : "❌ Error fetching balances. Check API configuration.";
    
    await ctx.editMessageText(errorMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{
            text: ctx.session?.language === "es" ? "🔙 Volver" : "🔙 Back",
            callback_data: "admin_kyrrex_dashboard",
          }],
        ],
      },
    });
  }
}

/**
 * Get Kyrrex payment statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getKyrrexStats() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Get all payments
    const allPaymentsSnapshot = await db.collection('kyrrex_payments').get();
    
    // Get recent payments (last 30 days)
    const recentPaymentsSnapshot = await db.collection('kyrrex_payments')
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();

    const stats = {
      totalPayments: 0,
      completedPayments: 0,
      pendingPayments: 0,
      expiredPayments: 0,
      totalRevenue: 0,
      recentPayments: 0,
      recentRevenue: 0,
    };

    // Process all payments
    allPaymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      stats.totalPayments++;
      
      switch (payment.status) {
        case 'completed':
          stats.completedPayments++;
          stats.totalRevenue += payment.usdAmount || 0;
          break;
        case 'pending':
          stats.pendingPayments++;
          break;
        case 'expired':
          stats.expiredPayments++;
          break;
      }
    });

    // Process recent payments
    recentPaymentsSnapshot.forEach(doc => {
      const payment = doc.data();
      stats.recentPayments++;
      
      if (payment.status === 'completed') {
        stats.recentRevenue += payment.usdAmount || 0;
      }
    });

    return stats;
  } catch (error) {
    logger.error("[Admin Kyrrex] Stats error:", error);
    return {
      totalPayments: 0,
      completedPayments: 0,
      pendingPayments: 0,
      expiredPayments: 0,
      totalRevenue: 0,
      recentPayments: 0,
      recentRevenue: 0,
    };
  }
}

/**
 * Get time ago string for a date
 * @param {Date} date - Date to compare
 * @param {string} lang - Language code
 * @returns {string} Time ago string
 */
function getTimeAgo(date, lang = 'en') {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return lang === 'es' ? 'Ahora' : 'Now';
  } else if (minutes < 60) {
    return lang === 'es' ? `Hace ${minutes} min` : `${minutes} min ago`;
  } else if (hours < 24) {
    return lang === 'es' ? `Hace ${hours}h` : `${hours}h ago`;
  } else {
    return lang === 'es' ? `Hace ${days}d` : `${days}d ago`;
  }
}

module.exports = {
  showKyrrexDashboard,
  showRecentPayments,
  showPendingPayments,
  handlePaymentConfirmation,
  executePaymentConfirmation,
  showBalances,
  getKyrrexStats,
};