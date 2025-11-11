/**
 * Upgrade user 8433276659 to Premium tier and send welcome message with invite link
 * Uses the activateMembership function from membershipManager
 */

require("./src/config/env");
const { Telegraf } = require("telegraf");
const { activateMembership } = require("./src/utils/membershipManager");
const { db } = require("./src/config/firebase");
const logger = require("./src/utils/logger");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const USER_ID = "8433276659";

/**
 * Upgrade user to Premium tier
 */
async function upgradeUserToPremium() {
  console.log("🚀 Starting Premium tier upgrade...\n");

  try {
    // 1. Check current user status
    console.log(`📋 Fetching current user data for ${USER_ID}...`);
    const userDoc = await db.collection("users").doc(USER_ID).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`✅ Current user status:`);
      console.log(`   Name: ${userData.firstName || userData.username || "Unknown"}`);
      console.log(`   Current Tier: ${userData.tier || "Free"}`);
      console.log(`   Language: ${userData.language || "en"}\n`);
    } else {
      console.log(`⚠️  User not found in database, will be created\n`);
    }

    // 2. Activate Premium membership (30 days)
    console.log(`💎 Activating Premium membership...`);
    console.log(`   Tier: Premium`);
    console.log(`   Duration: 30 days`);
    console.log(`   Activated by: admin\n`);

    const result = await activateMembership(
      USER_ID,
      "Premium",  // Premium tier
      "admin",    // Activated by admin
      30,         // 30 days duration
      bot,        // Bot instance for generating invite link and sending message
      {
        paymentMethod: "Admin Upgrade",
        reference: `Manual upgrade by admin - ${new Date().toISOString()}`
      }
    );

    // 3. Display results
    console.log("\n" + "=".repeat(60));
    console.log("✅ PREMIUM UPGRADE COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`👤 User ID: ${USER_ID}`);
    console.log(`💎 New Tier: ${result.tier}`);
    console.log(`📅 Expires: ${result.expiresAt ? result.expiresAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }) : "Never (Lifetime)"}`);
    console.log(`🔗 Invite Link: ${result.inviteLink || "Not generated"}`);
    console.log(`📤 Notification Sent: ${result.notificationSent ? "✅ Yes" : "❌ No"}`);
    console.log("=".repeat(60));

    // 4. Verify the update
    console.log("\n📋 Verifying database update...");
    const updatedUserDoc = await db.collection("users").doc(USER_ID).get();
    const updatedUserData = updatedUserDoc.data();

    console.log(`✅ Verification complete:`);
    console.log(`   Tier: ${updatedUserData.tier}`);
    console.log(`   Premium Status: ${updatedUserData.membershipIsPremium ? "✅ Active" : "❌ Inactive"}`);
    console.log(`   Expires At: ${updatedUserData.membershipExpiresAt ?
      new Date(updatedUserData.membershipExpiresAt.toDate()).toISOString() : "Never"}`);
    console.log(`   Updated By: ${updatedUserData.tierUpdatedBy}`);
    console.log(`   Updated At: ${new Date(updatedUserData.tierUpdatedAt.toDate()).toISOString()}`);

  } catch (error) {
    console.error("\n❌ Error upgrading user to Premium:", error);
    logger.error("Error in upgradeUserToPremium:", error);
    throw error;
  }
}

// Run the script
(async () => {
  try {
    await upgradeUserToPremium();
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Script failed:", error.message);
    process.exit(1);
  }
})();
