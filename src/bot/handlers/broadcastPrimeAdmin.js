const { isAdmin } = require("../../config/admin");
const logger = require("../../utils/logger");
const { showBroadcastMenu, sendPrimeChannelBroadcast } = require("./broadcastPrime");
const { t } = require("../../utils/i18n");

/**
 * Admin command to send PRIME channel activation broadcast
 * Usage: /broadcastprime
 */
async function handleBroadcastPrime(ctx) {
  try {
    // Check admin permissions
    if (!isAdmin(ctx.from.id)) {
      return await ctx.reply(t(ctx, 'errors.unauthorized'));
    }

    // Show language selection menu
    await showBroadcastMenu(ctx);

    logger.info('Admin initiated PRIME broadcast setup', {
      adminId: ctx.from.id,
      username: ctx.from.username
    });
  } catch (error) {
    logger.error('Error in handleBroadcastPrime:', error);
    await ctx.reply('❌ Error: ' + error.message);
  }
}

/**
 * Handle broadcast language selection and confirmation callback
 */
async function handleBroadcastConfirmation(ctx) {
  try {
    const actionType = ctx.callbackQuery.data;

    // Handle language selection
    if (actionType.startsWith('broadcast_prime_')) {
      const language = actionType.replace('broadcast_prime_', '');

      if (language === 'both') {
        // Send both languages
        await ctx.editMessageText('⏳ Sending broadcasts in both languages...', {
          parse_mode: 'Markdown'
        });

        // Send Spanish
        const resultEs = await sendPrimeChannelBroadcast(ctx, 'es');

        // Wait a moment between messages
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Send English
        const resultEn = await sendPrimeChannelBroadcast(ctx, 'en');

        await ctx.editMessageText(
          `✅ **Broadcasts Sent Successfully! / ¡Broadcasts Enviados Exitosamente!**

📊 **Delivery Report / Reporte de Entrega:**
• Channel / Canal: PRIME
• Time / Hora: ${resultEn.timestamp.toLocaleString('es-CO')}
• Status / Estado: Sent / Enviado
• Languages / Idiomas: Spanish & English / Español e Inglés
• Deadline / Fecha Límite: November 15, 2025 @ 12:00 PM Colombia Time

PRIME channel members will now see the activation messages in both languages.
Los miembros del canal PRIME ahora verán los mensajes de activación en ambos idiomas.`,
          {
            parse_mode: 'Markdown'
          }
        );

        logger.info('PRIME broadcast sent in both languages', {
          adminId: ctx.from.id,
          resultEs,
          resultEn
        });
      } else {
        // Send confirmation for selected language
        const langName = language === 'es' ? 'Español 🇪🇸' : 'English 🇺🇸';
        const confirmKeyboard = {
          inline_keyboard: [
            [
              {
                text: '✅ Confirm / Confirmar',
                callback_data: `confirm_broadcast_${language}`
              },
              {
                text: '❌ Cancel / Cancelar',
                callback_data: 'cancel_prime_broadcast'
              }
            ]
          ]
        };

        await ctx.editMessageText(
          `🎉 **PRIME Channel Activation Broadcast / Broadcast de Activación Canal PRIME**

**Selected Language / Idioma Seleccionado:** ${langName}

This will send the migration notification to ALL members of the PRIME channel.
Esto enviará la notificación de migración a TODOS los miembros del canal PRIME.

**Broadcast Details / Detalles del Broadcast:**
• Channel / Canal: PRIME (#${process.env.CHANNEL_ID})
• Deadline / Fecha Límite: Nov 15 @ 12:00 PM Colombia Time
• Content / Contenido: Membership activation instructions / Instrucciones de activación de membresía

**Are you sure you want to proceed? / ¿Estás seguro de que deseas proceder?**`,
          {
            parse_mode: 'Markdown',
            reply_markup: confirmKeyboard
          }
        );

        logger.info('Admin selected broadcast language', {
          adminId: ctx.from.id,
          language
        });
      }
    }
    // Handle confirmation
    else if (actionType.startsWith('confirm_broadcast_')) {
      const language = actionType.replace('confirm_broadcast_', '');

      // Show loading state
      const loadingMsg = language === 'es'
        ? '⏳ Enviando broadcast...'
        : '⏳ Sending broadcast...';

      await ctx.editMessageText(loadingMsg, {
        parse_mode: 'Markdown'
      });

      // Send broadcast
      const result = await sendPrimeChannelBroadcast(ctx, language);

      // Update admin with success
      const successMsg = language === 'es'
        ? `✅ **¡Broadcast Enviado Exitosamente!**

📊 **Reporte de Entrega:**
• Canal: PRIME
• Hora: ${result.timestamp.toLocaleString('es-CO')}
• Estado: Enviado
• Idioma: Español 🇪🇸
• Miembros: Recibirán notificación de activación
• Fecha Límite: 15 de Noviembre, 2025 @ 12:00 PM Hora Colombia

Los miembros del canal PRIME ahora verán el mensaje de activación con un enlace a la interfaz web.`
        : `✅ **Broadcast Sent Successfully!**

📊 **Delivery Report:**
• Channel: PRIME
• Time: ${result.timestamp.toLocaleString('en-US')}
• Status: Sent
• Language: English 🇺🇸
• Members: Will receive activation notification
• Deadline: November 15, 2025 @ 12:00 PM Colombia Time

PRIME channel members will now see the activation message with a link to the web interface.`;

      await ctx.editMessageText(successMsg, {
        parse_mode: 'Markdown'
      });

      logger.info('PRIME broadcast successfully sent', {
        adminId: ctx.from.id,
        language,
        result
      });
    }
    // Handle cancellation
    else if (actionType === 'cancel_prime_broadcast') {
      await ctx.editMessageText(
        '❌ **Broadcast Cancelled / Broadcast Cancelado**\n\nNo messages were sent. / No se enviaron mensajes.',
        { parse_mode: 'Markdown' }
      );

      logger.info('Admin cancelled PRIME broadcast', {
        adminId: ctx.from.id
      });
    }

    // Answer callback query
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error('Error in handleBroadcastConfirmation:', error);
    await ctx.answerCbQuery('❌ Error: ' + error.message, { show_alert: true });
  }
}

module.exports = {
  handleBroadcastPrime,
  handleBroadcastConfirmation
};
