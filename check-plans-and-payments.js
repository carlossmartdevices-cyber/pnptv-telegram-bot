require('dotenv').config();
const { db } = require('./src/config/firebase');
const planService = require('./src/services/planService');
const daimoService = require('./src/services/daimoPayService');

async function checkPlansAndPayments() {
  console.log('🔍 CHECKING PLANS AND PAYMENT METHODS\n');
  console.log('='.repeat(80));
  
  try {
    // 1. Check Plans
    console.log('\n1️⃣  SUBSCRIPTION PLANS STATUS\n');
    const plans = await planService.listPlans();
    
    if (!plans || plans.length === 0) {
      console.log('❌ NO PLANS FOUND');
    } else {
      console.log(`✅ Total Plans: ${plans.length}\n`);
      plans.forEach((plan, i) => {
        const status = plan.active !== false ? '✅ ACTIVE' : '❌ INACTIVE';
        console.log(`${i + 1}. ${status} - ${plan.name}`);
        console.log(`   Price: $${plan.price} | Duration: ${plan.durationDays || 30} days`);
        console.log(`   ID: ${plan.id}`);
        console.log('');
      });
    }
    
    // 2. Check Daimo Payment Service
    console.log('\n' + '='.repeat(80));
    console.log('\n2️⃣  DAIMO PAY SERVICE STATUS\n');
    
    const config = daimoService.getConfig();
    console.log(`✅ Daimo Service Enabled: ${config.enabled}`);
    console.log(`✅ API URL: ${config.baseUrl}`);
    console.log(`✅ Supported Networks: ${Object.keys(config.supportedChains).join(', ')}`);
    
    // 3. Test Payment Creation
    console.log('\n' + '='.repeat(80));
    console.log('\n3️⃣  TEST PAYMENT CREATION\n');
    
    try {
      const testPayment = await daimoService.createPayment({
        planName: 'Test Plan',
        amount: 1.00,
        userId: 'system_test_' + Date.now(),
        planId: 'system-test',
        userName: 'System Test'
      });
      
      console.log('✅ Payment Creation: SUCCESS');
      console.log(`   Payment ID: ${testPayment.id}`);
      console.log(`   Amount: $${testPayment.amount} ${testPayment.currency}`);
      console.log(`   Status: ${testPayment.status}`);
      console.log(`   Checkout URL: ${testPayment.checkoutUrl.substring(0, 50)}...`);
    } catch (error) {
      console.log('❌ Payment Creation: FAILED');
      console.log(`   Error: ${error.message}`);
    }
    
    // 4. Check Database Plans
    console.log('\n' + '='.repeat(80));
    console.log('\n4️⃣  FIRESTORE PLANS COLLECTION\n');
    
    const dbPlans = await db.collection('subscriptionPlans').get();
    console.log(`Total Plans in Firestore: ${dbPlans.size}`);
    
    if (dbPlans.size > 0) {
      dbPlans.docs.slice(0, 5).forEach((doc, i) => {
        const p = doc.data();
        console.log(`${i + 1}. ${p.name} - $${p.price}`);
      });
    }
    
    // 5. Check Active Users with Premium
    console.log('\n' + '='.repeat(80));
    console.log('\n5️⃣  ACTIVE PREMIUM SUBSCRIPTIONS\n');
    
    const premiumUsers = await db.collection('users')
      .where('tier', '!=', 'Free')
      .limit(5)
      .get();
    
    console.log(`✅ Premium Users (showing first 5): ${premiumUsers.size}`);
    premiumUsers.docs.forEach((doc, i) => {
      const u = doc.data();
      console.log(`${i + 1}. ${u.tier} - Expires: ${u.membershipExpiresAt || 'Unknown'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ ALL SYSTEMS CHECK COMPLETE\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkPlansAndPayments();
