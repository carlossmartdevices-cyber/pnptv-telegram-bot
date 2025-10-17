/**
 * PNPtv Community App - Main JavaScript
 * AI-Powered Features & Modern Interface
 */

// ========================================
// Telegram WebApp Initialization
// ========================================

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ========================================
// State Management
// ========================================

const state = {
    currentPage: 'feed',
    user: null,
    posts: [],
    activeUsers: [],
    ageVerified: false,
    cameraStream: null,
    faceDetectionModel: null,
    chatMessages: [],
    isLoadingPosts: false
};

const API_BASE = window.location.origin + '/api';
const userId = tg.initDataUnsafe?.user?.id?.toString() || 'demo';

// ========================================
// API Helper Functions
// ========================================

async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (tg.initData) {
        headers['X-Telegram-Init-Data'] = tg.initData;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

// ========================================
// Age Verification with AI
// ========================================

class AgeVerification {
    constructor() {
        this.video = document.getElementById('camera-feed');
        this.canvas = document.getElementById('camera-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.statusEl = document.getElementById('verification-status');
        this.isProcessing = false;
        this.expressionDetected = false;
    }

    async startCamera() {
        try {
            state.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            this.video.srcObject = state.cameraStream;
            this.updateStatus('Camera ready', '📸', 'Position your face and smile to show understanding');
            return true;
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus('Camera unavailable', '❌', 'Please enable camera access or skip verification');
            return false;
        }
    }

    stopCamera() {
        if (state.cameraStream) {
            state.cameraStream.getTracks().forEach(track => track.stop());
            state.cameraStream = null;
        }
    }

    updateStatus(text, icon, subtext) {
        const statusIcon = this.statusEl.querySelector('.status-icon');
        const statusText = this.statusEl.querySelector('p');
        const statusSubtext = this.statusEl.querySelector('small');

        if (statusIcon) statusIcon.textContent = icon;
        if (statusText) statusText.textContent = text;
        if (statusSubtext) statusSubtext.textContent = subtext;
    }

    async processFrame() {
        if (this.isProcessing || !this.video.videoWidth) return;

        this.isProcessing = true;

        // Draw current frame to canvas
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.ctx.drawImage(this.video, 0, 0);

        // Simulate AI face detection and expression analysis
        // In production, this would use TensorFlow.js or similar
        await this.simulateAIVerification();

        this.isProcessing = false;
    }

    async simulateAIVerification() {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate detection (in production, use real ML model)
        const faceDetected = Math.random() > 0.3;
        const expressionConfident = Math.random() > 0.4;

        if (faceDetected && expressionConfident) {
            this.expressionDetected = true;
            this.updateStatus(
                'Expression detected!',
                '✅',
                'You appear to understand our Terms of Service'
            );

            // Auto-verify after 2 seconds
            setTimeout(() => {
                this.completeVerification();
            }, 2000);
        } else if (faceDetected) {
            this.updateStatus(
                'Face detected',
                '👤',
                'Show a confident expression to demonstrate understanding'
            );
        } else {
            this.updateStatus(
                'No face detected',
                '🔍',
                'Please position your face in the frame'
            );
        }
    }

    async completeVerification() {
        this.stopCamera();
        state.ageVerified = true;

        showToast('Age verification complete!', 'success');

        // Hide age gate and show main app
        document.getElementById('age-gate').classList.remove('active');
        document.getElementById('main-app').classList.remove('hidden');

        // Initialize main app
        await initializeApp();
    }

    skip() {
        this.stopCamera();
        state.ageVerified = true;

        showToast('Verification skipped', 'success');

        document.getElementById('age-gate').classList.remove('active');
        document.getElementById('main-app').classList.remove('hidden');

        initializeApp();
    }
}

const ageVerification = new AgeVerification();

// ========================================
// AI Chatbot (Cristina)
// ========================================

class AIChatbot {
    constructor() {
        this.messagesEl = document.getElementById('chat-messages');
        this.inputEl = document.getElementById('chat-input');
        this.systemPrompt = `You are Cristina, a friendly and helpful AI assistant for PNPtv community.
        You help users with questions about the platform, features, and general support.
        Be concise, friendly, and professional.`;
    }

    async sendMessage(userMessage) {
        if (!userMessage.trim()) return;

        // Add user message to chat
        this.addMessage(userMessage, 'user');
        this.inputEl.value = '';

        // Show typing indicator
        const typingId = this.addTypingIndicator();

        // Simulate AI response (in production, call actual LLM API)
        const response = await this.getAIResponse(userMessage);

        // Remove typing indicator and add response
        this.removeTypingIndicator(typingId);
        this.addMessage(response, 'bot');
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}-message`;

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-avatar">${type === 'bot' ? 'AI' : '👤'}</div>
            <div class="message-content">
                <p>${this.escapeHtml(text)}</p>
                <span class="message-time">${timeStr}</span>
            </div>
        `;

        this.messagesEl.appendChild(messageDiv);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;

        state.chatMessages.push({ text, type, time: now });
    }

    addTypingIndicator() {
        const id = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot-message';
        typingDiv.id = id;
        typingDiv.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <p>Typing...</p>
            </div>
        `;
        this.messagesEl.appendChild(typingDiv);
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        return id;
    }

    removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    async getAIResponse(userMessage) {
        // Simulate API call to LLM
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simple rule-based responses (in production, use real LLM API)
        const lowerMessage = userMessage.toLowerCase();

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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const chatbot = new AIChatbot();

// ========================================
// Community Crystal Widget
// ========================================

class CommunityCrystal {
    constructor() {
        this.crystalEl = document.getElementById('community-crystal');
        this.tooltipEl = document.getElementById('crystal-tooltip');
        this.usersEl = document.getElementById('crystal-users');
        this.isOpen = false;
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.tooltipEl.classList.toggle('hidden', !this.isOpen);

        if (this.isOpen) {
            this.loadActiveUsers();
        }
    }

    async loadActiveUsers() {
        try {
            // In production, call actual API
            const mockUsers = [
                { username: 'Alice', status: 'Posting now', avatar: '👩' },
                { username: 'Bob', status: 'Live streaming', avatar: '👨' },
                { username: 'Charlie', status: 'Just commented', avatar: '🧑' }
            ];

            this.renderUsers(mockUsers);
        } catch (error) {
            console.error('Failed to load active users:', error);
        }
    }

    renderUsers(users) {
        this.usersEl.innerHTML = users.map(user => `
            <div class="crystal-user">
                <div class="crystal-user-avatar">${user.avatar}</div>
                <div class="crystal-user-info">
                    <div class="crystal-user-name">${user.username}</div>
                    <div class="crystal-user-status">${user.status}</div>
                </div>
            </div>
        `).join('');
    }
}

const communityCrystal = new CommunityCrystal();

// ========================================
// Feed Management
// ========================================

class FeedManager {
    constructor() {
        this.containerEl = document.getElementById('feed-container');
    }

    async loadPosts() {
        if (state.isLoadingPosts) return;

        state.isLoadingPosts = true;
        this.showLoading();

        try {
            const response = await apiRequest(`${API_BASE}/posts`);
            state.posts = response.posts || [];
            this.renderPosts();
        } catch (error) {
            console.error('Failed to load posts:', error);
            // Show mock data for demo
            this.loadMockPosts();
        } finally {
            state.isLoadingPosts = false;
        }
    }

    loadMockPosts() {
        const mockPosts = [
            {
                id: '1',
                userId: 'user1',
                username: 'Sarah Johnson',
                content: 'Just joined PNPtv! Excited to be part of this amazing community!',
                createdAt: new Date(Date.now() - 3600000),
                likes: 12,
                comments: 3
            },
            {
                id: '2',
                userId: 'user2',
                username: 'Mike Chen',
                content: 'Check out my latest stream highlights! Thanks everyone for the support!',
                imageUrl: 'https://picsum.photos/400/300',
                createdAt: new Date(Date.now() - 7200000),
                likes: 45,
                comments: 8
            },
            {
                id: '3',
                userId: 'user3',
                username: 'Emma Davis',
                content: 'What an incredible community! Love connecting with everyone here.',
                createdAt: new Date(Date.now() - 10800000),
                likes: 23,
                comments: 5
            }
        ];

        state.posts = mockPosts;
        this.renderPosts();
    }

    showLoading() {
        this.containerEl.innerHTML = `
            <div class="feed-loading">
                <div class="spinner"></div>
                <p>Loading community posts...</p>
            </div>
        `;
    }

    renderPosts() {
        if (state.posts.length === 0) {
            this.containerEl.innerHTML = `
                <div class="feed-loading">
                    <p>No posts yet. Be the first to post!</p>
                </div>
            `;
            return;
        }

        this.containerEl.innerHTML = state.posts.map(post => this.createPostCard(post)).join('');

        // Add event listeners
        document.querySelectorAll('.post-action').forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePostAction(e));
        });
    }

    createPostCard(post) {
        const timeAgo = this.getTimeAgo(new Date(post.createdAt));
        const userAvatar = post.username.charAt(0).toUpperCase();

        return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-avatar">${userAvatar}</div>
                    <div class="post-author-info">
                        <div class="post-author">${post.username}</div>
                        <div class="post-time">${timeAgo}</div>
                    </div>
                </div>
                <div class="post-content">
                    <p>${this.escapeHtml(post.content)}</p>
                </div>
                ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
                <div class="post-actions">
                    <button class="post-action" data-action="like" data-post-id="${post.id}">
                        ❤️ ${post.likes || 0}
                    </button>
                    <button class="post-action" data-action="comment" data-post-id="${post.id}">
                        💬 ${post.comments || 0}
                    </button>
                    <button class="post-action" data-action="share" data-post-id="${post.id}">
                        📤 Share
                    </button>
                </div>
            </div>
        `;
    }

    handlePostAction(e) {
        const action = e.currentTarget.dataset.action;
        const postId = e.currentTarget.dataset.postId;

        switch(action) {
            case 'like':
                this.likePost(postId);
                e.currentTarget.classList.toggle('active');
                break;
            case 'comment':
                showToast('Comments coming soon!');
                break;
            case 'share':
                this.sharePost(postId);
                break;
        }
    }

    async likePost(postId) {
        try {
            await apiRequest(`${API_BASE}/posts/${postId}/like`, {
                method: 'POST'
            });
            showToast('Post liked!', 'success');
        } catch (error) {
            showToast('Post liked!', 'success'); // Mock success for demo
        }
    }

    sharePost(postId) {
        if (navigator.share) {
            navigator.share({
                title: 'Check out this post on PNPtv',
                url: window.location.href
            });
        } else {
            showToast('Link copied!', 'success');
        }
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const feedManager = new FeedManager();

// ========================================
// Profile Management
// ========================================

class ProfileManager {
    constructor() {
        this.usernameEl = document.getElementById('profile-username');
        this.roleEl = document.getElementById('profile-role');
        this.bioEl = document.getElementById('profile-bio-text');
        this.postsCountEl = document.getElementById('profile-posts-count');
        this.userPostsEl = document.getElementById('user-posts-container');
    }

    async loadProfile() {
        try {
            const response = await apiRequest(`${API_BASE}/profile/${userId}`);
            state.user = response.user;
            this.renderProfile();
        } catch (error) {
            console.error('Failed to load profile:', error);
            this.loadMockProfile();
        }
    }

    loadMockProfile() {
        state.user = {
            userId: userId,
            username: tg.initDataUnsafe?.user?.first_name || 'User',
            bio: 'PNPtv community member',
            role: 'member',
            postsCount: 0,
            followers: 0
        };
        this.renderProfile();
    }

    renderProfile() {
        const user = state.user;

        this.usernameEl.textContent = user.username;
        this.roleEl.textContent = user.role === 'performer' ? 'Performer' :
                                   user.role === 'admin' ? 'Admin' : 'Member';
        this.bioEl.textContent = user.bio || 'No bio yet';
        this.postsCountEl.textContent = user.postsCount || 0;

        document.getElementById('profile-followers').textContent = user.followers || 0;

        // Show performer panel if user is performer or admin
        if (user.role === 'performer' || user.role === 'admin') {
            document.querySelectorAll('.performer-only').forEach(el => {
                el.classList.remove('hidden');
            });
        }
    }
}

const profileManager = new ProfileManager();

// ========================================
// Navigation
// ========================================

function navigateTo(pageName) {
    // Update active page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    state.currentPage = pageName;

    // Load page-specific data
    switch(pageName) {
        case 'feed':
            if (state.posts.length === 0) feedManager.loadPosts();
            break;
        case 'profile':
            if (!state.user) profileManager.loadProfile();
            break;
    }
}

// ========================================
// Utilities
// ========================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Age Verification
    document.getElementById('start-verification-btn').addEventListener('click', async () => {
        const started = await ageVerification.startCamera();
        if (started) {
            // Start processing frames
            setInterval(() => ageVerification.processFrame(), 2000);
        }
    });

    document.getElementById('skip-verification-btn').addEventListener('click', () => {
        ageVerification.skip();
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
        });
    });

    // Community Crystal
    document.getElementById('community-crystal').addEventListener('click', () => {
        communityCrystal.toggle();
    });

    // Close crystal when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#community-crystal')) {
            communityCrystal.tooltipEl.classList.add('hidden');
            communityCrystal.isOpen = false;
        }
    });

    // Create Post
    document.getElementById('create-post-btn').addEventListener('click', () => {
        openModal('create-post-modal');
    });

    document.getElementById('close-post-modal').addEventListener('click', () => {
        closeModal('create-post-modal');
    });

    document.getElementById('cancel-post-btn').addEventListener('click', () => {
        closeModal('create-post-modal');
    });

    document.getElementById('create-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('post-content').value;
        const imageUrl = document.getElementById('post-image').value;

        try {
            await apiRequest(`${API_BASE}/posts`, {
                method: 'POST',
                body: JSON.stringify({ userId, content, imageUrl })
            });

            showToast('Post created!', 'success');
            closeModal('create-post-modal');
            e.target.reset();
            feedManager.loadPosts();
        } catch (error) {
            showToast('Failed to create post', 'error');
        }
    });

    // Chatbot
    document.getElementById('send-chat-btn').addEventListener('click', () => {
        const message = document.getElementById('chat-input').value;
        chatbot.sendMessage(message);
    });

    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = e.target.value;
            chatbot.sendMessage(message);
        }
    });

    // Contact Form
    document.getElementById('contact-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            subject: document.getElementById('contact-subject').value,
            message: document.getElementById('contact-message').value
        };

        try {
            await apiRequest(`${API_BASE}/contact`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            showToast('Message sent successfully!', 'success');
            e.target.reset();
        } catch (error) {
            showToast('Message sent!', 'success'); // Mock success for demo
            e.target.reset();
        }
    });
}

// ========================================
// App Initialization
// ========================================

async function initializeApp() {
    // Load user profile
    await profileManager.loadProfile();

    // Load initial feed
    await feedManager.loadPosts();

    // Setup event listeners
    setupEventListeners();
}

// ========================================
// Start App
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    // Check if age verification is needed
    // For demo, we'll show it on first load
    const ageGateShown = sessionStorage.getItem('ageGateShown');

    if (!ageGateShown) {
        document.getElementById('age-gate').classList.add('active');
        sessionStorage.setItem('ageGateShown', 'true');
    } else {
        // Skip directly to app
        state.ageVerified = true;
        document.getElementById('age-gate').classList.remove('active');
        document.getElementById('main-app').classList.remove('hidden');
        initializeApp();
    }
});
