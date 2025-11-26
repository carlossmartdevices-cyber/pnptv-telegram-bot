/**
 * Post Data Model
 * Defines schema and operations for user posts (text, images, videos)
 */

const { db } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const POSTS_COLLECTION = 'posts';
const MAX_TEXT_LENGTH = 2000;
const MAX_MEDIA_FILES = 4;

/**
 * Post Schema:
 * {
 *   postId: string (auto-generated)
 *   userId: string (Telegram ID)
 *   username: string
 *   userPhotoFileId: string (for avatar in feed)
 *
 *   content: {
 *     text: string (max 2000 chars)
 *     media: [{
 *       type: 'image' | 'video'
 *       url: string (Firebase Storage URL)
 *       thumbnailUrl: string (for videos)
 *       fileName: string
 *       mimeType: string
 *       size: number (bytes)
 *     }]
 *   }
 *
 *   engagement: {
 *     likes: number
 *     comments: number
 *     shares: number
 *     views: number
 *   }
 *
 *   visibility: 'public' | 'members_only' | 'premium_only'
 *   isActive: boolean
 *   isPinned: boolean
 *
 *   location: {
 *     latitude: number
 *     longitude: number
 *     locationName: string
 *   } (optional)
 *
 *   tags: string[] (hashtags)
 *
 *   createdAt: timestamp
 *   updatedAt: timestamp
 * }
 */

class PostModel {
  /**
   * Create a new post
   */
  static async createPost(data) {
    const { userId, username, userPhotoFileId, text, media, visibility, location, tags } = data;

    if (!userId || !username) {
      throw new Error('userId and username are required');
    }

    if (!text && (!media || media.length === 0)) {
      throw new Error('Post must contain text or media');
    }

    if (text && text.length > MAX_TEXT_LENGTH) {
      throw new Error(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
    }

    if (media && media.length > MAX_MEDIA_FILES) {
      throw new Error(`Cannot upload more than ${MAX_MEDIA_FILES} media files`);
    }

    const post = {
      userId,
      username,
      userPhotoFileId: userPhotoFileId || null,
      content: {
        text: text || '',
        media: media || []
      },
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0
      },
      visibility: visibility || 'public',
      isActive: true,
      isPinned: false,
      location: location || null,
      tags: tags || [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection(POSTS_COLLECTION).add(post);

    return {
      postId: docRef.id,
      ...post,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get post by ID
   */
  static async getPostById(postId) {
    const doc = await db.collection(POSTS_COLLECTION).doc(postId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      postId: doc.id,
      ...doc.data()
    };
  }

  /**
   * Get feed posts (paginated, sorted by creation date)
   */
  static async getFeedPosts(options = {}) {
    const {
      limit = 20,
      lastPostId = null,
      userId = null, // Filter by specific user
      visibility = null, // Filter by visibility
      tags = null // Filter by tags
    } = options;

    let query = db.collection(POSTS_COLLECTION)
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    // Filter by user
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    // Filter by visibility
    if (visibility) {
      query = query.where('visibility', '==', visibility);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      query = query.where('tags', 'array-contains-any', tags);
    }

    // Pagination: start after last post
    if (lastPostId) {
      const lastDoc = await db.collection(POSTS_COLLECTION).doc(lastPostId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      postId: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get posts by user
   */
  static async getUserPosts(userId, limit = 20) {
    return this.getFeedPosts({ userId, limit });
  }

  /**
   * Get nearby posts (within radius)
   */
  static async getNearbyPosts(latitude, longitude, radiusKm = 50, limit = 20) {
    // Get all posts with location
    const snapshot = await db.collection(POSTS_COLLECTION)
      .where('isActive', '==', true)
      .where('location', '!=', null)
      .orderBy('location')
      .orderBy('createdAt', 'desc')
      .limit(limit * 3) // Fetch more to filter by distance
      .get();

    const posts = snapshot.docs.map(doc => ({
      postId: doc.id,
      ...doc.data()
    }));

    // Filter by distance
    const nearbyPosts = posts.filter(post => {
      if (!post.location) return false;

      const distance = this.calculateDistance(
        latitude,
        longitude,
        post.location.latitude,
        post.location.longitude
      );

      return distance <= radiusKm;
    });

    return nearbyPosts.slice(0, limit);
  }

  /**
   * Update post
   */
  static async updatePost(postId, updates) {
    const allowedUpdates = ['text', 'visibility', 'tags', 'isPinned'];
    const updateData = {};

    // Filter allowed updates
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        if (key === 'text') {
          updateData['content.text'] = updates.text;
        } else {
          updateData[key] = updates[key];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid updates provided');
    }

    updateData.updatedAt = FieldValue.serverTimestamp();

    await db.collection(POSTS_COLLECTION).doc(postId).update(updateData);

    return this.getPostById(postId);
  }

  /**
   * Delete post (soft delete)
   */
  static async deletePost(postId) {
    await db.collection(POSTS_COLLECTION).doc(postId).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp()
    });

    return true;
  }

  /**
   * Increment engagement metrics
   */
  static async incrementEngagement(postId, metric) {
    const validMetrics = ['likes', 'comments', 'shares', 'views'];

    if (!validMetrics.includes(metric)) {
      throw new Error('Invalid engagement metric');
    }

    await db.collection(POSTS_COLLECTION).doc(postId).update({
      [`engagement.${metric}`]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });

    return true;
  }

  /**
   * Get post statistics for a user
   */
  static async getUserPostStats(userId) {
    const posts = await this.getUserPosts(userId, 1000);

    const stats = {
      totalPosts: posts.length,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalViews: 0
    };

    posts.forEach(post => {
      stats.totalLikes += post.engagement?.likes || 0;
      stats.totalComments += post.engagement?.comments || 0;
      stats.totalShares += post.engagement?.shares || 0;
      stats.totalViews += post.engagement?.views || 0;
    });

    return stats;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = PostModel;
