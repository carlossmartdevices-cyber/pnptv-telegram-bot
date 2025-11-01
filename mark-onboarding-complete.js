#!/usr/bin/env node
/**
 * Script to mark onboarding as complete for all users
 * Usage: node mark-onboarding-complete.js
 */

require('dotenv').config();
const { db } = require('./src/config/firebase');
const logger = require('./src/utils/logger');

async function markOnboardingComplete() {
  try {
    logger.info('Starting onboarding completion for all users...');

    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    if (totalUsers === 0) {
      logger.info('No users found in database');
      return;
    }

    logger.info(`Found ${totalUsers} users. Marking onboarding as complete...`);

    let updated = 0;
    let errors = 0;
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();

      // Skip if already marked complete
      if (userData.onboardingComplete) {
        logger.debug(`User ${doc.id} already has onboarding complete, skipping`);
        continue;
      }

      try {
        batch.update(doc.ref, {
          onboardingComplete: true,
          onboardingCompletedAt: new Date().toISOString(),
        });

        batchCount++;
        updated++;

        // Commit batch when it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          logger.info(`Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
      } catch (error) {
        logger.error(`Error updating user ${doc.id}:`, error);
        errors++;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      logger.info(`Committed final batch of ${batchCount} updates`);
    }

    logger.info(`✅ Completed!`);
    logger.info(`Total users: ${totalUsers}`);
    logger.info(`Updated: ${updated}`);
    logger.info(`Errors: ${errors}`);
    logger.info(`Already complete: ${totalUsers - updated - errors}`);

    process.exit(0);
  } catch (error) {
    logger.error('Fatal error marking onboarding complete:', error);
    process.exit(1);
  }
}

markOnboardingComplete();
