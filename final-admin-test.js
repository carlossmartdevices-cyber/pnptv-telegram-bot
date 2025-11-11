#!/usr/bin/env node

/**
 * Final Test - Verify Everything is Ready for Admin
 */

const { db } = require('./src/config/firebase');
const { getPersonalityBadgeDisplay } = require('./src/bot/handlers/profile');
const { ADMIN_IDS, isAdmin } = require('./src/config/admin');
const { t } = require('./src/utils/i18n');

console.log('=== Final Admin Personality Test ===\n');

async function finalTest() {
  try {
    const adminUserId = ADMIN_IDS[0].toString();
    console.log(`🎯 Testing for admin user: ${adminUserId} (@Sxntinx)\n`);

    // 1. Verify admin status
    console.log('1. Admin verification:');
    const adminStatus = isAdmin(adminUserId);
    console.log(`   ✅ Is admin: ${adminStatus}`);

    // 2. Get user data
    console.log('\n2. Database check:');
    const userDoc = await db.collection('users').doc(adminUserId).get();
    if (!userDoc.exists) {
      console.log('   ❌ User not found in database');
      return;
    }
    const userData = userDoc.data();
    console.log(`   ✅ User found: @${userData.username} (${userData.firstName})`);
    console.log(`   ✅ Has personalityChoice: ${!!userData.personalityChoice}`);
    console.log(`   ✅ Has badge field: ${!!userData.badge}`);

    // 3. Test personality badge display
    console.log('\n3. Personality badge test:');
    const badgeEN = await getPersonalityBadgeDisplay(userData, 'en');
    const badgeES = await getPersonalityBadgeDisplay(userData, 'es');
    console.log(`   ✅ English: "${badgeEN.trim()}"`);
    console.log(`   ✅ Spanish: "${badgeES.trim()}"`);

    // 4. Test full profile template
    console.log('\n4. Full profile template test:');
    const profileText = t("profileInfo", "en", {
      userId: userData.userId,
      username: userData.username || "Not set",
      tier: userData.tier || "Free",
      membershipInfo: "",
      personalityBadge: badgeEN,
      location: userData.locationName || "Not set",
      bio: userData.bio || "Not set",
    });
    
    console.log('   📋 Complete profile text:');
    console.log('   ' + '='.repeat(50));
    console.log('   ' + profileText.split('\n').join('\n   '));
    console.log('   ' + '='.repeat(50));

    // 5. Verify The Meth Daddy is visible
    const hasMethDaddy = profileText.includes('💀 The Meth Daddy');
    console.log(`\n5. Final verification:`);
    console.log(`   ${hasMethDaddy ? '✅' : '❌'} The Meth Daddy visible in profile: ${hasMethDaddy}`);

    console.log('\n=== Test Complete ===');
    
    if (hasMethDaddy) {
      console.log('🎉 SUCCESS! Everything is ready!');
      console.log('');
      console.log('💀 Now try in Telegram:');
      console.log('   1. Send /profile to @PNPtvbot');
      console.log('   2. Look for "🎭 Personality: 💀 The Meth Daddy"');
      console.log('   3. Click ⚙️ Settings to manage personality');
      console.log('');
      console.log('🚀 Your admin personality should be visible!');
    } else {
      console.log('❌ ISSUE: The Meth Daddy not showing in profile template');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

finalTest();