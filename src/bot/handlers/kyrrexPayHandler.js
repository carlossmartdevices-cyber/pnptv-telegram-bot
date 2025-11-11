const { db } = require("../../config/firebase");
const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");
const kyrrexService = require("../../services/kyrrexService");
const planService = require("../../services/planService");
const QRCode = require('qrcode');

/**
 * Kyrrex Cryptocurrency Payment Handler
 * Handles BTC, USDT, USDC, ETH, BNB, TRX payments via Kyrrex API
 */

/**
 * Show available subscription plans for Kyrrex payment
 * @param {Object} ctx - Telegraf context
 */
async function showKyrrexPlans(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id;

    logger.info(`[Kyrrex] User ${userId} requested plans`);

    // Check if Kyrrex is configured
    const kyrrexConfig = kyrrexService.getConfig();
    if (!kyrrexConfig.enabled) {
      const errorMsg = lang === "es"
        ? "❌ Kyrrex no está configurado. Por favor contacta al administrador."
        : "❌ Kyrrex is not configured. Please contact the administrator.";
      
      await ctx.reply(errorMsg);
      return;
    }

    // Get available plans
    const plans = await planService.getActivePlans();
    
    if (!plans || plans.length === 0) {
      const noPlansMsg = lang === "es"
        ? "❌ No hay planes disponibles en este momento."
        : "❌ No plans available at the moment.";
      
      await ctx.reply(noPlansMsg);
      return;
    }

    // Get current exchange rates for display
    const rates = await kyrrexService.getExchangeRates('USD');

    // Build plans message
    const header = lang === "es"
      ? "🪙 *Planes de Suscripción - Kyrrex Crypto*\n\n" +
        "Hazte miembro de *PNPtv PRIME* y disfruta del mejor contenido amateur — Hombres latinos fumando y slamming en Telegram.\n\n" +
        "🔥 *Lo que obtendrás:*\n\n" +
        "🎬 Docenas de videos completos para adultos con Santino y sus chicos\n" +
        "👥 Acceso a nuestro grupo exclusivo de miembros en Telegram\n" +
        "📍 Conecta con otros miembros en tu área usando nuestra herramienta de geolocalización\n\n" +
        "💰 *Paga con criptomonedas:*\n" +
        "₿ Bitcoin (BTC)\n" +
        "💎 Ethereum (ETH)\n" +
        "🏆 Tether (USDT) - TRC20/ERC20\n" +
        "🔵 USD Coin (USDC)\n" +
        "🟡 Binance Coin (BNB)\n" +
        "🔴 TRON (TRX)\n\n" +
        "🔒 Pago seguro en blockchain\n" +
        "⚡ Activación automática tras confirmación\n" +
        "🌐 Comisiones ultra-bajas (TRC20 recomendado)\n\n" +
        "*💱 Tipos de cambio actuales (USD):*\n" +
        `• BTC: $${rates.BTC?.toLocaleString() || '43,000'}\n` +
        `• ETH: $${rates.ETH?.toLocaleString() || '2,400'}\n` +
        `• USDT/USDC: $${rates.USDT || '1.00'}\n` +
        `• BNB: $${rates.BNB || '240'}\n` +
        `• TRX: $${rates.TRX || '0.10'}`
      : "🪙 *Subscription Plans - Kyrrex Crypto*\n\n" +
        "Become a member of *PNPtv PRIME* and enjoy the best amateur content — Latino men smoking and slamming on Telegram.\n\n" +
        "🔥 *What you'll get:*\n\n" +
        "🎬 Dozens of full-length adult videos featuring Santino and his boys\n" +
        "👥 Access to our exclusive Telegram members group\n" +
        "📍 Connect with other members in your area using our geolocation tool\n\n" +
        "💰 *Pay with cryptocurrencies:*\n" +
        "₿ Bitcoin (BTC)\n" +
        "💎 Ethereum (ETH)\n" +
        "🏆 Tether (USDT) - TRC20/ERC20\n" +
        "🔵 USD Coin (USDC)\n" +
        "🟡 Binance Coin (BNB)\n" +
        "🔴 TRON (TRX)\n\n" +
        "🔒 Secure blockchain payment\n" +
        "⚡ Automatic activation after confirmation\n" +
        "🌐 Ultra-low fees (TRC20 recommended)\n\n" +
        "*💱 Current exchange rates (USD):*\n" +
        `• BTC: $${rates.BTC?.toLocaleString() || '43,000'}\n` +
        `• ETH: $${rates.ETH?.toLocaleString() || '2,400'}\n` +
        `• USDT/USDC: $${rates.USDT || '1.00'}\n` +
        `• BNB: $${rates.BNB || '240'}\n` +
        `• TRX: $${rates.TRX || '0.10'}`;

    const planButtons = [];

    // Format each plan as buttons only
    plans.forEach((plan) => {
      const price = plan.price || plan.priceInUSD || 0;
      
      // Add button for this plan
      planButtons.push([{
        text: `🪙 ${plan.name} - $${price.toFixed(2)} USD`,
        callback_data: `kyrrex_plan_${plan.id}`,
      }]);
    });

    // Add help and back buttons
    planButtons.push([
      {
        text: lang === "es" ? "❓ ¿Cómo funciona?" : "❓ How does it work?",
        callback_data: "kyrrex_help",
      },
      {
        text: lang === "es" ? "🔙 Volver" : "🔙 Back",
        callback_data: "show_subscription_plans",
      },
    ]);

    // Answer callback query first if it's a callback
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
    }

    // Edit message if callback, reply if direct command
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      try {
        await ctx.editMessageText(header, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: planButtons,
          },
        });
      } catch (editError) {
        // If edit fails, send new message
        await ctx.reply(header, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: planButtons,
          },
        });
      }
    } else {
      await ctx.reply(header, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: planButtons,
        },
      });
    }
  } catch (error) {
    logger.error("[Kyrrex] Error showing plans:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al cargar planes. Intenta de nuevo."
        : "❌ Error loading plans. Please try again."
    );
  }
}

/**
 * Handle plan selection and show cryptocurrency options
 * @param {Object} ctx - Telegraf context
 */
async function handleKyrrexPlanSelection(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id;
    
    // Extract plan ID from callback data
    const match = ctx.callbackQuery?.data?.match(/^kyrrex_plan_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery("Invalid plan selection");
      return;
    }
    
    const planId = match[1];
    
    logger.info(`[Kyrrex] User ${userId} selected plan ${planId}`);

    // Answer callback query
    await ctx.answerCbQuery();

    // Check if Kyrrex is configured
    const kyrrexConfig = kyrrexService.getConfig();
    if (!kyrrexConfig.enabled) {
      await ctx.reply(
        lang === "es"
          ? "❌ Kyrrex no está configurado."
          : "❌ Kyrrex is not configured."
      );
      return;
    }

    // Get plan details
    const plan = await planService.getPlanById(planId);
    if (!plan) {
      await ctx.reply(
        lang === "es"
          ? "❌ Plan no encontrado."
          : "❌ Plan not found."
      );
      return;
    }

    const price = plan.price || plan.priceInUSD;
    if (!price || price < 1) {
      await ctx.reply(
        lang === "es"
          ? "❌ Precio inválido para este plan."
          : "❌ Invalid price for this plan."
      );
      return;
    }

    // Store selected plan in session
    ctx.session.selectedPlan = { planId, planName: plan.name, price };

    // Show cryptocurrency selection
    const cryptoMsg = lang === "es"
      ? `💰 *Selecciona tu criptomoneda*\n\n` +
        `📦 *Plan:* ${plan.name}\n` +
        `💵 *Precio:* $${price.toFixed(2)} USD\n` +
        `⏱️ *Duración:* ${plan.durationDays || 30} días\n\n` +
        `*Elige tu método de pago preferido:*`
      : `💰 *Select your cryptocurrency*\n\n` +
        `📦 *Plan:* ${plan.name}\n` +
        `💵 *Price:* $${price.toFixed(2)} USD\n` +
        `⏱️ *Duration:* ${plan.durationDays || 30} days\n\n` +
        `*Choose your preferred payment method:*`;

    const cryptoButtons = [
      [
        { text: "🏆 USDT (Recommended)", callback_data: "kyrrex_crypto_USDT" },
        { text: "🔵 USDC", callback_data: "kyrrex_crypto_USDC" },
      ],
      [
        { text: "₿ Bitcoin (BTC)", callback_data: "kyrrex_crypto_BTC" },
        { text: "💎 Ethereum (ETH)", callback_data: "kyrrex_crypto_ETH" },
      ],
      [
        { text: "🟡 Binance Coin (BNB)", callback_data: "kyrrex_crypto_BNB" },
        { text: "🔴 TRON (TRX)", callback_data: "kyrrex_crypto_TRX" },
      ],
      [
        {
          text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
          callback_data: "kyrrex_show_plans",
        },
      ],
    ];

    await ctx.editMessageText(cryptoMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: cryptoButtons,
      },
    });

  } catch (error) {
    logger.error("[Kyrrex] Plan selection error:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al procesar tu selección. Intenta de nuevo."
        : "❌ Error processing your selection. Please try again."
    );
  }
}

/**
 * Handle cryptocurrency selection and create payment
 * @param {Object} ctx - Telegraf context
 */
async function handleKyrrexCryptoSelection(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || ctx.from.username || "User";
    
    // Extract cryptocurrency from callback data
    const match = ctx.callbackQuery?.data?.match(/^kyrrex_crypto_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery("Invalid cryptocurrency selection");
      return;
    }
    
    const cryptocurrency = match[1];
    const selectedPlan = ctx.session.selectedPlan;
    
    if (!selectedPlan) {
      await ctx.answerCbQuery("Plan selection expired. Please start again.");
      await showKyrrexPlans(ctx);
      return;
    }

    logger.info(`[Kyrrex] User ${userId} selected crypto ${cryptocurrency} for plan ${selectedPlan.planId}`);

    // Answer callback query
    await ctx.answerCbQuery();

    // Show processing message
    const processingMsg = lang === "es"
      ? "⏳ Generando tu dirección de pago cripto...\n\nEsto puede tardar unos segundos."
      : "⏳ Generating your crypto payment address...\n\nThis may take a few seconds.";
    
    const processingMessage = await ctx.editMessageText(processingMsg);

    try {
      // Create payment via Kyrrex API
      const paymentResult = await kyrrexService.createPayment({
        planName: selectedPlan.planName,
        amount: selectedPlan.price,
        userId: userId.toString(),
        planId: selectedPlan.planId,
        userName: userName,
        cryptocurrency: cryptocurrency,
      });

      logger.info(`[Kyrrex] Payment created successfully`, {
        paymentId: paymentResult?.paymentId,
        cryptocurrency,
        amount: paymentResult?.amount,
      });

      // Generate QR code if not provided
      let qrCodeBuffer = null;
      if (!paymentResult.qrCode && paymentResult.depositAddress) {
        const qrData = `${cryptocurrency.toLowerCase()}:${paymentResult.depositAddress}?amount=${paymentResult.amount}`;
        qrCodeBuffer = await QRCode.toBuffer(qrData, {
          errorCorrectionLevel: 'M',
          type: 'png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 256,
        });
      }

      // Success message with payment details
      const networkInfo = paymentResult.network ? ` (${paymentResult.network})` : '';
      const successMsg = lang === "es"
        ? `🎉 *¡Dirección de Pago Generada!*\n\n` +
          `📦 *Plan:* ${selectedPlan.planName}\n` +
          `💰 *Precio:* ${paymentResult.amount} ${cryptocurrency}${networkInfo}\n` +
          `💵 *Equivalente USD:* $${selectedPlan.price.toFixed(2)}\n` +
          `⏱️ *Duración:* ${selectedPlan.durationDays || 30} días\n` +
          `🌐 *Red:* ${paymentResult.network || 'Principal'}\n\n` +
          `*📍 Dirección de Pago:*\n` +
          `\`${paymentResult.depositAddress}\`\n\n` +
          `*📱 Instrucciones de Pago:*\n` +
          `1️⃣ Envía exactamente *${paymentResult.amount} ${cryptocurrency}*\n` +
          `2️⃣ A la dirección de arriba\n` +
          `3️⃣ Confirmación automática tras 1 confirmación\n` +
          `4️⃣ ¡Tu membresía se activa al instante!\n\n` +
          `⏰ *Válido por:* 24 horas\n` +
          `🔒 *100% Seguro:* Protegido por blockchain\n` +
          `⚡ *Activación:* Automática tras confirmación\n\n` +
          `⚠️ *IMPORTANTE:* Envía solo ${cryptocurrency} en red ${paymentResult.network}. Otros tokens se perderán.`
        : `🎉 *Payment Address Generated!*\n\n` +
          `📦 *Plan:* ${selectedPlan.planName}\n` +
          `💰 *Price:* ${paymentResult.amount} ${cryptocurrency}${networkInfo}\n` +
          `💵 *USD Equivalent:* $${selectedPlan.price.toFixed(2)}\n` +
          `⏱️ *Duration:* ${selectedPlan.durationDays || 30} days\n` +
          `🌐 *Network:* ${paymentResult.network || 'Main'}\n\n` +
          `*📍 Payment Address:*\n` +
          `\`${paymentResult.depositAddress}\`\n\n` +
          `*📱 Payment Instructions:*\n` +
          `1️⃣ Send exactly *${paymentResult.amount} ${cryptocurrency}*\n` +
          `2️⃣ To the address above\n` +
          `3️⃣ Automatic confirmation after 1 confirmation\n` +
          `4️⃣ Your membership activates instantly!\n\n` +
          `⏰ *Valid for:* 24 hours\n` +
          `🔒 *100% Secure:* Blockchain protected\n` +
          `⚡ *Activation:* Automatic after confirmation\n\n` +
          `⚠️ *IMPORTANT:* Send only ${cryptocurrency} on ${paymentResult.network} network. Other tokens will be lost.`;

      const buttons = [
        [
          {
            text: lang === "es" ? "📋 Copiar Dirección" : "📋 Copy Address",
            callback_data: `kyrrex_copy_${paymentResult.paymentId}`,
          },
          {
            text: lang === "es" ? "🔄 Verificar Pago" : "🔄 Check Payment",
            callback_data: `kyrrex_check_${paymentResult.paymentId}`,
          },
        ],
        [
          {
            text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
            callback_data: "kyrrex_show_plans",
          },
        ],
      ];

      // Send QR code if available
      if (qrCodeBuffer) {
        await ctx.replyWithPhoto({ source: qrCodeBuffer }, {
          caption: successMsg,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      } else {
        await ctx.editMessageText(successMsg, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      }

      logger.info("[Kyrrex] Payment instructions sent to user", {
        userId,
        planId: selectedPlan.planId,
        paymentId: paymentResult.paymentId,
        cryptocurrency,
      });

      // Clear session
      delete ctx.session.selectedPlan;

    } catch (paymentError) {
      logger.error("[Kyrrex] Payment creation error:", {
        error: paymentError.message,
        stack: paymentError.stack,
        userId,
        planId: selectedPlan.planId,
        cryptocurrency,
      });

      const errorMsg = lang === "es"
        ? `❌ *Error al crear el pago*\n\n` +
          `No pudimos generar tu dirección de pago.\n\n` +
          `Por favor contacta al administrador o intenta con otro método de pago.`
        : `❌ *Payment Creation Error*\n\n` +
          `We couldn't generate your payment address.\n\n` +
          `Please contact the administrator or try another payment method.`;

      await ctx.editMessageText(errorMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "🔄 Reintentar" : "🔄 Retry",
                callback_data: `kyrrex_plan_${selectedPlan.planId}`,
              },
            ],
            [
              {
                text: lang === "es" ? "🔙 Volver" : "🔙 Back",
                callback_data: "kyrrex_show_plans",
              },
            ],
          ],
        },
      });
    }
  } catch (error) {
    logger.error("[Kyrrex] Crypto selection error:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al procesar tu selección. Intenta de nuevo."
        : "❌ Error processing your selection. Please try again."
    );
  }
}

/**
 * Handle payment status check
 * @param {Object} ctx - Telegraf context
 */
async function handleKyrrexPaymentCheck(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id;
    
    // Extract payment ID from callback data
    const match = ctx.callbackQuery?.data?.match(/^kyrrex_check_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery("Invalid payment ID");
      return;
    }
    
    const paymentId = match[1];
    
    logger.info(`[Kyrrex] User ${userId} checking payment ${paymentId}`);

    await ctx.answerCbQuery(
      lang === "es" ? "🔍 Verificando pago..." : "🔍 Checking payment..."
    );

    try {
      const paymentStatus = await kyrrexService.checkPaymentStatus(paymentId);
      
      let statusMsg;
      let buttons = [];

      if (paymentStatus.status === 'completed') {
        statusMsg = lang === "es"
          ? `✅ *¡Pago Confirmado!*\n\n` +
            `Tu suscripción ha sido activada exitosamente.\n\n` +
            `📦 *Plan:* ${paymentStatus.planName}\n` +
            `💰 *Pagado:* ${paymentStatus.confirmedAmount || paymentStatus.cryptoAmount} ${paymentStatus.cryptocurrency}\n` +
            `🔗 *TX Hash:* \`${paymentStatus.txHash}\`\n` +
            `✅ *Confirmaciones:* ${paymentStatus.confirmations}\n\n` +
            `¡Bienvenido a PNPtv PRIME! 🎉`
          : `✅ *Payment Confirmed!*\n\n` +
            `Your subscription has been activated successfully.\n\n` +
            `📦 *Plan:* ${paymentStatus.planName}\n` +
            `💰 *Paid:* ${paymentStatus.confirmedAmount || paymentStatus.cryptoAmount} ${paymentStatus.cryptocurrency}\n` +
            `🔗 *TX Hash:* \`${paymentStatus.txHash}\`\n` +
            `✅ *Confirmations:* ${paymentStatus.confirmations}\n\n` +
            `Welcome to PNPtv PRIME! 🎉`;

        buttons = [
          [{
            text: lang === "es" ? "🎬 Ir al Canal Premium" : "🎬 Go to Premium Channel",
            url: "https://t.me/pnptvpremium", // Replace with your actual channel
          }],
        ];

      } else if (paymentStatus.status === 'expired') {
        statusMsg = lang === "es"
          ? `⏰ *Pago Expirado*\n\n` +
            `Este enlace de pago ha expirado.\n\n` +
            `Por favor genera un nuevo pago si aún deseas suscribirte.`
          : `⏰ *Payment Expired*\n\n` +
            `This payment link has expired.\n\n` +
            `Please generate a new payment if you still want to subscribe.`;

        buttons = [
          [{
            text: lang === "es" ? "🔄 Nuevo Pago" : "🔄 New Payment",
            callback_data: "kyrrex_show_plans",
          }],
        ];

      } else {
        // Still pending
        const timeLeft = paymentStatus.expiresAt ? 
          Math.max(0, Math.floor((new Date(paymentStatus.expiresAt) - new Date()) / (1000 * 60))) : 0;

        statusMsg = lang === "es"
          ? `⏳ *Pago Pendiente*\n\n` +
            `Esperando tu pago de ${paymentStatus.cryptoAmount} ${paymentStatus.cryptocurrency}\n\n` +
            `📍 *Dirección:* \`${paymentStatus.depositAddress}\`\n` +
            `⏰ *Expira en:* ${timeLeft} minutos\n\n` +
            `El pago se confirmará automáticamente cuando se reciba la transacción.`
          : `⏳ *Payment Pending*\n\n` +
            `Waiting for your payment of ${paymentStatus.cryptoAmount} ${paymentStatus.cryptocurrency}\n\n` +
            `📍 *Address:* \`${paymentStatus.depositAddress}\`\n` +
            `⏰ *Expires in:* ${timeLeft} minutes\n\n` +
            `Payment will be confirmed automatically when transaction is received.`;

        buttons = [
          [
            {
              text: lang === "es" ? "🔄 Verificar Nuevamente" : "🔄 Check Again",
              callback_data: `kyrrex_check_${paymentId}`,
            },
            {
              text: lang === "es" ? "📋 Copiar Dirección" : "📋 Copy Address",
              callback_data: `kyrrex_copy_${paymentId}`,
            },
          ],
        ];
      }

      await ctx.editMessageText(statusMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: buttons,
        },
      });

    } catch (statusError) {
      logger.error("[Kyrrex] Payment status check error:", statusError);
      
      await ctx.editMessageText(
        lang === "es"
          ? "❌ Error al verificar el pago. Intenta de nuevo."
          : "❌ Error checking payment. Please try again.",
        {
          reply_markup: {
            inline_keyboard: [
              [{
                text: lang === "es" ? "🔄 Reintentar" : "🔄 Retry",
                callback_data: `kyrrex_check_${paymentId}`,
              }],
            ],
          },
        }
      );
    }

  } catch (error) {
    logger.error("[Kyrrex] Payment check error:", error);
    await ctx.answerCbQuery(
      ctx.session?.language === "es"
        ? "❌ Error al verificar pago"
        : "❌ Error checking payment"
    );
  }
}

/**
 * Handle copy address action
 * @param {Object} ctx - Telegraf context
 */
async function handleKyrrexCopyAddress(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    
    // Extract payment ID from callback data
    const match = ctx.callbackQuery?.data?.match(/^kyrrex_copy_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery("Invalid payment ID");
      return;
    }
    
    const paymentId = match[1];
    
    // Get payment details from Firestore
    const paymentDoc = await db.collection('kyrrex_payments').doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      await ctx.answerCbQuery(
        lang === "es" ? "❌ Pago no encontrado" : "❌ Payment not found"
      );
      return;
    }

    const paymentData = paymentDoc.data();
    
    // Send address as a separate message so user can copy it
    const copyMsg = lang === "es"
      ? `📋 *Copia esta dirección:*\n\n\`${paymentData.depositAddress}\`\n\n` +
        `💰 *Cantidad exacta:* ${paymentData.cryptoAmount} ${paymentData.cryptocurrency}\n` +
        `🌐 *Red:* ${paymentData.network}`
      : `📋 *Copy this address:*\n\n\`${paymentData.depositAddress}\`\n\n` +
        `💰 *Exact amount:* ${paymentData.cryptoAmount} ${paymentData.cryptocurrency}\n` +
        `🌐 *Network:* ${paymentData.network}`;

    await ctx.reply(copyMsg, { parse_mode: "Markdown" });
    
    await ctx.answerCbQuery(
      lang === "es" 
        ? "📋 Dirección copiada abajo" 
        : "📋 Address copied below"
    );

  } catch (error) {
    logger.error("[Kyrrex] Copy address error:", error);
    await ctx.answerCbQuery(
      ctx.session?.language === "es"
        ? "❌ Error al copiar dirección"
        : "❌ Error copying address"
    );
  }
}

/**
 * Show help information about Kyrrex payments
 * @param {Object} ctx - Telegraf context
 */
async function handleKyrrexHelp(ctx) {
  await ctx.answerCbQuery();
  
  const lang = ctx.session?.language || "en";
  
  const helpMsg = lang === "es"
    ? `🪙 *Kyrrex Crypto - Información*\n\n` +
      `*¿Qué es Kyrrex?*\n` +
      `Kyrrex te permite pagar suscripciones con las principales criptomonedas de forma segura y automática.\n\n` +
      `*💰 Criptomonedas Soportadas:*\n` +
      `• ₿ Bitcoin (BTC) - Red principal\n` +
      `• 💎 Ethereum (ETH) - Red ERC-20\n` +
      `• 🏆 Tether (USDT) - TRC20/ERC20/BEP20\n` +
      `• 🔵 USD Coin (USDC) - ERC20/BEP20\n` +
      `• 🟡 Binance Coin (BNB) - BEP20\n` +
      `• 🔴 TRON (TRX) - TRC20\n\n` +
      `*✨ Ventajas:*\n` +
      `✅ No tarjeta de crédito necesaria\n` +
      `✅ Activación automática tras confirmación\n` +
      `✅ Pago 100% seguro en blockchain\n` +
      `✅ Comisiones ultra-bajas (especialmente TRC20)\n` +
      `✅ Soporte para múltiples redes\n` +
      `✅ Direcciones únicas por pago\n\n` +
      `*📱 Proceso de Pago:*\n` +
      `1️⃣ Selecciona tu plan\n` +
      `2️⃣ Elige tu criptomoneda preferida\n` +
      `3️⃣ Envía la cantidad exacta a la dirección generada\n` +
      `4️⃣ ¡Activación automática tras 1 confirmación!\n\n` +
      `*🔒 Seguridad:*\n` +
      `Cada pago genera una dirección única. Los fondos van directamente a nuestras wallets seguras protegidas por tecnología blockchain.\n\n` +
      `*💡 Recomendación:*\n` +
      `Para comisiones mínimas, recomendamos USDT en red TRC20 (TRON).`
    : `🪙 *Kyrrex Crypto - Information*\n\n` +
      `*What is Kyrrex?*\n` +
      `Kyrrex allows you to pay for subscriptions with major cryptocurrencies securely and automatically.\n\n` +
      `*💰 Supported Cryptocurrencies:*\n` +
      `• ₿ Bitcoin (BTC) - Main network\n` +
      `• 💎 Ethereum (ETH) - ERC-20 network\n` +
      `• 🏆 Tether (USDT) - TRC20/ERC20/BEP20\n` +
      `• 🔵 USD Coin (USDC) - ERC20/BEP20\n` +
      `• 🟡 Binance Coin (BNB) - BEP20\n` +
      `• 🔴 TRON (TRX) - TRC20\n\n` +
      `*✨ Benefits:*\n` +
      `✅ No credit card needed\n` +
      `✅ Automatic activation after confirmation\n` +
      `✅ 100% secure blockchain payment\n` +
      `✅ Ultra-low fees (especially TRC20)\n` +
      `✅ Multiple network support\n` +
      `✅ Unique addresses per payment\n\n` +
      `*📱 Payment Process:*\n` +
      `1️⃣ Select your plan\n` +
      `2️⃣ Choose your preferred cryptocurrency\n` +
      `3️⃣ Send exact amount to generated address\n` +
      `4️⃣ Automatic activation after 1 confirmation!\n\n` +
      `*🔒 Security:*\n` +
      `Each payment generates a unique address. Funds go directly to our secure wallets protected by blockchain technology.\n\n` +
      `*💡 Recommendation:*\n` +
      `For minimal fees, we recommend USDT on TRC20 network (TRON).`;

  // Edit message instead of sending new one
  try {
    await ctx.editMessageText(helpMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🪙 Ver Planes" : "🪙 View Plans",
              callback_data: "kyrrex_show_plans",
            },
          ],
          [
            {
              text: lang === "es" ? "🔙 Volver" : "🔙 Back",
              callback_data: "show_subscription_plans",
            },
          ],
        ],
      },
    });
  } catch (editError) {
    // If edit fails, send new message
    await ctx.reply(helpMsg, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "🪙 Ver Planes" : "🪙 View Plans",
              callback_data: "kyrrex_show_plans",
            },
          ],
          [
            {
              text: lang === "es" ? "🔙 Volver" : "🔙 Back",
              callback_data: "show_subscription_plans",
            },
          ],
        ],
      },
    });
  }
}

module.exports = {
  showKyrrexPlans,
  handleKyrrexPlanSelection,
  handleKyrrexCryptoSelection,
  handleKyrrexPaymentCheck,
  handleKyrrexCopyAddress,
  handleKyrrexHelp,
};