require("./instrument");
require("./src/config/env");
const { Telegraf } = require("telegraf");
const { db } = require("./src/config/firebase");
const { activateMembership } = require("./src/utils/membershipManager");
const logger = require("./src/utils/logger");

/**
 * Script to activate all current users as Premium members (PNP Members)
 * This will:
 * 1. Get all users from the database
 * 2. Update their tier to "Premium" (PNP Member)
 * 3. Set expiration to 30 days by default (can be customized)
 * 4. Send activation notification to each user
 * 5. Generate unique invite links to the premium channel
 */

async function activateAllMembers() {
  try {
    console.log("\n=== Starting Mass Membership Activation ===\n");

    // Initialize bot for sending notifications and generating invite links
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

    // Get all users from the database
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      console.log("No users found in the database.");
      return;
    }

    console.log(`Found ${usersSnapshot.size} users to activate\n`);

    // Configuration
    const tier = "Premium"; // PNP Members = Premium tier
    const durationDays = 30; // 30 days membership (change to 999999 for lifetime)
    const activatedBy = "admin"; // Activated by admin

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userName = userData.firstName || userData.username || "User";
      const currentTier = userData.tier || "Free";

      try {
        console.log(`\n--- Processing User ${userId} ---`);
        console.log(`Name: ${userName}`);
        console.log(`Current Tier: ${currentTier}`);

        // Check if user has completed onboarding
        if (!userData.onboardingComplete) {
          console.log(`⚠️  Skipped: User has not completed onboarding`);
          skippedCount++;
          continue;
        }

        // Activate membership
        console.log(`Activating ${tier} membership for ${durationDays} days...`);

        const result = await activateMembership(
          userId,
          tier,
          activatedBy,
          durationDays,
          bot,
          {
            paymentAmount: null,
            paymentCurrency: null,
            paymentMethod: "Admin Activation",
            reference: "Mass Activation - PNP Members",
          }
        );

        if (result.success) {
          console.log(`✅ Success!`);
          console.log(`   Tier: ${result.tier}`);
          console.log(`   Expires: ${result.expiresAt ? result.expiresAt.toISOString() : "Never (Lifetime)"}`);
          console.log(`   Invite Link: ${result.inviteLink || "N/A"}`);
          console.log(`   Notification Sent: ${result.notificationSent ? "Yes" : "No"}`);
          successCount++;
        } else {
          console.log(`❌ Failed to activate membership`);
          failureCount++;
          errors.push({ userId, userName, error: "Activation failed" });
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error.message);
        failureCount++;
        errors.push({ userId, userName, error: error.message });
      }
    }

    // Summary
    console.log("\n\n=== Activation Complete ===\n");
    console.log(`Total Users: ${usersSnapshot.size}`);
    console.log(`✅ Successfully Activated: ${successCount}`);
    console.log(`⚠️  Skipped (No Onboarding): ${skippedCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    if (errors.length > 0) {
      console.log("\n--- Errors ---");
      errors.forEach(({ userId, userName, error }) => {
        console.log(`User ${userId} (${userName}): ${error}`);
      });
    }

    console.log("\n=== Done ===\n");

    // Stop the bot
    await bot.stop();
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
activateAllMembers();
