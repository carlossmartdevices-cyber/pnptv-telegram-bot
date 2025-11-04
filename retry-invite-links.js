require("./instrument");
require("./src/config/env");
const { Telegraf } = require("telegraf");
const { db } = require("./src/config/firebase");
const logger = require("./src/utils/logger");

/**
 * Helper function to escape Markdown special characters
 */
function escapeMarkdown(text) {
  if (!text) return text;
  // Escape special characters for Markdown
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * Retry script to send invite links to users who didn't receive them
 */
async function retryInviteLinks() {
  try {
    console.log("\n=== Retrying Premium Channel Invite Links ===\n");

    // Initialize bot
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

    // Get all Premium members
    const premiumUsersSnapshot = await db
      .collection("users")
      .where("tier", "==", "Premium")
      .where("membershipIsPremium", "==", true)
      .get();

    console.log(`Found ${premiumUsersSnapshot.size} Premium members\n`);
    console.log("⏳ Using 3-second delay between requests to avoid rate limiting\n");

    const channelId = process.env.CHANNEL_ID;
    if (!channelId) {
      console.error("❌ CHANNEL_ID not set in environment variables");
      process.exit(1);
    }

    let successCount = 0;
    let skipCount = 0;
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

        // Generate unique invite link with longer wait time
        let inviteLink = null;
        try {
          const expireDate = expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null;

          const invite = await bot.telegram.createChatInviteLink(channelId, {
            member_limit: 1, // One-time use link
            expire_date: expireDate,
            name: `Premium - User ${userId}`,
          });

          inviteLink = invite.invite_link;
          console.log(`✓ Generated invite link`);
        } catch (inviteError) {
          console.error(`❌ Failed to generate invite link:`, inviteError.message);

          // If rate limited, wait the specified time plus buffer
          if (inviteError.message.includes('retry after')) {
            const waitTime = parseInt(inviteError.message.match(/retry after (\d+)/)?.[1] || 30);
            console.log(`⏳ Waiting ${waitTime + 5} seconds due to rate limiting...`);
            await new Promise((resolve) => setTimeout(resolve, (waitTime + 5) * 1000));

            // Retry once
            try {
              const invite = await bot.telegram.createChatInviteLink(channelId, {
                member_limit: 1,
                expire_date: expireDate,
                name: `Premium - User ${userId}`,
              });
              inviteLink = invite.invite_link;
              console.log(`✓ Generated invite link (retry succeeded)`);
            } catch (retryError) {
              console.error(`❌ Retry failed:`, retryError.message);
              failureCount++;
              errors.push({ userId, userName, error: `Invite link: ${retryError.message}` });
              continue;
            }
          } else {
            failureCount++;
            errors.push({ userId, userName, error: `Invite link: ${inviteError.message}` });
            continue;
          }
        }

        // Escape username for Markdown
        const safeUserName = escapeMarkdown(userName);
        const expiryText = expiresAt
          ? expiresAt.toLocaleDateString(isSpanish ? 'es-CO' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          : (isSpanish ? 'Nunca' : 'Never');

        // Create message with plain text (no Markdown formatting for username)
        const message = isSpanish
          ? `🎉 *Bienvenido al Canal Premium de PNPtv\\!*

Hola ${safeUserName}, \\¡tu membresía Premium está activa\\!

🔗 *Únete al Canal Premium ahora:*
${inviteLink}

⚠️ *Importante:*
• Este es tu link único y personal de acceso
• Solo funciona UNA vez
• No lo compartas con nadie
• Expira: ${escapeMarkdown(expiryText)}

💎 ¡Disfruta de todo el contenido exclusivo premium\\!

¿Tienes preguntas? Usa /help para más información\\.`
          : `🎉 *Welcome to PNPtv Premium Channel\\!*

Hello ${safeUserName}, your Premium membership is active\\!

🔗 *Join the Premium Channel now:*
${inviteLink}

⚠️ *Important:*
• This is your unique personal access link
• It works only ONCE
• Do not share it with anyone
• Expires: ${escapeMarkdown(expiryText)}

💎 Enjoy all the exclusive premium content\\!

Have questions? Use /help for more information\\.`;

        // Send message
        try {
          await bot.telegram.sendMessage(userId, message, {
            parse_mode: "MarkdownV2",
            disable_web_page_preview: false,
          });

          console.log(`✅ Invite link sent successfully`);
          successCount++;
        } catch (sendError) {
          console.error(`❌ Failed to send message:`, sendError.message);

          // If chat not found or bot blocked, skip
          if (sendError.message.includes('chat not found') || sendError.message.includes('blocked by the user')) {
            console.log(`⚠️ Skipping user (chat unavailable)`);
            skipCount++;
          } else {
            failureCount++;
            errors.push({ userId, userName, error: `Message send: ${sendError.message}` });
          }
        }

        // Wait 3 seconds between each user to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error.message);
        failureCount++;
        errors.push({ userId, userName, error: error.message });
      }
    }

    // Summary
    console.log("\n\n=== Retry Complete ===\n");
    console.log(`Total Premium Members: ${premiumUsersSnapshot.size}`);
    console.log(`✅ Successfully Sent: ${successCount}`);
    console.log(`⚠️ Skipped (Chat Unavailable): ${skipCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    if (errors.length > 0) {
      console.log("\n--- Remaining Errors ---");
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
retryInviteLinks();
