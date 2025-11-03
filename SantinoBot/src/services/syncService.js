const cron = require('node-cron');
const { db } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Sync user permissions periodically
 * Runs every hour to check for expired memberships
 */
function startPermissionSync(bot) {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Starting periodic permission sync...');
    
    try {
      const now = new Date();

      // Find users with expired memberships
      // Split the query to avoid multiple inequality filters
      const expiredQuery = await db.collection('users')
        .where('membershipExpiresAt', '<=', now)
        .get();

      let updatedCount = 0;

      for (const doc of expiredQuery.docs) {
        try {
          const userId = doc.id;
          const userData = doc.data();

          // Filter out Free tier users in code instead of query
          if (userData.tier === 'Free' || !userData.tier) {
            continue;
          }

          // Update to Free tier
          await db.collection('users').doc(userId).update({
            tier: 'Free',
            membershipIsPremium: false,
            lastTierDowngrade: now,
            previousTier: userData.tier
          });

          logger.info(`Downgraded expired user ${userId} from ${userData.tier} to Free`);
          updatedCount++;
        } catch (error) {
          logger.error(`Failed to downgrade user ${doc.id}:`, error);
        }
      }

      logger.info(`Permission sync completed. Updated ${updatedCount} users.`);
    } catch (error) {
      logger.error('Error during permission sync:', error);
    }
  });

  logger.info('Permission sync scheduler started (runs hourly)');
}

/**
 * Sync permissions for all group members
 * Can be called manually or triggered by events
 */
async function syncGroupPermissions(bot, groupId) {
  try {
    logger.info(`Starting group permission sync for group ${groupId}`);
    
    // Get all group members (this requires bot to be admin)
    const chatMembers = await bot.telegram.getChatAdministrators(groupId);
    
    // Note: getChatMemberCount and iterating through all members 
    // requires special permissions. For now, we'll sync on-demand
    // when users interact with the group.
    
    logger.info(`Group sync completed for ${chatMembers.length} administrators`);
  } catch (error) {
    logger.error('Error syncing group permissions:', error);
  }
}

/**
 * Clean up old log files and expired data
 */
function startCleanupTasks() {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting daily cleanup tasks...');
    
    try {
      // Clean up old search records (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const usersSnapshot = await db.collection('users').get();
      let cleanedCount = 0;

      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (userData.searches && Array.isArray(userData.searches)) {
          const recentSearches = userData.searches.filter(timestamp => {
            const searchDate = timestamp.toDate();
            return searchDate > thirtyDaysAgo;
          });
          
          if (recentSearches.length !== userData.searches.length) {
            await doc.ref.update({ searches: recentSearches });
            cleanedCount++;
          }
        }
      }

      logger.info(`Cleanup completed. Cleaned ${cleanedCount} user records.`);
    } catch (error) {
      logger.error('Error during cleanup tasks:', error);
    }
  });

  logger.info('Cleanup tasks scheduler started (runs daily at 2 AM)');
}

module.exports = {
  startPermissionSync,
  syncGroupPermissions,
  startCleanupTasks
};