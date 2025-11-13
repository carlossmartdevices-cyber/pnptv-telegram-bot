/**
 * Channel Broadcaster Admin Handler
 * Full wizard for creating and publishing rich content to channels
 */

const logger = require('../../../utils/logger');
const { t } = require('../../../utils/i18n');
const { isAdmin } = require('../../../config/admin');
const ChannelBroadcasterService = require('../../../services/channelBroadcasterService');

// Initialize service (will use telegram from context)
let broadcasterService = null;

/**
 * Show channel broadcaster menu
 */
async function showChannelBroadcasterMenu(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply(t(ctx, 'errors.unauthorized'));
      return;
    }

    broadcasterService = new ChannelBroadcasterService(ctx.telegram);
    const lang = ctx.session.language || 'en';

    const menu = lang === 'es'
      ? `📢 **Panel de Publicación a Canales**\n\n🎯 Publica contenido enriquecido (texto, media, archivos, encuestas, menús) a tus canales.\n\n¿Qué deseas hacer?`
      : `📢 **Channel Broadcaster Panel**\n\n🎯 Publish rich content (text, media, files, polls, menus) to your channels.\n\nWhat would you like to do?`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '✏️ Crear Publicación' : '✏️ Create Post',
            callback_data: 'cbc_new_post'
          }
        ],
        [
          {
            text: lang === 'es' ? '📋 Ver Borradores' : '📋 View Drafts',
            callback_data: 'cbc_view_drafts'
          }
        ],
        [
          {
            text: lang === 'es' ? '📤 Ver Publicados' : '📤 View Published',
            callback_data: 'cbc_view_published'
          }
        ],
        [
          {
            text: lang === 'es' ? '« Volver' : '« Back',
            callback_data: 'admin_back'
          }
        ]
      ]
    };

    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(menu, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      await ctx.reply(menu, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }

    logger.info('Admin accessed channel broadcaster menu', { adminId: ctx.from.id });
  } catch (error) {
    logger.error('Error showing channel broadcaster menu:', error);
    await ctx.reply(t(ctx, 'errors.generic'));
  }
}

/**
 * Start new post wizard - Step 1: Select Channels
 */
async function startNewPost(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    broadcasterService = new ChannelBroadcasterService(ctx.telegram);
    const lang = ctx.session.language || 'en';

    // Initialize wizard session
    ctx.session.cbWizard = {
      step: 'select_channels',
      selectedChannels: [],
      text: '',
      media: [],
      attachments: [],
      poll: null,
      inlineMenu: null,
      markdown: true,
      title: '',
      pinMessage: false,
      deleteAfterMinutes: null
    };

    await ctx.answerCbQuery();

    const message = lang === 'es'
      ? `📢 **Asistente de Publicación - Paso 1**\n\n**Selecciona los canales donde publicar:**\n\n☐ Contacto PNP\n☐ PNPtv PRIME\n\nToca cada uno para seleccionar/deseleccionar`
      : `📢 **Post Wizard - Step 1**\n\n**Select channels to publish to:**\n\n☐ Contacto PNP\n☐ PNPtv PRIME\n\nTap each to toggle`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' 
              ? '📱 Contacto PNP' 
              : '📱 Contacto PNP',
            callback_data: 'cbc_toggle_channel_contacto'
          }
        ],
        [
          {
            text: lang === 'es' 
              ? '💎 PNPtv PRIME' 
              : '💎 PNPtv PRIME',
            callback_data: 'cbc_toggle_channel_prime'
          }
        ],
        [
          {
            text: lang === 'es' 
              ? '📢 Ambos' 
              : '📢 Both',
            callback_data: 'cbc_toggle_channel_both'
          }
        ],
        [
          {
            text: lang === 'es' ? '✅ Siguiente' : '✅ Next',
            callback_data: 'cbc_step_content'
          }
        ],
        [
          {
            text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel',
            callback_data: 'cbc_cancel'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info('New post wizard started', { adminId: ctx.from.id });
  } catch (error) {
    logger.error('Error starting new post:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Toggle channel selection
 */
async function toggleChannelSelection(ctx, channel) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    if (!ctx.session.cbWizard) {
      await ctx.answerCbQuery('Session expired');
      return;
    }

    const lang = ctx.session.language || 'en';
    const channelMap = {
      'contacto': process.env.FREE_CHANNEL_ID,
      'prime': process.env.CHANNEL_ID,
      'both': [process.env.FREE_CHANNEL_ID, process.env.CHANNEL_ID]
    };

    const channelId = channelMap[channel];

    if (channel === 'both') {
      // Select both
      ctx.session.cbWizard.selectedChannels = [
        process.env.FREE_CHANNEL_ID,
        process.env.CHANNEL_ID
      ];
    } else {
      // Toggle single channel
      const index = ctx.session.cbWizard.selectedChannels.indexOf(channelId);
      if (index > -1) {
        ctx.session.cbWizard.selectedChannels.splice(index, 1);
      } else {
        ctx.session.cbWizard.selectedChannels.push(channelId);
      }
    }

    await ctx.answerCbQuery(lang === 'es' ? 'Canales actualizados' : 'Channels updated');

    // Show updated menu
    const checkedContacto = ctx.session.cbWizard.selectedChannels.includes(process.env.FREE_CHANNEL_ID) ? '✅' : '☐';
    const checkedPrime = ctx.session.cbWizard.selectedChannels.includes(process.env.CHANNEL_ID) ? '✅' : '☐';

    const message = lang === 'es'
      ? `📢 **Asistente de Publicación - Paso 1**\n\n**Selecciona los canales donde publicar:**\n\n${checkedContacto} Contacto PNP\n${checkedPrime} PNPtv PRIME\n\nToca cada uno para seleccionar/deseleccionar`
      : `📢 **Post Wizard - Step 1**\n\n**Select channels to publish to:**\n\n${checkedContacto} Contacto PNP\n${checkedPrime} PNPtv PRIME\n\nTap each to toggle`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' 
              ? `📱 Contacto PNP ${checkedContacto}` 
              : `📱 Contacto PNP ${checkedContacto}`,
            callback_data: 'cbc_toggle_channel_contacto'
          }
        ],
        [
          {
            text: lang === 'es' 
              ? `💎 PNPtv PRIME ${checkedPrime}` 
              : `💎 PNPtv PRIME ${checkedPrime}`,
            callback_data: 'cbc_toggle_channel_prime'
          }
        ],
        [
          {
            text: lang === 'es' 
              ? '📢 Ambos' 
              : '📢 Both',
            callback_data: 'cbc_toggle_channel_both'
          }
        ],
        [
          {
            text: lang === 'es' ? '✅ Siguiente' : '✅ Next',
            callback_data: 'cbc_step_content'
          }
        ],
        [
          {
            text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel',
            callback_data: 'cbc_cancel'
          }
        ]
      ]
    };

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (e) {
      // Ignore edit errors
    }
  } catch (error) {
    logger.error('Error toggling channel:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Step 2: Content Type Selection
 */
async function stepContentType(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    if (!ctx.session.cbWizard?.selectedChannels || ctx.session.cbWizard.selectedChannels.length === 0) {
      const lang = ctx.session.language || 'en';
      await ctx.answerCbQuery(lang === 'es' ? 'Selecciona al menos un canal' : 'Select at least one channel');
      return;
    }

    const lang = ctx.session.language || 'en';
    await ctx.answerCbQuery();

    ctx.session.cbWizard.step = 'select_content_type';

    const message = lang === 'es'
      ? `📝 **Paso 2: Tipo de Contenido**\n\n¿Qué tipo de contenido deseas publicar?\n\n📍 Canales seleccionados: ${ctx.session.cbWizard.selectedChannels.length}`
      : `📝 **Step 2: Content Type**\n\nWhat type of content do you want to publish?\n\n📍 Selected channels: ${ctx.session.cbWizard.selectedChannels.length}`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '📄 Solo Texto' : '📄 Text Only',
            callback_data: 'cbc_content_text'
          }
        ],
        [
          {
            text: lang === 'es' ? '🖼️ Texto + Imagen' : '🖼️ Text + Photo',
            callback_data: 'cbc_content_photo'
          }
        ],
        [
          {
            text: lang === 'es' ? '🎥 Texto + Video' : '🎥 Text + Video',
            callback_data: 'cbc_content_video'
          }
        ],
        [
          {
            text: lang === 'es' ? '📎 Archivos' : '📎 Files',
            callback_data: 'cbc_content_file'
          }
        ],
        [
          {
            text: lang === 'es' ? '📊 Encuesta' : '📊 Poll',
            callback_data: 'cbc_content_poll'
          }
        ],
        [
          {
            text: lang === 'es' ? '🔗 Con Menú' : '🔗 With Menu',
            callback_data: 'cbc_content_menu'
          }
        ],
        [
          {
            text: lang === 'es' ? '« Atrás' : '« Back',
            callback_data: 'cbc_new_post'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error('Error in stepContentType:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Handle content text selection - ask user to send message
 */
async function contentText(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';
    await ctx.answerCbQuery();

    ctx.session.cbWizard.step = 'awaiting_text';

    const message = lang === 'es'
      ? `📝 **Envía tu mensaje**\n\nPuedes usar *Markdown* para formato:\n\n*negrita*\n_cursiva_\n~tachado~\n\`código\`\n\nEscribe /done cuando termines`
      : `📝 **Send your message**\n\nYou can use *Markdown* for formatting:\n\n*bold*\n_italic_\n~strikethrough~\n\`code\`\n\nType /done when finished`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel',
            callback_data: 'cbc_cancel'
          }
        ]]
      }
    });
  } catch (error) {
    logger.error('Error in contentText:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Handle content photo - ask for photo
 */
async function contentPhoto(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';
    await ctx.answerCbQuery();

    ctx.session.cbWizard.step = 'awaiting_photo';
    ctx.session.cbWizard.mediaType = 'photo';

    const message = lang === 'es'
      ? `📷 **Envía una imagen**\n\nLuego podrás agregar texto descriptivo.`
      : `📷 **Send a photo**\n\nYou can add descriptive text afterward.`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          {
            text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel',
            callback_data: 'cbc_cancel'
          }
        ]]
      }
    });
  } catch (error) {
    logger.error('Error in contentPhoto:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Handle incoming media/files
 */
async function handleMediaUpload(ctx) {
  try {
    if (!ctx.session.cbWizard?.step?.startsWith('awaiting_')) {
      return; // Not in media upload mode
    }

    const lang = ctx.session.language || 'en';

    // Extract file ID from message
    let fileId = null;
    let mediaType = null;

    if (ctx.message.photo) {
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      mediaType = 'photo';
    } else if (ctx.message.video) {
      fileId = ctx.message.video.file_id;
      mediaType = 'video';
    } else if (ctx.message.document) {
      fileId = ctx.message.document.file_id;
      mediaType = 'document';
    } else if (ctx.message.audio) {
      fileId = ctx.message.audio.file_id;
      mediaType = 'audio';
    }

    if (!fileId) {
      await ctx.reply(lang === 'es' ? '❌ Tipo de archivo no soportado' : '❌ Unsupported file type');
      return;
    }

    // Store media
    ctx.session.cbWizard.media.push({
      type: mediaType,
      fileId: fileId,
      caption: ctx.message.caption || ''
    });

    await ctx.reply(lang === 'es' ? '✅ Archivo agregado' : '✅ File added');

    // Ask for text caption
    const msg = lang === 'es'
      ? `🎯 Ahora escribe el texto/descripción para acompañar el contenido.\n\nPuedes usar *Markdown* para formato.`
      : `🎯 Now write text/description for the content.\n\nYou can use *Markdown* for formatting.`;

    ctx.session.cbWizard.step = 'awaiting_text';
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error handling media upload:', error);
    await ctx.reply(t(ctx, 'errors.generic'));
  }
}

/**
 * Handle text input in wizard
 */
async function handleWizardTextInput(ctx) {
  try {
    if (!ctx.session.cbWizard) return;

    const lang = ctx.session.language || 'en';
    const text = ctx.message.text;

    // Handle /done command
    if (text === '/done') {
      if (!ctx.session.cbWizard.text) {
        await ctx.reply(lang === 'es' ? '❌ Escribe algo primero' : '❌ Write something first');
        return;
      }

      // Move to preview
      await showPreview(ctx);
      return;
    }

    // Store text
    ctx.session.cbWizard.text = text;

    // Show options menu
    const message = lang === 'es'
      ? `✅ **Texto guardado**\n\n¿Qué deseas hacer?\n\n**Texto:** ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`
      : `✅ **Text saved**\n\nWhat would you like to do?\n\n**Text:** ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === 'es' ? '✏️ Editar' : '✏️ Edit',
              callback_data: 'cbc_edit_text'
            },
            {
              text: lang === 'es' ? '➕ Agregar Menú' : '➕ Add Menu',
              callback_data: 'cbc_add_menu'
            }
          ],
          [
            {
              text: lang === 'es' ? '👁️ Vista Previa' : '👁️ Preview',
              callback_data: 'cbc_show_preview'
            }
          ],
          [
            {
              text: lang === 'es' ? '📤 Publicar' : '📤 Publish',
              callback_data: 'cbc_publish_now'
            }
          ]
        ]
      }
    });
  } catch (error) {
    logger.error('Error handling wizard text input:', error);
    await ctx.reply(t(ctx, 'errors.generic'));
  }
}

/**
 * Show preview of the post
 */
async function showPreview(ctx) {
  try {
    if (!ctx.session.cbWizard) return;

    const lang = ctx.session.language || 'en';
    const wizard = ctx.session.cbWizard;

    let preview = `🔍 **Vista Previa**\n\n`;
    preview += `${wizard.text}\n\n`;
    preview += `📍 **Canales:** ${wizard.selectedChannels.length}\n`;
    if (wizard.media.length > 0) preview += `📎 **Archivos:** ${wizard.media.length}\n`;
    if (wizard.inlineMenu) preview += `🔗 **Menú:** Sí\n`;

    await ctx.reply(preview, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === 'es' ? '📤 Publicar Ahora' : '📤 Publish Now',
              callback_data: 'cbc_publish_now'
            }
          ],
          [
            {
              text: lang === 'es' ? '📅 Programar' : '📅 Schedule',
              callback_data: 'cbc_schedule_post'
            }
          ],
          [
            {
              text: lang === 'es' ? '❌ Cancelar' : '❌ Cancel',
              callback_data: 'cbc_cancel'
            }
          ]
        ]
      }
    });
  } catch (error) {
    logger.error('Error showing preview:', error);
    await ctx.reply(t(ctx, 'errors.generic'));
  }
}

/**
 * Publish post immediately
 */
async function publishNow(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply(t(ctx, 'errors.unauthorized'));
      return;
    }

    if (!ctx.session.cbWizard) {
      const lang = ctx.session.language || 'en';
      await ctx.reply(lang === 'es' ? 'Sesión expirada' : 'Session expired');
      return;
    }

    const lang = ctx.session.language || 'en';
    broadcasterService = new ChannelBroadcasterService(ctx.telegram);

    // Show progress
    const progressMsg = await ctx.reply(lang === 'es' ? '📤 Publicando...' : '📤 Publishing...');

    try {
      // Create broadcast
      const broadcast = await broadcasterService.createBroadcast(ctx.from.id, {
        channels: ctx.session.cbWizard.selectedChannels,
        text: ctx.session.cbWizard.text,
        media: ctx.session.cbWizard.media,
        inlineMenu: ctx.session.cbWizard.inlineMenu,
        title: ctx.session.cbWizard.title || 'Admin Post',
        markdown: true,
        pinMessage: ctx.session.cbWizard.pinMessage
      });

      // Publish immediately
      const results = await broadcasterService.publishBroadcast(broadcast.id, ctx.telegram);

      // Delete progress message
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg.message_id);
      } catch (e) {
        // Ignore
      }

      // Show results
      const resultMsg = lang === 'es'
        ? `✅ **¡Publicado!**\n\n✉️ Exitosos: ${results.successful.length}\n❌ Fallidos: ${results.failed.length}`
        : `✅ **Published!**\n\n✉️ Successful: ${results.successful.length}\n❌ Failed: ${results.failed.length}`;

      await ctx.reply(resultMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: lang === 'es' ? '📢 Nuevo Post' : '📢 New Post',
              callback_data: 'cbc_new_post'
            }
          ]]
        }
      });

      // Clear wizard
      ctx.session.cbWizard = null;

      logger.info('Post published successfully', {
        adminId: ctx.from.id,
        broadcastId: broadcast.id,
        channels: results.successful.length
      });
    } catch (error) {
      logger.error('Error publishing post:', error);

      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg.message_id);
      } catch (e) {
        // Ignore
      }

      await ctx.reply(lang === 'es' ? `❌ Error: ${error.message}` : `❌ Error: ${error.message}`);
    }
  } catch (error) {
    logger.error('Error in publishNow:', error);
    await ctx.reply(t(ctx, 'errors.generic'));
  }
}

/**
 * Cancel wizard
 */
async function cancelWizard(ctx) {
  try {
    const lang = ctx.session.language || 'en';

    ctx.session.cbWizard = null;

    await ctx.answerCbQuery(lang === 'es' ? 'Cancelado' : 'Cancelled');
    await showChannelBroadcasterMenu(ctx);
  } catch (error) {
    logger.error('Error cancelling wizard:', error);
  }
}

/**
 * Handle callback queries
 */
async function handleChannelBroadcasterCallback(ctx) {
  const data = ctx.callbackQuery.data;

  if (data === 'cbc_new_post') {
    await startNewPost(ctx);
  } else if (data.startsWith('cbc_toggle_channel_')) {
    const channel = data.replace('cbc_toggle_channel_', '');
    await toggleChannelSelection(ctx, channel);
  } else if (data === 'cbc_step_content') {
    await stepContentType(ctx);
  } else if (data === 'cbc_content_text') {
    await contentText(ctx);
  } else if (data === 'cbc_content_photo') {
    await contentPhoto(ctx);
  } else if (data === 'cbc_show_preview') {
    await showPreview(ctx);
  } else if (data === 'cbc_publish_now') {
    await publishNow(ctx);
  } else if (data === 'cbc_cancel') {
    await cancelWizard(ctx);
  }
}

module.exports = {
  showChannelBroadcasterMenu,
  startNewPost,
  handleChannelBroadcasterCallback,
  handleMediaUpload,
  handleWizardTextInput
};
