#!/usr/bin/env node

/**
 * Special Badge & Lifetime Membership Script
 * Adds custom badge "Santino's fav slut of the week" to user Chill_Party_bttm
 * Extends membership to lifetime and sends group announcement
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { db } = require('./src/config/firebase');
const logger = require('./src/utils/logger');
const { escapeMdV2 } = require('./src/utils/telegramEscapes');

// Configuration
const TARGET_USER_ID = '7857923659'; // Chill_Party_bttm
const TARGET_USERNAME = 'Chill_Party_bttm';
const FREE_GROUP_ID = process.env.FREE_GROUP_ID || '-1003291737499';
const SPECIAL_BADGE = "🔥 Santino's fav slut of the week";
const SAFE_SPECIAL_BADGE = escapeMdV2(String(SPECIAL_BADGE));

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

/**
 * Add special badge to user
 */
async function addSpecialBadge(userId, badge) {
  try {
    console.log(`🎯 Adding special badge to user ${userId}...`);
    
    // Get current user data
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error(`User ${userId} not found in database`);
    }
    
    const userData = userDoc.data();
    const currentBadges = Array.isArray(userData.badges) ? userData.badges : [];
    
    console.log(`📋 Current badges: ${JSON.stringify(currentBadges)}`);
    
    // Add the special badge if not already present
    if (!currentBadges.includes(badge)) {
      currentBadges.push(badge);
      
      await db.collection('users').doc(userId).update({
        badges: currentBadges,
        lastBadgeAdded: new Date(),
        lastBadgeAddedBy: 'admin_special'
      });
      
      console.log(`✅ Badge added successfully!`);
      console.log(`📋 New badges: ${JSON.stringify(currentBadges)}`);
      
      return { success: true, badgesCount: currentBadges.length };
    } else {
      console.log(`⚠️  Badge already exists`);
      return { success: true, badgesCount: currentBadges.length, alreadyExists: true };
    }
    
  } catch (error) {
    console.error('❌ Error adding badge:', error);
    throw error;
  }
}

/**
 * Set user membership to lifetime
 */
async function setLifetimeMembership(userId) {
  try {
    console.log(`💎 Setting lifetime membership for user ${userId}...`);
    
    const updateData = {
      tier: 'Premium',
      membershipExpiresAt: null, // Null = lifetime
      membershipIsPremium: true,
      tierUpdatedAt: new Date(),
      tierUpdatedBy: 'admin_special',
      previousTier: 'Basic', // Assume they had Basic
      lastActive: new Date(),
      lifetimeMember: true,
      lifetimeMemberSince: new Date(),
      lifetimeMemberReason: 'Special recognition - Santino favorite'
    };
    
    await db.collection('users').doc(userId).update(updateData);
    
    console.log(`✅ Lifetime membership activated!`);
    console.log(`💎 Tier: Premium (Lifetime)`);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error setting lifetime membership:', error);
    throw error;
  }
}

/**
 * Send group announcement
 */
async function sendGroupAnnouncement(userId, username) {
  try {
    console.log(`📢 Sending group announcement...`);
    
    const announcementMessage = 
      `🎉 **SPECIAL ANNOUNCEMENT** 🎉\n\n` +
      `🔥 **${SAFE_SPECIAL_BADGE}** 🔥\n\n` +
      `Congratulations to @${escapeMdV2(String(username))}!\n\n` +
      `🌟 **Lifetime Membership Extended** 🌟\n` +
      `💎 Premium access forever\n` +
      `🎯 Special recognition from Santino\n` +
      `🚀 All premium features unlocked permanently\n\n` +
      `Welcome to the elite club! 🔥💎`;
    
    // Send to free group (main announcement)
    if (FREE_GROUP_ID) {
      await bot.telegram.sendMessage(FREE_GROUP_ID, announcementMessage, {
        parse_mode: 'Markdown'
      });
      console.log(`✅ Announcement sent to group ${FREE_GROUP_ID}`);
    }
    
    // Also send private message to user
    try {
      const privateMessage = 
        `🎉 **CONGRATULATIONS!** 🎉\n\n` +
        `You've been awarded:\n` +
        `🔥 **${SAFE_SPECIAL_BADGE}**\n\n` +
        `🌟 **Lifetime Premium Membership** 🌟\n` +
        `💎 All premium features unlocked forever\n` +
        `🎯 Special recognition from Santino\n` +
        `🚀 Exclusive access to all channels\n\n` +
        `Welcome to the elite club! Your membership never expires! 🔥💎`;
      
      await bot.telegram.sendMessage(userId, privateMessage, {
        parse_mode: 'Markdown'
      });
      console.log(`✅ Private notification sent to user`);
    } catch (dmError) {
      console.log(`⚠️  Could not send private message (user may have bot blocked): ${dmError.message}`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error sending group announcement:', error);
    throw error;
  }
}

/**
 * Get user info for verification
 */
async function getUserInfo(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data();
    return {
      userId,
      username: userData.username || 'Unknown',
      firstName: userData.firstName || 'Unknown', 
      tier: userData.tier || 'Free',
      badges: userData.badges || [],
      membershipExpiresAt: userData.membershipExpiresAt,
      lifetimeMember: userData.lifetimeMember || false
    };
    
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Special Badge & Lifetime Membership Script');
  console.log('================================================\n');
  
  try {
    // 1. Verify user exists
    console.log('📋 STEP 1: Verifying user...');
    const userInfo = await getUserInfo(TARGET_USER_ID);
    
    if (!userInfo) {
      throw new Error(`User ${TARGET_USER_ID} not found!`);
    }
    
    console.log(`✅ User found:`);
    console.log(`   Name: ${userInfo.firstName}`);
    console.log(`   Username: @${userInfo.username}`);
    console.log(`   Current Tier: ${userInfo.tier}`);
    console.log(`   Current Badges: ${JSON.stringify(userInfo.badges)}`);
    console.log(`   Lifetime Member: ${userInfo.lifetimeMember}`);
    console.log('');
    
    // 2. Add special badge
    console.log('📋 STEP 2: Adding special badge...');
    const badgeResult = await addSpecialBadge(TARGET_USER_ID, SPECIAL_BADGE);
    console.log(`✅ Badge operation complete (${badgeResult.badgesCount} total badges)`);
    console.log('');
    
    // 3. Set lifetime membership
    console.log('📋 STEP 3: Setting lifetime membership...');
    const membershipResult = await setLifetimeMembership(TARGET_USER_ID);
    console.log(`✅ Lifetime membership activated`);
    console.log('');
    
    // 4. Send group announcement
    console.log('📋 STEP 4: Sending group announcement...');
    const announcementResult = await sendGroupAnnouncement(TARGET_USER_ID, TARGET_USERNAME);
    console.log(`✅ Group announcement sent`);
    console.log('');
    
    // 5. Final verification
    console.log('📋 STEP 5: Final verification...');
    const finalUserInfo = await getUserInfo(TARGET_USER_ID);
    console.log(`✅ Final user status:`);
    console.log(`   Tier: ${finalUserInfo.tier}`);
    console.log(`   Badges: ${JSON.stringify(finalUserInfo.badges)}`);
    console.log(`   Lifetime Member: ${finalUserInfo.lifetimeMember}`);
    console.log(`   Membership Expires: ${finalUserInfo.membershipExpiresAt ? 'Yes' : 'Never (Lifetime)'}`);
    console.log('');
    
    console.log('🎉 SUCCESS! All operations completed successfully!');
    console.log('================================================');
    console.log(`🔥 Badge Added: "${SPECIAL_BADGE}"`);
    console.log(`💎 Lifetime Membership: Activated`);
    console.log(`📢 Group Announcement: Sent`);
    console.log(`👤 User: @${TARGET_USERNAME} (${TARGET_USER_ID})`);
    
  } catch (error) {
    console.error('\n❌ SCRIPT FAILED:');
    console.error(error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Execute the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  addSpecialBadge,
  setLifetimeMembership,
  sendGroupAnnouncement,
  getUserInfo
};