#!/usr/bin/env node

/**
 * Check Test Plan in Firestore
 * Run: node check-test-plan.js
 */

require('dotenv').config();

const { db } = require('./src/config/firebase');

async function checkTestPlan() {
  try {
    console.log('🔍 Checking for test plan in Firestore...');

    // Get test plan specifically
    const testPlanDoc = await db.collection('subscriptionPlans').doc('test-1usd').get();
    
    if (testPlanDoc.exists) {
      const testPlan = testPlanDoc.data();
      console.log('✅ Test Plan found!');
      console.log('📋 Details:');
      console.log(`   ID: ${testPlan.id}`);
      console.log(`   Name: ${testPlan.displayName}`);
      console.log(`   Price: $${testPlan.price} USD`);
      console.log(`   Duration: ${testPlan.durationDays} day(s)`);
      console.log(`   Active: ${testPlan.active}`);
      console.log(`   Is Test: ${testPlan.isTest}`);
    } else {
      console.log('❌ Test plan not found in Firestore');
    }

    // List all plans
    console.log('\n📚 All available plans:');
    const allPlans = await db.collection('subscriptionPlans').get();
    allPlans.docs.forEach(doc => {
      const plan = doc.data();
      console.log(`   • ${plan.displayName || plan.name} - $${plan.price} USD (${doc.id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking test plan:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  checkTestPlan();
}

module.exports = checkTestPlan;