const { db } = require("../../config/firebase");
const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");
const daimoPayService = require("../../services/daimoPayService");
const planService = require("../../services/planService");
const { escapeMdV2 } = require("../../utils/telegramEscapes");

/**
 * Daimo Pay Subscription Handler (Updated API - Nov 2025)
 * Handles USDC stablecoin payments via Daimo Pay
 */

/**
 * Show available subscription plans for Daimo payment
 * @param {Object} ctx - Telegraf context
 */
async function showDaimoPlans(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id;

    logger.info(`[DaimoPay] User ${userId} requested plans`);

    // Check if Daimo is configured
    const daimoConfig = daimoPayService.getConfig();
    if (!daimoConfig.enabled) {
      const errorMsg = lang === "es"
        ? "❌ Daimo Pay no está configurado. Por favor contacta al administrador."
        : "❌ Daimo Pay is not configured. Please contact the administrator.";
      
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

    // Build plans message
    const header = lang === "es"
      ? "💎 *Planes de Suscripción - Daimo Pay*\n\n" +
        "Hazte miembro de *PNPtv PRIME* y disfruta del mejor contenido amateur — Hombres latinos fumando y slamming en Telegram.\n\n" +
        "🔥 *Lo que obtendrás:*\n\n" +
        "🎬 Docenas de videos completos para adultos con Santino y sus chicos\n" +
        "👥 Acceso a nuestro grupo exclusivo de miembros en Telegram\n" +
        "📍 Conecta con otros miembros en tu área usando nuestra herramienta de geolocalización\n\n" +
        "� *Paga con USDC (stablecoin) desde:*\n" +
        "✅ Coinbase, Binance, exchanges\n" +
        "✅ Venmo, Cash App, Zelle, PayPal\n" +
        "✅ Revolut, Wise\n" +
        "✅ Cualquier wallet cripto\n\n" +
        "🔒 Pago seguro en blockchain\n" +
        "⚡ Activación automática instantánea\n" +
        "🌐 Comisiones ultra-bajas (Base Network)"
      : "💎 *Subscription Plans - Daimo Pay*\n\n" +
        "Become a member of *PNPtv PRIME* and enjoy the best amateur content — Latino men smoking and slamming on Telegram.\n\n" +
        "🔥 *What you'll get:*\n\n" +
        "🎬 Dozens of full-length adult videos featuring Santino and his boys\n" +
        "👥 Access to our exclusive Telegram members group\n" +
        "📍 Connect with other members in your area using our geolocation tool\n\n" +
        "💰 *Pay with USDC (stablecoin) from:*\n" +
        "✅ Coinbase, Binance, exchanges\n" +
        "✅ Venmo, Cash App, Zelle, PayPal\n" +
        "✅ Revolut, Wise\n" +
        "✅ Any crypto wallet\n\n" +
        "🔒 Secure blockchain payment\n" +
        "⚡ Instant automatic activation\n" +
        "🌐 Ultra-low fees (Base Network)";

    const plansText = header;
    const planButtons = [];

    // Format each plan as buttons only (no text list)
    plans.forEach((plan) => {
      const price = plan.price || plan.priceInUSD || 0;
      
      // Add button for this plan (escape dynamic values to be safe)
      planButtons.push([{
        text: `💎 ${escapeMdV2(plan.name)} - $${escapeMdV2(price.toFixed(2))} USDC`,
        callback_data: `daimo_plan_${plan.id}`,
      }]);
    });

    // Add help and back buttons
    planButtons.push([
      {
        text: lang === "es" ? "❓ ¿Cómo funciona?" : "❓ How does it work?",
        callback_data: "daimo_help",
      },
      {
        text: lang === "es" ? "🔙 Volver" : "🔙 Back",
        callback_data: "show_subscription_plans",
      },
    ]);

    // Send GIF/Animation first (optional - you can set a GIF URL here)
    const gifUrl = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXN5bWJ5cDN5dGN5ZGJ5cDN5ZGJ5cDN5ZGJ5cDN5ZGJ5cDN5ZGJ5cDN5ZGJ5cA/giphy.gif"; // Replace with your GIF URL
    
    // Uncomment the next 3 lines to send a GIF before the plans
    // await ctx.replyWithAnimation(gifUrl, {
    //   caption: lang === "es" ? "💎 ¡Bienvenido a PNPtv PRIME!" : "💎 Welcome to PNPtv PRIME!"
    // });

    // Answer callback query first if it's a callback
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
    }

    // Edit message if callback, reply if direct command
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      try {
        await ctx.editMessageText(plansText, {
          parse_mode: "MarkdownV2",
          reply_markup: {
            inline_keyboard: planButtons,
          },
        });
      } catch (editError) {
        // If edit fails, send new message
        await ctx.reply(plansText, {
          parse_mode: "MarkdownV2",
          reply_markup: {
            inline_keyboard: planButtons,
          },
        });
      }
    } else {
      await ctx.reply(plansText, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: planButtons,
        },
      });
    }
  } catch (error) {
    logger.error("[DaimoPay] Error showing plans:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al cargar planes. Intenta de nuevo."
        : "❌ Error loading plans. Please try again."
    );
  }
}

/**
 * Handle plan selection and create payment
 * @param {Object} ctx - Telegraf context
 */
async function handleDaimoPlanSelection(ctx) {
  try {
    const lang = ctx.session?.language || "en";
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || ctx.from.username || "User";
    
    // Extract plan ID from callback data
    const match = ctx.callbackQuery?.data?.match(/^daimo_plan_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery("Invalid plan selection");
      return;
    }
    
    const planId = match[1];
    
    logger.info(`[DaimoPay] User ${userId} selected plan ${planId}`);

    // Answer callback query
    logger.info(`[DaimoPay] Step 1: Answering callback query`);
    await ctx.answerCbQuery();

    // Check if Daimo is configured
    logger.info(`[DaimoPay] Step 2: Checking Daimo config`);
    const daimoConfig = daimoPayService.getConfig();
    logger.info(`[DaimoPay] Config enabled: ${daimoConfig.enabled}`);
    if (!daimoConfig.enabled) {
      await ctx.reply(
        lang === "es"
          ? "❌ Daimo Pay no está configurado."
          : "❌ Daimo Pay is not configured."
      );
      return;
    }

    // Get plan details
    logger.info(`[DaimoPay] Step 3: Getting plan details for ${planId}`);
    const plan = await planService.getPlanById(planId);
    logger.info(`[DaimoPay] Plan retrieved:`, { plan: plan ? plan.name : 'NULL' });
    if (!plan) {
      await ctx.reply(
        lang === "es"
          ? "❌ Plan no encontrado."
          : "❌ Plan not found."
      );
      return;
    }

    const price = plan.price || plan.priceInUSD;
    logger.info(`[DaimoPay] Step 4: Validating price: ${price}`);
    if (!price || price < 1) {
      await ctx.reply(
        lang === "es"
          ? "❌ Precio inválido para este plan."
          : "❌ Invalid price for this plan."
      );
      return;
    }

    // Show processing message
    logger.info(`[DaimoPay] Step 5: Showing processing message`);
    const processingMsg = lang === "es"
      ? "⏳ Generando tu enlace de pago seguro...\n\nEsto puede tardar unos segundos."
      : "⏳ Generating your secure payment link...\n\nThis may take a few seconds.";
    
    const processingMessage = await ctx.reply(processingMsg);
    logger.info(`[DaimoPay] Processing message sent, ID: ${processingMessage.message_id}`);

    try {
      // Create payment via Daimo API
      logger.info(`[DaimoPay] Step 6: Calling createPayment with amount ${price}`);
      const paymentResult = await daimoPayService.createPayment({
        planName: plan.name,
        amount: price,
        userId: userId.toString(),
        planId: planId,
        userName: userName,
        chainId: daimoPayService.SUPPORTED_CHAINS.BASE, // Default to Base for lowest fees
      });

      logger.info(`[DaimoPay] Step 7: Payment created successfully`, {
        paymentId: paymentResult?.id,
        url: paymentResult?.url ? 'URL_EXISTS' : 'NO_URL'
      });

      // Delete processing message
      await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(() => {});


      // Success message with payment details
      const successMsg = lang === "es"
        ? `🎉 *¡Enlace de Pago Generado!*\n\n` +
          `📦 *Plan:* ${escapeMdV2(plan.name)}\n` +
          `💰 *Precio:* $${escapeMdV2(price.toFixed(2))} USDC\n` +
          `⏱️ *Duración:* ${escapeMdV2(String(plan.durationDays || 30))} días\n` +
          `🌐 *Red:* Base Network (comisiones ultra-bajas)\n\n` +
          `💳 *MÉTODOS DE PAGO DISPONIBLES:*\n` +
          `✅ Coinbase \\(recomendado\\)\n` +
          `✅ Cash App\n` +
          `✅ Venmo\n` +
          `✅ Binance, Kraken, otros exchanges\n` +
          `✅ MetaMask, Rainbow, wallets cripto\n\n` +
          `📌 *¿No tienes USDC?*\n` +
          `No te preocupes\\! Puedes:\n` +
          `• Comprar USDC en Coinbase/Cash App/Venmo\n` +
          `• Usar tarjeta débito/crédito\n` +
          `• Transferir desde tu banco\n\n` +
          `*📱 Pasos para Pagar:*\n` +
          `1️⃣ Haz clic en "💳 Pagar Ahora"\n` +
          `2️⃣ Elige tu app favorita \\(Coinbase, Cash App, Venmo\\)\n` +
          `3️⃣ Sigue las instrucciones en pantalla\n` +
          `4️⃣ ¡Tu membresía se activa al instante!\n\n` +
          `⏰ *Válido por:* 24 horas\n` +
          `🔒 *100% Seguro:* Protegido por blockchain\n` +
          `⚡ *Activación:* Instantánea y automática`
        : `🎉 *Payment Link Generated!*\n\n` +
          `📦 *Plan:* ${escapeMdV2(plan.name)}\n` +
          `💰 *Price:* $${escapeMdV2(price.toFixed(2))} USDC\n` +
          `⏱️ *Duration:* ${escapeMdV2(String(plan.durationDays || 30))} days\n` +
          `🌐 *Network:* Base (ultra-low fees)\n\n` +
          `💳 *PAYMENT METHODS AVAILABLE:*\n` +
          `✅ Coinbase \\(recommended\\)\n` +
          `✅ Cash App\n` +
          `✅ Venmo\n` +
          `✅ Binance, Kraken, other exchanges\n` +
          `✅ MetaMask, Rainbow, crypto wallets\n\n` +
          `📌 *Don't have USDC?*\n` +
          `No problem\\! You can:\n` +
          `• Buy USDC on Coinbase/Cash App/Venmo\n` +
          `• Use debit/credit card\n` +
          `• Transfer from your bank\n\n` +
          `*📱 How to Pay:*\n` +
          `1️⃣ Click "💳 Pay Now"\n` +
          `2️⃣ Choose your favorite app \\(Coinbase, Cash App, Venmo\\)\n` +
          `3️⃣ Follow the on\\-screen instructions\n` +
          `4️⃣ Your membership activates instantly!\n\n` +
          `⏰ *Valid for:* 24 hours\n` +
          `🔒 *100% Secure:* Blockchain protected\n` +
          `⚡ *Activation:* Instant and automatic`;

      await ctx.reply(successMsg, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "💳 Pagar Ahora" : "💳 Pay Now",
                url: paymentResult.checkoutUrl,
              },
            ],
            [
              {
                text: lang === "es" ? "🔙 Volver a Planes" : "🔙 Back to Plans",
                callback_data: "daimo_show_plans",
              },
            ],
          ],
        },
      });

      logger.info("[DaimoPay] Payment link sent to user", {
        userId,
        planId,
        paymentId: paymentResult.paymentId,
      });

    } catch (paymentError) {
      logger.error("[DaimoPay] Payment creation error:", {
        error: paymentError.message,
        stack: paymentError.stack,
        userId,
        planId,
        price
      });

      // Delete processing message
      await ctx.telegram.deleteMessage(ctx.chat.id, processingMessage.message_id).catch(() => {});

      const errorMsg = lang === "es"
        ? `❌ *Error al crear el pago*\n\n` +
          `No pudimos generar tu enlace de pago.\n\n` +
          `Por favor contacta al administrador o intenta con otro método de pago.`
        : `❌ *Payment Creation Error*\n\n` +
          `We couldn't generate your payment link.\n\n` +
          `Please contact the administrator or try another payment method.`;

      await ctx.reply(errorMsg, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "es" ? "🔄 Reintentar" : "🔄 Retry",
                callback_data: `daimo_plan_${planId}`,
              },
            ],
            [
              {
                text: lang === "es" ? "🔙 Volver" : "🔙 Back",
                callback_data: "daimo_show_plans",
              },
            ],
          ],
        },
      });
    }
  } catch (error) {
    logger.error("[DaimoPay] Plan selection error:", error);
    await ctx.reply(
      ctx.session?.language === "es"
        ? "❌ Error al procesar tu selección. Intenta de nuevo."
        : "❌ Error processing your selection. Please try again."
    );
  }
}

/**
 * Show help information about Daimo Pay
 * @param {Object} ctx - Telegraf context
 */
async function handleDaimoHelp(ctx) {
  await ctx.answerCbQuery();
  
  const lang = ctx.session?.language || "en";
  
  const helpMsg = lang === "es"
    ? `💎 *Daimo Pay \\- Información*\n\n` +
      `*¿Qué es Daimo Pay?*\n` +
      `Daimo Pay te permite pagar con USDC \\(stablecoin dólar\\) desde múltiples apps y plataformas\\.\n\n` +
      `*📱 Métodos de Pago:*\n` +
      `• 💳 *Apps populares:* Coinbase, Cash App, Venmo\n` +
      `• 🏦 *Exchanges:* Binance, Kraken, otros\n` +
      `• 🔐 *Wallets:* MetaMask, Rainbow, Trust Wallet\n\n` +
      `*¿No tienes USDC?*\n` +
      `No te preocupes\\! Puedes comprar USDC en:\n` +
      `• Coinbase, Cash App, Venmo\n` +
      `• Usando tarjeta débito/crédito\n` +
      `• Transferencia bancaria\n\n` +
      `*✨ Ventajas:*\n` +
      `✅ Activación automática instantánea\n` +
      `✅ Pago seguro en blockchain\n` +
      `✅ Comisiones ultra\\-bajas \\(Base Network\\)\n` +
      `✅ Reembolso automático si hay problemas\n\n` +
      `*💡 Nota:*\n` +
      `USDC es una stablecoin 1:1 con el dólar\\. $10 USDC = $10 USD\\.`
    : `💎 *Daimo Pay \\- Information*\n\n` +
      `*What is Daimo Pay?*\n` +
      `Daimo Pay allows you to pay with USDC \\(dollar stablecoin\\) from multiple apps and platforms\\.\n\n` +
      `*📱 Payment Methods:*\n` +
      `• 💳 *Popular apps:* Coinbase, Cash App, Venmo\n` +
      `• 🏦 *Exchanges:* Binance, Kraken, others\n` +
      `• 🔐 *Wallets:* MetaMask, Rainbow, Trust Wallet\n\n` +
      `*Don't have USDC?*\n` +
      `No problem\\! You can buy USDC on:\n` +
      `• Coinbase, Cash App, Venmo\n` +
      `• Using debit/credit card\n` +
      `• Bank transfer\n\n` +
      `*✨ Benefits:*\n` +
      `✅ Instant automatic activation\n` +
      `✅ Secure blockchain payment\n` +
      `✅ Ultra\\-low fees \\(Base Network\\)\n` +
      `✅ Automatic refund if issues occur\n\n` +
      `*💡 Note:*\n` +
      `USDC is a 1:1 dollar\\-pegged stablecoin\\. $10 USDC = $10 USD\\.`;

  // Edit message instead of sending new one
  try {
    await ctx.editMessageText(helpMsg, {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "💎 Ver Planes" : "💎 View Plans",
              callback_data: "daimo_show_plans",
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
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "💎 Ver Planes" : "💎 View Plans",
              callback_data: "daimo_show_plans",
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
  showDaimoPlans,
  handleDaimoPlanSelection,
  handleDaimoHelp,
};
