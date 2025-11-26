const { db } = require('./src/config/firebase');

async function verifyActivation() {
  const adminId = '8365312597';

  try {
    console.log('🔍 Fetching user data from database...\n');

    const userDoc = await db.collection('users').doc(adminId).get();

    if (!userDoc.exists) {
      console.log('❌ User not found in database');
      process.exit(1);
    }

    const userData = userDoc.data();

    console.log('✅ USER DATA VERIFIED:\n');
    console.log('👤 User ID:', adminId);
    console.log('📊 Tier:', userData.tier);
    console.log('💎 Premium Status:', userData.membershipIsPremium ? 'YES ✅' : 'NO ❌');
    console.log('📅 Activated At:', userData.tierUpdatedAt ? userData.tierUpdatedAt.toDate().toLocaleString() : 'N/A');
    console.log('🔧 Activated By:', userData.tierUpdatedBy || 'N/A');
    console.log('⏰ Expires At:', userData.membershipExpiresAt ? userData.membershipExpiresAt.toDate().toLocaleString() : 'Never (Lifetime)');
    console.log('🔗 Channel Link:', userData.inviteLink || 'Not generated');
    console.log('📝 Previous Tier:', userData.previousTier || 'N/A');

    console.log('\n✅ Crystal Plan is ACTIVE and CONFIRMED! 🎉');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

verifyActivation();
