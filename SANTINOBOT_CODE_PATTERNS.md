# SantinoBot - Implementation Patterns & Code Examples

## How to Extend SantinoBot

This guide shows code patterns for implementing new features.

---

## Pattern 1: Adding a New Event Handler

### Problem: Need to handle group updates

### Solution:

```javascript
// In src/handlers/groupHandlers.js

/**
 * Handle group info updates
 */
async function handleGroupInfoUpdate(ctx) {
  try {
    const groupId = ctx.chat.id;
    const updateType = ctx.update.chat_member?.new_chat_member ? 'member_update' : 'info_update';

    logger.info(`Group update in ${groupId}: ${updateType}`);

    // Your custom logic here
    
  } catch (error) {
    logger.error('Error handling group update:', error);
  }
}

// In src/bot.js
bot.on('my_chat_member', handleGroupInfoUpdate);
```

---

## Pattern 2: Adding a New Command

### Problem: Need a new `/stats` command to show group statistics

### Solution:

```javascript
// In src/handlers/dataCommands.js

/**
 * Get group statistics
 */
async function cmdGroupStats(ctx) {
  try {
    const groupId = ctx.chat.id;
    
    // Query Firestore for all group members
    const groupUsers = await db.collection('users')
      .where('groupMemberOf', 'array-contains', groupId)
      .get();
    
    // Calculate statistics
    let stats = {
      totalMembers: groupUsers.size,
      freeUsers: 0,
      premiumUsers: 0,
      expiredUsers: 0
    };

    const now = new Date();

    for (const doc of groupUsers.docs) {
      const user = doc.data();
      
      if (user.tier === 'Free') {
        stats.freeUsers++;
      } else {
        if (user.membershipExpiresAt && user.membershipExpiresAt.toDate() <= now) {
          stats.expiredUsers++;
        } else {
          stats.premiumUsers++;
        }
      }
    }

    // Send formatted response
    const message = `📊 **Group Statistics**\n\n` +
      `👥 Total Members: ${stats.totalMembers}\n` +
      `🆓 Free Users: ${stats.freeUsers}\n` +
      `💎 Premium Users: ${stats.premiumUsers}\n` +
      `⏳ Expired: ${stats.expiredUsers}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in stats command:', error);
    await ctx.reply('❌ Error getting statistics');
  }
}

// In src/bot.js
bot.command('stats', cmdGroupStats);
```

---

## Pattern 3: Adding Real-Time Data Listener

### Problem: Need to react when a user updates their profile bio

### Solution:

```javascript
// In src/services/userDataService.js

/**
 * Watch for profile updates for a specific user
 */
function watchUserProfileUpdates(userId, onUpdate) {
  const unsubscribe = db.collection('users').doc(userId)
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          onUpdate(doc.data());
        }
      },
      (error) => {
        logger.error(`Error watching user ${userId}:`, error);
      }
    );
  
  return unsubscribe; // Can be called to stop listening
}

// Usage in handler:
db.collection('users').doc(userId).onSnapshot((doc) => {
  const userData = doc.data();
  
  if (userData.bio) {
    // Bio was just updated
    console.log('User updated bio:', userData.bio);
    
    // React to bio update
    // e.g., update group description, send notification, etc.
  }
});
```

---

## Pattern 4: Adding Data Validation

### Problem: Need to validate tier values before saving

### Solution:

```javascript
// In src/utils/validation.js (new file)

const VALID_TIERS = ['Free', 'trial-week', 'pnp-member', 'crystal-member', 'diamond-member'];

function isValidTier(tier) {
  return VALID_TIERS.includes(tier);
}

function validateUserData(userData) {
  const errors = [];

  if (!userData.userId) {
    errors.push('userId is required');
  }

  if (userData.tier && !isValidTier(userData.tier)) {
    errors.push(`Invalid tier: ${userData.tier}`);
  }

  if (userData.email && !isValidEmail(userData.email)) {
    errors.push('Invalid email format');
  }

  if (userData.location) {
    if (!Number.isFinite(userData.location.latitude) || 
        !Number.isFinite(userData.location.longitude)) {
      errors.push('Invalid location coordinates');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

module.exports = {
  validateUserData,
  isValidTier,
  isValidEmail,
  VALID_TIERS
};

// Usage:
const validation = require('../utils/validation');
const result = validation.validateUserData(userData);

if (!result.isValid) {
  logger.warn('Invalid user data:', result.errors);
  return false;
}
```

---

## Pattern 5: Custom Permission Tier

### Problem: Need to add a new tier "beta-tester" with special permissions

### Solution:

```javascript
// In src/utils/permissions.js

function getTelegramPermissions(tier) {
  const basePermissions = {
    can_send_messages: true,
    can_send_audios: false,
    can_send_documents: false,
    can_send_photos: false,
    can_send_videos: false,
    can_send_video_notes: false,
    can_send_voice_notes: false,
    can_send_polls: false,
    can_send_other_messages: false,
    can_add_web_page_previews: true,
    can_change_info: false,
    can_invite_users: false,
    can_pin_messages: false,
  };

  if (tier === 'Free') {
    return basePermissions;
  }

  if (tier === 'beta-tester') {
    // Beta testers get photos but not videos
    return {
      ...basePermissions,
      can_send_photos: true,
      can_send_documents: true,
      can_add_web_page_previews: true,
    };
  }

  // Premium: full permissions
  return {
    ...basePermissions,
    can_send_audios: true,
    can_send_documents: true,
    can_send_photos: true,
    can_send_videos: true,
    can_send_video_notes: true,
    can_send_voice_notes: true,
    can_send_polls: true,
    can_send_other_messages: true,
  };
}
```

---

## Pattern 6: Adding Message Filtering

### Problem: Need to filter spam or certain keywords

### Solution:

```javascript
// In src/utils/contentFilter.js (new file)

const BAD_WORDS = ['spam', 'promotion', 'advertisement'];
const SPAM_KEYWORDS = ['click here', 'buy now', 'limited offer'];

function containsSpam(text) {
  const lowerText = text.toLowerCase();
  
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

function containsBadWords(text) {
  const lowerText = text.toLowerCase();
  
  for (const word of BAD_WORDS) {
    if (lowerText.includes(word)) {
      return true;
    }
  }
  
  return false;
}

module.exports = {
  containsSpam,
  containsBadWords
};

// Usage in handler:
const contentFilter = require('../utils/contentFilter');

async function handleTextMessage(ctx) {
  const text = ctx.message.text;
  
  // Check for spam
  if (contentFilter.containsSpam(text)) {
    await ctx.deleteMessage();
    await ctx.reply('⚠️ Spam detected. Message removed.');
    return;
  }
  
  // Continue processing
}
```

---

## Pattern 7: Batch User Updates

### Problem: Need to downgrade multiple users at once

### Solution:

```javascript
// In src/services/userDataService.js

/**
 * Batch downgrade multiple users
 */
async function batchDowngradeUsers(userIds, newTier = 'Free') {
  const batch = db.batch();
  const now = new Date();
  
  const updateData = {
    tier: newTier,
    membershipIsPremium: false,
    lastTierDowngrade: now,
  };

  for (const userId of userIds) {
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, updateData);
  }

  try {
    await batch.commit();
    logger.info(`Batch updated ${userIds.length} users to ${newTier}`);
    return {
      success: true,
      updatedCount: userIds.length
    };
  } catch (error) {
    logger.error('Batch update failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Usage:
const userIds = ['123456', '234567', '345678'];
const result = await userDataService.batchDowngradeUsers(userIds, 'Free');
if (result.success) {
  console.log(`Updated ${result.updatedCount} users`);
}
```

---

## Pattern 8: Scheduled Tasks

### Problem: Need to send a weekly message to premium users

### Solution:

```javascript
// In src/services/syncService.js

const cron = require('node-cron');

/**
 * Send weekly premium user notification
 */
function startWeeklyNotification(bot) {
  // Every Monday at 10 AM
  cron.schedule('0 10 * * 1', async () => {
    logger.info('Starting weekly premium user notification');
    
    try {
      // Get all premium users
      const premiumUsers = await db.collection('users')
        .where('tier', '!=', 'Free')
        .where('membershipIsPremium', '==', true)
        .get();

      let notifiedCount = 0;

      for (const doc of premiumUsers.docs) {
        try {
          const userId = doc.id;
          
          // Send direct message to user
          await bot.telegram.sendMessage(
            userId,
            '📢 **Weekly Premium Update**\n\n' +
            'Thank you for being a premium member! 💎\n' +
            'New features coming this week...\n',
            { parse_mode: 'Markdown' }
          );
          
          notifiedCount++;
        } catch (error) {
          logger.warn(`Could not notify user ${doc.id}:`, error.message);
        }
      }

      logger.info(`Weekly notification sent to ${notifiedCount} premium users`);
    } catch (error) {
      logger.error('Error in weekly notification:', error);
    }
  });

  logger.info('Weekly notification scheduler started');
}

// In bot.js
startWeeklyNotification(bot);
```

---

## Pattern 9: Error Recovery

### Problem: Need to handle Firebase connection failures gracefully

### Solution:

```javascript
// In src/config/firebase.js

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

async function retryFirebaseOperation(operation, retries = MAX_RETRIES) {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      logger.warn(`Firebase operation failed, retrying... (${retries} retries left)`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      return retryFirebaseOperation(operation, retries - 1);
    }
    
    throw error;
  }
}

function isRetryableError(error) {
  // Retry on network errors, timeouts, etc.
  const retryableErrors = [
    'DEADLINE_EXCEEDED',
    'UNAVAILABLE',
    'RESOURCE_EXHAUSTED',
    'ABORTED'
  ];
  
  return retryableErrors.some(code => error.code?.includes(code));
}

// Usage:
const userDoc = await retryFirebaseOperation(
  () => db.collection('users').doc(userId).get()
);
```

---

## Pattern 10: Logging Activities

### Problem: Need detailed activity tracking for analytics

### Solution:

```javascript
// In src/utils/activityLogger.js (new file)

const { db } = require('../config/firebase');

/**
 * Log user activity with timestamp and metadata
 */
async function logActivity(userId, activityType, metadata = {}) {
  try {
    const activity = {
      userId,
      type: activityType,
      timestamp: new Date(),
      metadata
    };

    // Add to global activities collection
    await db.collection('activities').add(activity);

    // Also add to user's activity array
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      activities: admin.firestore.FieldValue.arrayUnion({
        type: activityType,
        timestamp: new Date(),
        ...metadata
      })
    });

    logger.info(`Activity logged: ${userId} - ${activityType}`);
  } catch (error) {
    logger.error('Error logging activity:', error);
  }
}

// Usage examples:
await logActivity(userId, 'joined_group', { groupId: '123' });
await logActivity(userId, 'sent_media', { type: 'photo' });
await logActivity(userId, 'tier_changed', { oldTier: 'Free', newTier: 'Premium' });
await logActivity(userId, 'permission_denied', { reason: 'free_user_media' });
```

---

## Pattern 11: Webhook Setup for Production

### Problem: Long polling is too slow, need webhooks for production

### Solution:

```javascript
// In src/bot.js

async function startBot() {
  try {
    startPermissionSync(bot);
    startCleanupTasks();
    
    // Check if production with webhook configured
    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      const port = process.env.PORT || 3000;
      
      // Remove old webhook
      await bot.telegram.deleteWebhook();
      
      // Set new webhook
      const webhookUrl = `${process.env.WEBHOOK_URL}/webhook/${process.env.BOT_TOKEN}`;
      await bot.telegram.setWebhook(webhookUrl);
      
      // Start express server
      const express = require('express');
      const app = express();
      
      app.use(express.json());
      app.post(`/webhook/${process.env.BOT_TOKEN}`, (req, res) => {
        bot.handleUpdate(req.body, res);
      });
      
      app.listen(port, () => {
        logger.info(`Webhook listening on port ${port}`);
        logger.info(`Webhook URL: ${webhookUrl}`);
      });
    } else {
      // Development: use long polling
      await bot.launch();
      logger.info('Bot started with long polling');
    }
    
    logger.info(`🤖 SantinoBot is running!`);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}
```

---

## Pattern 12: Unit Testing

### Problem: Need to test handlers without running bot

### Solution:

```javascript
// In test/handlers.test.js

const { expect } = require('chai');
const sinon = require('sinon');
const { handleMediaMessage } = require('../src/handlers/groupHandlers');
const userDataService = require('../src/services/userDataService');

describe('Group Handlers', () => {
  
  describe('handleMediaMessage', () => {
    it('should delete photo from free user', async () => {
      // Mock context
      const ctx = {
        from: { id: 123, username: 'testuser' },
        message: { photo: { file_id: 'abc' }, message_id: 1 },
        deleteMessage: sinon.stub().resolves(),
        reply: sinon.stub().resolves({ message_id: 2 })
      };
      
      // Mock user data service
      sinon.stub(userDataService, 'getUserPermissions').resolves({
        tier: 'Free'
      });
      
      // Run handler
      await handleMediaMessage(ctx);
      
      // Verify photo was deleted
      expect(ctx.deleteMessage.calledWith()).to.be.true;
      expect(ctx.reply.called).to.be.true;
      
      // Verify warning message
      const warning = ctx.reply.firstCall.args[0];
      expect(warning).to.include('premium');
      
      // Restore stubs
      sinon.restore();
    });
    
    it('should allow photo from premium user', async () => {
      const ctx = {
        from: { id: 124, username: 'premiumuser' },
        message: { photo: { file_id: 'def' }, message_id: 3 },
        deleteMessage: sinon.stub().resolves(),
        reply: sinon.stub().resolves()
      };
      
      sinon.stub(userDataService, 'getUserPermissions').resolves({
        tier: 'pnp-member'
      });
      
      await handleMediaMessage(ctx);
      
      // Photo should NOT be deleted
      expect(ctx.deleteMessage.called).to.be.false;
      
      sinon.restore();
    });
  });
});

// Run tests:
// npm test
```

---

## Tips & Best Practices

### ✅ Do's

```javascript
// ✅ Use async/await
async function getData(userId) {
  try {
    const data = await db.collection('users').doc(userId).get();
    return data.data();
  } catch (error) {
    logger.error('Error:', error);
  }
}

// ✅ Handle errors gracefully
if (error.code === 'permission-denied') {
  logger.warn('No permission for operation');
}

// ✅ Use real-time listeners where needed
db.collection('users').doc(userId).onSnapshot((doc) => {
  // Auto-update on changes
});

// ✅ Batch operations for multiple updates
const batch = db.batch();
batch.update(ref1, data1);
batch.update(ref2, data2);
await batch.commit();

// ✅ Cache frequently accessed data
const userCache = new Map();
```

### ❌ Don'ts

```javascript
// ❌ Don't ignore errors
const data = await db.collection('users').doc(userId).get(); // What if fails?

// ❌ Don't hardcode values
restrictChatMember(userId, { can_send_photos: false }); // Should be from config

// ❌ Don't make synchronous calls
const result = db.collection('users').get(); // Wrong

// ❌ Don't store sensitive data
process.env.FIREBASE_PRIVATE_KEY in logs // Danger!

// ❌ Don't forget to cleanup listeners
db.collection('users').doc(userId).onSnapshot(...); // Never stops listening
```

---

**Now you understand SantinoBot completely! 🎓**

Use these patterns to extend it with any features you need.
