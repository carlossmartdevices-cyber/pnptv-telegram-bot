#!/usr/bin/env node

/**
 * Set The Meth Daddy personality for admin user
 */

const { db } = require('./src/config/firebase');
const personalityService = require('./src/services/personalityService');
const { ADMIN_IDS } = require('./src/config/admin');

console.log('=== Setting The Meth Daddy Personality for Admin ===\n');

async function setAdminPersonality() {
  try {
    console.log('1. Checking admin configuration...');
    console.log(`   ✅ Admin IDs: ${ADMIN_IDS.join(', ')}`);
    
    const adminUserId = ADMIN_IDS[0].toString(); // Use first admin ID
    console.log(`   ✅ Setting personality for admin user: ${adminUserId}`);

    console.log('\n2. Getting admin personality choices...');
    const choices = personalityService.getPersonalityChoices(adminUserId);
    console.log(`   ✅ Available personalities for admin: ${choices.length}`);
    choices.forEach(choice => {
      console.log(`      ${choice.emoji} ${choice.name} - ${choice.description}${choice.isAdminOnly ? ' (ADMIN ONLY)' : ''}`);
    });

    console.log('\n3. Finding The Meth Daddy personality...');
    const methDaddyChoice = choices.find(c => c.name === 'The Meth Daddy');
    
    if (!methDaddyChoice) {
      console.error('   ❌ The Meth Daddy personality not found!');
      process.exit(1);
    }
    
    console.log(`   ✅ Found: ${methDaddyChoice.emoji} ${methDaddyChoice.name} - ${methDaddyChoice.description}`);

    console.log('\n4. Setting The Meth Daddy personality for admin...');
    const success = await personalityService.setUserPersonality(adminUserId, methDaddyChoice);
    
    if (success) {
      console.log(`   ✅ Successfully set personality for admin ${adminUserId}`);
      
      // Verify the setting
      const badge = await personalityService.getPersonalityBadge(adminUserId);
      console.log(`   ✅ Verified badge: ${badge}`);
      
      const personalityData = await personalityService.getUserPersonality(adminUserId);
      console.log(`   ✅ Full personality data:`, personalityData);
    } else {
      console.error('   ❌ Failed to set personality');
      process.exit(1);
    }

    console.log('\n5. Testing admin-only access...');
    const regularUserChoices = personalityService.getPersonalityChoices('123456789'); // Non-admin user
    const adminChoices = personalityService.getPersonalityChoices(adminUserId);
    
    console.log(`   ✅ Regular user choices: ${regularUserChoices.length} (should be 4)`);
    console.log(`   ✅ Admin user choices: ${adminChoices.length} (should be 5)`);
    
    const regularHasMethDaddy = regularUserChoices.some(c => c.name === 'The Meth Daddy');
    const adminHasMethDaddy = adminChoices.some(c => c.name === 'The Meth Daddy');
    
    console.log(`   ${regularHasMethDaddy ? '❌' : '✅'} Regular user can see The Meth Daddy: ${regularHasMethDaddy} (should be false)`);
    console.log(`   ${adminHasMethDaddy ? '✅' : '❌'} Admin user can see The Meth Daddy: ${adminHasMethDaddy} (should be true)`);

    console.log('\n=== Admin Personality Setup Complete ===');
    console.log('💀 **The Meth Daddy** personality is now active for admin user!');
    console.log('');
    console.log('Admin features:');
    console.log('- Exclusive "💀 The Meth Daddy" personality option');
    console.log('- Shows as "Supreme Leader - Admin Only"');
    console.log('- Only visible to admin users in profile settings');
    console.log('- Regular users see standard 4 personalities only');
    console.log('');
    console.log('🎭 Admin can change personality anytime via /profile → Settings → Change personality');

  } catch (error) {
    console.error('❌ Error setting admin personality:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

setAdminPersonality();