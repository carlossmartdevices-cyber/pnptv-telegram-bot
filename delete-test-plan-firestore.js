#!/usr/bin/env node

/**
 * Delete test-1usd plan from Firestore collections
 * Run: node delete-test-plan-firestore.js
 */

require('dotenv').config();

const { db } = require('./src/config/firebase');

async function deleteTestPlanFromFirestore() {
  try {
    console.log('🗑️  Deleting test-1usd plan from Firestore...');

    // Check and delete from subscriptionPlans collection
    const subscriptionPlanDoc = await db.collection('subscriptionPlans').doc('test-1usd').get();
    if (subscriptionPlanDoc.exists) {
      await db.collection('subscriptionPlans').doc('test-1usd').delete();
      console.log('✅ Deleted test-1usd from subscriptionPlans collection');
    } else {
      console.log('ℹ️  test-1usd not found in subscriptionPlans collection');
    }

    // Check and delete from plans collection  
    const planDoc = await db.collection('plans').doc('test-1usd').get();
    if (planDoc.exists) {
      await db.collection('plans').doc('test-1usd').delete();
      console.log('✅ Deleted test-1usd from plans collection');
    } else {
      console.log('ℹ️  test-1usd not found in plans collection');
    }

    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const subscriptionCheck = await db.collection('subscriptionPlans').doc('test-1usd').get();
    const planCheck = await db.collection('plans').doc('test-1usd').get();

    if (!subscriptionCheck.exists && !planCheck.exists) {
      console.log('✅ Verification successful: test-1usd plan completely removed from Firestore');
    } else {
      console.log('⚠️  Warning: Some documents may still exist');
      if (subscriptionCheck.exists) console.log('   - Still exists in subscriptionPlans');
      if (planCheck.exists) console.log('   - Still exists in plans');
    }

    console.log('\n🎯 Test plan cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting test plan:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  deleteTestPlanFromFirestore();
}

module.exports = deleteTestPlanFromFirestore;