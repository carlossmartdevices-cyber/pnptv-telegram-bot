const logger = require("../../utils/logger");
const { db } = require("../../config/firebase");
const { activateMembership } = require("../../utils/membershipManager");

/**
 * Handle automatic membership update request
 * This is for the broadcast asking existing premium users to update their memberships
 */
async function handleMembershipUpdateRequest(ctx) {
  try {
    await ctx.answerCbQuery();

    const userId = ctx.from.id.toString();
    const lang = ctx.session?.language || 'en';

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      await ctx.reply(
        lang === 'es'
          ? '❌ No se encontró tu cuenta. Por favor contacta al soporte.'
          : '❌ Account not found. Please contact support.'
      );
      return;
    }

    const userData = userDoc.data();
    const currentTier = userData.tier || 'Free';

    // Check if user has/had premium tier
    if (currentTier === 'Free') {
      await ctx.editMessageText(
        lang === 'es'
          ? '❌ Esta actualización es solo para miembros Premium/Basic existentes.\n\n' +
            'Si deseas obtener una membresía premium, usa el comando /subscribe.'
          : '❌ This update is only for existing Premium/Basic members.\n\n' +
            'If you want to get a premium membership, use the /subscribe command.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Show processing message
    await ctx.editMessageText(
      lang === 'es'
        ? '⏳ Procesando tu actualización de membresía...\n\nPor favor espera un momento.'
        : '⏳ Processing your membership update...\n\nPlease wait a moment.',
      { parse_mode: 'Markdown' }
    );

    // Determine duration based on tier
    let durationDays = 30; // Default

    // Map tier to typical duration
    if (currentTier === 'Premium') {
      durationDays = 120; // 4 months for Crystal-level
    } else if (currentTier === 'Basic') {
      durationDays = 30; // 1 month
    }

    // Check if they had a specific plan
    const planId = userData.planId;
    if (planId) {
      // Try to get duration from plans
      const plansRef = await db.collection('plans').get();
      plansRef.forEach(doc => {
        const plan = doc.data();
        if (plan.id === planId && plan.durationDays) {
          durationDays = plan.durationDays;
        }
      });
    }

    // Activate membership automatically
    const result = await activateMembership(
      userId,
      currentTier,
      "membership_update_broadcast",
      durationDays,
      ctx.telegram,
      {
        planId: planId || 'membership-update',
        skipPayment: true
      }
    );

    if (result.success) {
      // Send success message
      const successMessage = lang === 'es'
        ? `✅ *¡Membresía Actualizada Exitosamente!*\n\n` +
          `🎉 Tu membresía **${currentTier}** ha sido activada.\n\n` +
          `📅 *Duración:* ${durationDays} días\n` +
          `⏰ *Vence:* ${result.expirationDate ? new Date(result.expirationDate).toLocaleDateString('es-ES') : 'N/A'}\n\n` +
          `✨ *Beneficios Activados:*\n` +
          `• ✅ Acceso completo a medios\n` +
          `• ✅ Contenido premium desbloqueado\n` +
          `• ✅ Características exclusivas\n` +
          `• ✅ Búsquedas ilimitadas\n\n` +
          `${result.inviteLink ? `🔗 *Enlace al Canal Premium:*\n${result.inviteLink}\n\n` : ''}` +
          `¡Gracias por ser parte de PNPtv! 🔥`
        : `✅ *Membership Updated Successfully!*\n\n` +
          `🎉 Your **${currentTier}** membership has been activated.\n\n` +
          `📅 *Duration:* ${durationDays} days\n` +
          `⏰ *Expires:* ${result.expirationDate ? new Date(result.expirationDate).toLocaleDateString('en-US') : 'N/A'}\n\n` +
          `✨ *Benefits Activated:*\n` +
          `• ✅ Full media access\n` +
          `• ✅ Premium content unlocked\n` +
          `• ✅ Exclusive features\n` +
          `• ✅ Unlimited searches\n\n` +
          `${result.inviteLink ? `🔗 *Premium Channel Invite:*\n${result.inviteLink}\n\n` : ''}` +
          `Thank you for being part of PNPtv! 🔥`;

      await ctx.editMessageText(successMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: lang === 'es' ? '🏠 Menú Principal' : '🏠 Main Menu',
              callback_data: 'back_to_main'
            }
          ]]
        }
      });

      logger.info(`Membership auto-updated for user ${userId}: ${currentTier} for ${durationDays} days`);

    } else {
      // Send error message
      await ctx.editMessageText(
        lang === 'es'
          ? `❌ *Error al Actualizar Membresía*\n\n` +
            `No pudimos completar la actualización. Por favor contacta al soporte.\n\n` +
            `Error: ${result.error || 'Desconocido'}`
          : `❌ *Membership Update Failed*\n\n` +
            `We couldn't complete the update. Please contact support.\n\n` +
            `Error: ${result.error || 'Unknown'}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              {
                text: lang === 'es' ? '💬 Contactar Soporte' : '💬 Contact Support',
                url: 'https://t.me/Pnptvadmin'
              }
            ]]
          }
        }
      );

      logger.error(`Failed to auto-update membership for user ${userId}:`, result.error);
    }

  } catch (error) {
    logger.error('Error in handleMembershipUpdateRequest:', error);

    const lang = ctx.session?.language || 'en';
    await ctx.reply(
      lang === 'es'
        ? '❌ Ocurrió un error al procesar tu actualización. Por favor contacta al soporte.'
        : '❌ An error occurred while processing your update. Please contact support.'
    );
  }
}

module.exports = {
  handleMembershipUpdateRequest
};
