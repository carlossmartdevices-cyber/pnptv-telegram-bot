#!/usr/bin/env node

/**
 * Verify Special Badge & Lifetime Membership
 * Check that the changes were applied correctly to Chill_Party_bttm
 */

require('dotenv').config();
const { db } = require('./src/config/firebase');

const TARGET_USER_ID = '7857923659'; // Chill_Party_bttm

async function verifyChanges() {
  console.log('🔍 Verifying Special Badge & Lifetime Membership Changes');
  console.log('=====================================================\n');
  
  try {
    // Get user data from database
    const userDoc = await db.collection('users').doc(TARGET_USER_ID).get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found!');
      return;
    }
    
    const userData = userDoc.data();
    
    console.log('📋 USER INFORMATION:');
    console.log(`   User ID: ${TARGET_USER_ID}`);
    console.log(`   Name: ${userData.firstName || 'Unknown'} ${userData.lastName || ''}`);
    console.log(`   Username: @${userData.username || 'Unknown'}`);
    console.log('');
    
    console.log('💎 MEMBERSHIP STATUS:');
    console.log(`   Current Tier: ${userData.tier || 'Free'}`);
    console.log(`   Is Premium: ${userData.membershipIsPremium ? 'Yes' : 'No'}`);
    console.log(`   Lifetime Member: ${userData.lifetimeMember ? 'Yes' : 'No'}`);
    console.log(`   Membership Expires: ${userData.membershipExpiresAt ? 'Yes' : 'Never (Lifetime)'}`);
    console.log(`   Updated By: ${userData.tierUpdatedBy || 'Unknown'}`);
    console.log(`   Updated At: ${userData.tierUpdatedAt ? new Date(userData.tierUpdatedAt.toDate()).toLocaleString() : 'Unknown'}`);
    console.log('');
    
    console.log('🏆 BADGES:');
    const badges = userData.badges || [];
    if (badges.length > 0) {
      badges.forEach((badge, index) => {
        console.log(`   ${index + 1}. ${badge}`);
      });
    } else {
      console.log('   No badges found');
    }
    console.log(`   Total Badges: ${badges.length}`);
    console.log(`   Last Badge Added: ${userData.lastBadgeAdded ? new Date(userData.lastBadgeAdded.toDate()).toLocaleString() : 'Never'}`);
    console.log('');
    
    console.log('✅ VERIFICATION RESULTS:');
    
    // Check if special badge exists
    const hasSpecialBadge = badges.includes("🔥 Santino's fav slut of the week");
    console.log(`   🔥 Special Badge: ${hasSpecialBadge ? '✅ PRESENT' : '❌ MISSING'}`);
    
    // Check if lifetime membership is set
    const isLifetime = userData.lifetimeMember === true && userData.membershipExpiresAt === null;
    console.log(`   💎 Lifetime Membership: ${isLifetime ? '✅ ACTIVE' : '❌ NOT SET'}`);
    
    // Check if tier is Premium
    const isPremiumTier = userData.tier === 'Premium';
    console.log(`   ⭐ Premium Tier: ${isPremiumTier ? '✅ ACTIVE' : '❌ NOT SET'}`);
    
    console.log('');
    
    // Summary
    const allGood = hasSpecialBadge && isLifetime && isPremiumTier;
    if (allGood) {
      console.log('🎉 ALL CHECKS PASSED! The user has been successfully upgraded!');
    } else {
      console.log('⚠️  Some checks failed. Please review the above results.');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Execute verification
if (require.main === module) {
  verifyChanges()
    .then(() => {
      console.log('\n✅ Verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}