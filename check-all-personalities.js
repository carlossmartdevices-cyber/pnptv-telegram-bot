#!/usr/bin/env node

/**
 * Check All Users with Personalities
 * Find which users have The Meth Daddy and other personalities
 */

const { db } = require('./src/config/firebase');
const { ADMIN_IDS } = require('./src/config/admin');

console.log('=== Checking All Users with Personalities ===\n');

async function checkAllPersonalities() {
  try {
    console.log(`1. Admin IDs configured: ${ADMIN_IDS.join(', ')}\n`);

    console.log('2. Searching for users with personality data...');
    const usersWithPersonality = await db.collection('users')
      .where('personalityChoice', '!=', null)
      .get();

    if (usersWithPersonality.empty) {
      console.log('   ❌ No users found with personality data');
      return;
    }

    console.log(`   ✅ Found ${usersWithPersonality.size} users with personalities:\n`);

    usersWithPersonality.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      const isAdminUser = ADMIN_IDS.includes(parseInt(userId));
      const personality = userData.personalityChoice;
      
      console.log(`   👤 User ID: ${userId} ${isAdminUser ? '(ADMIN)' : ''}`);
      console.log(`      Username: @${userData.username || 'unknown'}`);
      console.log(`      Name: ${userData.firstName || 'unknown'}`);
      console.log(`      Personality: ${personality.emoji} ${personality.name}`);
      console.log(`      Description: ${personality.description}`);
      if (personality.selectedAt) {
        console.log(`      Selected: ${personality.selectedAt.toDate()}`);
      }
      console.log('');
    });

    console.log('3. Checking for The Meth Daddy specifically...');
    const methDaddyUsers = [];
    usersWithPersonality.forEach(doc => {
      const userData = doc.data();
      if (userData.personalityChoice && userData.personalityChoice.name === 'The Meth Daddy') {
        methDaddyUsers.push({
          userId: doc.id,
          username: userData.username,
          firstName: userData.firstName
        });
      }
    });

    if (methDaddyUsers.length > 0) {
      console.log(`   💀 Found ${methDaddyUsers.length} user(s) with The Meth Daddy:`);
      methDaddyUsers.forEach(user => {
        console.log(`      - User ${user.userId} (@${user.username || 'unknown'}) - ${user.firstName || 'unknown'}`);
      });
    } else {
      console.log('   ❌ No users found with The Meth Daddy personality');
    }

    console.log('\n4. Summary of all personalities:');
    const personalityCounts = {};
    usersWithPersonality.forEach(doc => {
      const personality = doc.data().personalityChoice;
      if (personality && personality.name) {
        personalityCounts[personality.name] = (personalityCounts[personality.name] || 0) + 1;
      }
    });

    Object.entries(personalityCounts).forEach(([name, count]) => {
      const isAdminOnly = name === 'The Meth Daddy';
      console.log(`   ${isAdminOnly ? '💀' : '🎭'} ${name}: ${count} user${count > 1 ? 's' : ''}${isAdminOnly ? ' (ADMIN ONLY)' : ''}`);
    });

    console.log('\n=== Check Complete ===');

  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkAllPersonalities();