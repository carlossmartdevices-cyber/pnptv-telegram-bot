const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");

/**
 * Group Menu Handler
 * Provides an easy-to-use inline menu for group members
 * to access common features: Library, Open Room, Rules, Help
 */

/**
 * Show main group menu
 * @param {Object} ctx - Telegraf context
 */
async function showGroupMenu(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    const userId = ctx.from.id;

    logger.info(`[GroupMenu] User ${userId} opened group menu`);

    // Menu header text
    const menuText = lang === 'es'
      ? `🎯 *Menú de la Comunidad PNPtv*\n\n` +
        `Selecciona una opción para acceder rápidamente a las funciones del grupo:`
      : `🎯 *PNPtv Community Menu*\n\n` +
        `Select an option to quickly access group features:`;

    // Build inline keyboard
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '📚 Biblioteca Musical' : '📚 Music Library',
            callback_data: 'group_menu_library'
          }
        ],
        [
          {
            text: lang === 'es' ? '📅 Abrir Sala' : '📅 Open Room',
            callback_data: 'group_menu_openroom'
          }
        ],
        [
          {
            text: lang === 'es' ? '💎 Suscribirse' : '💎 Subscribe',
            callback_data: 'group_menu_subscribe'
          }
        ],
        [
          {
            text: lang === 'es' ? '� Reglas de la Comunidad' : '📋 Community Rules',
            callback_data: 'group_menu_rules'
          }
        ],
        [
          {
            text: lang === 'es' ? '❓ Ayuda y Comandos' : '❓ Help & Commands',
            callback_data: 'group_menu_help'
          }
        ],
        [
          {
            text: lang === 'es' ? '� Cerrar Menú' : '🔙 Close Menu',
            callback_data: 'group_menu_close'
          }
        ]
      ]
    };

    // Send menu
    await ctx.reply(menuText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info(`[GroupMenu] Menu sent to user ${userId}`);

  } catch (error) {
    logger.error('[GroupMenu] Error showing group menu:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.reply(
      lang === 'es'
        ? '❌ Error al mostrar el menú. Por favor intenta de nuevo.'
        : '❌ Error showing menu. Please try again.'
    );
  }
}

/**
 * Handle library menu callback
 * Redirects to existing library handler
 */
async function handleLibraryCallback(ctx) {
  try {
    await ctx.answerCbQuery();

    const { handleLibrary } = require('./community');

    // Call existing library handler
    await handleLibrary(ctx);

  } catch (error) {
    logger.error('[GroupMenu] Error in library callback:', error);
    await ctx.answerCbQuery('Error loading library');
  }
}

/**
 * Handle open room callback
 * Immediately creates a Zoom room for premium users
 */
async function handleOpenRoomCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    const userId = ctx.from.id;

    // Show loading message
    await ctx.answerCbQuery(
      lang === 'es' ? '⏳ Creando sala...' : '⏳ Creating room...'
    );

    // Get user tier to determine if premium
    const { db } = require('../../config/firebase');
    const userDoc = await db.collection('users').doc(userId.toString()).get();
    const userData = userDoc.data();
    const tier = userData?.tier || 'Free';
    const isPremium = tier === 'Premium';

    if (!isPremium) {
      // Show upgrade message for non-premium users
      const upgradeText = lang === 'es'
        ? `💎 *Función Premium*\n\n` +
          `Las videollamadas están disponibles solo para miembros Premium (Crystal/Diamond).\n\n` +
          `💎 Los miembros Premium pueden:\n` +
          `• Crear salas de video instantáneas\n` +
          `• Transmitir en vivo\n` +
          `• Acceso VIP\n\n` +
          `¿Quieres actualizar? Usa /subscribe`
        : `💎 *Premium Feature*\n\n` +
          `Video calls are available for Premium members only (Crystal/Diamond).\n\n` +
          `💎 Premium members can:\n` +
          `• Create instant video rooms\n` +
          `• Live stream\n` +
          `• VIP access\n\n` +
          `Want to upgrade? Use /subscribe`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
              callback_data: 'group_menu_back'
            }
          ]
        ]
      };

      await ctx.editMessageText(upgradeText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    // Premium user - create instant Zoom meeting
    const zoomService = require('../../services/zoomService');

    // Create meeting starting in 5 minutes, lasting 60 minutes by default
    const startTime = new Date(Date.now() + 5 * 60 * 1000);
    const userName = ctx.from.first_name || ctx.from.username || 'PNPtv Member';

    const meetingData = {
      title: lang === 'es'
        ? `Sala de ${userName}`
        : `${userName}'s Room`,
      startTime: startTime.toISOString(),
      duration: 60, // 60 minutes
      description: lang === 'es'
        ? `Sala de video creada por ${userName} desde PNPtv`
        : `Video room created by ${userName} from PNPtv`
    };

    const result = await zoomService.createMeeting(meetingData);

    if (result.success) {
      // Success - send meeting details
      const successText = lang === 'es'
        ? `✅ *¡Sala Creada!*\n\n` +
          `🎥 Tu sala de video está lista.\n\n` +
          `🔗 *Enlace:*\n${result.joinUrl}\n\n` +
          `⏰ *Comienza:* ${startTime.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}\n` +
          `⌛ *Duración:* ${result.duration} minutos\n` +
          `${result.password ? `🔐 *Contraseña:* ${result.password}\n\n` : '\n'}` +
          `📢 Comparte este enlace con el grupo para que otros se unan.`
        : `✅ *Room Created!*\n\n` +
          `🎥 Your video room is ready.\n\n` +
          `🔗 *Link:*\n${result.joinUrl}\n\n` +
          `⏰ *Starts:* ${startTime.toLocaleString('en-US', { timeZone: 'America/Bogota' })}\n` +
          `⌛ *Duration:* ${result.duration} minutes\n` +
          `${result.password ? `🔐 *Password:* ${result.password}\n\n` : '\n'}` +
          `📢 Share this link with the group so others can join.`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: lang === 'es' ? '🔗 Abrir Zoom' : '🔗 Open Zoom',
              url: result.joinUrl
            }
          ],
          [
            {
              text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
              callback_data: 'group_menu_back'
            }
          ]
        ]
      };

      await ctx.editMessageText(successText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        disable_web_page_preview: true
      });

      logger.info(`[GroupMenu] Zoom room created for user ${userId}: ${result.meetingId}`);

    } else {
      // Error creating meeting
      const errorText = lang === 'es'
        ? `❌ *Error al Crear Sala*\n\n` +
          `No pudimos crear la sala de video.\n\n` +
          `Error: ${result.error}\n\n` +
          `Por favor intenta de nuevo o contacta al soporte.`
        : `❌ *Error Creating Room*\n\n` +
          `We couldn't create the video room.\n\n` +
          `Error: ${result.error}\n\n` +
          `Please try again or contact support.`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: lang === 'es' ? '🔄 Reintentar' : '🔄 Try Again',
              callback_data: 'group_menu_openroom'
            }
          ],
          [
            {
              text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
              callback_data: 'group_menu_back'
            }
          ]
        ]
      };

      await ctx.editMessageText(errorText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      logger.error(`[GroupMenu] Error creating Zoom room for user ${userId}:`, result.error);
    }

  } catch (error) {
    logger.error('[GroupMenu] Error in open room callback:', error);
    const lang = ctx.session?.language || 'en';

    try {
      await ctx.editMessageText(
        lang === 'es'
          ? '❌ Error al crear la sala. Por favor intenta de nuevo.'
          : '❌ Error creating room. Please try again.',
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
                  callback_data: 'group_menu_back'
                }
              ]
            ]
          }
        }
      );
    } catch (editError) {
      await ctx.answerCbQuery(
        lang === 'es' ? 'Error al crear sala' : 'Error creating room'
      );
    }
  }
}

/**
 * Handle rules menu callback
 * Redirects to existing rules handler
 */
async function handleRulesCallback(ctx) {
  try {
    await ctx.answerCbQuery();

    const { handleRules } = require('./rules');

    // Call existing rules handler
    await handleRules(ctx);

  } catch (error) {
    logger.error('[GroupMenu] Error in rules callback:', error);
    await ctx.answerCbQuery('Error loading rules');
  }
}

/**
 * Handle help callback
 * Shows available group commands
 */
async function handleHelpCallback(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = ctx.session?.language || 'en';

    const helpText = lang === 'es'
      ? `❓ *Cómo Usar el Bot PNPtv*\n\n` +
        `🔹 *COMANDOS DEL GRUPO:*\n` +
        `Usa estos comandos aquí (respuestas visibles para todos):\n\n` +
        `🎯 \`/menu\` - Menú rápido de acceso\n` +
        `📚 \`/library\` - Biblioteca musical\n` +
        `🎵 \`/toptracks\` - Pistas más populares\n` +
        `📅 \`/schedulecall\` - Programar videollamada\n` +
        `📡 \`/schedulestream\` - Programar stream\n` +
        `🗓️ \`/upcoming\` - Ver próximos eventos\n` +
        `📋 \`/rules\` - Reglas de la comunidad\n` +
        `⏰ \`/settimezone\` - Zona horaria del grupo\n\n` +
        `🔹 *FUNCIONES PRIVADAS:*\n` +
        `Habla con el bot en privado para acceder a:\n\n` +
        `👤 \`/profile\` - Editar tu perfil\n` +
        `🗺️ \`/map\` - Compartir ubicación\n` +
        `📍 \`/nearby\` - Miembros cercanos\n` +
        `💎 \`/subscribe\` - Planes Premium\n\n` +
        `📌 *DIFERENCIA IMPORTANTE:*\n` +
        `• Grupo = Funciones comunitarias\n` +
        `• Privado = Configuración personal\n\n` +
        `💡 Tip: Usa el botón de menú arriba ↑`
      : `❓ *How to Use PNPtv Bot*\n\n` +
        `🔹 *GROUP COMMANDS:*\n` +
        `Use these commands here (responses visible to all):\n\n` +
        `🎯 \`/menu\` - Quick access menu\n` +
        `📚 \`/library\` - Music library\n` +
        `🎵 \`/toptracks\` - Most played tracks\n` +
        `📅 \`/schedulecall\` - Schedule video call\n` +
        `📡 \`/schedulestream\` - Schedule stream\n` +
        `🗓️ \`/upcoming\` - View upcoming events\n` +
        `📋 \`/rules\` - Community rules\n` +
        `⏰ \`/settimezone\` - Group timezone\n\n` +
        `🔹 *PRIVATE FEATURES:*\n` +
        `Chat with bot privately to access:\n\n` +
        `👤 \`/profile\` - Edit your profile\n` +
        `🗺️ \`/map\` - Share location\n` +
        `📍 \`/nearby\` - Find nearby members\n` +
        `💎 \`/subscribe\` - Premium plans\n\n` +
        `📌 *KEY DIFFERENCE:*\n` +
        `• Group = Community features\n` +
        `• Private = Personal settings\n\n` +
        `💡 Tip: Use the menu button above ↑`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
            callback_data: 'group_menu_back'
          }
        ]
      ]
    };

    await ctx.editMessageText(helpText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info(`[GroupMenu] Help shown to user ${ctx.from.id}`);

  } catch (error) {
    logger.error('[GroupMenu] Error in help callback:', error);
    await ctx.answerCbQuery('Error loading help');
  }
}


/**
 * Handle subscribe callback
 * Redirects users to the subscribe flow (best in private chat)
 */
async function handleSubscribeCallback(ctx) {
  try {
    await ctx.answerCbQuery();

    // If the callback came from a group, ask the user to open a private chat
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      const lang = ctx.session?.language || 'en';

      const message = lang === 'es'
        ? `💎 Para suscribirte, por favor abre un chat privado con el bot y usa /subscribe` 
        : `💎 To subscribe, please open a private chat with the bot and use /subscribe`;

      // Try to edit the callback message to show subscription info
      try {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: lang === 'es' ? 'Abrir Privado' : 'Open Private Chat', url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start` }
              ],
              [
                { text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu', callback_data: 'group_menu_back' }
              ]
            ]
          }
        });
        return;
      } catch (editErr) {
        // If edit fails, fallthrough to replying
      }
    }

    // Fallback: call the subscribe handler directly (it will render plans)
    const subscribeHandler = require('./subscribe');
    await subscribeHandler(ctx);

  } catch (error) {
    logger.error('[GroupMenu] Error in subscribe callback:', error);
    try { await ctx.answerCbQuery('Error loading subscription info'); } catch(_){}
  }
}

/**
 * Handle back to menu callback
 * Returns to main group menu
 */
async function handleBackToMenu(ctx) {
  try {
    await ctx.answerCbQuery();

    const lang = ctx.session?.language || 'en';

    // Recreate main menu
    const menuText = lang === 'es'
      ? `🎯 *Menú de la Comunidad PNPtv*\n\n` +
        `Selecciona una opción para acceder rápidamente a las funciones del grupo:`
      : `🎯 *PNPtv Community Menu*\n\n` +
        `Select an option to quickly access group features:`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '📚 Biblioteca Musical' : '📚 Music Library',
            callback_data: 'group_menu_library'
          }
        ],
        [
          {
            text: lang === 'es' ? '📅 Abrir Sala' : '📅 Open Room',
            callback_data: 'group_menu_openroom'
          }
        ],
        [
          {
            text: lang === 'es' ? '📋 Reglas de la Comunidad' : '📋 Community Rules',
            callback_data: 'group_menu_rules'
          }
        ],
        [
          {
            text: lang === 'es' ? '❓ Ayuda y Comandos' : '❓ Help & Commands',
            callback_data: 'group_menu_help'
          }
        ],
        [
          {
            text: lang === 'es' ? '🔙 Cerrar Menú' : '🔙 Close Menu',
            callback_data: 'group_menu_close'
          }
        ]
      ]
    };

    await ctx.editMessageText(menuText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    logger.error('[GroupMenu] Error returning to menu:', error);
    await ctx.answerCbQuery('Error');
  }
}

/**
 * Handle close menu callback
 * Deletes the menu message
 */
async function handleCloseMenu(ctx) {
  try {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
    logger.info(`[GroupMenu] Menu closed by user ${ctx.from.id}`);
  } catch (error) {
    logger.error('[GroupMenu] Error closing menu:', error);
    // If message already deleted or can't be deleted, just answer callback
    await ctx.answerCbQuery();
  }
}

module.exports = {
  showGroupMenu,
  handleLibraryCallback,
  handleOpenRoomCallback,
  handleRulesCallback,
  handleHelpCallback,
  handleBackToMenu,
  handleCloseMenu,
  handleSubscribeCallback
};
