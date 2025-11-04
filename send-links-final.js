require("./instrument");
require("./src/config/env");
const { Telegraf } = require("telegraf");
const { db } = require("./src/config/firebase");

/**
 * Final script to send invite links with HTML formatting (simpler than Markdown)
 */
async function sendInviteLinks() {
  try {
    console.log("\n=== Sending Premium Channel Invite Links (HTML Format) ===\n");

    const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

    const premiumUsersSnapshot = await db
      .collection("users")
      .where("tier", "==", "Premium")
      .where("membershipIsPremium", "==", true)
      .get();

    console.log(`Found ${premiumUsersSnapshot.size} Premium members\n`);
    console.log("⏳ Using 3-second delay between requests\n");

    const channelId = process.env.CHANNEL_ID;

    let successCount = 0;
    let skipCount = 0;
    let failureCount = 0;
    const errors = [];

    for (const userDoc of premiumUsersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userName = userData.firstName || userData.username || "User";
      const userLanguage = userData.language || "en";
      const isSpanish = userLanguage === "es";
      const expiresAt = userData.membershipExpiresAt?.toDate();

      try {
        console.log(`--- User ${userId} (${userName}) ---`);

        // Generate invite link
        let inviteLink = null;
        try {
          const expireDate = expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null;

          const invite = await bot.telegram.createChatInviteLink(channelId, {
            member_limit: 1,
            expire_date: expireDate,
            name: `Premium - ${userId}`,
          });

          inviteLink = invite.invite_link;
          console.log(`✓ Link generated`);
        } catch (inviteError) {
          if (inviteError.message.includes('retry after')) {
            const waitTime = parseInt(inviteError.message.match(/retry after (\d+)/)?.[1] || 30);
            console.log(`⏳ Rate limited, waiting ${waitTime + 5}s...`);
            await new Promise((resolve) => setTimeout(resolve, (waitTime + 5) * 1000));

            try {
              const invite = await bot.telegram.createChatInviteLink(channelId, {
                member_limit: 1,
                expire_date: expireDate,
                name: `Premium - ${userId}`,
              });
              inviteLink = invite.invite_link;
              console.log(`✓ Link generated (retry)`);
            } catch (retryError) {
              console.error(`❌ Retry failed`);
              failureCount++;
              errors.push({ userId, userName, error: retryError.message });
              continue;
            }
          } else {
            console.error(`❌ Failed:`, inviteError.message);
            failureCount++;
            errors.push({ userId, userName, error: inviteError.message });
            continue;
          }
        }

        // Format expiry date
        const expiryText = expiresAt
          ? expiresAt.toLocaleDateString(isSpanish ? 'es-CO' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          : (isSpanish ? 'Nunca' : 'Never');

        // Create HTML message (no special character issues)
        const message = isSpanish
          ? `🎉 <b>¡Bienvenido al Canal Premium de PNPtv!</b>

Hola ${userName}, ¡tu membresía Premium está activa!

🔗 <b>Únete al Canal Premium ahora:</b>
${inviteLink}

⚠️ <b>Importante:</b>
• Este es tu link único y personal de acceso
• Solo funciona UNA vez
• No lo compartas con nadie
• Expira: ${expiryText}

💎 ¡Disfruta de todo el contenido exclusivo premium!

¿Tienes preguntas? Usa /help para más información.`
          : `🎉 <b>Welcome to PNPtv Premium Channel!</b>

Hello ${userName}, your Premium membership is active!

🔗 <b>Join the Premium Channel now:</b>
${inviteLink}

⚠️ <b>Important:</b>
• This is your unique personal access link
• It works only ONCE
• Do not share it with anyone
• Expires: ${expiryText}

💎 Enjoy all the exclusive premium content!

Have questions? Use /help for more information.`;

        // Send with HTML formatting
        try {
          await bot.telegram.sendMessage(userId, message, {
            parse_mode: "HTML",
            disable_web_page_preview: false,
          });

          console.log(`✅ Sent\n`);
          successCount++;
        } catch (sendError) {
          if (sendError.message.includes('chat not found') || sendError.message.includes('blocked by the user')) {
            console.log(`⚠️ Skipped (unavailable)\n`);
            skipCount++;
          } else {
            console.error(`❌ Send failed:`, sendError.message);
            failureCount++;
            errors.push({ userId, userName, error: sendError.message });
          }
        }

        // Wait 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`❌ Error:`, error.message);
        failureCount++;
        errors.push({ userId, userName, error: error.message });
      }
    }

    // Summary
    console.log("\n=== Complete ===\n");
    console.log(`Total: ${premiumUsersSnapshot.size}`);
    console.log(`✅ Sent: ${successCount}`);
    console.log(`⚠️ Skipped: ${skipCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    if (errors.length > 0 && errors.length < 10) {
      console.log("\n--- Errors ---");
      errors.forEach(({ userId, userName, error }) => {
        console.log(`${userId} (${userName}): ${error}`);
      });
    }

    await bot.stop();
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Fatal:", error);
    process.exit(1);
  }
}

sendInviteLinks();
