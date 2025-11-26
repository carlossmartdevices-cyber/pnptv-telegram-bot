const logger = require("../../utils/logger");
const { db } = require("../../config/firebase");

/**
 * Broadcast messages in both languages
 */
const BROADCAST_MESSAGES = {
  es: {
    main: `🎉 **IMPORTANTE: Se Requiere Activación de Membresía del Canal PRIME**

Estimados Miembros PRIME,

¡Gracias por su lealtad y valiosos comentarios! Sus sugerencias nos ayudan a mejorar continuamente el bot y optimizar su experiencia.

**⚠️ ACCIÓN REQUERIDA - FECHA LÍMITE: 15 DE NOVIEMBRE @ 12:00 PM HORA COLOMBIA**

Si compraste tu membresía PRIME **antes de la implementación del bot**, debes **activarla en nuestro nuevo sistema** para mantener el acceso y desbloquear nuevos beneficios.

**Importante**: Esto NO requiere comprar una nueva membresía. Simplemente activa tu membresía existente para disfrutar de:
✅ Acceso ilimitado a medios
✅ Funciones premium del bot
✅ Soporte prioritario

**El no activar antes de la fecha límite resultará en:**
❌ Remoción del canal PRIME
❌ Revocación de membresía

**No se harán excepciones.**

👇 **Activa Tu Membresía Ahora:**`,
    activateButton: '🔓 Activar Membresía',
    helpButton: '📞 ¿Necesitas Ayuda?',
    warning: `⏰ **ADVERTENCIA FINAL DE FECHA LÍMITE**

🚨 ¡Te quedan **24 HORAS** para activar tu membresía PRIME!

**Fecha Límite**: Mañana @ 12:00 PM Hora Colombia

Si aún no has activado tu cuenta, por favor hazlo inmediatamente para evitar ser removido del canal PRIME y que tu membresía sea revocada.

Después de la fecha límite, procederemos a:
1. Remover todos los miembros no activados del canal PRIME
2. Revocar sus membresías
3. No se otorgarán excepciones ni extensiones

¡Actúa ahora! ⏱️`,
    warningButton: '🔓 Activar Ahora - ¡Última Oportunidad!'
  },
  en: {
    main: `🎉 **IMPORTANT: PRIME Channel Membership Activation Required**

Dear PRIME Members,

Thank you for your loyalty and valuable feedback! Your suggestions help us continuously improve the bot and optimize your experience.

**⚠️ ACTION REQUIRED - DEADLINE: NOVEMBER 15 @ 12:00 PM COLOMBIA TIME**

If you purchased your PRIME membership **before the bot implementation**, you must **activate it in our new system** to maintain access and unlock new benefits.

**Important**: This does NOT require purchasing a new membership. Simply activate your existing membership to enjoy:
✅ Unlimited media access
✅ Premium bot features
✅ Priority support

**Failure to activate before the deadline will result in:**
❌ Removal from PRIME channel
❌ Membership revocation

**No exceptions will be made.**

👇 **Activate Your Membership Now:**`,
    activateButton: '🔓 Activate Membership',
    helpButton: '📞 Need Help?',
    warning: `⏰ **FINAL DEADLINE WARNING**

🚨 You have **24 HOURS** left to activate your PRIME membership!

**Deadline**: Tomorrow @ 12:00 PM Colombia Time

If you haven't activated your account yet, please do so immediately to avoid being removed from the PRIME channel and having your membership revoked.

After the deadline, we will proceed to:
1. Remove all non-activated members from the PRIME channel
2. Revoke their memberships
3. No exceptions or extensions will be granted

Act now! ⏱️`,
    warningButton: '🔓 Activate Now - Last Chance!'
  }
};

/**
 * Show language selection menu for broadcast
 */
async function showBroadcastMenu(ctx) {
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🇪🇸 Español',
          callback_data: 'broadcast_prime_es'
        },
        {
          text: '🇺🇸 English',
          callback_data: 'broadcast_prime_en'
        }
      ],
      [
        {
          text: '🌍 Both Languages / Ambos Idiomas',
          callback_data: 'broadcast_prime_both'
        }
      ]
    ]
  };

  await ctx.reply(
    '📢 **Select Broadcast Language / Seleccionar Idioma de Difusión**\n\nChoose which language to send the PRIME activation broadcast:\nElige en qué idioma enviar la difusión de activación PRIME:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }
  );
}

/**
 * Send PRIME Channel Migration Broadcast
 * Sends the initial notification message with activation button
 */
async function sendPrimeChannelBroadcast(ctx, language = 'es') {
  try {
    const { CHANNEL_ID, WEBAPP_URL } = process.env;

    if (!CHANNEL_ID) {
      throw new Error('CHANNEL_ID not configured');
    }

    const channelId = parseInt(CHANNEL_ID);
    const webAppUrl = `${WEBAPP_URL}/prime-activation`;

    const messages = BROADCAST_MESSAGES[language];
    const broadcastMessage = messages.main;

    // Format keyboard with proper Telegram API structure
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: messages.activateButton,
            web_app: { url: webAppUrl }  // web_app MUST be an object with url property
          }
        ],
        [
          {
            text: messages.helpButton,
            url: 'https://t.me/PNPtvbot?start=prime_help'
          }
        ]
      ]
    };

    // Send to PRIME channel
    await ctx.telegram.sendMessage(channelId, broadcastMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_notification: false
    });

    // Log broadcast
    await db.collection('broadcasts').add({
      type: 'prime-activation',
      channel: 'PRIME',
      channelId: channelId,
      language: language,
      message: broadcastMessage,
      sentAt: new Date(),
      status: 'sent',
      deadline: new Date('2025-11-15T12:00:00-05:00'), // Colombia time
      recipientCount: null // Will be populated when delivery confirmed
    });

    logger.info('PRIME channel broadcast sent successfully', {
      channelId,
      language,
      timestamp: new Date()
    });

    // Send confirmation to admin
    if (ctx) {
      const confirmMsg = language === 'es'
        ? '✅ ¡Broadcast del canal PRIME enviado exitosamente!\n\n📊 El mensaje de activación ha sido publicado en el canal PRIME.'
        : '✅ PRIME channel broadcast sent successfully!\n\n📊 The activation message has been posted to the PRIME channel.';
      await ctx.reply(confirmMsg);
    }

    return {
      success: true,
      channelId: channelId,
      language: language,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('Error sending PRIME channel broadcast:', error);
    if (ctx) {
      await ctx.reply('❌ Error sending broadcast. Error: ' + error.message);
    }
    throw error;
  }
}

/**
 * Send final deadline warning (optional - 24 hours before)
 */
async function sendDeadlineWarning(telegramApi, language = 'es') {
  try {
    const { CHANNEL_ID, WEBAPP_URL } = process.env;

    if (!CHANNEL_ID) {
      throw new Error('CHANNEL_ID not configured');
    }

    const channelId = parseInt(CHANNEL_ID);
    const webAppUrl = `${WEBAPP_URL}/prime-activation`;

    const messages = BROADCAST_MESSAGES[language];
    const warningMessage = messages.warning;

    // Format keyboard with proper Telegram API structure
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: messages.warningButton,
            web_app: { url: webAppUrl }  // web_app MUST be an object with url property
          }
        ]
      ]
    };

    await telegramApi.sendMessage(channelId, warningMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_notification: false
    });

    logger.info('PRIME deadline warning sent', {
      channelId,
      language,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error sending deadline warning:', error);
  }
}

/**
 * Post-deadline actions - remove non-activated members
 */
async function enforceMigrationDeadline(telegramApi) {
  try {
    const { CHANNEL_ID } = process.env;

    if (!CHANNEL_ID) {
      throw new Error('CHANNEL_ID not configured');
    }

    const channelId = parseInt(CHANNEL_ID);

    // Get all users NOT activated
    const nonActivatedSnapshot = await db.collection('users')
      .where('primeActivationMigration', '!=', true)
      .get();

    const usersToRemove = nonActivatedSnapshot.docs.map(doc => doc.id);

    if (usersToRemove.length === 0) {
      logger.info('No non-activated users to remove');
      return {
        success: true,
        removedCount: 0
      };
    }

    // Remove each user from PRIME channel
    let removedCount = 0;
    for (const userId of usersToRemove) {
      try {
        await telegramApi.restrictChatMember(channelId, userId, {
          permissions: {
            can_send_messages: false,
            can_send_media_messages: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
            can_change_info: false,
            can_invite_users: false,
            can_pin_messages: false
          }
        });

        // Send farewell message
        try {
          await telegramApi.sendMessage(userId, `
❌ **Membresía PRIME Revocada**

Tu membresía ha sido revocada porque no la activaste antes de la fecha límite del 15 de noviembre.

Si crees que esto es un error, por favor contacta a soporte usando el comando /support.
`, { parse_mode: 'Markdown' });
        } catch (msgError) {
          logger.warn('Could not send farewell message to user', { userId });
        }

        removedCount++;
      } catch (removeError) {
        logger.warn('Failed to remove user from PRIME channel', {
          userId,
          error: removeError.message
        });
      }
    }

    logger.info('PRIME channel deadline enforcement completed', {
      totalNonActivated: usersToRemove.length,
      successfullyRemoved: removedCount,
      timestamp: new Date()
    });

    return {
      success: true,
      removedCount: removedCount,
      totalChecked: usersToRemove.length
    };
  } catch (error) {
    logger.error('Error enforcing migration deadline:', error);
    throw error;
  }
}

module.exports = {
  showBroadcastMenu,
  sendPrimeChannelBroadcast,
  sendDeadlineWarning,
  enforceMigrationDeadline
};
