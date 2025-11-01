const logger = require('../utils/logger');
const userDataService = require('../services/userDataService');

/**
 * Admin/Debug command handlers for data access
 */

/**
 * Get user profile info
 */
async function cmdUserProfile(ctx) {
  try {
    const userId = ctx.message.text.split(' ')[1] || ctx.from.id.toString();
    
    const profile = await userDataService.getUserProfile(userId);
    if (!profile) {
      await ctx.reply(`❌ User ${userId} not found`);
      return;
    }

    const message = `👤 **User Profile**\n\n` +
      `ID: \`${userId}\`\n` +
      `Username: @${profile.username || 'N/A'}\n` +
      `Email: ${profile.email || 'N/A'}\n` +
      `Tier: ${profile.tier || 'Free'}\n` +
      `Bio: ${profile.bio || 'N/A'}\n` +
      `Last Active: ${profile.lastActive?.toDate() || 'N/A'}\n` +
      `Joined: ${profile.createdAt?.toDate() || 'N/A'}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in userprofile command:', error);
    await ctx.reply('❌ Error getting profile');
  }
}

/**
 * Get nearby members
 */
async function cmdNearby(ctx) {
  try {
    const userId = ctx.message.text.split(' ')[1] || ctx.from.id.toString();
    
    const nearby = await userDataService.getNearbyUsers(userId);
    
    if (nearby.length === 0) {
      await ctx.reply('📍 No nearby members found');
      return;
    }

    let message = `📍 **Nearby Members for ${userId}**\n\n`;
    nearby.forEach((user, index) => {
      message += `${index + 1}. @${user.username || user.firstName}\n` +
        `   Distance: ${user.distance.toFixed(2)}km\n` +
        `   Tier: ${user.tier}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in nearby command:', error);
    await ctx.reply('❌ Error getting nearby members');
  }
}

/**
 * Get subscription status
 */
async function cmdSubscription(ctx) {
  try {
    const userId = ctx.message.text.split(' ')[1] || ctx.from.id.toString();
    
    const subscription = await userDataService.getSubscriptionStatus(userId);
    
    let message = `💎 **Subscription Status**\n\n` +
      `Tier: ${subscription.tier}\n` +
      `Status: ${subscription.isActive ? '✅ Active' : '⏳ Expired'}\n`;

    if (subscription.expiresAt) {
      message += `Expires: ${subscription.expiresAt.toLocaleDateString()}\n`;
    }

    message += `Joined: ${subscription.joinedDate?.toLocaleDateString() || 'N/A'}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in subscription command:', error);
    await ctx.reply('❌ Error getting subscription');
  }
}

/**
 * Track nearby search
 */
async function cmdTrackSearch(ctx) {
  try {
    const userId = ctx.message.text.split(' ')[1] || ctx.from.id.toString();
    
    const result = await userDataService.trackNearbySearch(userId);
    
    if (!result.allowed) {
      await ctx.reply(
        '❌ Weekly search limit reached (3 per week for free users)\n' +
        '💎 Upgrade to premium for unlimited searches'
      );
      return;
    }

    const remaining = result.remaining === -1 ? 'Unlimited' : result.remaining;
    await ctx.reply(`✅ Search tracked. Remaining: ${remaining}`);
  } catch (error) {
    logger.error('Error in tracksearch command:', error);
    await ctx.reply('❌ Error tracking search');
  }
}

/**
 * Update user profile
 */
async function cmdUpdateProfile(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const args = ctx.message.text.split(' ');
    
    if (args.length < 3) {
      await ctx.reply('Usage: /updateprofile <field> <value>\nFields: bio');
      return;
    }

    const field = args[1];
    const value = args.slice(2).join(' ');

    const success = await userDataService.updateUserProfile(userId, {
      [field]: value
    });

    if (success) {
      await ctx.reply(`✅ Profile updated: ${field}`);
    } else {
      await ctx.reply('❌ Failed to update profile');
    }
  } catch (error) {
    logger.error('Error in updateprofile command:', error);
    await ctx.reply('❌ Error updating profile');
  }
}

/**
 * Get data service info
 */
async function cmdDataInfo(ctx) {
  try {
    const message = `🤖 **SantinoBot - Data Services**\n\n` +
      `Available Commands:\n` +
      `/userprofile [id] - Get user profile\n` +
      `/nearby [id] - Get nearby members\n` +
      `/subscription [id] - Get subscription status\n` +
      `/tracksearch [id] - Track nearby search\n` +
      `/updateprofile <field> <value> - Update your profile\n` +
      `/datainfo - This message\n\n` +
      `Status: ✅ Connected to Firestore\n` +
      `Real-time Sync: ✅ Enabled`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in datainfo command:', error);
    await ctx.reply('❌ Error');
  }
}

module.exports = {
  cmdUserProfile,
  cmdNearby,
  cmdSubscription,
  cmdTrackSearch,
  cmdUpdateProfile,
  cmdDataInfo
};
