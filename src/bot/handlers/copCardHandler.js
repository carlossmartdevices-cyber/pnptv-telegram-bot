const copCardService = require('../../services/copCardService');
const planService = require('../../services/planService');
const logger = require('../../utils/logger');
const { escapeMdV2 } = require('../../utils/telegramEscapes');

/**
 * COP Card Payment Handler
 * Handles user interactions for Credit/Debit card payments in COP
 */

/**
 * Show available plans with COP pricing
 */
async function showCopCardPlans(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = ctx.session.language || 'en';
    const plans = await planService.listPlans();

    // Filter active plans
    const activePlans = plans.filter(p => p.active !== false);

    if (activePlans.length === 0) {
      const message = lang === 'es'
        ? '❌ No hay planes disponibles en este momento.'
        : '❌ No plans available at this time.';
      await ctx.reply(message);
      return;
    }

    const message = lang === 'es'
      ? '💳 *Pago con Tarjeta de Crédito/Débito (COP)*\n\n' +
        'Selecciona un plan para ver los detalles de pago:\n\n' +
        '💡 *Tip:* Los pagos se procesan en pesos colombianos (COP)'
      : '💳 *Credit/Debit Card Payment (COP)*\n\n' +
        'Select a plan to view payment details:\n\n' +
        '💡 *Tip:* Payments are processed in Colombian Pesos (COP)';

    const keyboard = activePlans.map(plan => {
      const priceText = plan.priceInCOP
        ? `$${plan.priceInCOP.toLocaleString('es-CO')} COP`
        : `$${(plan.price * 4000).toLocaleString('es-CO')} COP`;

      return [{
        text: `${plan.icon || '💎'} ${plan.displayName || plan.name} - ${priceText}`,
        callback_data: `cop_card_plan_${plan.id}`
      }];
    });

    keyboard.push([{
      text: lang === 'es' ? '« Volver a Planes' : '« Back to Plans',
      callback_data: 'show_subscription_plans'
    }]);

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`User ${ctx.from.id} viewing COP card plans`);
  } catch (error) {
    logger.error('Error showing COP card plans:', error);
    await ctx.reply(
      ctx.session.language === 'es'
        ? '❌ Error al cargar los planes. Intenta de nuevo.'
        : '❌ Error loading plans. Please try again.'
    );
  }
}

/**
 * Handle plan selection and show payment instructions
 */
async function handleCopCardPlanSelection(ctx) {
  try {
    await ctx.answerCbQuery();

    const planId = ctx.match[1];
    const lang = ctx.session.language || 'en';

    // Get plan details
    const plan = await planService.getPlanById(planId);

    if (!plan) {
      const message = lang === 'es'
        ? '❌ Plan no encontrado.'
        : '❌ Plan not found.';
      await ctx.reply(message);
      return;
    }

    // Calculate COP price
    const amountCOP = plan.priceInCOP || (plan.price * 4000);

  // Get Wompi/Nequi payment link or fallback. Prefer `paymentLink` (stored in Firestore)
  // but fall back to legacy `wompiPaymentLink` in static configs.
  const wompiLink = plan.paymentLink || plan.wompiPaymentLink || process.env.COP_CARD_PAYMENT_LINK || 'https://pnptv.app/cop-card/instructions';

    // Create payment intent
    const paymentIntent = await copCardService.createPaymentIntent({
      userId: ctx.from.id.toString(),
      planId: plan.id,
      planName: plan.displayName || plan.name,
      amountCOP,
      durationDays: plan.durationDays || plan.duration,
      tier: plan.tier,
      paymentLink: wompiLink
    });

    // Generate payment instructions message
    const merchantName = process.env.COP_CARD_MERCHANT_NAME || 'PNPtv';

    const webhookUrl = process.env.WEBHOOK_URL || 'https://pnptv.app';
    const thankYouUrl = `${webhookUrl}/cop-card/thank-you`;

    const message = lang === 'es'
      ? `💳 *Pago con Tarjeta - ${escapeMdV2(plan.displayName || plan.name)}*\n\n` +
        `💵 *Precio USD:* $${escapeMdV2(String(plan.price))} USD\n` +
        `💰 *Monto a pagar:* $${escapeMdV2(amountCOP.toLocaleString('es-CO'))} COP\n` +
        `⏱️ *Duración:* ${escapeMdV2(String(plan.durationDays || plan.duration))} días\n` +
        `🔖 *Referencia de pago:* \`${escapeMdV2(paymentIntent.reference)}\`\n\n` +
        `📝 *Instrucciones:*\n` +
        `1. Haz clic en "💳 Ir a Pagar" abajo\n` +
        `2. Completa el pago con tu tarjeta de crédito/débito\n` +
        `3. *Serás cobrado en pesos colombianos (COP)*\n` +
        `4. Después del pago, serás redirigido a una página con instrucciones\n` +
        `5. Regresa aquí y presiona "✅ He completado el pago"\n\n` +
        `⚠️ *Importante:* Guarda tu referencia: \`${escapeMdV2(paymentIntent.reference)}\`\n` +
        `Tu membresía se activará después de verificar el pago (máximo 24h)`
      : `💳 *Card Payment - ${escapeMdV2(plan.displayName || plan.name)}*\n\n` +
        `💵 *USD Price:* $${escapeMdV2(String(plan.price))} USD\n` +
        `💰 *Amount to pay:* $${escapeMdV2(amountCOP.toLocaleString('es-CO'))} COP\n` +
        `⏱️ *Duration:* ${escapeMdV2(String(plan.durationDays || plan.duration))} days\n` +
        `🔖 *Payment reference:* \`${escapeMdV2(paymentIntent.reference)}\`\n\n` +
        `📝 *Instructions:*\n` +
        `1. Click "💳 Go to Payment" below\n` +
        `2. Complete payment with your credit/debit card\n` +
        `3. *You will be charged in Colombian pesos (COP)*\n` +
        `4. After payment, you'll be redirected to a page with instructions\n` +
        `5. Return here and press "✅ I've completed payment"\n\n` +
        `⚠️ *Important:* Save your reference: \`${escapeMdV2(paymentIntent.reference)}\`\n` +
        `Your membership will be activated after payment verification (max 24h)`;

    const keyboard = [
      [{
        text: lang === 'es' ? '💳 Ir a Pagar' : '💳 Go to Payment',
        url: paymentIntent.paymentLink
      }],
      [{
        text: lang === 'es' ? '✅ He completado el pago' : '✅ I\'ve completed payment',
        callback_data: `cop_card_confirmed_${paymentIntent.paymentId}`
      }],
      [{
        text: lang === 'es' ? '❓ ¿Cómo funciona?' : '❓ How does it work?',
        callback_data: 'cop_card_help'
      }],
      [{
        text: lang === 'es' ? '« Volver a Planes' : '« Back to Plans',
        callback_data: 'cop_card_show_plans'
      }]
    ];

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`User ${ctx.from.id} selected COP card plan: ${planId}, payment: ${paymentIntent.paymentId}`);
  } catch (error) {
    logger.error('Error handling COP card plan selection:', error);
    await ctx.reply(
      ctx.session.language === 'es'
        ? '❌ Error al procesar el plan. Intenta de nuevo.'
        : '❌ Error processing plan. Please try again.'
    );
  }
}

/**
 * Handle payment confirmation (user clicked "I've paid")
 */
async function handleCopCardPaymentConfirmed(ctx) {
  try {
    await ctx.answerCbQuery();

    const paymentId = ctx.match[1];
    const lang = ctx.session.language || 'en';

    // Get payment details
    const payment = await copCardService.getPaymentById(paymentId);

    if (!payment) {
      const message = lang === 'es'
        ? '❌ Pago no encontrado.'
        : '❌ Payment not found.';
      await ctx.reply(message);
      return;
    }

    // Check if already confirmed
    if (payment.status === 'awaiting_verification' || payment.status === 'verified' || payment.status === 'completed') {
      const message = lang === 'es'
        ? '✅ *Pago ya confirmado*\n\nTu pago está siendo procesado. Te notificaremos cuando tu membresía sea activada.\n\n' +
          `🔖 Referencia: \`${payment.reference}\``
        : '✅ *Payment already confirmed*\n\nYour payment is being processed. We\'ll notify you when your membership is activated.\n\n' +
          `🔖 Reference: \`${payment.reference}\``;

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
      return;
    }

    // Mark as awaiting verification
    await copCardService.markAsAwaitingVerification(paymentId, ctx.from.id);

    // Notify admin
    const bot = ctx.botInfo ? ctx : require('../index');
    await copCardService.notifyAdmin(bot, payment);

    // Confirm to user
    const message = lang === 'es'
      ? '✅ *Pago registrado*\n\n' +
        'Gracias por confirmar tu pago. Estamos verificando la transacción y activaremos tu membresía en breve.\n\n' +
        `💰 Monto: $${escapeMdV2(payment.amount.toLocaleString('es-CO'))} COP\n` +
        `🔖 Referencia: \`${escapeMdV2(payment.reference)}\`\n` +
        `💎 Plan: ${escapeMdV2(payment.planName)}\n\n` +
        '⏳ Tiempo estimado de verificación: 5-15 minutos\n\n' +
        'Te notificaremos cuando tu membresía esté activa.'
      : '✅ *Payment registered*\n\n' +
        'Thank you for confirming your payment. We\'re verifying the transaction and will activate your membership shortly.\n\n' +
        `💰 Amount: $${escapeMdV2(payment.amount.toLocaleString('es-CO'))} COP\n` +
        `🔖 Reference: \`${escapeMdV2(payment.reference)}\`\n` +
        `💎 Plan: ${escapeMdV2(payment.planName)}\n\n` +
        '⏳ Estimated verification time: 5-15 minutes\n\n' +
        'We\'ll notify you when your membership is active.';

    const keyboard = [
      [{
        text: lang === 'es' ? '🔍 Ver Estado del Pago' : '🔍 Check Payment Status',
        callback_data: `cop_card_status_${paymentId}`
      }],
      [{
        text: lang === 'es' ? '« Volver al Inicio' : '« Back to Home',
        callback_data: 'start'
      }]
    ];

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`User ${ctx.from.id} confirmed COP card payment: ${paymentId}`);
  } catch (error) {
    logger.error('Error handling COP card payment confirmation:', error);
    await ctx.reply(
      ctx.session.language === 'es'
        ? '❌ Error al confirmar el pago. Intenta de nuevo o contacta soporte.'
        : '❌ Error confirming payment. Please try again or contact support.'
    );
  }
}

/**
 * Check payment status
 */
async function handleCopCardStatus(ctx) {
  try {
    await ctx.answerCbQuery();

    const paymentId = ctx.match[1];
    const lang = ctx.session.language || 'en';

    const payment = await copCardService.getPaymentById(paymentId);

    if (!payment) {
      const message = lang === 'es'
        ? '❌ Pago no encontrado.'
        : '❌ Payment not found.';
      await ctx.reply(message);
      return;
    }

    // Status messages
    const statusMessages = {
      'pending_payment': {
        es: '⏳ *Pendiente de Pago*\n\nAún no hemos recibido confirmación de tu pago.',
        en: '⏳ *Pending Payment*\n\nWe haven\'t received confirmation of your payment yet.'
      },
      'awaiting_verification': {
        es: '🔍 *En Verificación*\n\nEstamos verificando tu pago. Esto puede tomar unos minutos.',
        en: '🔍 *Under Verification*\n\nWe\'re verifying your payment. This may take a few minutes.'
      },
      'verified': {
        es: '✅ *Pago Verificado*\n\nTu pago ha sido verificado. Activando membresía...',
        en: '✅ *Payment Verified*\n\nYour payment has been verified. Activating membership...'
      },
      'completed': {
        es: '🎉 *¡Completado!*\n\nTu membresía está activa. ¡Disfruta del contenido premium!',
        en: '🎉 *Completed!*\n\nYour membership is active. Enjoy premium content!'
      }
    };

    const statusMsg = statusMessages[payment.status] || statusMessages['pending_payment'];
    const message = (statusMsg[lang] || statusMsg['en']) + '\n\n' +
      `💰 Monto: $${escapeMdV2(payment.amount.toLocaleString('es-CO'))} COP\n` +
      `🔖 Referencia: \`${escapeMdV2(payment.reference)}\`\n` +
      `📅 Creado: ${escapeMdV2(payment.createdAt.toLocaleString(lang === 'es' ? 'es-CO' : 'en-US'))}`;

    const keyboard = [[{
      text: lang === 'es' ? '🔄 Actualizar' : '🔄 Refresh',
      callback_data: `cop_card_status_${paymentId}`
    }]];

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`User ${ctx.from.id} checked COP card payment status: ${paymentId}`);
  } catch (error) {
    logger.error('Error checking COP card payment status:', error);
    await ctx.reply(
      ctx.session.language === 'es'
        ? '❌ Error al verificar el estado. Intenta de nuevo.'
        : '❌ Error checking status. Please try again.'
    );
  }
}

/**
 * Show help/instructions for COP card payments
 */
async function handleCopCardHelp(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = ctx.session.language || 'en';

    const message = lang === 'es'
      ? '❓ *¿Cómo Pagar con Tarjeta COP?*\n\n' +
        '*Paso 1:* Selecciona tu plan\n' +
        'Elige el plan que mejor se adapte a tus necesidades.\n\n' +
        '*Paso 2:* Ve al enlace de pago\n' +
        'Haz clic en "💳 Ir a Pagar" para abrir la pasarela de pago.\n\n' +
        '*Paso 3:* Completa el pago\n' +
        'Ingresa los datos de tu tarjeta de crédito o débito.\n' +
        '⚠️ *IMPORTANTE:* Incluye la referencia de pago en la descripción.\n\n' +
        '*Paso 4:* Confirma el pago\n' +
        'Regresa al bot y presiona "✅ He completado el pago".\n\n' +
        '*Paso 5:* Espera la activación\n' +
        'Verificaremos tu pago y activaremos tu membresía en 5-15 minutos.\n\n' +
        '💡 *Consejos:*\n' +
        '• Guarda la referencia de pago\n' +
        '• Asegúrate de completar el pago\n' +
        '• Contacta soporte si hay problemas\n\n' +
        '🔒 *Seguridad:*\n' +
        'Todos los pagos son procesados de forma segura a través de nuestra pasarela de pago certificada.'
      : '❓ *How to Pay with COP Card?*\n\n' +
        '*Step 1:* Select your plan\n' +
        'Choose the plan that best fits your needs.\n\n' +
        '*Step 2:* Go to payment link\n' +
        'Click "💳 Go to Payment" to open the payment gateway.\n\n' +
        '*Step 3:* Complete payment\n' +
        'Enter your credit or debit card details.\n' +
        '⚠️ *IMPORTANT:* Include the payment reference in the description.\n\n' +
        '*Step 4:* Confirm payment\n' +
        'Return to the bot and press "✅ I\'ve completed payment".\n\n' +
        '*Step 5:* Wait for activation\n' +
        'We\'ll verify your payment and activate your membership in 5-15 minutes.\n\n' +
        '💡 *Tips:*\n' +
        '• Save your payment reference\n' +
        '• Make sure to complete the payment\n' +
        '• Contact support if you have issues\n\n' +
        '🔒 *Security:*\n' +
        'All payments are securely processed through our certified payment gateway.';

    const keyboard = [[{
      text: lang === 'es' ? '« Volver a Planes' : '« Back to Plans',
      callback_data: 'cop_card_show_plans'
    }]];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

    logger.info(`User ${ctx.from.id} viewed COP card help`);
  } catch (error) {
    logger.error('Error showing COP card help:', error);
    await ctx.reply(
      ctx.session.language === 'es'
        ? '❌ Error al cargar la ayuda.'
        : '❌ Error loading help.'
    );
  }
}

module.exports = {
  showCopCardPlans,
  handleCopCardPlanSelection,
  handleCopCardPaymentConfirmed,
  handleCopCardStatus,
  handleCopCardHelp
};
