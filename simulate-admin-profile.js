#!/usr/bin/env node

/**
 * Simulate Admin Profile Display
 * Show exactly what the admin user should see when using /profile
 */

const { db } = require('./src/config/firebase');
const { getPersonalityBadgeDisplay } = require('./src/bot/handlers/profile');
const { t } = require('./src/utils/i18n');
const { ADMIN_IDS } = require('./src/config/admin');
const { getLocationDisplay } = require('./src/services/profileService');

console.log('=== Simulating Admin Profile Display ===\n');

async function simulateProfileDisplay() {
  try {
    const adminUserId = ADMIN_IDS[0].toString();
    const lang = 'en'; // Simulate English
    
    console.log(`🎭 Simulating /profile command for admin user: ${adminUserId}\n`);

    // Get user data from database (same as viewProfile function)
    const userRef = db.collection("users").doc(adminUserId);
    const doc = await userRef.get();

    if (!doc.exists) {
      console.log('❌ User document not found');
      return;
    }

    const userData = doc.data() || {};
    console.log('1. User data retrieved ✅');

    // Simulate the exact same logic as viewProfile function
    const usernameDisplay = userData.username || "Not set";
    const locationDisplay = getLocationDisplay(userData, lang);
    const bioDisplay = (typeof userData.bio === "string" && userData.bio.trim().length > 0)
        ? userData.bio.trim()
        : "Not set";

    // Get personality badge (this is the key function)
    const personalityBadge = await getPersonalityBadgeDisplay(userData, lang);
    console.log(`2. Personality badge: "${personalityBadge.trim()}" ✅`);

    // Build profile text (same as viewProfile)
    const profileText = t("profileInfo", lang, {
      userId: userData.userId,
      username: usernameDisplay,
      tier: userData.tier || "Free",
      membershipInfo: "",
      personalityBadge: personalityBadge,
      location: locationDisplay,
      bio: bioDisplay,
    });

    console.log('3. Complete profile text:\n');
    console.log('=' .repeat(50));
    console.log(profileText);
    console.log('=' .repeat(50));

    console.log('\n4. Profile buttons that would appear:');
    console.log('   [Edit Bio] [Edit Location]');
    console.log('   [📸 Add Photo] [💎 Upgrade]');
    console.log('   [🗺️ View Map] [⚙️ Settings]');
    console.log('   [🔙 Back to Menu]');

    console.log('\n5. Settings menu preview:');
    console.log('   ⚙️ Settings');
    console.log('   🌐 Language: 🇺🇸 English');
    console.log('   🎭 Personality: 💀 The Meth Daddy');
    console.log('   📢 Advertisement messages: ✅ Enabled');
    console.log('');
    console.log('   [🌐 Change language]');
    console.log('   [🎭 Change personality] ← This should show 5 options including The Meth Daddy');
    console.log('   [❌ Disable messages]');
    console.log('   [« Back to profile]');

    console.log('\n=== Profile Simulation Complete ===');
    console.log('💀 The Meth Daddy should be visible in your profile!');
    console.log('');
    console.log('To see it in Telegram:');
    console.log('1. Send /profile to the bot');
    console.log('2. Look for "🎭 Personality: 💀 The Meth Daddy" in the profile text');
    console.log('3. Click ⚙️ Settings to see personality options');
    console.log('4. Click 🎭 Change personality to see all 5 options');

  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

simulateProfileDisplay();