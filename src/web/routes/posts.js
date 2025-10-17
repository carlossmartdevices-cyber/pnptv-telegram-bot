/**
 * Posts API Routes
 * Handles CRUD operations for user posts (text, images, videos)
 */

const express = require('express');
const multer = require('multer');
const { admin } = require('../../config/firebase');
const PostModel = require('../../models/post');
const logger = require('../../utils/logger');
const path = require('path');

const router = express.Router();

function serializeTimestamp(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function normalizeMediaItem(media = {}) {
  if (!media || typeof media !== 'object') {
    return null;
  }

  return {
    type: media.type || (media.mimeType && media.mimeType.startsWith('video/') ? 'video' : 'image'),
    url: media.url,
    thumbnailUrl: media.thumbnailUrl || null,
    fileName: media.fileName || null,
    mimeType: media.mimeType || null,
    size: media.size || null,
  };
}

function normalizePostForResponse(post) {
  if (!post) {
    return null;
  }

  const content = post.content || {};
  const engagement = post.engagement || {};
  const postId = post.postId || post.id;

  const normalizedMedia = Array.isArray(content.media)
    ? content.media.map(normalizeMediaItem).filter(Boolean)
    : [];

  return {
    postId,
    userId: post.userId,
    username: post.username || null,
    userPhotoFileId: post.userPhotoFileId || null,
    content: {
      text: content.text || '',
      media: normalizedMedia,
    },
    engagement: {
      likes: engagement.likes || 0,
      comments: engagement.comments || 0,
      shares: engagement.shares || 0,
      views: engagement.views || 0,
    },
    visibility: post.visibility || 'public',
    isActive: post.isActive !== false,
    isPinned: post.isPinned || false,
    location: post.location || null,
    locationName: post.locationName || null,
    tags: Array.isArray(post.tags) ? post.tags : [],
    createdAt: serializeTimestamp(post.createdAt),
    updatedAt: serializeTimestamp(post.updatedAt),
  };
}

function assertStorageBucket() {
  if (!bucket) {
    throw new Error('Firebase Storage bucket is not configured.');
  }
}

// Initialize Firebase Storage (only if bucket is configured)
let bucket = null;
try {
  bucket = admin.storage().bucket();
  logger.info(`Firebase Storage bucket initialized: ${bucket.name}`);
} catch (error) {
  logger.error('Firebase Storage bucket initialization failed:', error);
  logger.warn('Firebase Storage bucket not configured. File uploads will be disabled.');
  logger.warn('To enable file uploads, set FIREBASE_STORAGE_BUCKET in your environment variables.');
  logger.warn(`Error details: ${error.message}`);
}

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

/**
 * Helper: Upload file to Firebase Storage
 */
async function uploadToStorage(file, userId, postId) {
  assertStorageBucket();

  const fileExtension = path.extname(file.originalname);
  const fileName = `posts/${userId}/${postId}/${Date.now()}${fileExtension}`;
  const fileUpload = bucket.file(fileName);

  const stream = fileUpload.createWriteStream({
    metadata: {
      contentType: file.mimetype,
      metadata: {
        userId: userId,
        postId: postId,
        originalName: file.originalname
      }
    },
    resumable: false
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (error) => {
      logger.error('Error uploading file to Firebase Storage:', error);
      reject(error);
    });

    stream.on('finish', async () => {
      try {
        // Make file publicly accessible
        await fileUpload.makePublic();

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        resolve({
          url: publicUrl,
          fileName: fileName,
          mimeType: file.mimetype,
          size: file.size
        });
      } catch (error) {
        reject(error);
      }
    });

    stream.end(file.buffer);
  });
}

/**
 * POST /api/posts
 * Create a new post with text and/or media
 */
router.post('/', upload.array('media', 4), async (req, res) => {
  try {
    const { userId, username, userPhotoFileId, text, visibility, tags, location } = req.body;

    // Validate required fields
    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        error: 'userId and username are required'
      });
    }

    const trimmedText = typeof text === 'string' ? text.trim() : '';

    // Validate content
    if (!trimmedText && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Post must contain text or media'
      });
    }

    if (req.files && req.files.length > 0 && !bucket) {
      return res.status(503).json({
        success: false,
        error: 'File uploads are currently unavailable',
      });
    }

    // Generate temporary post ID for file uploads
    const tempPostId = `temp_${Date.now()}`;

    // Upload media files to Firebase Storage
    const mediaArray = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadedFile = await uploadToStorage(file, userId, tempPostId);

          mediaArray.push({
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            url: uploadedFile.url,
            fileName: uploadedFile.fileName,
            mimeType: uploadedFile.mimeType,
            size: uploadedFile.size,
            thumbnailUrl: null // Can be generated later for videos
          });
        } catch (uploadError) {
          logger.error('Error uploading media file:', uploadError);
          // Continue with other files
        }
      }
    }

    // Parse location if provided
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (e) {
        logger.warn('Invalid location format:', location);
      }
    }

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        logger.warn('Invalid tags format:', tags);
      }
    }

    // Create post in Firestore
    const post = await PostModel.createPost({
      userId,
      username,
      userPhotoFileId,
      text: trimmedText,
      media: mediaArray,
      visibility: visibility || 'public',
      location: parsedLocation,
      tags: parsedTags
    });

    res.json({
      success: true,
      post: normalizePostForResponse(post)
    });

    logger.info(`Post created by user ${userId}, postId: ${post.postId}`);
  } catch (error) {
    logger.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/feed
 * Get feed posts (paginated)
 */
router.get('/feed', async (req, res) => {
  try {
    const {
      limit = 20,
      lastPostId = null,
      userId = null,
      visibility = null,
      tags = null
    } = req.query;

    const parsedTags = tags ? JSON.parse(tags) : null;

    const posts = await PostModel.getFeedPosts({
      limit: parseInt(limit),
      lastPostId,
      userId,
      visibility,
      tags: parsedTags
    });

    const normalizedPosts = posts
      .map(normalizePostForResponse)
      .filter(Boolean);

    res.json({
      success: true,
      posts: normalizedPosts,
      hasMore: posts.length === parseInt(limit)
    });

    logger.info(`Feed posts fetched: ${posts.length} posts`);
  } catch (error) {
    logger.error('Error fetching feed posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feed posts',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/user/:userId
 * Get posts by specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const posts = await PostModel.getUserPosts(userId, parseInt(limit));

    const normalizedPosts = posts
      .map(normalizePostForResponse)
      .filter(Boolean);

    res.json({
      success: true,
      posts: normalizedPosts
    });

    logger.info(`User posts fetched for ${userId}: ${posts.length} posts`);
  } catch (error) {
    logger.error('Error fetching user posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user posts',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/nearby
 * Get nearby posts within radius
 */
router.get('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'latitude and longitude are required'
      });
    }

    const posts = await PostModel.getNearbyPosts(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      parseInt(limit)
    );

    const normalizedPosts = posts
      .map(normalizePostForResponse)
      .filter(Boolean);

    res.json({
      success: true,
      posts: normalizedPosts
    });

    logger.info(`Nearby posts fetched: ${posts.length} posts within ${radius}km`);
  } catch (error) {
    logger.error('Error fetching nearby posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby posts',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/:postId
 * Get specific post by ID
 */
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await PostModel.getPostById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Increment view count
    await PostModel.incrementEngagement(postId, 'views');

    res.json({
      success: true,
      post: normalizePostForResponse(post)
    });

    logger.info(`Post fetched: ${postId}`);
  } catch (error) {
    logger.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post',
      message: error.message
    });
  }
});

/**
 * PUT /api/posts/:postId
 * Update a post
 */
router.put('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, visibility, tags, isPinned } = req.body;

    const updates = {};
    if (text !== undefined) updates.text = text;
    if (visibility !== undefined) updates.visibility = visibility;
    if (tags !== undefined) updates.tags = tags;
    if (isPinned !== undefined) updates.isPinned = isPinned;

    const updatedPost = await PostModel.updatePost(postId, updates);

    res.json({
      success: true,
      post: normalizePostForResponse(updatedPost)
    });

    logger.info(`Post updated: ${postId}`);
  } catch (error) {
    logger.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post',
      message: error.message
    });
  }
});

/**
 * DELETE /api/posts/:postId
 * Delete a post (soft delete)
 */
router.delete('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    // Get post to verify ownership
    const post = await PostModel.getPostById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Verify user owns the post
    if (post.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own posts'
      });
    }

    await PostModel.deletePost(postId);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

    logger.info(`Post deleted: ${postId} by user ${userId}`);
  } catch (error) {
    logger.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
      message: error.message
    });
  }
});

/**
 * POST /api/posts/:postId/like
 * Like a post
 */
router.post('/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;

    await PostModel.incrementEngagement(postId, 'likes');

    res.json({
      success: true,
      message: 'Post liked successfully'
    });

    logger.info(`Post liked: ${postId}`);
  } catch (error) {
    logger.error('Error liking post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like post',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/user/:userId/stats
 * Get post statistics for a user
 */
router.get('/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await PostModel.getUserPostStats(userId);

    res.json({
      success: true,
      stats
    });

    logger.info(`Post stats fetched for user ${userId}`);
  } catch (error) {
    logger.error('Error fetching post stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post stats',
      message: error.message
    });
  }
});

module.exports = router;
