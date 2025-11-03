#!/usr/bin/env node

/**
 * Fix Test Plan Collection
 * Add test plan to the correct "plans" collection that planService uses
 */

require('dotenv').config();

const { db } = require('./src/config/firebase');

async function fixTestPlanCollection() {
  try {
    console.log('🔧 Moving test plan to correct collection...');

    const testPlan = {
      id: 'test-1usd',
      name: 'Test Plan',
      displayName: 'Test Plan ($1)',
      price: 1.00,
      priceInCOP: 4000,
      currency: 'USD',
      duration: 1,
      durationDays: 1,
      tier: 'trial-week',
      description: 'Test plan for $1 USD - 1 day access for payment testing',
      features: [
        'Test access to premium features',
        'Payment system testing',
        '1 day duration',
        'Full Daimo/ePayco integration test'
      ],
      active: true,
      isTest: true,
      paymentMethods: ['daimo', 'epayco'],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to the correct "plans" collection (not "subscriptionPlans")
    await db.collection('plans').doc('test-1usd').set(testPlan);

    console.log('✅ Test plan added to "plans" collection!');
    
    // Verify it's there
    const doc = await db.collection('plans').doc('test-1usd').get();
    if (doc.exists) {
      console.log('✅ Verification: Test plan found in plans collection');
    } else {
      console.log('❌ Verification failed: Test plan not found');
    }

    // List all plans in the correct collection
    console.log('\n📚 All plans in "plans" collection:');
    const allPlans = await db.collection('plans').get();
    allPlans.docs.forEach(doc => {
      const plan = doc.data();
      const isTest = plan.isTest ? '🧪' : '💎';
      console.log(`   ${isTest} ${plan.displayName || plan.name} - $${plan.price} USD (${doc.id})`);
    });

    console.log('\n🎯 Test plan is now available to planService!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing test plan collection:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixTestPlanCollection();
}

module.exports = fixTestPlanCollection;