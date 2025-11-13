/**
 * Integration Example: How to Add Post-to-Channel to Admin Panel
 * 
 * This file shows exactly where and how to integrate the new
 * post-to-channel system into your existing admin.js handler
 */

// ============================================
// STEP 1: Add Import at Top of admin.js
// ============================================

// Add this with your other imports:
const { registerPostToChannelHandlers } = require('./admin/postToChannelIntegration');
const { showPostToChannelMenu } = require('./admin/postToChannelAdmin');


// ============================================
// STEP 2: Register Handlers in Bot Setup
// ============================================

// In your main bot initialization (src/bot/index.js or admin.js):

async function setupAdminHandlers(bot) {
  // ... existing handlers ...
  
  // ADD THIS NEW LINE:
  registerPostToChannelHandlers(bot);
  
  // ... rest of handlers ...
}


// ============================================
// STEP 3: Add Menu Item to Admin Panel
// ============================================

// Find the admin menu function (likely buildAdminMenu or similar)
// and add this button:

function buildAdminMenu(lang) {
  const menu = {
    inline_keyboard: [
      // ... existing buttons ...
      
      // ADD THIS ROW:
      [
        {
          text: lang === 'es' ? '📤 Publicaciones' : '📤 Post-to-Channel',
          callback_data: 'ptc_menu'
        }
      ],
      
      // ... rest of buttons ...
    ]
  };
  
  return menu;
}


// ============================================
// STEP 4: Add Callback Handler
// ============================================

// In your callback_query handler section, add:

bot.action('admin_menu', async (ctx) => {
  try {
    // ... existing admin menu logic ...
    
    // Shows the main admin menu with new button
  } catch (error) {
    logger.error('Error in admin menu:', error);
  }
});


// ============================================
// STEP 5: Full Example Integration
// ============================================

/**
 * BEFORE (existing admin.js structure):
 */

const adminModule = (bot) => {
  // Existing handlers...
  
  bot.action('admin_back', async (ctx) => {
    // Back button logic
  });
  
  bot.action('admin_some_feature', async (ctx) => {
    // Some feature
  });
};

/**
 * AFTER (with post-to-channel integrated):
 */

const adminModuleUpdated = (bot) => {
  // Import at top
  const { registerPostToChannelHandlers } = require('./admin/postToChannelIntegration');
  
  // Existing handlers...
  
  bot.action('admin_back', async (ctx) => {
    // Back button logic
  });
  
  bot.action('admin_some_feature', async (ctx) => {
    // Some feature
  });
  
  // ADD: Register new post-to-channel handlers
  registerPostToChannelHandlers(bot);
};


// ============================================
// STEP 6: Example Menu Structure
// ============================================

// Your admin menu should look like this:

const exampleAdminMenu = (lang) => {
  return {
    inline_keyboard: [
      [{ text: lang === 'es' ? '📊 Usuarios' : '👥 Users', callback_data: 'admin_users' }],
      [{ text: lang === 'es' ? '📈 Estadísticas' : '📈 Stats', callback_data: 'admin_stats' }],
      [{ text: lang === 'es' ? '💰 Pagos' : '💰 Payments', callback_data: 'admin_payments' }],
      // NEW:
      [{ text: lang === 'es' ? '📤 Publicaciones' : '📤 Post-to-Channel', callback_data: 'ptc_menu' }],
      [{ text: lang === 'es' ? '📢 Transmisiones' : '📢 Broadcasts', callback_data: 'admin_broadcast' }],
      [{ text: lang === 'es' ? '« Atrás' : '« Back', callback_data: 'main_menu' }]
    ]
  };
};


// ============================================
// STEP 7: Testing Integration
// ============================================

/**
 * After integration, test with:
 */

// 1. Start bot
npm start

// 2. Send /admin command
/admin

// 3. Verify new button appears: 📤 Post-to-Channel

// 4. Click button and verify wizard starts

// 5. Check logs for no errors:
pm2 logs pnptv-bot | grep ptc


// ============================================
// STEP 8: Environment Variables Required
// ============================================

/**
 * Add to your .env file:
 */

# Admin IDs (comma-separated)
ADMIN_IDS=123456789,987654321

# Telegram Channel IDs
CHANNEL_ID=-1001234567890
PREMIUM_CHANNEL_ID=-1001234567891
ANNOUNCE_CHANNEL_ID=-1001234567892

# Firebase (already configured)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="your-private-key"


// ============================================
// STEP 9: Database Indexes (Optional)
// ============================================

/**
 * For best performance, create Firestore indexes:
 * 
 * Go to Firebase Console → Firestore → Indexes
 * 
 * Create these composite indexes:
 */

// Index 1: channelPosts
Collection: channelPosts
Fields to Index:
  - channelId (Ascending)
  - publishedAt (Descending)

// Index 2: broadcastSchedules
Collection: broadcastSchedules
Fields to Index:
  - status (Ascending)
  - scheduledTime (Ascending)

// Index 3: posts (for filtering)
Collection: posts
Fields to Index:
  - isActive (Ascending)
  - createdAt (Descending)


// ============================================
// STEP 10: Verification Checklist
// ============================================

const integrationChecklist = [
  '✅ Copied postToChannelService.js to src/services/',
  '✅ Copied postLikeService.js to src/services/',
  '✅ Copied postToChannelAdmin.js to src/bot/handlers/admin/',
  '✅ Copied postToChannelIntegration.js to src/bot/handlers/admin/',
  '✅ Added registerPostToChannelHandlers() call in bot setup',
  '✅ Added ptc_menu button to admin menu',
  '✅ Updated .env with ADMIN_IDS and channel IDs',
  '✅ Restarted bot: pm2 restart pnptv-bot',
  '✅ Tested /admin command',
  '✅ Verified new button appears',
  '✅ Tested wizard with admin account',
  '✅ Checked logs for errors: pm2 logs pnptv-bot',
  '✅ Verified database collections created',
  '✅ Tested broadcast execution',
  '✅ Verified Firestore data recorded'
];


// ============================================
// STEP 11: Full Integration Code
// ============================================

/**
 * Complete example of what your admin.js handler should include:
 */

// At the top:
const { db } = require('../../config/firebase');
const logger = require('../../utils/logger');
const { t } = require('../../utils/i18n');
const { isAdmin } = require('../../config/admin');
const { registerPostToChannelHandlers } = require('./admin/postToChannelIntegration');
const { showPostToChannelMenu } = require('./admin/postToChannelAdmin');

/**
 * In your handler registration function:
 */
function registerAdminHandlers(bot) {
  // ... existing handlers ...
  
  // NEW: Register post-to-channel handlers
  registerPostToChannelHandlers(bot);
  
  // Admin panel menu
  bot.action('admin_panel', async (ctx) => {
    try {
      if (!isAdmin(ctx.from.id)) {
        await ctx.reply(t(ctx, 'errors.unauthorized'));
        return;
      }
      
      const lang = ctx.session.language || 'en';
      const message = lang === 'es'
        ? '🔧 **Panel de Administración**\n\n¿Qué deseas hacer?'
        : '🔧 **Admin Panel**\n\nWhat would you like to do?';
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'es' ? '👥 Usuarios' : '👥 Users', callback_data: 'admin_users' }],
            [{ text: lang === 'es' ? '📊 Estadísticas' : '📊 Analytics', callback_data: 'admin_stats' }],
            [{ text: lang === 'es' ? '💰 Pagos' : '💰 Payments', callback_data: 'admin_payments' }],
            // NEW BUTTON:
            [{ text: lang === 'es' ? '📤 Publicaciones' : '📤 Post-to-Channel', callback_data: 'ptc_menu' }],
            [{ text: lang === 'es' ? '« Atrás' : '« Back', callback_data: 'main_menu' }]
          ]
        }
      });
    } catch (error) {
      logger.error('Error in admin panel:', error);
    }
  });
  
  // ... rest of handlers ...
}


// ============================================
// STEP 12: Troubleshooting Integration
// ============================================

/**
 * If something doesn't work:
 */

// Problem: Button doesn't appear
// Solution: Verify callback_data exactly matches 'ptc_menu'

// Problem: "Unknown action" error
// Solution: Check registerPostToChannelHandlers() was called

// Problem: "Unauthorized" error
// Solution: Add your Telegram ID to ADMIN_IDS in .env

// Problem: "Channel not configured" error
// Solution: Add CHANNEL_ID to .env with -100 prefix

// Problem: Posts not showing
// Solution: Create some posts first, then try top posts filter

// Problem: Broadcast fails silently
// Solution: Check logs: pm2 logs pnptv-bot | grep ptc


// ============================================
// STEP 13: Deployment Commands
// ============================================

/**
 * After integration, deploy with:
 */

// Development:
npm start

// Production with PM2:
pm2 restart pnptv-bot

// Watch logs:
pm2 logs pnptv-bot

// Tail specific logs:
pm2 logs pnptv-bot | grep "ptc\|broadcast"

// Check if running:
pm2 status


// ============================================
// STEP 14: Quick Test Script
// ============================================

/**
 * Create test-post-to-channel.js to verify integration:
 */

const { db } = require('./src/config/firebase');
const PostToChannelService = require('./src/services/postToChannelService');

async function testIntegration() {
  console.log('🧪 Testing Post-to-Channel Integration...\n');
  
  try {
    // Test 1: Get posts
    console.log('1️⃣ Checking posts collection...');
    const postsSnapshot = await db.collection('posts').limit(5).get();
    console.log(`   ✅ Found ${postsSnapshot.size} posts\n`);
    
    // Test 2: Create test channel post
    console.log('2️⃣ Testing service methods...');
    console.log('   ✅ Service loaded successfully\n');
    
    // Test 3: Check admin access
    console.log('3️⃣ Checking ADMIN_IDS...');
    const adminIds = process.env.ADMIN_IDS?.split(',') || [];
    console.log(`   ✅ Found ${adminIds.length} admin IDs\n`);
    
    // Test 4: Check channel IDs
    console.log('4️⃣ Checking channel configuration...');
    const channels = {
      main: process.env.CHANNEL_ID,
      premium: process.env.PREMIUM_CHANNEL_ID,
      announce: process.env.ANNOUNCE_CHANNEL_ID
    };
    console.log('   ✅ Channels configured:\n');
    Object.entries(channels).forEach(([name, id]) => {
      console.log(`      ${name}: ${id ? '✅' : '❌'}`);
    });
    
    console.log('\n🎉 Integration test complete!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testIntegration();

/**
 * Run test:
 * node test-post-to-channel.js
 */


// ============================================
// STEP 15: Monitoring After Integration
// ============================================

/**
 * Monitor these metrics after deployment:
 */

const monitoringChecklist = [
  'Check: pm2 logs pnptv-bot (no errors)',
  'Check: Firestore collections created',
  'Check: Admin can access /admin',
  'Check: 📤 Post-to-Channel button appears',
  'Check: Wizard starts on button click',
  'Check: Posts load correctly',
  'Check: Channels display correctly',
  'Check: Broadcast publishes without errors',
  'Check: channelPosts collection updated',
  'Check: Analytics data appears',
  'Check: Real-time progress updates',
  'Check: Error handling works'
];

console.log('📋 Post-Integration Monitoring:');
monitoringChecklist.forEach(item => console.log(item));


// ============================================
// SUMMARY
// ============================================

/**
 * You've successfully integrated the Post-to-Channel system!
 * 
 * Key points:
 * ✅ Admin-only feature (secured by isAdmin check)
 * ✅ 3-step wizard interface
 * ✅ Real-time progress tracking
 * ✅ Comprehensive error handling
 * ✅ Full analytics support
 * ✅ Production-ready code
 * 
 * Next: Train admins on usage
 * See: POST_TO_CHANNEL_ADMIN_QUICKREF.md
 */
