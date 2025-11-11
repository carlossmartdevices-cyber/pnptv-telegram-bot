#!/usr/bin/env node

// Send Payment Broadcast to All Users
require("./src/config/env");
const { Telegraf } = require('telegraf');
const { db } = require("./src/config/firebase");
const { t } = require("./src/utils/i18n");
const logger = require("./src/utils/logger");

console.log("🚀 Sending Payment Broadcast to All PNPtv Users...\n");

async function sendPaymentBroadcast() {
  try {
    // Initialize bot
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
    
    if (!process.env.TELEGRAM_TOKEN) {
      console.error("❌ TELEGRAM_TOKEN not found in environment");
      process.exit(1);
    }

    console.log("📡 Connecting to Telegram...");
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Connected as @${botInfo.username}`);

    // Get all users with completed onboarding
    console.log("📊 Fetching users from database...");
    const usersSnapshot = await db.collection("users").get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.onboardingComplete) {
        users.push({
          userId: doc.id,
          language: userData.language || "en",
          username: userData.username || "N/A"
        });
      }
    });

    console.log(`📈 Found ${users.length} users with completed onboarding`);
    
    if (users.length === 0) {
      console.log("⚠️  No users found to send broadcast to");
      process.exit(0);
    }

    // Confirm before sending
    console.log("\n📋 BROADCAST PREVIEW:");
    console.log("─".repeat(50));
    const previewMessage = t("paymentBroadcastMessage", "en");
    console.log(previewMessage);
    console.log("─".repeat(50));
    console.log("Buttons: [💰 I Made My Payment] [💎 View All Plans]");
    console.log("─".repeat(50));

    console.log(`\n🎯 Ready to send to ${users.length} users`);
    console.log("⏳ Starting broadcast in 3 seconds...");
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    // Send to users in batches of 20
    const batchSize = 20;
    const totalBatches = Math.ceil(users.length / batchSize);
    
    console.log(`📤 Sending in ${totalBatches} batches of ${batchSize} users each...\n`);

    for (let i = 0; i < users.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batch = users.slice(i, i + batchSize);
      
      console.log(`📦 Batch ${batchNumber}/${totalBatches} - Sending to ${batch.length} users...`);

      await Promise.all(batch.map(async (user) => {
        try {
          const userLang = user.language;
          const messageText = t("paymentBroadcastMessage", userLang);
          
          const keyboard = [[{
            text: userLang === "es" ? "💰 Hice Mi Pago" : "💰 I Made My Payment",
            callback_data: "payment_confirmation_start"
          }], [{
            text: userLang === "es" ? "💎 Ver Todos los Planes" : "💎 View All Plans",
            callback_data: "show_all_plans"
          }]];

          await bot.telegram.sendMessage(user.userId, messageText, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
          
          successCount++;
          console.log(`   ✅ Sent to @${user.username} (${user.userId})`);
        } catch (error) {
          failureCount++;
          const errorMsg = `Failed to send to ${user.userId}: ${error.message}`;
          errors.push(errorMsg);
          console.log(`   ❌ ${errorMsg}`);
        }
      }));

      // Rate limiting - wait between batches
      if (i + batchSize < users.length) {
        console.log(`⏳ Waiting 2 seconds before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Progress update
      const progress = Math.round(((i + batchSize) / users.length) * 100);
      console.log(`📊 Progress: ${Math.min(i + batchSize, users.length)}/${users.length} (${progress}%)\n`);
    }

    // Final report
    console.log("🎊 BROADCAST COMPLETE! 🎊");
    console.log("═".repeat(60));
    console.log(`✅ Successfully sent: ${successCount} users`);
    console.log(`❌ Failed to send: ${failureCount} users`);
    console.log(`📊 Total users: ${users.length}`);
    console.log(`🎯 Success rate: ${Math.round((successCount / users.length) * 100)}%`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log("\n⚠️  Errors encountered:");
      errors.forEach(error => console.log(`   • ${error}`));
    } else if (errors.length > 10) {
      console.log(`\n⚠️  ${errors.length} errors encountered (too many to display)`);
    }

    console.log("\n🎉 Payment confirmation system is now active!");
    console.log("📱 Users can now:");
    console.log("   • Click 'I Made My Payment' button");
    console.log("   • Select their plan");
    console.log("   • Upload payment receipts");
    console.log("   • Get automatic admin notifications");
    
    console.log("\n📧 You'll receive payment proofs at @pnptvadmin");
    console.log("🔗 Payment proofs are also stored in Firestore collection 'payment_proofs'");
    
    // Log the successful broadcast
    logger.info(`Payment broadcast completed: ${successCount} sent, ${failureCount} failed`, {
      totalUsers: users.length,
      successCount,
      failureCount,
      successRate: Math.round((successCount / users.length) * 100)
    });

  } catch (error) {
    console.error("💥 Broadcast failed:", error);
    logger.error("Payment broadcast failed:", error);
    process.exit(1);
  }
}

// Start the broadcast
sendPaymentBroadcast().then(() => {
  console.log("\n✨ Script completed successfully!");
  process.exit(0);
}).catch(error => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});