/**
 * PNPtv Web Server
 * Serves the mini app and provides API endpoints
 */

const express = require('express');
const path = require('path');
const { db } = require('../config/firebase');
const logger = require('../utils/logger');
const { authenticateTelegramUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || process.env.WEB_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache-busting middleware for static files
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// CORS for Telegram Mini Apps
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Telegram-Init-Data');
    next();
});

// ========================================
// Helper Functions
// ========================================

function serializeDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    return null;
}

// ========================================
// Posts API
// ========================================

/**
 * Get community posts
 */
app.get('/api/posts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const postsSnapshot = await db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const posts = [];
        for (const doc of postsSnapshot.docs) {
            const postData = doc.data();

            // Get user info
            let username = 'Anonymous';
            try {
                const userDoc = await db.collection('users').doc(postData.userId).get();
                if (userDoc.exists) {
                    username = userDoc.data().username || 'Anonymous';
                }
            } catch (err) {
                logger.warn(`Failed to get username for user ${postData.userId}`);
            }

            posts.push({
                id: doc.id,
                userId: postData.userId,
                username,
                content: postData.content,
                imageUrl: postData.imageUrl || null,
                createdAt: serializeDate(postData.createdAt),
                likes: postData.likes || 0,
                comments: postData.comments || 0
            });
        }

        res.json({ success: true, posts });
        logger.info('Posts fetched successfully');
    } catch (error) {
        logger.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

/**
 * Create a new post
 */
app.post('/api/posts', authenticateTelegramUser, async (req, res) => {
    try {
        const { userId, content, imageUrl } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (content.length > 1000) {
            return res.status(400).json({ error: 'Content too long (max 1000 characters)' });
        }

        const postData = {
            userId,
            content: content.trim(),
            imageUrl: imageUrl || null,
            createdAt: new Date(),
            likes: 0,
            comments: 0,
            likedBy: []
        };

        const postRef = await db.collection('posts').add(postData);

        // Update user's post count
        try {
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                postsCount: (await userRef.get()).data()?.postsCount + 1 || 1
            });
        } catch (err) {
            logger.warn(`Failed to update post count for user ${userId}`);
        }

        res.json({
            success: true,
            post: {
                id: postRef.id,
                ...postData,
                createdAt: postData.createdAt.toISOString()
            }
        });

        logger.info(`Post created by user ${userId}`);
    } catch (error) {
        logger.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

/**
 * Like a post
 */
app.post('/api/posts/:postId/like', authenticateTelegramUser, async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const postData = postDoc.data();
        const likedBy = postData.likedBy || [];

        if (likedBy.includes(userId)) {
            // Unlike
            await postRef.update({
                likes: (postData.likes || 1) - 1,
                likedBy: likedBy.filter(id => id !== userId)
            });
            res.json({ success: true, liked: false });
        } else {
            // Like
            await postRef.update({
                likes: (postData.likes || 0) + 1,
                likedBy: [...likedBy, userId]
            });
            res.json({ success: true, liked: true });
        }

        logger.info(`Post ${postId} liked/unliked by user ${userId}`);
    } catch (error) {
        logger.error('Error liking post:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
});

// ========================================
// Contact API
// ========================================

/**
 * Submit contact form
 */
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const contactData = {
            name,
            email,
            subject,
            message,
            createdAt: new Date(),
            status: 'new'
        };

        await db.collection('contact_messages').add(contactData);

        res.json({ success: true, message: 'Message sent successfully' });
        logger.info(`Contact message received from ${email}`);
    } catch (error) {
        logger.error('Error submitting contact form:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ========================================
// Active Users API
// ========================================

/**
 * Get recently active users
 */
app.get('/api/users/active', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const usersSnapshot = await db.collection('users')
            .where('lastActive', '>=', fiveMinutesAgo)
            .orderBy('lastActive', 'desc')
            .limit(limit)
            .get();

        const users = usersSnapshot.docs.map(doc => ({
            userId: doc.id,
            username: doc.data().username || 'Anonymous',
            lastActive: serializeDate(doc.data().lastActive)
        }));

        res.json({ success: true, users });
    } catch (error) {
        logger.error('Error fetching active users:', error);
        res.status(500).json({ error: 'Failed to fetch active users' });
    }
});

// ========================================
// Profile API
// ========================================

/**
 * Get user profile
 */
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();

        res.json({
            success: true,
            user: {
                userId,
                username: userData.username || 'Anonymous',
                bio: userData.bio || null,
                role: userData.role || 'member',
                tier: userData.tier || 'Free',
                postsCount: userData.postsCount || 0,
                followers: userData.followers || 0,
                createdAt: serializeDate(userData.createdAt),
                lastActive: serializeDate(userData.lastActive)
            }
        });

        logger.info(`Profile fetched for user ${userId}`);
    } catch (error) {
        logger.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * Update user profile
 */
app.put('/api/profile/:userId', authenticateTelegramUser, async (req, res) => {
    try {
        const { userId } = req.params;
        const { bio } = req.body;

        const userRef = db.collection('users').doc(userId);
        const updateData = {};

        if (bio !== undefined) {
            if (bio.length > 500) {
                return res.status(400).json({ error: 'Bio too long (max 500 characters)' });
            }
            updateData.bio = bio.trim();
        }

        updateData.updatedAt = new Date();

        await userRef.update(updateData);

        res.json({ success: true, message: 'Profile updated' });
        logger.info(`Profile updated for user ${userId}`);
    } catch (error) {
        logger.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ========================================
// AI Chatbot API (Cristina)
// ========================================

/**
 * Chat with AI assistant
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Save chat message
        await db.collection('chat_history').add({
            userId,
            message,
            timestamp: new Date()
        });

        // In production, integrate with actual LLM API (OpenAI, Anthropic, etc.)
        // For now, return a simple response
        const response = generateSimpleResponse(message);

        res.json({
            success: true,
            response,
            timestamp: new Date().toISOString()
        });

        logger.info(`Chat message processed for user ${userId}`);
    } catch (error) {
        logger.error('Error processing chat:', error);
        res.status(500).json({ error: 'Failed to process chat' });
    }
});

function generateSimpleResponse(message) {
    const lowerMessage = message.toLowerCase();

    const responses = {
        'hello': 'Hi there! How can I help you today?',
        'help': 'I can help you with questions about PNPtv features, your account, or general support. What would you like to know?',
        'feature': 'PNPtv offers community feeds, live streaming, user profiles, and premium memberships. Which feature interests you?',
        'profile': 'You can customize your profile by going to the Profile tab and tapping the edit button.',
        'post': 'To create a post, tap the + button on the Feed page. You can share text and images with the community.',
        'premium': 'Premium members get exclusive features like priority support, advanced customization, and ad-free experience.',
        'contact': 'You can reach us through the Contact tab, or I can help answer your questions right here!',
        'default': 'I understand you\'re asking about that. Could you provide more details so I can better assist you?'
    };

    for (const [keyword, response] of Object.entries(responses)) {
        if (keyword !== 'default' && lowerMessage.includes(keyword)) {
            return response;
        }
    }

    return responses.default;
}

// ========================================
// Main Routes
// ========================================

/**
 * Serve new mini app
 */
app.get('/new-app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'new-app.html'));
});

/**
 * Serve main app (default)
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'new-app.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Track server instance
let serverInstance = null;

/**
 * Start server
 */
function startServer() {
    return new Promise((resolve, reject) => {
        if (serverInstance) {
            logger.info('Web server already running');
            return resolve(serverInstance);
        }

        const server = app.listen(PORT, () => {
            logger.info(`Web server running on port ${PORT}`);
            console.log(`🌐 Mini App available at: http://localhost:${PORT}`);
            serverInstance = server;
            resolve(server);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.warn(`Port ${PORT} already in use`);
                resolve(null);
            } else {
                logger.error('Failed to start web server:', error);
                reject(error);
            }
        });
    });
}

module.exports = { app, startServer };
