#!/usr/bin/env node

/**
 * Add $1 Test Plan to Firestore
 * Run: node add-test-plan.js
 */

require('dotenv').config();

const { db } = require('./src/config/firebase');

async function addTestPlan() {
  try {
    console.log('🔧 Adding $1 Test Plan to Firestore...');

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

    // Add to Firestore
    await db.collection('subscriptionPlans').doc('test-1usd').set(testPlan);

    console.log('✅ Test plan added successfully!');
    console.log('📋 Plan details:');
    console.log(`   ID: ${testPlan.id}`);
    console.log(`   Name: ${testPlan.displayName}`);
    console.log(`   Price: $${testPlan.price} USD`);
    console.log(`   Duration: ${testPlan.durationDays} day(s)`);
    console.log(`   Tier: ${testPlan.tier}`);
    
    console.log('\n🧪 You can now test payments with:');
    console.log('   • Daimo Pay (USDC): $1.00 USD');
    console.log('   • ePayco (COP): $4,000 COP');
    
    console.log('\n🔍 To verify, run: node check-plans.js');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test plan:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  addTestPlan();
}

module.exports = addTestPlan;