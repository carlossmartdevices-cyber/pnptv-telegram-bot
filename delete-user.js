#!/usr/bin/env node
/**
 * Delete a user from Firestore database
 * Usage: node delete-user.js <userId>
 */

require('dotenv').config();
const { db } = require('./src/config/firebase');
const logger = require('./src/utils/logger');

async function deleteUser(userId) {
  try {
    if (!userId) {
      console.error('❌ User ID is required');
      console.log('Usage: node delete-user.js <userId>');
      process.exit(1);
    }

    logger.info(`Starting user deletion for user: ${userId}`);

    // Get user document first
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`❌ User ${userId} not found in database`);
      process.exit(1);
    }

    const userData = userDoc.data();
    console.log(`\n📋 User found:`);
    console.log(`  • ID: ${userId}`);
    console.log(`  • Username: ${userData.username || 'N/A'}`);
    console.log(`  • First Name: ${userData.firstName || 'N/A'}`);
    console.log(`  • Tier: ${userData.tier || 'N/A'}`);
    console.log(`  • Registered: ${userData.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}`);

    // Delete the user document
    await db.collection('users').doc(userId).delete();
    
    logger.info(`User ${userId} deleted successfully`);
    console.log(`\n✅ User ${userId} has been deleted from the database`);
    console.log(`🔄 User can now start fresh by sending /start to the bot\n`);

    process.exit(0);
  } catch (error) {
    logger.error('Error deleting user:', error);
    console.error(`❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

const userId = process.argv[2];
deleteUser(userId);
