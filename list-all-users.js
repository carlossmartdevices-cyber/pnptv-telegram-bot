#!/usr/bin/env node

/**
 * List all bot users from Firestore
 * Run: node list-all-users.js
 */

require('dotenv').config();

const { db } = require('./src/config/firebase');

async function listAllUsers() {
  try {
    console.log('📊 Fetching all bot users from Firestore...\n');

    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('❌ No users found in the database.');
      return;
    }

    console.log(`👥 Total Users: ${usersSnapshot.size}\n`);
    console.log('='.repeat(80));

    const users = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        ...userData
      });
    });

    // Sort users by creation date (newest first)
    users.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
      const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      return dateB - dateA;
    });

    users.forEach((user, index) => {
      const {
        id,
        username,
        firstName,
        lastName,
        tier = 'Free',
        email,
        language = 'en',
        onboardingComplete = false,
        membershipExpiresAt,
        membershipIsPremium = false,
        createdAt,
        lastActive,
        location,
        bio
      } = user;

      // Format dates
      const createdDate = createdAt?.toDate?.() || createdAt || null;
      const lastActiveDate = lastActive?.toDate?.() || lastActive || null;
      const expirationDate = membershipExpiresAt?.toDate?.() || membershipExpiresAt || null;

      // Determine membership status
      let membershipStatus = '🆓 Free';
      if (membershipIsPremium && expirationDate) {
        const now = new Date();
        const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
        if (daysRemaining > 0) {
          membershipStatus = `💎 ${tier} (${daysRemaining} days left)`;
        } else {
          membershipStatus = `⏰ ${tier} (Expired)`;
        }
      } else if (tier !== 'Free') {
        membershipStatus = `💎 ${tier}`;
      }

      // Format display name
      const displayName = firstName || username || 'Unknown';
      const fullName = lastName ? `${firstName} ${lastName}` : displayName;
      const usernameDisplay = username ? `@${username}` : 'No username';

      console.log(`${index + 1}. 👤 ${fullName} (${usernameDisplay})`);
      console.log(`   🆔 ID: ${id}`);
      console.log(`   💎 Status: ${membershipStatus}`);
      console.log(`   📧 Email: ${email || 'Not provided'}`);
      console.log(`   🌍 Language: ${language.toUpperCase()}`);
      console.log(`   ✅ Onboarding: ${onboardingComplete ? 'Complete' : 'Incomplete'}`);
      
      if (location) {
        const locationText = typeof location === 'string' ? location : 
                           location.city || location.address || 'Location shared';
        console.log(`   📍 Location: ${locationText}`);
      }

      if (bio) {
        const bioPreview = bio.length > 50 ? bio.substring(0, 50) + '...' : bio;
        console.log(`   📝 Bio: ${bioPreview}`);
      }

      if (createdDate) {
        console.log(`   📅 Joined: ${createdDate.toLocaleDateString()}`);
      }

      if (lastActiveDate) {
        console.log(`   🕐 Last Active: ${lastActiveDate.toLocaleDateString()}`);
      }

      if (expirationDate) {
        console.log(`   ⏰ Expires: ${expirationDate.toLocaleDateString()}`);
      }

      console.log(''); // Empty line between users
    });

    // Summary statistics
    console.log('='.repeat(80));
    console.log('📈 SUMMARY STATISTICS\n');

    const totalUsers = users.length;
    const completedOnboarding = users.filter(u => u.onboardingComplete).length;
    const premiumUsers = users.filter(u => u.membershipIsPremium).length;
    const freeUsers = users.filter(u => u.tier === 'Free' || !u.tier).length;
    const usersWithEmail = users.filter(u => u.email).length;
    const usersWithLocation = users.filter(u => u.location).length;
    const usersWithBio = users.filter(u => u.bio).length;

    // Tier breakdown
    const tierCounts = {};
    users.forEach(user => {
      const tier = user.tier || 'Free';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    // Language breakdown
    const languageCounts = {};
    users.forEach(user => {
      const lang = user.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    console.log(`👥 Total Users: ${totalUsers}`);
    console.log(`✅ Completed Onboarding: ${completedOnboarding} (${Math.round(completedOnboarding/totalUsers*100)}%)`);
    console.log(`💎 Premium Members: ${premiumUsers} (${Math.round(premiumUsers/totalUsers*100)}%)`);
    console.log(`🆓 Free Users: ${freeUsers} (${Math.round(freeUsers/totalUsers*100)}%)`);
    console.log(`📧 Users with Email: ${usersWithEmail} (${Math.round(usersWithEmail/totalUsers*100)}%)`);
    console.log(`📍 Users with Location: ${usersWithLocation} (${Math.round(usersWithLocation/totalUsers*100)}%)`);
    console.log(`📝 Users with Bio: ${usersWithBio} (${Math.round(usersWithBio/totalUsers*100)}%)`);

    console.log('\n🏆 TIER BREAKDOWN:');
    Object.entries(tierCounts).forEach(([tier, count]) => {
      const percentage = Math.round(count/totalUsers*100);
      console.log(`   ${tier}: ${count} users (${percentage}%)`);
    });

    console.log('\n🌍 LANGUAGE BREAKDOWN:');
    Object.entries(languageCounts).forEach(([lang, count]) => {
      const percentage = Math.round(count/totalUsers*100);
      const langName = lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang.toUpperCase();
      console.log(`   ${langName}: ${count} users (${percentage}%)`);
    });

    console.log('\n✨ User listing complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  listAllUsers();
}

module.exports = listAllUsers;