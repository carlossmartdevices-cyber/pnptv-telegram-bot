require("./instrument");
require("./src/config/env");
const { Telegraf } = require("telegraf");
const { db } = require("./src/config/firebase");
const logger = require("./src/utils/logger");

/**
 * Script to send premium channel invite links to all Premium members
 * This will:
 * 1. Get all Premium members from the database
 * 2. Generate unique invite links for each user
 * 3. Send them the invite link with instructions
 */

async function sendInviteLinks() {
  try {
    console.log("\n=== Sending Premium Channel Invite Links ===\n");

    // Initialize bot
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

    // Get all Premium members
    const premiumUsersSnapshot = await db
      .collection("users")
      .where("tier", "==", "Premium")
      .where("membershipIsPremium", "==", true)
      .get();

    if (premiumUsersSnapshot.empty) {
      console.log("No Premium members found.");
      return;
    }

    console.log(`Found ${premiumUsersSnapshot.size} Premium members\n`);

    const channelId = process.env.CHANNEL_ID;
    if (!channelId) {
      console.error("❌ CHANNEL_ID not set in environment variables");
      process.exit(1);
    }

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    // Process each Premium member
    for (const userDoc of premiumUsersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userName = userData.firstName || userData.username || "User";
      const userLanguage = userData.language || "en";
      const isSpanish = userLanguage === "es";
      const expiresAt = userData.membershipExpiresAt?.toDate();

      try {
        console.log(`\n--- Processing User ${userId} ---`);
        console.log(`Name: ${userName}`);

        // Generate unique invite link
        let inviteLink = null;
        try {
          const expireDate = expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null;

          const invite = await bot.telegram.createChatInviteLink(channelId, {
            member_limit: 1, // One-time use link
            expire_date: expireDate,
            name: `Premium - User ${userId}`,
          });

          inviteLink = invite.invite_link;
          console.log(`✓ Generated invite link: ${inviteLink}`);
        } catch (inviteError) {
          console.error(`❌ Failed to generate invite link:`, inviteError.message);
          failureCount++;
          errors.push({ userId, userName, error: `Invite link generation: ${inviteError.message}` });

          // Wait longer before next attempt
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        // Create message
        const message = isSpanish
          ? `🎉 *¡Bienvenido al Canal Premium de PNPtv!*

Hola ${userName}, ¡tu membresía Premium está activa!

🔗 *Únete al Canal Premium ahora:*
${inviteLink}

⚠️ *Importante:*
• Este es tu link único y personal de acceso
• Solo funciona UNA vez
• No lo compartas con nadie
• Expira: ${expiresAt ? expiresAt.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Nunca'}

💎 ¡Disfruta de todo el contenido exclusivo premium!

¿Tienes preguntas? Usa /help para más información.`
          : `🎉 *Welcome to PNPtv Premium Channel!*

Hello ${userName}, your Premium membership is active!

🔗 *Join the Premium Channel now:*
${inviteLink}

⚠️ *Important:*
• This is your unique personal access link
• It works only ONCE
• Do not share it with anyone
• Expires: ${expiresAt ? expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Never'}

💎 Enjoy all the exclusive premium content!

Have questions? Use /help for more information.`;

        // Send message
        try {
          await bot.telegram.sendMessage(userId, message, {
            parse_mode: "Markdown",
            disable_web_page_preview: false, // Show link preview
          });

          console.log(`✓ Invite link sent successfully`);
          successCount++;
        } catch (sendError) {
          console.error(`❌ Failed to send message:`, sendError.message);
          failureCount++;
          errors.push({ userId, userName, error: `Message send: ${sendError.message}` });
        }

        // Add delay to avoid rate limiting (1.5 seconds between messages)
        await new Promise((resolve) => setTimeout(resolve, 1500));

      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error.message);
        failureCount++;
        errors.push({ userId, userName, error: error.message });
      }
    }

    // Summary
    console.log("\n\n=== Invite Links Sent ===\n");
    console.log(`Total Premium Members: ${premiumUsersSnapshot.size}`);
    console.log(`✅ Successfully Sent: ${successCount}`);
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
sendInviteLinks();
