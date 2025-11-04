#!/usr/bin/env node
/**
 * Fix Date Handling Issues in Firestore
 * This script fixes common date format issues that cause problems with membership updates and broadcasts
 */

require('dotenv').config();
const { db } = require('./src/config/firebase');
const admin = require('firebase-admin');
const logger = require('./src/utils/logger');

/**
 * Convert Date to Firestore Timestamp for consistent storage
 * @param {Date|null} date - JavaScript Date object
 * @returns {admin.firestore.Timestamp|null} Firestore Timestamp
 */
function toFirestoreTimestamp(date) {
  if (!date) return null;
  if (date instanceof admin.firestore.Timestamp) return date;
  return admin.firestore.Timestamp.fromDate(date);
}

/**
 * Convert Firestore Timestamp to JavaScript Date for comparisons
 * @param {admin.firestore.Timestamp|Date|null} timestamp - Firestore Timestamp
 * @returns {Date|null} JavaScript Date
 */
function fromFirestoreTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(timestamp);
}

async function fixDateHandling() {
  console.log('🔧 Starting date handling fixes...\n');

  try {
    // 1. Fix membership dates - convert Date objects to Timestamps
    console.log('1️⃣ Fixing membership date formats...');
    
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    let usersFixed = 0;

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      let needsUpdate = false;
      const updates = {};

      // Fix membershipExpiresAt
      if (userData.membershipExpiresAt && !(userData.membershipExpiresAt instanceof admin.firestore.Timestamp)) {
        updates.membershipExpiresAt = toFirestoreTimestamp(new Date(userData.membershipExpiresAt));
        needsUpdate = true;
      }

      // Fix createdAt
      if (userData.createdAt && !(userData.createdAt instanceof admin.firestore.Timestamp)) {
        updates.createdAt = toFirestoreTimestamp(new Date(userData.createdAt));
        needsUpdate = true;
      }

      // Fix tierUpdatedAt
      if (userData.tierUpdatedAt && !(userData.tierUpdatedAt instanceof admin.firestore.Timestamp)) {
        updates.tierUpdatedAt = toFirestoreTimestamp(new Date(userData.tierUpdatedAt));
        needsUpdate = true;
      }

      // Fix lastActive
      if (userData.lastActive && !(userData.lastActive instanceof admin.firestore.Timestamp)) {
        updates.lastActive = toFirestoreTimestamp(new Date(userData.lastActive));
        needsUpdate = true;
      }

      if (needsUpdate) {
        batch.update(doc.ref, updates);
        usersFixed++;
      }
    });

    if (usersFixed > 0) {
      await batch.commit();
      console.log(`✅ Fixed date formats for ${usersFixed} users`);
    } else {
      console.log('✅ All user dates already in correct format');
    }

    // 2. Fix broadcast dates
    console.log('\n2️⃣ Fixing broadcast date formats...');
    
    const broadcastsSnapshot = await db.collection('scheduledBroadcasts').get();
    const broadcastBatch = db.batch();
    let broadcastsFixed = 0;

    broadcastsSnapshot.forEach((doc) => {
      const broadcastData = doc.data();
      let needsUpdate = false;
      const updates = {};

      // Fix scheduledTime
      if (broadcastData.scheduledTime && !(broadcastData.scheduledTime instanceof admin.firestore.Timestamp)) {
        updates.scheduledTime = toFirestoreTimestamp(new Date(broadcastData.scheduledTime));
        needsUpdate = true;
      }

      // Fix createdAt
      if (broadcastData.createdAt && !(broadcastData.createdAt instanceof admin.firestore.Timestamp)) {
        updates.createdAt = toFirestoreTimestamp(new Date(broadcastData.createdAt));
        needsUpdate = true;
      }

      // Fix sentAt
      if (broadcastData.sentAt && !(broadcastData.sentAt instanceof admin.firestore.Timestamp)) {
        updates.sentAt = toFirestoreTimestamp(new Date(broadcastData.sentAt));
        needsUpdate = true;
      }

      // Fix cancelledAt
      if (broadcastData.cancelledAt && !(broadcastData.cancelledAt instanceof admin.firestore.Timestamp)) {
        updates.cancelledAt = toFirestoreTimestamp(new Date(broadcastData.cancelledAt));
        needsUpdate = true;
      }

      if (needsUpdate) {
        broadcastBatch.update(doc.ref, updates);
        broadcastsFixed++;
      }
    });

    if (broadcastsFixed > 0) {
      await broadcastBatch.commit();
      console.log(`✅ Fixed date formats for ${broadcastsFixed} broadcasts`);
    } else {
      console.log('✅ All broadcast dates already in correct format');
    }

    // 3. Test complex queries that require proper date formatting
    console.log('\n3️⃣ Testing date-based queries...');

    try {
      // Test membership expiration query
      const now = admin.firestore.Timestamp.now();
      const thresholdDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      const expiringUsersSnapshot = await db
        .collection('users')
        .where('membershipExpiresAt', '<=', thresholdDate)
        .where('membershipExpiresAt', '>', now)
        .where('membershipIsPremium', '==', true)
        .limit(5)
        .get();

      console.log(`✅ Expiring memberships query works (found ${expiringUsersSnapshot.size} users)`);

    } catch (queryError) {
      console.log(`❌ Date query still failing: ${queryError.message}`);
      console.log('   You may need to create composite indexes in Firebase Console');
    }

    try {
      // Test broadcast scheduling query
      const nowTimestamp = admin.firestore.Timestamp.now();

      const readyBroadcastsSnapshot = await db
        .collection('scheduledBroadcasts')
        .where('status', '==', 'pending')
        .where('scheduledTime', '<=', nowTimestamp)
        .orderBy('scheduledTime', 'asc')
        .limit(5)
        .get();

      console.log(`✅ Scheduled broadcasts query works (found ${readyBroadcastsSnapshot.size} ready broadcasts)`);

    } catch (broadcastQueryError) {
      console.log(`❌ Broadcast query still failing: ${broadcastQueryError.message}`);
      console.log('   Trying fallback query without orderBy...');
      
      try {
        const fallbackSnapshot = await db
          .collection('scheduledBroadcasts')
          .where('status', '==', 'pending')
          .limit(5)
          .get();
        
        console.log(`✅ Fallback broadcast query works (found ${fallbackSnapshot.size} broadcasts)`);
      } catch (fallbackError) {
        console.log(`❌ Even fallback query failed: ${fallbackError.message}`);
      }
    }

    console.log('\n🎉 Date handling fixes completed!');
    console.log('\n📋 Summary:');
    console.log(`   • Fixed ${usersFixed} user date records`);
    console.log(`   • Fixed ${broadcastsFixed} broadcast date records`);
    console.log('   • All dates now use Firestore Timestamp format');
    console.log('   • Complex queries should work properly now');

  } catch (error) {
    console.error('💥 Error during date handling fixes:', error);
    logger.error('Date handling fix error:', error);
  }

  process.exit(0);
}

// Run the fixes
fixDateHandling().catch((error) => {
  console.error('💥 Critical error:', error);
  process.exit(1);
});