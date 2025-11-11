#!/usr/bin/env node

/**
 * Check Payment Records in Firestore
 */

const { db } = require('./src/config/firebase');

console.log('=== Payment Records Check ===\n');

async function checkPayments() {
  try {
    console.log('🔍 Checking payment collections...\n');

    // Check different possible payment collections
    const collections = [
      'payments',
      'transactions', 
      'daimo_payments',
      'subscriptions',
      'payment_records',
      'orders'
    ];

    let totalPayments = 0;
    let totalAmount = 0;

    for (const collectionName of collections) {
      try {
        console.log(`📋 Checking collection: ${collectionName}`);
        const snapshot = await db.collection(collectionName).get();
        
        if (!snapshot.empty) {
          console.log(`   ✅ Found ${snapshot.size} documents`);
          
          let collectionAmount = 0;
          snapshot.forEach(doc => {
            const data = doc.data();
            totalPayments++;
            
            // Try to extract amount from various fields
            const amount = data.amount || data.value || data.price || data.total || 0;
            if (amount && typeof amount === 'number') {
              collectionAmount += amount;
              totalAmount += amount;
            }
            
            console.log(`     - ID: ${doc.id}`);
            console.log(`       Amount: ${amount || 'N/A'}`);
            console.log(`       Status: ${data.status || 'N/A'}`);
            console.log(`       Date: ${data.createdAt?.toDate?.() || data.timestamp?.toDate?.() || 'N/A'}`);
            console.log(`       User: ${data.userId || data.user_id || 'N/A'}`);
            console.log(`       Plan: ${data.planId || data.plan || 'N/A'}`);
            console.log('');
          });
          
          if (collectionAmount > 0) {
            console.log(`   💰 Collection total: $${collectionAmount.toFixed(2)}\n`);
          }
        } else {
          console.log(`   ❌ Empty collection\n`);
        }
      } catch (error) {
        console.log(`   ⚠️ Error accessing ${collectionName}: ${error.message}\n`);
      }
    }

    // Check user subscriptions for payment history
    console.log('👥 Checking user subscriptions...');
    const usersSnapshot = await db.collection('users').get();
    let paidUsers = 0;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.tier && userData.tier !== 'Free') {
        paidUsers++;
        console.log(`   💎 Paid user: ${userData.username || userData.firstName || doc.id} (${userData.tier})`);
      }
    });

    console.log('\n=== PAYMENT SUMMARY ===');
    console.log(`📊 Total payment records found: ${totalPayments}`);
    console.log(`💰 Total amount: $${totalAmount.toFixed(2)}`);
    console.log(`👥 Users with paid tiers: ${paidUsers}`);
    console.log(`📅 Report generated: ${new Date().toISOString()}`);

    // Check for recent payments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log('\n=== RECENT PAYMENTS (Last 30 days) ===');
    let recentPayments = 0;
    let recentAmount = 0;

    for (const collectionName of collections) {
      try {
        const recentSnapshot = await db.collection(collectionName)
          .where('createdAt', '>=', thirtyDaysAgo)
          .get();
          
        if (!recentSnapshot.empty) {
          recentSnapshot.forEach(doc => {
            const data = doc.data();
            recentPayments++;
            const amount = data.amount || data.value || data.price || data.total || 0;
            if (amount && typeof amount === 'number') {
              recentAmount += amount;
            }
          });
        }
      } catch (error) {
        // Some collections might not have createdAt field, skip silently
      }
    }

    console.log(`📈 Recent payments: ${recentPayments}`);
    console.log(`💵 Recent amount: $${recentAmount.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error checking payments:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

checkPayments();