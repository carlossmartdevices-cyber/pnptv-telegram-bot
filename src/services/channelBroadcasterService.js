/**
 * Channel Broadcaster Service
 * Advanced admin feature to publish rich content to multiple channels
 * Supports: Markdown text, media, files, polls, inline menus
 */

const logger = require('../utils/logger');
const { db } = require('../config/firebase');

class ChannelBroadcasterService {
  constructor(telegram) {
    this.telegram = telegram;
  }

  /**
   * Create a new broadcast post
   * Validates and stores metadata in Firestore for later publishing
   */
  async createBroadcast(adminId, broadcastData) {
    try {
      if (!broadcastData.channels || broadcastData.channels.length === 0) {
        throw new Error('At least one channel must be selected');
      }

      const broadcastDoc = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdBy: adminId,
        createdAt: new Date(),
        channels: broadcastData.channels, // Array of channel IDs
        
        // Content fields
        content: {
          text: broadcastData.text || '',
          markdown: broadcastData.markdown || true,
          html: broadcastData.html || false
        },
        
        // Media/Files
        media: broadcastData.media || [], // Array of {type, fileId, caption, parse_mode}
        attachments: broadcastData.attachments || [], // Array of {type, fileId, filename}
        
        // Interactive elements
        poll: broadcastData.poll || null, // {question, options[], is_anonymous?, allows_multiple_answers?, type?}
        inlineMenu: broadcastData.inlineMenu || null, // {buttons: [{text, url, callback_data}...]}
        
        // Scheduling
        scheduling: {
          isScheduled: broadcastData.isScheduled || false,
          scheduledTime: broadcastData.scheduledTime || null,
          status: 'draft' // draft, pending, published, failed
        },
        
        // Metadata
        metadata: {
          title: broadcastData.title || 'Untitled Broadcast',
          description: broadcastData.description || '',
          tags: broadcastData.tags || [],
          pinMessage: broadcastData.pinMessage || false,
          deleteAfterMinutes: broadcastData.deleteAfterMinutes || null
        },
        
        // Publishing results
        results: {
          successful: [],
          failed: [],
          pending: broadcastData.channels || []
        }
      };

      // Store in Firestore
      await db.collection('broadcasts').doc(broadcastDoc.id).set(broadcastDoc);

      logger.info('Broadcast created', {
        broadcastId: broadcastDoc.id,
        adminId,
        channels: broadcastData.channels.length
      });

      return broadcastDoc;
    } catch (error) {
      logger.error('Error creating broadcast:', error);
      throw error;
    }
  }

  /**
   * Publish broadcast to all selected channels
   */
  async publishBroadcast(broadcastId, telegram) {
    try {
      const broadcastDoc = await db.collection('broadcasts').doc(broadcastId).get();
      if (!broadcastDoc.exists) {
        throw new Error('Broadcast not found');
      }

      const broadcast = broadcastDoc.data();
      const results = {
        successful: [],
        failed: [],
        messageIds: {}
      };

      // Publish to each channel
      for (const channelId of broadcast.channels) {
        try {
          let messageId;

          // Case 1: Send media with caption
          if (broadcast.media && broadcast.media.length > 0) {
            const firstMedia = broadcast.media[0];
            messageId = await this.sendMediaMessage(
              telegram,
              channelId,
              firstMedia,
              broadcast.content.text,
              broadcast.inlineMenu
            );
          }
          // Case 2: Send file/document
          else if (broadcast.attachments && broadcast.attachments.length > 0) {
            const firstAttachment = broadcast.attachments[0];
            messageId = await this.sendFileMessage(
              telegram,
              channelId,
              firstAttachment,
              broadcast.content.text,
              broadcast.inlineMenu
            );
          }
          // Case 3: Send text only
          else {
            messageId = await telegram.sendMessage(
              channelId,
              broadcast.content.text,
              {
                parse_mode: broadcast.content.markdown ? 'Markdown' : 'HTML',
                reply_markup: broadcast.inlineMenu ? this.buildInlineKeyboard(broadcast.inlineMenu) : undefined,
                disable_web_page_preview: !broadcast.metadata.showPreview
              }
            );
          }

          // Case 4: Send poll separately if needed
          if (broadcast.poll) {
            await this.sendPoll(telegram, channelId, broadcast.poll);
          }

          // Pin message if requested
          if (broadcast.metadata.pinMessage && messageId) {
            try {
              await telegram.pinChatMessage(channelId, messageId);
            } catch (e) {
              logger.warn(`Could not pin message in ${channelId}:`, e.message);
            }
          }

          results.successful.push(channelId);
          results.messageIds[channelId] = messageId;
        } catch (error) {
          logger.error(`Failed to publish to channel ${channelId}:`, error);
          results.failed.push({
            channelId,
            error: error.message
          });
        }
      }

      // Update broadcast status
      const status = results.failed.length === 0 ? 'published' : 'partial';
      await db.collection('broadcasts').doc(broadcastId).update({
        'scheduling.status': status,
        'results.successful': results.successful,
        'results.failed': results.failed,
        'results.pending': [],
        'results.publishedAt': new Date()
      });

      logger.info('Broadcast published', {
        broadcastId,
        successful: results.successful.length,
        failed: results.failed.length
      });

      return results;
    } catch (error) {
      logger.error('Error publishing broadcast:', error);
      throw error;
    }
  }

  /**
   * Send media message (photo, video, audio, document)
   */
  async sendMediaMessage(telegram, channelId, media, caption, inlineMenu) {
    const options = {
      parse_mode: 'Markdown',
      caption: caption || '',
      reply_markup: inlineMenu ? this.buildInlineKeyboard(inlineMenu) : undefined
    };

    const mediaMap = {
      'photo': telegram.sendPhoto.bind(telegram),
      'video': telegram.sendVideo.bind(telegram),
      'audio': telegram.sendAudio.bind(telegram),
      'document': telegram.sendDocument.bind(telegram),
      'animation': telegram.sendAnimation.bind(telegram)
    };

    const sendFunction = mediaMap[media.type];
    if (!sendFunction) {
      throw new Error(`Unsupported media type: ${media.type}`);
    }

    const result = await sendFunction(channelId, media.fileId, options);
    return result.message_id;
  }

  /**
   * Send file/document message
   */
  async sendFileMessage(telegram, channelId, attachment, caption, inlineMenu) {
    const result = await telegram.sendDocument(
      channelId,
      attachment.fileId,
      {
        caption: caption || attachment.filename || '',
        parse_mode: 'Markdown',
        reply_markup: inlineMenu ? this.buildInlineKeyboard(inlineMenu) : undefined
      }
    );
    return result.message_id;
  }

  /**
   * Send poll
   */
  async sendPoll(telegram, channelId, poll) {
    const result = await telegram.sendPoll(
      channelId,
      poll.question,
      poll.options,
      {
        is_anonymous: poll.is_anonymous ?? true,
        allows_multiple_answers: poll.allows_multiple_answers ?? false,
        type: poll.type || 'regular'
      }
    );
    return result.message_id;
  }

  /**
   * Build inline keyboard from menu config
   */
  buildInlineKeyboard(inlineMenu) {
    if (!inlineMenu || !inlineMenu.buttons) {
      return undefined;
    }

    const keyboard = {
      inline_keyboard: inlineMenu.buttons.map(button => [
        {
          text: button.text,
          url: button.url || undefined,
          callback_data: button.callback_data || undefined,
          web_app: button.web_app || undefined,
          switch_inline_query: button.switch_inline_query || undefined
        }
      ])
    };

    return keyboard;
  }

  /**
   * Get all broadcasts (draft or published)
   */
  async getBroadcasts(filters = {}) {
    try {
      let query = db.collection('broadcasts');

      if (filters.status) {
        query = query.where('scheduling.status', '==', filters.status);
      }

      if (filters.createdBy) {
        query = query.where('createdBy', '==', filters.createdBy);
      }

      const result = await query
        .orderBy('createdAt', 'desc')
        .limit(filters.limit || 50)
        .get();

      return result.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error getting broadcasts:', error);
      throw error;
    }
  }

  /**
   * Get broadcast by ID
   */
  async getBroadcast(broadcastId) {
    try {
      const doc = await db.collection('broadcasts').doc(broadcastId).get();
      if (!doc.exists) {
        throw new Error('Broadcast not found');
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      logger.error('Error getting broadcast:', error);
      throw error;
    }
  }

  /**
   * Update broadcast (only if draft)
   */
  async updateBroadcast(broadcastId, updates) {
    try {
      const broadcast = await this.getBroadcast(broadcastId);

      if (broadcast.scheduling.status !== 'draft') {
        throw new Error('Can only update draft broadcasts');
      }

      await db.collection('broadcasts').doc(broadcastId).update({
        ...updates,
        updatedAt: new Date()
      });

      logger.info('Broadcast updated', { broadcastId });
      return { id: broadcastId, ...broadcast, ...updates };
    } catch (error) {
      logger.error('Error updating broadcast:', error);
      throw error;
    }
  }

  /**
   * Delete broadcast (only if draft)
   */
  async deleteBroadcast(broadcastId) {
    try {
      const broadcast = await this.getBroadcast(broadcastId);

      if (broadcast.scheduling.status !== 'draft') {
        throw new Error('Can only delete draft broadcasts');
      }

      await db.collection('broadcasts').doc(broadcastId).delete();

      logger.info('Broadcast deleted', { broadcastId });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting broadcast:', error);
      throw error;
    }
  }

  /**
   * Schedule broadcast for later
   */
  async scheduleBroadcast(broadcastId, scheduledTime) {
    try {
      const broadcast = await this.getBroadcast(broadcastId);

      if (broadcast.scheduling.status !== 'draft') {
        throw new Error('Can only schedule draft broadcasts');
      }

      if (new Date(scheduledTime) <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      await db.collection('broadcasts').doc(broadcastId).update({
        'scheduling.isScheduled': true,
        'scheduling.scheduledTime': new Date(scheduledTime),
        'scheduling.status': 'pending'
      });

      logger.info('Broadcast scheduled', { broadcastId, scheduledTime });
      return { success: true };
    } catch (error) {
      logger.error('Error scheduling broadcast:', error);
      throw error;
    }
  }

  /**
   * Get channel map from environment
   */
  static getChannelMap() {
    return {
      'contacto-pnp': process.env.FREE_CHANNEL_ID || '-1001234567890',
      'pnptv-prime': process.env.CHANNEL_ID || '-1009876543210',
      'both': [
        process.env.FREE_CHANNEL_ID || '-1001234567890',
        process.env.CHANNEL_ID || '-1009876543210'
      ]
    };
  }
}

module.exports = ChannelBroadcasterService;
