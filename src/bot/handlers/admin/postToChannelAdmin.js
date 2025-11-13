/**
 * Admin Post-to-Channel Handler
 * Manages admin controls for publishing posts to channels
 */

const logger = require('../../../utils/logger');
const { t } = require('../../../utils/i18n');
const { db } = require('../../../config/firebase');
const PostToChannelService = require('../../../services/postToChannelService');
const PostModel = require('../../../models/post');
const { isAdmin } = require('../../../config/admin');

/**
 * Show post-to-channel admin menu
 */
async function showPostToChannelMenu(ctx) {
  try {
    // Check admin status
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';
    
    const menu = lang === 'es'
      ? `📤 **Panel de Publicación de Mensajes**\n\nGestiona la publicación de posts en canales.\n\n¿Qué deseas hacer?`
      : `📤 **Post-to-Channel Panel**\n\nManage publishing posts to channels.\n\nWhat would you like to do?`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '📝 Crear Publicación' : '📝 Create Broadcast',
            callback_data: 'ptc_create_broadcast'
          }
        ],
        [
          {
            text: lang === 'es' ? '📅 Ver Programadas' : '📅 Scheduled',
            callback_data: 'ptc_view_scheduled'
          }
        ],
        [
          {
            text: lang === 'es' ? '📊 Analytics' : '📊 Analytics',
            callback_data: 'ptc_view_analytics'
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

    await ctx.editMessageText(menu, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info('Admin accessed post-to-channel menu', { adminId: ctx.from.id });
  } catch (error) {
    logger.error('Error showing post-to-channel menu:', error);
    await ctx.reply(t(ctx, 'errors.generic'));
  }
}

/**
 * Start broadcast creation wizard
 */
async function startBroadcastWizard(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';

    // Initialize wizard
    ctx.session.ptcWizard = {
      step: 'select_posts',
      selectedPostIds: [],
      selectedChannelIds: [],
      title: null,
      description: null,
      scheduledTime: null,
      isScheduled: false
    };

    await ctx.answerCbQuery();

    const message = lang === 'es'
      ? `📝 **Asistente de Publicación**\n\nPaso 1: Selecciona qué posts deseas publicar.\n\n¿Quieres publicar:\n\n1. 🔥 Los posts más populares\n2. 📅 Posts recientes\n3. 📌 Posts fijados\n4. 👤 Posts de usuario específico\n5. 🏷️ Posts por etiqueta`
      : `📝 **Broadcast Wizard**\n\nStep 1: Select posts to publish.\n\nChoose your options:\n\n1. 🔥 Top posts\n2. 📅 Recent posts\n3. 📌 Pinned posts\n4. 👤 User's posts\n5. 🏷️ By hashtag`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '🔥 Más populares' : '🔥 Top Posts',
            callback_data: 'ptc_posts_popular'
          }
        ],
        [
          {
            text: lang === 'es' ? '📅 Recientes' : '📅 Recent',
            callback_data: 'ptc_posts_recent'
          }
        ],
        [
          {
            text: lang === 'es' ? '📌 Fijados' : '📌 Pinned',
            callback_data: 'ptc_posts_pinned'
          }
        ],
        [
          {
            text: lang === 'es' ? '👤 Por usuario' : '👤 By User',
            callback_data: 'ptc_posts_user'
          }
        ],
        [
          {
            text: lang === 'es' ? '🏷️ Por etiqueta' : '🏷️ By Tag',
            callback_data: 'ptc_posts_tag'
          }
        ],
        [
          {
            text: lang === 'es' ? '« Cancelar' : '« Cancel',
            callback_data: 'ptc_cancel'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info('Broadcast wizard started', { adminId: ctx.from.id });
  } catch (error) {
    logger.error('Error starting broadcast wizard:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Select top posts
 */
async function selectTopPosts(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';
    await ctx.answerCbQuery();

    // Get top posts
    const posts = await PostModel.getFeedPosts({
      limit: 50
    });

    // Sort by engagement
    const topPosts = posts
      .sort((a, b) => {
        const engagementA = (a.engagement?.likes || 0) + (a.engagement?.views || 0) / 10;
        const engagementB = (b.engagement?.likes || 0) + (b.engagement?.views || 0) / 10;
        return engagementB - engagementA;
      })
      .slice(0, 10);

    if (topPosts.length === 0) {
      await ctx.editMessageText(
        lang === 'es' ? '❌ No hay posts disponibles' : '❌ No posts available',
        {
          reply_markup: {
            inline_keyboard: [[
              {
                text: lang === 'es' ? '« Volver' : '« Back',
                callback_data: 'ptc_create_broadcast'
              }
            ]]
          }
        }
      );
      return;
    }

    // Store posts in session
    ctx.session.ptcWizard.availablePosts = topPosts;
    ctx.session.ptcWizard.selectedPostIds = [];

    // Show selection menu
    await showPostSelectionMenu(ctx, topPosts);

    logger.info('Top posts loaded for selection', {
      adminId: ctx.from.id,
      count: topPosts.length
    });
  } catch (error) {
    logger.error('Error selecting top posts:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Show post selection menu
 */
async function showPostSelectionMenu(ctx, posts) {
  try {
    const lang = ctx.session.language || 'en';

    let message = lang === 'es'
      ? `📝 **Selecciona Posts** (${ctx.session.ptcWizard.selectedPostIds.length} seleccionados)\n\n`
      : `📝 **Select Posts** (${ctx.session.ptcWizard.selectedPostIds.length} selected)\n\n`;

    // List posts with selection status
    posts.forEach((post, index) => {
      const isSelected = ctx.session.ptcWizard.selectedPostIds.includes(post.postId);
      const checkbox = isSelected ? '☑️' : '☐';
      const text = post.content?.text || '[No text]';
      const preview = text.substring(0, 40) + (text.length > 40 ? '...' : '');
      
      message += `${checkbox} #${index + 1} | ${preview}\n`;
    });

    message += '\n' + (lang === 'es'
      ? 'Toca cada post para seleccionar/deseleccionar'
      : 'Tap each post to select/unselect');

    const keyboard = {
      inline_keyboard: [
        // Post selection buttons
        ...posts.map((post, index) => [{
          text: ctx.session.ptcWizard.selectedPostIds.includes(post.postId)
            ? `☑️ ${index + 1}`
            : `☐ ${index + 1}`,
          callback_data: `ptc_toggle_post_${index}`
        }]),
        // Action buttons
        [
          {
            text: lang === 'es' ? '✅ Confirmar' : '✅ Confirm',
            callback_data: 'ptc_confirm_posts'
          }
        ],
        [
          {
            text: lang === 'es' ? '« Volver' : '« Back',
            callback_data: 'ptc_create_broadcast'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error('Error showing post selection menu:', error);
    throw error;
  }
}

/**
 * Toggle post selection
 */
async function togglePostSelection(ctx, postIndex) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';

    if (!ctx.session.ptcWizard?.availablePosts) {
      await ctx.answerCbQuery(lang === 'es' ? 'Sesión expirada' : 'Session expired');
      return;
    }

    const post = ctx.session.ptcWizard.availablePosts[postIndex];
    if (!post) {
      await ctx.answerCbQuery(lang === 'es' ? 'Post no encontrado' : 'Post not found');
      return;
    }

    // Toggle selection
    const index = ctx.session.ptcWizard.selectedPostIds.indexOf(post.postId);
    if (index > -1) {
      ctx.session.ptcWizard.selectedPostIds.splice(index, 1);
    } else {
      ctx.session.ptcWizard.selectedPostIds.push(post.postId);
    }

    await ctx.answerCbQuery(lang === 'es' ? 'Post actualizado' : 'Post updated');

    // Refresh menu
    await showPostSelectionMenu(ctx, ctx.session.ptcWizard.availablePosts);
  } catch (error) {
    logger.error('Error toggling post selection:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Confirm posts and move to channel selection
 */
async function confirmPostsAndSelectChannels(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';

    if (!ctx.session.ptcWizard?.selectedPostIds || ctx.session.ptcWizard.selectedPostIds.length === 0) {
      await ctx.answerCbQuery(lang === 'es' ? 'Selecciona al menos un post' : 'Select at least one post');
      return;
    }

    await ctx.answerCbQuery();

    // Move to channel selection
    ctx.session.ptcWizard.step = 'select_channels';

    const message = lang === 'es'
      ? `📢 **Paso 2: Selecciona Canales**\n\n${ctx.session.ptcWizard.selectedPostIds.length} posts seleccionados\n\nAhora elige los canales donde publicar:`
      : `📢 **Step 2: Select Channels**\n\n${ctx.session.ptcWizard.selectedPostIds.length} posts selected\n\nNow choose channels to publish to:`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '📱 Canal Principal' : '📱 Main Channel',
            callback_data: 'ptc_channel_main'
          }
        ],
        [
          {
            text: lang === 'es' ? '💎 Canal Premium' : '💎 Premium Channel',
            callback_data: 'ptc_channel_premium'
          }
        ],
        [
          {
            text: lang === 'es' ? '📢 Canal Anuncios' : '📢 Announcements',
            callback_data: 'ptc_channel_announce'
          }
        ],
        [
          {
            text: lang === 'es' ? '✅ Siguiente' : '✅ Next',
            callback_data: 'ptc_confirm_channels'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info('Moved to channel selection', {
      adminId: ctx.from.id,
      postCount: ctx.session.ptcWizard.selectedPostIds.length
    });
  } catch (error) {
    logger.error('Error confirming posts:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Toggle channel selection
 */
async function toggleChannelSelection(ctx, channelType) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';
    const channelMap = {
      'main': process.env.CHANNEL_ID,
      'premium': process.env.PREMIUM_CHANNEL_ID,
      'announce': process.env.ANNOUNCE_CHANNEL_ID
    };

    const channelId = channelMap[channelType];
    if (!channelId) {
      await ctx.answerCbQuery(lang === 'es' ? 'Canal no configurado' : 'Channel not configured');
      return;
    }

    // Toggle selection
    const index = (ctx.session.ptcWizard.selectedChannelIds || []).indexOf(channelId);
    if (index > -1) {
      ctx.session.ptcWizard.selectedChannelIds.splice(index, 1);
    } else {
      if (!ctx.session.ptcWizard.selectedChannelIds) {
        ctx.session.ptcWizard.selectedChannelIds = [];
      }
      ctx.session.ptcWizard.selectedChannelIds.push(channelId);
    }

    await ctx.answerCbQuery(lang === 'es' ? 'Canal actualizado' : 'Channel updated');

    // Show updated menu
    await showPostSelectionMenu(ctx);
  } catch (error) {
    logger.error('Error toggling channel selection:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Show scheduling options
 */
async function showSchedulingOptions(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';

    if (!ctx.session.ptcWizard?.selectedChannelIds || ctx.session.ptcWizard.selectedChannelIds.length === 0) {
      await ctx.answerCbQuery(lang === 'es' ? 'Selecciona al menos un canal' : 'Select at least one channel');
      return;
    }

    await ctx.answerCbQuery();

    ctx.session.ptcWizard.step = 'schedule';

    const message = lang === 'es'
      ? `⏰ **Paso 3: Programación**\n\n¿Cuándo deseas publicar?\n\n${ctx.session.ptcWizard.selectedPostIds.length} posts → ${ctx.session.ptcWizard.selectedChannelIds.length} canales`
      : `⏰ **Step 3: Schedule**\n\nWhen should we publish?\n\n${ctx.session.ptcWizard.selectedPostIds.length} posts → ${ctx.session.ptcWizard.selectedChannelIds.length} channels`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'es' ? '🚀 Ahora' : '🚀 Now',
            callback_data: 'ptc_schedule_now'
          }
        ],
        [
          {
            text: lang === 'es' ? '⏱️ En 1 hora' : '⏱️ In 1 hour',
            callback_data: 'ptc_schedule_1h'
          }
        ],
        [
          {
            text: lang === 'es' ? '📅 Personalizado' : '📅 Custom',
            callback_data: 'ptc_schedule_custom'
          }
        ],
        [
          {
            text: lang === 'es' ? '✅ Vista Previa' : '✅ Preview',
            callback_data: 'ptc_preview_broadcast'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    logger.info('Moved to scheduling', {
      adminId: ctx.from.id,
      channelCount: ctx.session.ptcWizard.selectedChannelIds.length
    });
  } catch (error) {
    logger.error('Error showing scheduling options:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Execute broadcast immediately
 */
async function executeBroadcastNow(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';

    if (!ctx.session.ptcWizard?.selectedPostIds || ctx.session.ptcWizard.selectedPostIds.length === 0) {
      await ctx.answerCbQuery(lang === 'es' ? 'No hay posts seleccionados' : 'No posts selected');
      return;
    }

    await ctx.answerCbQuery();

    // Show progress
    const progressMsg = await ctx.editMessageText(
      lang === 'es' ? '📤 Publicando...' : '📤 Publishing...',
      { parse_mode: 'Markdown' }
    );

    try {
      // Execute broadcast
      const results = await PostToChannelService.publishBatch(
        ctx.session.ptcWizard.selectedPostIds,
        ctx.session.ptcWizard.selectedChannelIds,
        {
          delay: 500,
          stopOnError: false,
          progressCallback: async (progress) => {
            try {
              const percent = Math.round((progress.current / progress.total) * 100);
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                progressMsg.message_id,
                undefined,
                lang === 'es'
                  ? `📤 Publicando... ${percent}%\n✅ Exitosos: ${results.successful}`
                  : `📤 Publishing... ${percent}%\n✅ Successful: ${results.successful}`
              );
            } catch (e) {
              // Ignore edit errors
            }
          }
        }
      );

      // Show results
      const resultMsg = lang === 'es'
        ? `✅ **Publicación Completada**\n\n✉️ Exitosos: ${results.successful}\n❌ Fallidos: ${results.failed}\n\n${results.errors.length > 0 ? '⚠️ Errores:\n' + results.errors.map(e => `• ${e.postId}: ${e.error}`).join('\n') : ''}`
        : `✅ **Broadcast Complete**\n\n✉️ Successful: ${results.successful}\n❌ Failed: ${results.failed}\n\n${results.errors.length > 0 ? '⚠️ Errors:\n' + results.errors.map(e => `• ${e.postId}: ${e.error}`).join('\n') : ''}`;

      await ctx.editMessageText(resultMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: lang === 'es' ? '« Volver' : '« Back',
              callback_data: 'ptc_menu'
            }
          ]]
        }
      });

      logger.info('Broadcast executed successfully', {
        adminId: ctx.from.id,
        results
      });

      // Clear wizard
      ctx.session.ptcWizard = null;
    } catch (error) {
      logger.error('Error executing broadcast:', error);
      await ctx.editMessageText(
        lang === 'es' ? `❌ Error: ${error.message}` : `❌ Error: ${error.message}`,
        {
          reply_markup: {
            inline_keyboard: [[
              {
                text: lang === 'es' ? '« Volver' : '« Back',
                callback_data: 'ptc_menu'
              }
            ]]
          }
        }
      );
    }
  } catch (error) {
    logger.error('Error in executeBroadcastNow:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Cancel broadcast wizard
 */
async function cancelBroadcastWizard(ctx) {
  try {
    const lang = ctx.session.language || 'en';

    await ctx.answerCbQuery(lang === 'es' ? 'Cancelado' : 'Cancelled');

    ctx.session.ptcWizard = null;

    await showPostToChannelMenu(ctx);
  } catch (error) {
    logger.error('Error cancelling wizard:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * View scheduled broadcasts
 */
async function viewScheduledBroadcasts(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery(t(ctx, 'errors.unauthorized'));
      return;
    }

    const lang = ctx.session.language || 'en';
    await ctx.answerCbQuery();

    const broadcasts = await PostToChannelService.getScheduledBroadcasts({
      status: 'scheduled',
      limit: 10
    });

    if (broadcasts.length === 0) {
      await ctx.editMessageText(
        lang === 'es'
          ? '📅 **Transmisiones Programadas**\n\nNo hay transmisiones programadas.'
          : '📅 **Scheduled Broadcasts**\n\nNo scheduled broadcasts.',
        {
          reply_markup: {
            inline_keyboard: [[
              {
                text: lang === 'es' ? '« Volver' : '« Back',
                callback_data: 'ptc_menu'
              }
            ]]
          }
        }
      );
      return;
    }

    let message = lang === 'es'
      ? `📅 **Transmisiones Programadas** (${broadcasts.length})\n\n`
      : `📅 **Scheduled Broadcasts** (${broadcasts.length})\n\n`;

    broadcasts.forEach((b, i) => {
      const time = new Date(b.scheduledTime).toLocaleString();
      message += `${i + 1}. ${b.title}\n   🕐 ${time}\n   📊 ${b.postIds.length} posts → ${b.channelIds.length} channels\n\n`;
    });

    const keyboard = {
      inline_keyboard: [
        ...broadcasts.map((b, i) => [{
          text: `${i + 1}. ${b.title.substring(0, 30)}...`,
          callback_data: `ptc_view_broadcast_${i}`
        }]),
        [
          {
            text: lang === 'es' ? '« Volver' : '« Back',
            callback_data: 'ptc_menu'
          }
        ]
      ]
    };

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    logger.error('Error viewing scheduled broadcasts:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

module.exports = {
  showPostToChannelMenu,
  startBroadcastWizard,
  selectTopPosts,
  togglePostSelection,
  confirmPostsAndSelectChannels,
  toggleChannelSelection,
  showSchedulingOptions,
  executeBroadcastNow,
  cancelBroadcastWizard,
  viewScheduledBroadcasts
};
