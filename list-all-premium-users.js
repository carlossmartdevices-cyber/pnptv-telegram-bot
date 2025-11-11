require('dotenv').config();
const { db } = require('./src/config/firebase');

async function listPremiumUsers() {
  try {
    console.log('=== PNPtv Premium Users Report ===\n');
    console.log(`Generated: ${new Date().toLocaleString()}\n`);

    // Get all users
    const usersSnapshot = await db.collection('users').get();

    const now = new Date();
    const premiumUsers = [];
    const expiredUsers = [];
    let freeUsers = 0;

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;

      // Check if user has premium membership
      const tier = userData.tier || 'Free';
      const membershipExpiration = userData.membershipExpiration?.toDate();
      const isPremium = membershipExpiration && membershipExpiration > now;

      const userInfo = {
        userId,
        username: userData.username || 'N/A',
        firstName: userData.firstName || 'N/A',
        lastName: userData.lastName || '',
        tier,
        language: userData.language || 'en',
        membershipExpiration: membershipExpiration ? membershipExpiration.toLocaleString() : 'N/A',
        isPremium,
        planId: userData.planId || 'N/A',
        onboardingComplete: userData.onboardingComplete || false,
        createdAt: userData.createdAt?.toDate()?.toLocaleString() || 'N/A'
      };

      if (tier !== 'Free' && isPremium) {
        premiumUsers.push(userInfo);
      } else if (tier !== 'Free' && !isPremium) {
        expiredUsers.push(userInfo);
      } else {
        freeUsers++;
      }
    });

    // Sort premium users by expiration date
    premiumUsers.sort((a, b) => {
      const dateA = new Date(a.membershipExpiration);
      const dateB = new Date(b.membershipExpiration);
      return dateB - dateA; // Most time remaining first
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 SUMMARY\n');
    console.log(`✅ Active Premium Users: ${premiumUsers.length}`);
    console.log(`⏰ Expired Premium Users: ${expiredUsers.length}`);
    console.log(`🆓 Free Users: ${freeUsers}`);
    console.log(`📈 Total Users: ${usersSnapshot.size}`);
    console.log(`💰 Conversion Rate: ${((premiumUsers.length / usersSnapshot.size) * 100).toFixed(2)}%`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (premiumUsers.length > 0) {
      console.log('💎 ACTIVE PREMIUM USERS\n');

      premiumUsers.forEach((user, index) => {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const daysRemaining = Math.ceil((new Date(user.membershipExpiration) - now) / (1000 * 60 * 60 * 24));

        console.log(`${index + 1}. ${fullName} (@${user.username})`);
        console.log(`   User ID: ${user.userId}`);
        console.log(`   Tier: ${user.tier}`);
        console.log(`   Plan: ${user.planId}`);
        console.log(`   Language: ${user.language.toUpperCase()}`);
        console.log(`   Expires: ${user.membershipExpiration} (${daysRemaining} days)`);
        console.log(`   Joined: ${user.createdAt}`);
        console.log('');
      });
    }

    if (expiredUsers.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('⏰ EXPIRED PREMIUM USERS (Potential Re-engagement)\n');

      expiredUsers.forEach((user, index) => {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const daysExpired = Math.ceil((now - new Date(user.membershipExpiration)) / (1000 * 60 * 60 * 24));

        console.log(`${index + 1}. ${fullName} (@${user.username})`);
        console.log(`   User ID: ${user.userId}`);
        console.log(`   Last Tier: ${user.tier}`);
        console.log(`   Last Plan: ${user.planId}`);
        console.log(`   Expired: ${user.membershipExpiration} (${daysExpired} days ago)`);
        console.log('');
      });
    }

    // Breakdown by tier
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 BREAKDOWN BY TIER\n');

    const tierCounts = {};
    premiumUsers.forEach(user => {
      tierCounts[user.tier] = (tierCounts[user.tier] || 0) + 1;
    });

    Object.entries(tierCounts).sort((a, b) => b[1] - a[1]).forEach(([tier, count]) => {
      console.log(`${tier}: ${count} users`);
    });

    // Breakdown by plan
    console.log('\n📋 BREAKDOWN BY PLAN\n');

    const planCounts = {};
    premiumUsers.forEach(user => {
      planCounts[user.planId] = (planCounts[user.planId] || 0) + 1;
    });

    Object.entries(planCounts).sort((a, b) => b[1] - a[1]).forEach(([plan, count]) => {
      console.log(`${plan}: ${count} users`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('Error fetching premium users:', error);
  }

  process.exit(0);
}

listPremiumUsers();
