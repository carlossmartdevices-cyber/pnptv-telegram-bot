/**
 * Post Like System
 * Handles user likes on posts
 */

const { db } = require('../../../config/firebase');
const logger = require('../../../utils/logger');
const { t } = require('../../../utils/i18n');
const PostModel = require('../../../models/post');

const POSTS_COLLECTION = 'posts';
const POST_LIKES_COLLECTION = 'postLikes';

class PostLikeService {
  /**
   * Like a post
   */
  static async likePost(postId, userId) {
    try {
      const likeDocId = `${postId}_${userId}`;

      // Check if already liked
      const likeDoc = await db.collection(POST_LIKES_COLLECTION)
        .doc(likeDocId)
        .get();

      if (likeDoc.exists) {
        throw new Error('User has already liked this post');
      }

      // Create like record
      await db.collection(POST_LIKES_COLLECTION).doc(likeDocId).set({
        postId,
        userId,
        createdAt: new Date()
      });

      // Increment like count
      await db.collection(POSTS_COLLECTION).doc(postId).update({
        'engagement.likes': db.FieldValue.increment(1)
      });

      logger.info('Post liked', { postId, userId });
      return true;
    } catch (error) {
      logger.error('Error liking post:', error);
      throw error;
    }
  }

  /**
   * Unlike a post
   */
  static async unlikePost(postId, userId) {
    try {
      const likeDocId = `${postId}_${userId}`;

      // Delete like record
      await db.collection(POST_LIKES_COLLECTION)
        .doc(likeDocId)
        .delete();

      // Decrement like count
      await db.collection(POSTS_COLLECTION).doc(postId).update({
        'engagement.likes': db.FieldValue.increment(-1)
      });

      logger.info('Post unliked', { postId, userId });
      return true;
    } catch (error) {
      logger.error('Error unliking post:', error);
      throw error;
    }
  }

  /**
   * Check if user has liked post
   */
  static async isPostLiked(postId, userId) {
    try {
      const likeDocId = `${postId}_${userId}`;
      const likeDoc = await db.collection(POST_LIKES_COLLECTION)
        .doc(likeDocId)
        .get();

      return likeDoc.exists;
    } catch (error) {
      logger.error('Error checking if post is liked:', error);
      throw error;
    }
  }

  /**
   * Get top posts by likes
   */
  static async getTopPostsByLikes(limit = 10, timeframeHours = 24) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - timeframeHours);

      const snapshot = await db.collection(POSTS_COLLECTION)
        .where('isActive', '==', true)
        .where('createdAt', '>=', cutoffDate)
        .orderBy('createdAt', 'desc')
        .get();

      const posts = snapshot.docs
        .map(doc => ({
          postId: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => (b.engagement?.likes || 0) - (a.engagement?.likes || 0))
        .slice(0, limit);

      return posts;
    } catch (error) {
      logger.error('Error getting top posts by likes:', error);
      throw error;
    }
  }

  /**
   * Get post like count
   */
  static async getPostLikeCount(postId) {
    try {
      const snapshot = await db.collection(POST_LIKES_COLLECTION)
        .where('postId', '==', postId)
        .get();

      return snapshot.size;
    } catch (error) {
      logger.error('Error getting post like count:', error);
      throw error;
    }
  }

  /**
   * Get users who liked a post
   */
  static async getPostLikers(postId, limit = 10) {
    try {
      const snapshot = await db.collection(POST_LIKES_COLLECTION)
        .where('postId', '==', postId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      logger.error('Error getting post likers:', error);
      throw error;
    }
  }
}

/**
 * Handle post like button callback
 */
async function handlePostLikeButton(ctx) {
  try {
    const match = ctx.callbackQuery.data.match(/^post_like_(.+)$/);
    if (!match) {
      await ctx.answerCbQuery('Invalid request');
      return;
    }

    const postId = match[1];
    const userId = ctx.from.id.toString();
    const lang = ctx.session?.language || 'en';

    // Check if already liked
    const isLiked = await PostLikeService.isPostLiked(postId, userId);

    if (isLiked) {
      // Unlike
      await PostLikeService.unlikePost(postId, userId);
      await ctx.answerCbQuery(lang === 'es' ? 'Me gusta quitado' : 'Like removed');
    } else {
      // Like
      await PostLikeService.likePost(postId, userId);
      await ctx.answerCbQuery(lang === 'es' ? '¡Te ha gustado!' : 'Liked!');
    }

    // Update message with new like count
    const post = await PostModel.getPostById(postId);
    if (post) {
      const caption = buildUpdatedCaption(post, isLiked);
      try {
        await ctx.editMessageCaption(caption, {
          parse_mode: 'HTML',
          reply_markup: buildButtons(post, userId)
        });
      } catch (error) {
        // Ignore edit errors
        logger.debug('Could not update message caption:', error.message);
      }
    }

    logger.info('Post like toggled', { postId, userId, wasLiked: isLiked });
  } catch (error) {
    logger.error('Error handling post like button:', error);
    await ctx.answerCbQuery(t(ctx, 'errors.generic'));
  }
}

/**
 * Helper: Build updated caption with new engagement stats
 */
function buildUpdatedCaption(post, wasLiked) {
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

  // Engagement stats (updated)
  const newLikes = wasLiked 
    ? (post.engagement?.likes || 0) - 1 
    : (post.engagement?.likes || 0) + 1;

  parts.push(`\n<code>❤️ ${newLikes} | 👁️ ${post.engagement?.views || 0}</code>`);

  return parts.join('\n');
}

/**
 * Helper: Build buttons with updated like status
 */
function buildButtons(post, userId) {
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

module.exports = {
  PostLikeService,
  handlePostLikeButton
};
