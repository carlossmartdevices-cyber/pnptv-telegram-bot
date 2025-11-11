#!/usr/bin/env node

/**
 * Payment Intent Monitor - Real-time Status Tracking
 * Monitors the 20 new payment intents for status changes and webhook processing
 */

const { db } = require('./src/config/firebase');
const axios = require('axios');

console.log('=== PAYMENT INTENT MONITOR ===\n');

// The 20 unpaid payment intents from our last check
const MONITORED_INTENTS = [
  '9kAKk6AhtNNx7Bui1V7bMHiLtANfTDp6Qs4wHPHCpEFW', // $99.99 diamond-member
  '35vT11rdrkEheRnYRsgHqxy6no3x6CLBqGA9M4iktep', // $1 test-1usd
  '5eL8kXvoyPJLx9g9pmXPk6mEC4uet3QycjuZ1KHs8WpF', // $1 test-1usd
  'AECdU65XpYkTrGLY4VY5Q5Ecfu6ZruCbPvzj8zGpM26Y', // $1 test-1usd
  'B6p5qbuRLoQft6J7VaAwhi19VWRRMLd4iusTKjsLnH6f', // $14.99 trial-pass
  '5syTKDefnYLdVZvrDPbbXRtv85qhwyKgCZr3JaWk6bkf', // $1 test-1usd
  '3sX282E89onS914N6cYHv5nG8hRK39VWWXd2LAWnpt53', // $1 test-1usd
  'AMa736ZUm726SV8PDHWjmPG6131FLNco3HNE4gC7ZDi4', // $14.99 trial-pass
  'Di7SYWeLV48E4PEtVxtwQZeb6cjBJLgc6icfALdNGDBS', // $1 test-1usd
  '2iZMiiJBPK7ofoZtxYek1NqvkDUj7BCrj8ThYWKmQyMD', // $1 test-1usd
  'As5s17EQ8FjNEJJzadWke7Z9nmmHPt9Hohmrd9KAdvDs', // $14.99 trial-pass
  '5WmumDwsenyMDAuGTRiG9ZvTY4Xae6DRQ9hdL3m66Bmq', // $1 test-1usd
  'BuKZcGrb9qiDgGWVccCT7TrJgJLDG7UYj7QZcX9nazYD', // $1 test-1usd
  'GP2fhnbSskkUqUbW6yi9mUe8N41RrS6faLB4Kivy88gb', // $1 test-1usd
  'B9fT2n5jpPRkKH8EabG325iP6wL1MuCjSVYV5wDtLapk', // $1 test-1usd
  '5Yfzjtd5BaiT7Cq4JcrS3KJLnhCHFkbBW9zG75MH3ymv', // $1 test-1usd
  '4wyNNCu2uMfk88CsVyKVE9AbRpnTuCfUwzaZYtnVA8wW', // $14.99 trial-pass
  'HGuL3ShdQNVZguavmg5FfuSUgTp5tmodrpJDJnpChzWy', // $14.99 trial-pass
  '8AN4RgorRDdrVBY8oiezUqGjWJQS6jkSBAkLoAtp3U3g', // $1 test-1usd
  'FHKkcGYapvLPwiv3jVTNEfCESzzytZJKZ2SLKr5ypWUD'  // $14.99 trial-pass
];

async function monitorPaymentIntents() {
  try {
    console.log(`🔍 Monitoring ${MONITORED_INTENTS.length} payment intents for status changes...\n`);

    const statusChanges = [];
    let completedCount = 0;
    let pendingCount = 0;
    let unpaidCount = 0;
    let errorCount = 0;

    for (const intentId of MONITORED_INTENTS) {
      try {
        const intentDoc = await db.collection('payment_intents').doc(intentId).get();
        
        if (!intentDoc.exists) {
          console.log(`❌ Intent ${intentId} not found`);
          errorCount++;
          continue;
        }

        const data = intentDoc.data();
        const status = data.status || 'unknown';
        const amount = data.amount || 0;
        const userId = data.userId;
        const planId = data.planId;
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;
        const updatedAt = data.updatedAt?.toDate?.() || data.updatedAt;

        const statusEmoji = {
          'payment_completed': '✅',
          'payment_pending': '⏳',
          'payment_unpaid': '❌',
          'payment_failed': '💥'
        }[status] || '❓';

        console.log(`${statusEmoji} ${intentId.substring(0, 8)}... - $${amount} - ${status}`);
        console.log(`   User: ${userId} | Plan: ${planId}`);
        console.log(`   Created: ${createdAt}`);
        
        if (updatedAt && updatedAt !== createdAt) {
          console.log(`   Updated: ${updatedAt} ⚡`);
        }

        // Check for transaction details
        if (data.source?.txHash) {
          console.log(`   ✅ TX Hash: ${data.source.txHash}`);
          console.log(`   🔗 Chain: ${data.source.chainId}`);
          console.log(`   💰 Amount: ${data.source.amountUnits} ${data.source.tokenSymbol}`);
        }

        // Count by status
        switch (status) {
          case 'payment_completed':
            completedCount++;
            break;
          case 'payment_pending':
            pendingCount++;
            break;
          case 'payment_unpaid':
            unpaidCount++;
            break;
          default:
            errorCount++;
        }

        console.log('');

      } catch (error) {
        console.log(`❌ Error checking ${intentId}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('=== MONITORING SUMMARY ===');
    console.log(`✅ Completed: ${completedCount}`);
    console.log(`⏳ Pending: ${pendingCount}`);
    console.log(`❌ Unpaid: ${unpaidCount}`);
    console.log(`💥 Errors: ${errorCount}`);
    console.log(`📊 Total: ${MONITORED_INTENTS.length}`);

    // If we found any completed payments, return their IDs for processing
    if (completedCount > 0) {
      console.log('\n🎉 COMPLETED PAYMENTS FOUND! These can be processed for membership activation:');
      
      const completedIntents = [];
      for (const intentId of MONITORED_INTENTS) {
        const intentDoc = await db.collection('payment_intents').doc(intentId).get();
        if (intentDoc.exists && intentDoc.data().status === 'payment_completed') {
          completedIntents.push({
            id: intentId,
            ...intentDoc.data()
          });
        }
      }
      
      return { completedIntents, statusSummary: { completedCount, pendingCount, unpaidCount, errorCount } };
    }

    return { completedIntents: [], statusSummary: { completedCount, pendingCount, unpaidCount, errorCount } };

  } catch (error) {
    console.error('❌ Error in monitoring:', error);
    throw error;
  }
}

// Export for use by other scripts
module.exports = { monitorPaymentIntents, MONITORED_INTENTS };

// Run if called directly
if (require.main === module) {
  monitorPaymentIntents()
    .then((result) => {
      if (result.completedIntents.length > 0) {
        console.log(`\n🚀 Next step: Process ${result.completedIntents.length} completed payment intents for membership activation`);
        process.exit(0);
      } else {
        console.log('\n⏳ All payment intents still unpaid. Continue monitoring or check webhook processing.');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('❌ Monitor failed:', error);
      process.exit(1);
    });
}