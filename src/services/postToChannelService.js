/**
 * Post-to-Channel System
 * Core service for publishing posts to Telegram channels with advanced management
 */

const { db } = require('../config/firebase');
const logger = require('../utils/logger');
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const CHANNEL_POSTS_COLLECTION = 'channelPosts';
const POSTS_COLLECTION = 'posts';
const BROADCAST_SCHEDULES_COLLECTION = 'broadcastSchedules';

class PostToChannelService {
  /**
   * Publish a single post to a channel
   */
  static async publishPostToChannel(postId, channelId, options = {}) {
    try {
      const {
        addCaption = true,
        addButtons = true,
        parseMode = 'HTML',
        maxRetries = 3
      } = options;

      // Get post data
      const post = await this.getPostData(postId);
      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Check visibility
      if (!this.isPostVisibleInChannel(post, channelId)) {
        throw new Error('Post visibility does not allow channel publication');
      }

      // Prepare message
      const caption = addCaption ? this.buildCaption(post) : '';
      const media = post.content.media || [];

      let telegramMessageId = null;
      let retryCount = 0;

      // Publish with media or text-only
      while (retryCount < maxRetries) {
        try {
          if (media.length > 0) {
            telegramMessageId = await this.sendMediaMessage(
              channelId,
              post,
              caption,
              parseMode
            );
          } else {
            telegramMessageId = await bot.telegram.sendMessage(
              channelId,
              caption,
              {
                parse_mode: parseMode,
                disable_web_page_preview: true,
                reply_markup: addButtons ? this.buildButtons(post) : undefined
              }
            );
          }
          break;
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          logger.warn(`Retry ${retryCount}/${maxRetries} for post ${postId}`, error.message);
          await new Promise(r => setTimeout(r, 1000 * retryCount));
        }
      }

      // Record channel post
      const channelPostRef = await db.collection(CHANNEL_POSTS_COLLECTION).add({
        channelId,
        postId,
        telegramMessageId,
        userId: post.userId,
        publishedAt: new Date(),
        engagement: {
          views: 0,
          forwardCount: 0,
          reactions: {}
        },
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update original post with channel metadata
      await db.collection(POSTS_COLLECTION).doc(postId).update({
        channelPostedAt: new Date(),
        publishedChannels: post.publishedChannels
          ? [...(post.publishedChannels || []), channelId]
          : [channelId]
      });

      logger.info(`Post ${postId} published to channel ${channelId}`, {
        channelPostId: channelPostRef.id,
        messageId: telegramMessageId
      });

      return {
        channelPostId: channelPostRef.id,
        telegramMessageId,
        publishedAt: new Date()
      };
    } catch (error) {
      logger.error('Error publishing post to channel:', error);
      throw error;
    }
  }

  /**
   * Publish multiple posts to channels (batch operation)
   */
  static async publishBatch(postIds, channelIds, options = {}) {
    const {
      delay = 100, // ms between posts
      stopOnError = false,
      progressCallback = null
    } = options;

    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < postIds.length; i++) {
      const postId = postIds[i];
      for (let j = 0; j < channelIds.length; j++) {
        const channelId = channelIds[j];

        try {
          await this.publishPostToChannel(postId, channelId, options);
          results.successful++;

          if (progressCallback) {
            progressCallback({
              current: i * channelIds.length + j + 1,
              total: postIds.length * channelIds.length,
              status: 'success'
            });
          }

          // Delay between posts
          await new Promise(r => setTimeout(r, delay));
        } catch (error) {
          results.failed++;
          results.errors.push({
            postId,
            channelId,
            error: error.message
          });

          if (progressCallback) {
            progressCallback({
              current: i * channelIds.length + j + 1,
              total: postIds.length * channelIds.length,
              status: 'error'
            });
          }

          if (stopOnError) {
            throw error;
          }
        }
      }
    }

    logger.info('Batch publish completed', results);
    return results;
  }

  /**
   * Schedule posts for future publication
   */
  static async scheduleBroadcast(broadcastData) {
    try {
      const {
        adminId,
        title,
        description,
        postIds,
        channelIds,
        scheduledTime,
        tags = []
      } = broadcastData;

      if (!postIds || postIds.length === 0) {
        throw new Error('No posts selected');
      }

      if (!channelIds || channelIds.length === 0) {
        throw new Error('No channels selected');
      }

      if (scheduledTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      const broadcast = {
        adminId,
        title,
        description,
        postIds,
        channelIds,
        scheduledTime,
        tags,
        status: 'scheduled', // draft, scheduled, sent, cancelled
        executedAt: null,
        results: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection(BROADCAST_SCHEDULES_COLLECTION).add(broadcast);

      logger.info(`Broadcast ${docRef.id} scheduled for ${scheduledTime}`, {
        postCount: postIds.length,
        channelCount: channelIds.length
      });

      return {
        broadcastId: docRef.id,
        ...broadcast
      };
    } catch (error) {
      logger.error('Error scheduling broadcast:', error);
      throw error;
    }
  }

  /**
   * Execute scheduled broadcast
   */
  static async executeScheduledBroadcast(broadcastId) {
    try {
      const broadcastDoc = await db.collection(BROADCAST_SCHEDULES_COLLECTION)
        .doc(broadcastId)
        .get();

      if (!broadcastDoc.exists) {
        throw new Error(`Broadcast ${broadcastId} not found`);
      }

      const broadcast = broadcastDoc.data();

      if (broadcast.status !== 'scheduled') {
        throw new Error(`Broadcast status is ${broadcast.status}, expected 'scheduled'`);
      }

      // Execute publish
      const results = await this.publishBatch(
        broadcast.postIds,
        broadcast.channelIds,
        { stopOnError: false }
      );

      // Update broadcast record
      await db.collection(BROADCAST_SCHEDULES_COLLECTION).doc(broadcastId).update({
        status: 'sent',
        executedAt: new Date(),
        results,
        updatedAt: new Date()
      });

      logger.info(`Broadcast ${broadcastId} executed`, results);
      return results;
    } catch (error) {
      logger.error('Error executing scheduled broadcast:', error);
      throw error;
    }
  }

  /**
   * Get scheduled broadcasts
   */
  static async getScheduledBroadcasts(filter = {}) {
    try {
      const {
        status = null,
        adminId = null,
        limit = 50,
        offset = 0
      } = filter;

      let query = db.collection(BROADCAST_SCHEDULES_COLLECTION)
        .orderBy('scheduledTime', 'desc');

      if (status) {
        query = query.where('status', '==', status);
      }

      if (adminId) {
        query = query.where('adminId', '==', adminId);
      }

      const snapshot = await query
        .offset(offset)
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        broadcastId: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error fetching scheduled broadcasts:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled broadcast
   */
  static async cancelBroadcast(broadcastId) {
    try {
      const broadcastDoc = await db.collection(BROADCAST_SCHEDULES_COLLECTION)
        .doc(broadcastId)
        .get();

      if (!broadcastDoc.exists) {
        throw new Error(`Broadcast ${broadcastId} not found`);
      }

      const broadcast = broadcastDoc.data();

      if (broadcast.status === 'sent') {
        throw new Error('Cannot cancel a broadcast that has already been sent');
      }

      await db.collection(BROADCAST_SCHEDULES_COLLECTION).doc(broadcastId).update({
        status: 'cancelled',
        updatedAt: new Date()
      });

      logger.info(`Broadcast ${broadcastId} cancelled`);
      return true;
    } catch (error) {
      logger.error('Error cancelling broadcast:', error);
      throw error;
    }
  }

  /**
   * Get channel posts
   */
  static async getChannelPosts(channelId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        status = 'published'
      } = options;

      let query = db.collection(CHANNEL_POSTS_COLLECTION)
        .where('channelId', '==', channelId)
        .orderBy('publishedAt', 'desc');

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query
        .offset(offset)
        .limit(limit)
        .get();

      const posts = [];
      for (const doc of snapshot.docs) {
        const post = doc.data();
        const originalPost = await this.getPostData(post.postId);
        posts.push({
          channelPostId: doc.id,
          ...post,
          originalPost
        });
      }

      return posts;
    } catch (error) {
      logger.error('Error fetching channel posts:', error);
      throw error;
    }
  }

  /**
   * Get channel post analytics
   */
  static async getChannelAnalytics(channelId, options = {}) {
    try {
      const {
        days = 30
      } = options;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const snapshot = await db.collection(CHANNEL_POSTS_COLLECTION)
        .where('channelId', '==', channelId)
        .where('publishedAt', '>=', cutoffDate)
        .get();

      let totalViews = 0;
      let totalForwards = 0;
      let totalPosts = snapshot.size;
      const postAnalytics = [];

      snapshot.forEach(doc => {
        const post = doc.data();
        totalViews += post.engagement?.views || 0;
        totalForwards += post.engagement?.forwardCount || 0;
        postAnalytics.push({
          postId: post.postId,
          views: post.engagement?.views || 0,
          forwards: post.engagement?.forwardCount || 0,
          publishedAt: post.publishedAt
        });
      });

      return {
        channelId,
        period: `${days} days`,
        totalPosts,
        totalViews,
        totalForwards,
        averageViewsPerPost: totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0,
        topPosts: postAnalytics.sort((a, b) => b.views - a.views).slice(0, 10)
      };
    } catch (error) {
      logger.error('Error fetching channel analytics:', error);
      throw error;
    }
  }

  /**
   * Helper: Get post data
   */
  static async getPostData(postId) {
    try {
      const doc = await db.collection(POSTS_COLLECTION).doc(postId).get();
      return doc.exists ? { postId: doc.id, ...doc.data() } : null;
    } catch (error) {
      logger.error(`Error getting post ${postId}:`, error);
      return null;
    }
  }

  /**
   * Helper: Check if post is visible in channel
   */
  static isPostVisibleInChannel(post, channelId) {
    // Implement visibility rules based on channel type
    // For now, return true (can be customized)
    return post.isActive && post.visibility !== 'private';
  }

  /**
   * Helper: Build post caption
   */
  static buildCaption(post) {
    const parts = [];

    // User info
    if (post.username) {
      parts.push(`<b>👤 ${post.username}</b>`);
    }

    // Content text
    if (post.content?.text) {
      parts.push(post.content.text);
    }

    // Tags
    if (post.tags && post.tags.length > 0) {
      parts.push(`\n\n<i>${post.tags.map(t => `#${t}`).join(' ')}</i>`);
    }

    // Engagement stats
    parts.push(`\n<code>❤️ ${post.engagement?.likes || 0} | 👁️ ${post.engagement?.views || 0}</code>`);

    return parts.join('\n');
  }

  /**
   * Helper: Build inline buttons for post
   */
  static buildButtons(post) {
    return {
      inline_keyboard: [
        [
          {
            text: '❤️ Like',
            callback_data: `post_like_${post.postId}`
          },
          {
            text: '↗️ Share',
            callback_data: `post_share_${post.postId}`
          }
        ]
      ]
    };
  }

  /**
   * Helper: Send media message
   */
  static async sendMediaMessage(channelId, post, caption, parseMode) {
    const media = post.content.media;

    if (media.length === 0) {
      throw new Error('No media found');
    }

    // Send first media with caption
    const firstMedia = media[0];

    if (firstMedia.type === 'image') {
      return (await bot.telegram.sendPhoto(
        channelId,
        firstMedia.url,
        {
          caption,
          parse_mode: parseMode,
          disable_web_page_preview: true
        }
      )).message_id;
    } else if (firstMedia.type === 'video') {
      return (await bot.telegram.sendVideo(
        channelId,
        firstMedia.url,
        {
          caption,
          parse_mode: parseMode
        }
      )).message_id;
    } else if (firstMedia.type === 'document') {
      return (await bot.telegram.sendDocument(
        channelId,
        firstMedia.url,
        {
          caption,
          parse_mode: parseMode
        }
      )).message_id;
    } else {
      throw new Error(`Unsupported media type: ${firstMedia.type}`);
    }
  }

  /**
   * Update post engagement from Telegram
   */
  static async updateEngagementFromTelegram(channelPostId, telegramMessageId) {
    try {
      // Get message info from Telegram (requires admin rights)
      // This is a simplified version - actual implementation would need
      // to use Telegram Bot API with appropriate permissions
      
      const channelPostDoc = await db.collection(CHANNEL_POSTS_COLLECTION)
        .doc(channelPostId)
        .get();

      if (!channelPostDoc.exists) {
        throw new Error(`Channel post ${channelPostId} not found`);
      }

      // Update engagement stats
      // (Would be populated from Telegram API in production)

      logger.info(`Updated engagement for channel post ${channelPostId}`);
      return true;
    } catch (error) {
      logger.error('Error updating engagement:', error);
      throw error;
    }
  }
}

module.exports = PostToChannelService;
