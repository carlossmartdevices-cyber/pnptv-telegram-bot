#!/usr/bin/env node

/**
 * Debug Admin Personality Display Issue
 * Check why admin user is not seeing The Meth Daddy personality
 */

const { db } = require('./src/config/firebase');
const personalityService = require('./src/services/personalityService');
const { getPersonalityBadgeDisplay } = require('./src/bot/handlers/profile');
const { ADMIN_IDS, isAdmin } = require('./src/config/admin');

console.log('=== Debug Admin Personality Display Issue ===\n');

async function debugPersonalityDisplay() {
  try {
    const adminUserId = ADMIN_IDS[0].toString();
    console.log(`1. Debugging for admin user: ${adminUserId}`);
    
    console.log('\n2. Checking admin status...');
    const adminStatus = isAdmin(adminUserId);
    console.log(`   ✅ Is admin: ${adminStatus}`);
    console.log(`   ✅ Admin IDs: ${ADMIN_IDS.join(', ')}`);

    console.log('\n3. Checking user document in database...');
    const userDoc = await db.collection('users').doc(adminUserId).get();
    if (!userDoc.exists) {
      console.log('   ❌ User document does not exist!');
      return;
    }
    
    const userData = userDoc.data();
    console.log(`   ✅ User document exists`);
    console.log(`   📄 User data:`, JSON.stringify(userData, null, 2));

    console.log('\n4. Testing personality service functions...');
    const hasPersonality = await personalityService.hasPersonality(adminUserId);
    console.log(`   ✅ Has personality: ${hasPersonality}`);
    
    if (hasPersonality) {
      const personalityBadge = await personalityService.getPersonalityBadge(adminUserId);
      console.log(`   ✅ Personality badge: ${personalityBadge}`);
      
      const personalityData = await personalityService.getUserPersonality(adminUserId);
      console.log(`   ✅ Full personality data:`, personalityData);
    }

    console.log('\n5. Testing profile badge display function...');
    const badgeDisplayEN = await getPersonalityBadgeDisplay(userData, 'en');
    const badgeDisplayES = await getPersonalityBadgeDisplay(userData, 'es');
    console.log(`   ✅ Badge display (EN): "${badgeDisplayEN}"`);
    console.log(`   ✅ Badge display (ES): "${badgeDisplayES}"`);

    console.log('\n6. Testing personality choices for admin...');
    const adminChoices = personalityService.getPersonalityChoices(adminUserId);
    console.log(`   ✅ Admin choices count: ${adminChoices.length}`);
    adminChoices.forEach((choice, index) => {
      console.log(`      ${index + 1}. ${choice.emoji} ${choice.name} - ${choice.description}${choice.isAdminOnly ? ' (ADMIN ONLY)' : ''}`);
    });

    console.log('\n7. Testing personality choices for regular user...');
    const regularChoices = personalityService.getPersonalityChoices('123456789');
    console.log(`   ✅ Regular user choices count: ${regularChoices.length}`);
    regularChoices.forEach((choice, index) => {
      console.log(`      ${index + 1}. ${choice.emoji} ${choice.name} - ${choice.description}`);
    });

    console.log('\n8. Checking if The Meth Daddy exists...');
    const methDaddyChoice = adminChoices.find(c => c.name === 'The Meth Daddy');
    if (methDaddyChoice) {
      console.log(`   ✅ The Meth Daddy found: ${methDaddyChoice.emoji} ${methDaddyChoice.name}`);
      console.log(`   ✅ Description: ${methDaddyChoice.description}`);
      console.log(`   ✅ Admin only: ${methDaddyChoice.isAdminOnly}`);
    } else {
      console.log(`   ❌ The Meth Daddy NOT found in admin choices!`);
    }

    console.log('\n9. Testing callback data generation...');
    if (methDaddyChoice) {
      const callbackData = `personality_select_${methDaddyChoice.name.replace(/\s+/g, '_')}`;
      console.log(`   ✅ Callback data: ${callbackData}`);
    }

    console.log('\n=== Debug Complete ===');
    
    if (!hasPersonality) {
      console.log('❌ ISSUE: Admin user has no personality set!');
      console.log('💡 SOLUTION: Run set-admin-personality.js again');
    } else if (badgeDisplayEN.includes('The Meth Daddy')) {
      console.log('✅ Everything looks correct - The Meth Daddy should be visible');
      console.log('💡 Try: /profile in the bot to see if it appears');
    } else {
      console.log('❌ ISSUE: Badge display does not show The Meth Daddy');
      console.log('💡 SOLUTION: Check personality data format');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

debugPersonalityDisplay();