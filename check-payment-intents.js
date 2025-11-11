#!/usr/bin/env node

/**
 * Check Payment Intents - Focus on Recent Activity
 * Checks for new payment_intents and their statuses
 */

const { db } = require('./src/config/firebase');

console.log('=== PAYMENT INTENTS CHECK ===\n');

async function checkPaymentIntents() {
  try {
    console.log('🔍 Checking payment_intents collection for recent activity...\n');

    // Get all payment intents, ordered by creation date
    const paymentIntentsSnapshot = await db.collection('payment_intents')
      .orderBy('createdAt', 'desc')
      .limit(20) // Get last 20 to see recent activity
      .get();

    if (paymentIntentsSnapshot.empty) {
      console.log('❌ No payment intents found');
      return;
    }

    console.log(`📋 Found ${paymentIntentsSnapshot.size} recent payment intents:\n`);

    let pendingCount = 0;
    let completedCount = 0;
    let unpaidCount = 0;
    let otherCount = 0;

    paymentIntentsSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const status = data.status || 'unknown';
      
      // Count by status
      switch (status) {
        case 'payment_pending':
        case 'pending':
          pendingCount++;
          break;
        case 'payment_completed':
        case 'completed':
          completedCount++;
          break;
        case 'payment_unpaid':
        case 'unpaid':
          unpaidCount++;
          break;
        default:
          otherCount++;
      }

      const statusEmoji = {
        'payment_completed': '✅',
        'completed': '✅',
        'payment_pending': '⏳',
        'pending': '⏳',
        'payment_unpaid': '❌',
        'unpaid': '❌',
        'payment_failed': '💥',
        'failed': '💥'
      }[status] || '❓';

      console.log(`${index + 1}. ${statusEmoji} ID: ${doc.id}`);
      console.log(`   Status: ${status}`);
      console.log(`   Amount: $${data.amount || 'N/A'}`);
      console.log(`   User: ${data.userId}`);
      console.log(`   Plan: ${data.planId}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || data.createdAt || 'N/A'}`);
      console.log(`   Updated: ${data.updatedAt?.toDate?.() || data.updatedAt || 'N/A'}`);
      
      if (data.checkoutUrl) {
        console.log(`   Checkout: ${data.checkoutUrl.substring(0, 50)}...`);
      }
      
      if (data.source?.txHash) {
        console.log(`   TX Hash: ${data.source.txHash}`);
      }
      
      console.log('');
    });

    console.log('=== STATUS SUMMARY ===');
    console.log(`✅ Completed: ${completedCount}`);
    console.log(`⏳ Pending: ${pendingCount}`);
    console.log(`❌ Unpaid: ${unpaidCount}`);
    console.log(`❓ Other: ${otherCount}`);
    console.log(`📊 Total: ${paymentIntentsSnapshot.size}`);

    // Check for very recent activity (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSnapshot = await db.collection('payment_intents')
      .where('createdAt', '>', oneHourAgo)
      .get();

    console.log(`\n⚡ Activity in last hour: ${recentSnapshot.size} payment intents`);
    
    if (recentSnapshot.size > 0) {
      console.log('\n🚨 NEW PAYMENT ACTIVITY DETECTED:');
      recentSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   • ${doc.id} - $${data.amount} - ${data.status} - User: ${data.userId}`);
      });
    }

    // Check specifically for pending payments
    const pendingSnapshot = await db.collection('payment_intents')
      .where('status', 'in', ['payment_pending', 'pending'])
      .get();

    if (pendingSnapshot.size > 0) {
      console.log(`\n⏳ PENDING PAYMENTS: ${pendingSnapshot.size} found`);
      pendingSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   • ${doc.id} - $${data.amount} - User: ${data.userId} - Plan: ${data.planId}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking payment intents:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the check
if (require.main === module) {
  checkPaymentIntents();
}