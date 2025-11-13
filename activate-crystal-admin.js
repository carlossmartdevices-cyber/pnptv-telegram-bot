const bot = require('./src/bot/index');
const { db, admin } = require('./src/config/firebase');
const { activateMembership } = require('./src/utils/membershipManager');

async function activateCrystalPlan() {
  const adminId = '8365312597';

  try {
    console.log('\n🔍 Checking for Crystal plan in database...');

    // Find the Crystal plan
    const plansSnapshot = await db.collection('plans').get();
    let crystalPlan = null;

    plansSnapshot.forEach(doc => {
      const plan = doc.data();
      if (plan.tier === 'Crystal' || plan.name.toLowerCase().includes('crystal')) {
        crystalPlan = { id: doc.id, ...plan };
      }
    });

    if (!crystalPlan) {
      console.log('\n⚠️  Crystal plan not found in database. Creating default activation...');

      // Activate with default Crystal plan settings
      const result = await activateMembership(
        adminId,
        'Crystal',
        'manual_activation',
        30, // 30 days
        bot,
        {
          paymentAmount: 'Manual Test',
          paymentCurrency: 'COP',
          paymentMethod: 'Manual Activation',
          reference: 'CRYSTAL-ADMIN-TEST-' + Date.now()
        }
      );

      console.log('\n✅ Crystal plan activated successfully!');
      console.log('📋 Activation details:', {
        tier: result.tier,
        expiresAt: result.membershipExpiresAt ? result.membershipExpiresAt.toDate() : 'Never'
      });
    } else {
      console.log('\n✅ Found Crystal plan:', crystalPlan.name);
      console.log('   Price:', crystalPlan.priceInCOP, crystalPlan.currency);
      console.log('   Duration:', crystalPlan.duration, 'days');

      // Activate membership
      const result = await activateMembership(
        adminId,
        'Crystal',
        'manual_activation',
        crystalPlan.duration || 30,
        bot,
        {
          paymentAmount: crystalPlan.priceInCOP || crystalPlan.price,
          paymentCurrency: crystalPlan.currency || 'COP',
          paymentMethod: 'Manual Activation',
          reference: 'CRYSTAL-ADMIN-' + Date.now()
        }
      );

      console.log('\n✅ Crystal plan activated successfully!');
      console.log('📋 Activation details:', {
        tier: result.tier,
        expiresAt: result.membershipExpiresAt ? result.membershipExpiresAt.toDate() : 'Never'
      });
    }

    // Send detailed admin notification
    const userDoc = await db.collection('users').doc(adminId).get();
    const userData = userDoc.data();

    const expiresDate = userData.membershipExpiresAt
      ? userData.membershipExpiresAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Never (Lifetime)';

    // Get the channel invite link from user data
    const inviteLink = userData.inviteLink || 'Not generated yet';

    const adminMessage = `🎉 *CRYSTAL PLAN ACTIVATED*

✅ *Payment Confirmed & Plan Activated*

👤 *User Details:*
• User ID: ${adminId}
• Tier: ${userData.tier}
• Status: ${userData.membershipIsPremium ? 'PREMIUM ✅' : 'Free'}

💎 *Plan Details:*
• Plan: Crystal Plan
• Duration: ${crystalPlan ? crystalPlan.duration : 30} days
• Activated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
• Expires: ${expiresDate}

💰 *Payment Info:*
• Amount: $${crystalPlan ? crystalPlan.priceInCOP : 'N/A'} ${crystalPlan ? crystalPlan.currency : 'COP'}
• Method: Manual Activation
• Reference: CRYSTAL-ADMIN-${Date.now()}

🔓 *Access Status:* GRANTED
The user now has full access to all Crystal plan features.

🔗 *Premium Channel Access:*
${inviteLink}

⚠️ This is your unique access link. Do not share it with anyone.

Use /profile to view your updated membership status.`;

    await bot.telegram.sendMessage(adminId, adminMessage, { parse_mode: 'Markdown' });
    console.log('\n📨 Admin notification sent!');
    console.log('\n🔗 Channel link:', inviteLink);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

activateCrystalPlan();
