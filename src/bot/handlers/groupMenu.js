const logger = require("../../utils/logger");
const { t } = require("../../utils/i18n");
const { getUserTimezone, getCommonTimezones, setUserTimezone } = require("../../utils/timezoneHelper");

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

    // Build inline keyboard - Reorganized menu with new order and structure
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '👤 Actualizar Perfil' : '👤 Update Profile',
            callback_data: 'group_menu_profile'
          }
        ],
        [
          {
            text: lang === 'es' ? '👑 Ser Miembro PRIME' : '👑 Become PRIME Member',
            callback_data: 'group_menu_prime'
          }
        ],
        [
          {
            text: lang === 'es' ? '🎥 Abrir Sala Zoom' : '🎥 Open Zoom Room',
            callback_data: 'group_menu_openroom'
          }
        ],
        [
          {
            text: lang === 'es' ? '📍 ¿Quién Está Cerca?' : '📍 Who is Nearby?',
            callback_data: 'group_menu_nearby'
          }
        ],
        [
          {
            text: lang === 'es' ? '🎵 Música y Eventos' : '🎵 Music & Events',
            callback_data: 'group_menu_music_events'
          }
        ],
        [
          {
            text: lang === 'es' ? '⚙️ Configuración' : '⚙️ Settings',
            callback_data: 'group_menu_settings'
          }
        ],
        [
          {
            text: lang === 'es' ? '❓ Ayuda' : '❓ Help',
            callback_data: 'group_menu_help_ai'
          }
        ],
        [
          {
            text: lang === 'es' ? '🆘 Necesito Admin' : '🆘 I Need Admin',
            callback_data: 'group_menu_admin_case'
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
 * Immediately creates a Zoom room for all tiers with quotas:
 * - Free: 1 per month
 * - Week trial: 1 per month
 * - Monthly members: 3 per month
 * - Crystal/Diamond: 5 per month
 */
async function handleOpenRoomCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    const userId = ctx.from.id;

    // Show loading message
    await ctx.answerCbQuery(
      lang === 'es' ? '⏳ Creando sala...' : '⏳ Creating room...'
    );

    // Get user tier to check zoom quota
    const { db } = require('../../config/firebase');
    const zoomUsageService = require('../../services/zoomUsageService');
    const { getUserTimezone, getCommonTimezones } = require('../../utils/timezoneHelper');
    
    const userDoc = await db.collection('users').doc(userId.toString()).get();
    const userData = userDoc.data();
    const tier = userData?.tier || 'Free';
    
    // Check if user has timezone set
    const userTimezone = userData?.timezone;
    
    // If no timezone is set, show timezone options first
    if (!userTimezone) {
      const timezones = getCommonTimezones();
      
      const tzText = lang === 'es'
        ? `🕐 *Configura Tu Zona Horaria*\n\n` +
          `Antes de crear la sala, necesitamos que establezcas tu zona horaria.\n` +
          `Esto asegura que todos vean los tiempos correctamente.\n\n` +
          `Selecciona tu zona horaria:`
        : `🕐 *Set Your Timezone*\n\n` +
          `Before creating a room, please set your timezone.\n` +
          `This ensures everyone sees the correct times.\n\n` +
          `Select your timezone:`;
      
      const keyboard = {
        inline_keyboard: []
      };
      
      // Add timezone buttons in rows of 2
      for (let i = 0; i < timezones.length; i += 2) {
        const row = [];
        row.push({
          text: `${timezones[i].label} (${timezones[i].offset})`,
          callback_data: `set_zoom_tz_${timezones[i].value}`
        });
        if (i + 1 < timezones.length) {
          row.push({
            text: `${timezones[i + 1].label} (${timezones[i + 1].offset})`,
            callback_data: `set_zoom_tz_${timezones[i + 1].value}`
          });
        }
        keyboard.inline_keyboard.push(row);
      }
      
      keyboard.inline_keyboard.push([
        {
          text: lang === 'es' ? '« Volver al Menú' : '« Back to Menu',
          callback_data: 'group_menu_back'
        }
      ]);
      
      await ctx.editMessageText(tzText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    // Check if user can create zoom room
    const { canCreate, reason, usage } = await zoomUsageService.canCreateZoomRoom(userId.toString());

    if (!canCreate) {
      // Show quota exceeded message
      const upgradeText = lang === 'es'
        ? `⚠️ *Límite de Salas Alcanzado*\n\n` +
          `${reason}\n\n` +
          `💡 Tip: Usa el grupo mientras esperas a que se reinicie tu límite mensual.`
        : `⚠️ *Zoom Room Limit Reached*\n\n` +
          `${reason}\n\n` +
          `💡 Tip: Use the group while you wait for your monthly limit to reset.`;

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

      // Record zoom room creation for quota tracking
      try {
        const zoomUsageService = require('../../services/zoomUsageService');
        const userName = ctx.from.first_name || ctx.from.username || 'PNPtv Member';
        await zoomUsageService.recordZoomRoomCreation(
          userId.toString(),
          result.meetingId,
          lang === 'es' ? `Sala de ${userName}` : `${userName}'s Room`
        );
      } catch (usageError) {
        logger.warn(`[GroupMenu] Failed to record zoom usage for user ${userId}:`, usageError.message);
      }

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
 * Redirects to AI support agent or case request manager
 */
async function handleHelpCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    const userId = ctx.from.id;

    // Show help options: AI Support or Case Manager
    const helpText = lang === 'es'
      ? `❓ *¿Cómo Podemos Ayudarte?*\n\n` +
        `Elige una opción de soporte:\n\n` +
        `🤖 *Chat con IA* - Respuestas inmediatas a preguntas frecuentes\n` +
        `📋 *Gestor de Casos* - Para reportar problemas o hacer solicitudes especiales`
      : `❓ *How Can We Help You?*\n\n` +
        `Choose a support option:\n\n` +
        `🤖 *AI Chat* - Instant answers to frequently asked questions\n` +
        `📋 *Case Manager* - To report issues or make special requests`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '🤖 Chat de IA' : '🤖 AI Chat',
            callback_data: 'help_start_ai_chat'
          },
          {
            text: lang === 'es' ? '📋 Gestor de Casos' : '📋 Case Manager',
            callback_data: 'help_open_cases'
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

    await ctx.editMessageText(helpText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info(`[GroupMenu] Help menu shown to user ${userId}`);

  } catch (error) {
    logger.error('[GroupMenu] Error in help callback:', error);
    await ctx.answerCbQuery('Error loading help');
  }
}

/**
 * Handle help_start_ai_chat callback
 * Redirects user to start AI chat in private
 */
async function handleHelpStartAIChat(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    const userId = ctx.from.id;

    // Mark session to start AI chat
    ctx.session.aiChatFromGroup = true;

    const message = lang === 'es'
      ? `✅ Abriendo el Chat de IA...\n\n💬 Por favor inicia una conversación privada conmigo para comenzar el chat de soporte.`
      : `✅ Opening AI Chat...\n\n💬 Please start a private conversation with me to begin the support chat.`;

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'PNPtvbot';

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '💬 Abrir Chat IA' : '💬 Open AI Chat',
            url: `https://t.me/${botUsername}?start=ai_chat`
          }
        ],
        [
          {
            text: lang === 'es' ? '« Volver' : '« Back',
            callback_data: 'help_back'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info(`[GroupMenu] User ${userId} redirected to AI chat`);

  } catch (error) {
    logger.error('[GroupMenu] Error in handleHelpStartAIChat:', error);
    await ctx.answerCbQuery('Error');
  }
}

/**
 * Handle help_open_cases callback
 * Redirects user to case manager in private
 */
async function handleHelpOpenCases(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    const userId = ctx.from.id;

    const message = lang === 'es'
      ? `✅ Abriendo Gestor de Casos...\n\n📋 Por favor inicia una conversación privada conmigo para acceder al gestor de casos.`
      : `✅ Opening Case Manager...\n\n📋 Please start a private conversation with me to access the case manager.`;

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'PNPtvbot';

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '📋 Abrir Casos' : '📋 Open Cases',
            url: `https://t.me/${botUsername}?start=cases`
          }
        ],
        [
          {
            text: lang === 'es' ? '« Volver' : '« Back',
            callback_data: 'help_back'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info(`[GroupMenu] User ${userId} redirected to case manager`);

  } catch (error) {
    logger.error('[GroupMenu] Error in handleHelpOpenCases:', error);
    await ctx.answerCbQuery('Error');
  }
}

/**
 * Handle help_back callback
 * Returns to help menu
 */
async function handleHelpBack(ctx) {
  try {
    await ctx.answerCbQuery();
    await handleHelpCallback(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in handleHelpBack:', error);
    await ctx.answerCbQuery('Error');
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

/**
 * Handle timezone selection from zoom room creation
 * Sets timezone and then creates the room
 */
async function handleSetZoomTimezone(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    const userId = ctx.from.id;
    const timezoneValue = ctx.match[1]; // Extract timezone from callback_data
    
    // Show loading message
    await ctx.answerCbQuery(
      lang === 'es' ? '⏳ Configurando...' : '⏳ Setting up...'
    );
    
    const { db } = require('../../config/firebase');
    const { setUserTimezone } = require('../../utils/timezoneHelper');
    
    // Save timezone to user profile
    const success = await setUserTimezone(userId.toString(), timezoneValue);
    
    if (!success) {
      await ctx.editMessageText(
        lang === 'es'
          ? '❌ Error configurando la zona horaria. Intenta de nuevo.'
          : '❌ Error setting timezone. Please try again.',
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
      return;
    }
    
    // Now proceed with creating the zoom room
    const zoomUsageService = require('../../services/zoomUsageService');
    
    // Check if user can create zoom room
    const { canCreate, reason } = await zoomUsageService.canCreateZoomRoom(userId.toString());
    
    if (!canCreate) {
      const upgradeText = lang === 'es'
        ? `⚠️ *Límite de Salas Alcanzado*\n\n` +
          `${reason}\n\n` +
          `💡 Tip: Usa el grupo mientras esperas a que se reinicie tu límite mensual.`
        : `⚠️ *Zoom Room Limit Reached*\n\n` +
          `${reason}\n\n` +
          `💡 Tip: Use the group while you wait for your monthly limit to reset.`;
      
      await ctx.editMessageText(upgradeText, {
        parse_mode: 'Markdown',
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
      });
      return;
    }
    
    // Create zoom meeting
    const zoomService = require('../../services/zoomService');
    const startTime = new Date(Date.now() + 5 * 60 * 1000);
    const userName = ctx.from.first_name || ctx.from.username || 'PNPtv Member';
    
    const meetingData = {
      title: lang === 'es' ? `Sala de ${userName}` : `${userName}'s Room`,
      startTime: startTime.toISOString(),
      duration: 60,
      description: lang === 'es'
        ? `Sala de video creada por ${userName} desde PNPtv`
        : `Video room created by ${userName} from PNPtv`
    };
    
    const result = await zoomService.createMeeting(meetingData);
    
    if (result.success) {
      const successText = lang === 'es'
        ? `✅ *¡Sala Creada!*\n\n` +
          `🎥 Tu sala de video está lista.\n\n` +
          `🔗 *Enlace:*\n${result.joinUrl}\n\n` +
          `⏰ *Comienza:* ${startTime.toLocaleString('es-CO', { timeZone: timezoneValue })}\n` +
          `⌛ *Duración:* ${result.duration} minutos\n` +
          `${result.password ? `🔐 *Contraseña:* ${result.password}\n\n` : '\n'}` +
          `📢 Comparte este enlace con el grupo para que otros se unan.`
        : `✅ *Room Created!*\n\n` +
          `🎥 Your video room is ready.\n\n` +
          `🔗 *Link:*\n${result.joinUrl}\n\n` +
          `⏰ *Starts:* ${startTime.toLocaleString('en-US', { timeZone: timezoneValue })}\n` +
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
      
      try {
        await zoomUsageService.recordZoomRoomCreation(
          userId.toString(),
          result.meetingId,
          lang === 'es' ? `Sala de ${userName}` : `${userName}'s Room`
        );
      } catch (usageError) {
        logger.warn(`Failed to record zoom usage for user ${userId}:`, usageError.message);
      }
      
      logger.info(`Zoom room created for user ${userId}: ${result.meetingId}`);
    } else {
      const errorText = lang === 'es'
        ? `❌ *Error al Crear Sala*\n\n` +
          `No pudimos crear la sala de video.\n\n` +
          `Error: ${result.error}\n\n` +
          `Por favor intenta de nuevo o contacta al soporte.`
        : `❌ *Error Creating Room*\n\n` +
          `We couldn't create the video room.\n\n` +
          `Error: ${result.error}\n\n` +
          `Please try again or contact support.`;
      
      await ctx.editMessageText(errorText, {
        parse_mode: 'Markdown',
        reply_markup: {
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
        }
      });
      
      logger.error(`Error creating Zoom room for user ${userId}:`, result.error);
    }
  } catch (error) {
    logger.error('Error in handleSetZoomTimezone:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.editMessageText(
      lang === 'es'
        ? '❌ Error al procesar. Por favor intenta de nuevo.'
        : '❌ Error processing. Please try again.',
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
  }
}

/**
 * Handle top tracks callback
 * Shows most played tracks in the group
 */
async function handleTopTracksCallback(ctx) {
  try {
    await ctx.answerCbQuery();
    const lang = ctx.session?.language || 'en';
    const groupId = ctx.chat?.id?.toString() || 'community-library';
    
    const { getTopTracks } = require('../../services/communityService');
    
    const topTracks = await getTopTracks(groupId, 5);
    
    if (topTracks.length === 0) {
      await ctx.editMessageText(
        lang === 'es'
          ? `🔥 *Temas Más Reproducidos*\n\nAún no hay temas reproducidos.\n\nComienza a reproducir música para construir esta lista.`
          : `🔥 *Top Tracks*\n\nNo tracks have been played yet.\n\nStart listening to build the top tracks list!`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = lang === 'es' 
      ? `🔥 *Temas Más Reproducidos*\n\n`
      : `🔥 *Top Tracks*\n\n`;
    
    topTracks.forEach((track, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const typeEmoji = track.type === 'podcast' ? '🎙️' : '🎶';
      
      message += `${medal} ${typeEmoji} *${track.title}*\n`;
      message += `   👤 ${track.artist}\n`;
      message += `   🔥 ${track.playCount} ${lang === 'es' ? 'reproducidas' : 'plays'}\n\n`;
    });

    await ctx.editMessageText(message, { 
      parse_mode: 'Markdown',
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
    });
  } catch (error) {
    logger.error('[GroupMenu] Error in top tracks callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.editMessageText(
      lang === 'es' ? 'Error cargando temas' : 'Error loading tracks',
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
  }
}

/**
 * Handle upcoming events callback
 * Shows upcoming group events
 */
async function handleUpcomingCallback(ctx) {
  try {
    await ctx.answerCbQuery();
    const { handleUpcoming } = require('./community');
    await handleUpcoming(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in upcoming callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error cargando eventos' : 'Error loading events'
    );
  }
}

/**
 * Handle set timezone callback
 * Shows timezone options
 */
async function handleSetTimezoneCallback(ctx) {
  try {
    await ctx.answerCbQuery();
    const { handleSetTimezone } = require('./community');
    await handleSetTimezone(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in set timezone callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error configurando zona horaria' : 'Error setting timezone'
    );
  }
}

/**
 * Handle profile callback - redirects to bot for profile management
 */
async function handleProfileCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery();
    
    const userId = ctx.from.id;
    const { viewProfile } = require('./profile');
    await viewProfile(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in profile callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error abriendo perfil' : 'Error opening profile'
    );
  }
}

/**
 * Handle prime member callback - redirects to subscribe handler
 */
async function handlePrimeMemberCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery();
    
    const { showSubscriptionMenu } = require('./subscribe');
    await showSubscriptionMenu(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in prime member callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error abriendo suscripción' : 'Error opening subscription'
    );
  }
}

/**
 * Handle nearby callback - finds nearby members
 */
async function handleNearbyCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery();
    
    const { handleNearby } = require('./community');
    await handleNearby(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in nearby callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error buscando miembros' : 'Error finding members'
    );
  }
}

/**
 * Handle music and events submenu - shows library and tracks options
 */
async function handleMusicEventsCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery();
    
    const submenuText = lang === 'es'
      ? `🎵 *Música y Eventos*\n\nSelecciona una opción:`
      : `🎵 *Music & Events*\n\nSelect an option:`;
    
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
            text: lang === 'es' ? '⭐ Temas Top' : '⭐ Top Tracks',
            callback_data: 'group_menu_toptracks'
          }
        ],
        [
          {
            text: lang === 'es' ? '📅 Próximos Eventos' : '📅 Upcoming Events',
            callback_data: 'group_menu_upcoming'
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
    
    await ctx.editMessageText(submenuText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error('[GroupMenu] Error in music events callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error cargando menú' : 'Error loading menu'
    );
  }
}

/**
 * Handle settings callback - opens user settings in bot
 */
async function handleSettingsCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery();
    
    const { showSettings } = require('./profile');
    await showSettings(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in settings callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error abriendo configuración' : 'Error opening settings'
    );
  }
}

/**
 * Handle help AI callback - opens AI chat
 */
async function handleHelpAICallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery();
    
    const { startAIChat } = require('./aiChat');
    await startAIChat(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in help AI callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error abriendo ayuda' : 'Error opening help'
    );
  }
}

/**
 * Handle admin case callback - opens case form
 */
async function handleAdminCaseCallback(ctx) {
  try {
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery();
    
    const { startCaseCreation } = require('./caseManager');
    await startCaseCreation(ctx);
  } catch (error) {
    logger.error('[GroupMenu] Error in admin case callback:', error);
    const lang = ctx.session?.language || 'en';
    await ctx.answerCbQuery(
      lang === 'es' ? 'Error abriendo caso' : 'Error opening case'
    );
  }
}

module.exports = {
  showGroupMenu,
  handleProfileCallback,
  handlePrimeMemberCallback,
  handleOpenRoomCallback,
  handleNearbyCallback,
  handleMusicEventsCallback,
  handleSettingsCallback,
  handleHelpAICallback,
  handleAdminCaseCallback,
  handleLibraryCallback,
  handleTopTracksCallback,
  handleUpcomingCallback,
  handleSetTimezoneCallback,
  handleHelpCallback,
  handleHelpStartAIChat,
  handleHelpOpenCases,
  handleHelpBack,
  handleBackToMenu,
  handleCloseMenu,
  handleSubscribeCallback,
  handleSetZoomTimezone
};
