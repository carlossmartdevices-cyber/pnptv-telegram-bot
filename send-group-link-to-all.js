#!/usr/bin/env node

/**
 * Send Free Group Link to All Onboarded Users
 * 
 * This script sends the community group link to all users who have completed onboarding
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  const credentials = process.env.FIREBASE_CREDENTIALS 
    ? JSON.parse(process.env.FIREBASE_CREDENTIALS)
    : {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
      };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials)
    });
  }
}

const db = admin.firestore();
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const FREE_GROUP_ID = process.env.FREE_GROUP_ID || "-1003291737499";

async function sendGroupLinkToAllUsers() {
  try {
    console.log('🚀 Starting to send group link to all onboarded users...\n');

    // Get all users who completed onboarding
    const usersSnapshot = await db.collection('users').where('onboardingComplete', '==', true).get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No onboarded users found');
      return;
    }

    const totalUsers = usersSnapshot.size;
    console.log(`📊 Found ${totalUsers} onboarded users\n`);

    let sent = 0;
    let failed = 0;
    const failedUsers = [];

    // Create a single group invite link to share with all users
    let groupInviteLink;
    try {
      console.log('📝 Creating group invite link...');
      const groupInvite = await bot.telegram.createChatInviteLink(FREE_GROUP_ID, {
        expire_date: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days expiration
        member_limit: null // No limit on uses
      });
      groupInviteLink = groupInvite.invite_link;
      console.log(`✅ Group invite link created: ${groupInviteLink}\n`);
    } catch (error) {
      console.error('❌ Failed to create group invite link:', error.message);
      groupInviteLink = `https://t.me/+O0f_5ngX0uQ4ODVh`; // Fallback
      console.log(`📌 Using fallback link: ${groupInviteLink}\n`);
    }

    const message = `👥 **Join Our Community Group!**

We want to welcome you to our exclusive community group where you can:
✨ Discuss content and features
💬 Share your thoughts and feedback
📢 Get the latest updates directly
🤝 Connect with other members

Click the link below to join now:

${groupInviteLink}`;

    // Send to each user
    console.log('📤 Sending group link to users...\n');
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userData.telegramId || userDoc.id;
      const userName = userData.username || userData.firstName || 'User';

      try {
        await bot.telegram.sendMessage(userId, message, {
          parse_mode: 'Markdown'
        });
        
        sent++;
        console.log(`✅ Sent to @${userName} (${userId})`);
        
        // Rate limiting: wait 100ms between sends
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        failedUsers.push({ name: userName, id: userId, error: error.message });
        console.log(`❌ Failed to send to @${userName} (${userId}): ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 **CAMPAIGN SUMMARY**');
    console.log('='.repeat(60));
    console.log(`Total users: ${totalUsers}`);
    console.log(`✅ Sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success rate: ${((sent / totalUsers) * 100).toFixed(2)}%`);
    
    if (failedUsers.length > 0) {
      console.log('\n⚠️  Failed users:');
      failedUsers.forEach(u => {
        console.log(`   - @${u.name} (${u.id}): ${u.error}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
    console.log('✨ Group link distribution complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
sendGroupLinkToAllUsers().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
