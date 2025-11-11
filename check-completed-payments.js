#!/usr/bin/env node

/**
 * Check Only Completed Payment Records in Firestore
 */

const { db } = require('./src/config/firebase');

console.log('=== COMPLETED PAYMENTS ONLY ===\n');

async function checkCompletedPayments() {
  try {
    console.log('💰 Checking for completed payments...\n');

    // Check different possible payment collections
    const collections = [
      'payments',
      'transactions', 
      'daimo_payments',
      'subscriptions',
      'payment_records',
      'orders'
    ];

    let completedPayments = 0;
    let completedAmount = 0;
    const completedStatuses = ['completed', 'payment_completed', 'success', 'paid', 'confirmed'];

    for (const collectionName of collections) {
      try {
        console.log(`📋 Checking collection: ${collectionName}`);
        const snapshot = await db.collection(collectionName).get();
        
        if (!snapshot.empty) {
          let collectionCompleted = 0;
          let collectionAmount = 0;
          
          snapshot.forEach(doc => {
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            
            // Only count completed payments
            if (completedStatuses.includes(status)) {
              collectionCompleted++;
              completedPayments++;
              
              // Try to extract amount from various fields
              const amount = data.amount || data.value || data.price || data.total || 0;
              if (amount && typeof amount === 'number') {
                collectionAmount += amount;
                completedAmount += amount;
              }
              
              console.log(`     ✅ COMPLETED - ID: ${doc.id}`);
              console.log(`        Amount: $${amount || 'N/A'}`);
              console.log(`        Status: ${data.status}`);
              console.log(`        Date: ${data.createdAt?.toDate?.() || data.timestamp?.toDate?.() || 'N/A'}`);
              console.log(`        User: ${data.userId || data.user_id || 'N/A'}`);
              console.log(`        Plan: ${data.planId || data.plan || 'N/A'}`);
              console.log('');
            }
          });
          
          if (collectionCompleted > 0) {
            console.log(`   ✅ ${collectionCompleted} completed payments in ${collectionName}`);
            if (collectionAmount > 0) {
              console.log(`   💰 Collection revenue: $${collectionAmount.toFixed(2)}`);
            }
          } else {
            console.log(`   ❌ No completed payments in ${collectionName}`);
          }
          console.log('');
        } else {
          console.log(`   ❌ Empty collection\n`);
        }
      } catch (error) {
        console.log(`   ⚠️ Error accessing ${collectionName}: ${error.message}\n`);
      }
    }

    // Summary of completed payments
    console.log('=== COMPLETED PAYMENTS SUMMARY ===');
    console.log(`✅ Total completed payments: ${completedPayments}`);
    console.log(`💰 Total verified revenue: $${completedAmount.toFixed(2)}`);
    
    if (completedPayments === 0) {
      console.log('');
      console.log('⚠️  No completed payments found!');
      console.log('   This suggests:');
      console.log('   - Payment webhooks are not completing transactions');
      console.log('   - Manual activation is being used instead');
      console.log('   - Payment gateway integration needs review');
    } else {
      // Calculate average transaction value
      const avgTransaction = completedAmount / completedPayments;
      console.log(`📊 Average transaction: $${avgTransaction.toFixed(2)}`);
    }

    // Check for recent completed payments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log('\n=== RECENT COMPLETED PAYMENTS (Last 30 days) ===');
    let recentCompleted = 0;
    let recentAmount = 0;

    for (const collectionName of collections) {
      try {
        const recentSnapshot = await db.collection(collectionName)
          .where('createdAt', '>=', thirtyDaysAgo)
          .get();
          
        if (!recentSnapshot.empty) {
          recentSnapshot.forEach(doc => {
            const data = doc.data();
            const status = (data.status || '').toLowerCase();
            
            if (completedStatuses.includes(status)) {
              recentCompleted++;
              const amount = data.amount || data.value || data.price || data.total || 0;
              if (amount && typeof amount === 'number') {
                recentAmount += amount;
              }
            }
          });
        }
      } catch (error) {
        // Some collections might not have createdAt field, skip silently
      }
    }

    console.log(`📈 Recent completed payments: ${recentCompleted}`);
    console.log(`💵 Recent verified revenue: $${recentAmount.toFixed(2)}`);
    console.log(`📅 Report generated: ${new Date().toISOString()}`);

    // Revenue insights
    if (completedAmount > 0) {
      console.log('\n=== REVENUE INSIGHTS ===');
      const monthlyProjection = (completedAmount / 30) * 30; // Based on recent activity
      console.log(`📊 Monthly revenue projection: $${monthlyProjection.toFixed(2)}`);
      
      if (completedPayments < 5) {
        console.log('💡 Recommendation: Focus on payment completion rates');
      } else {
        console.log('✅ Good payment completion rate');
      }
    }

  } catch (error) {
    console.error('❌ Error checking completed payments:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkCompletedPayments();