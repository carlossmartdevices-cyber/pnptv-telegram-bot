/**
 * Send welcome message with premium channel invite link to user 8433276659
 * This script generates a unique invite link and sends a personalized welcome message
 */

require("./src/config/env");
const { Telegraf } = require("telegraf");
const { db } = require("./src/config/firebase");
const logger = require("./src/utils/logger");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const USER_ID = "8433276659";
const CHANNEL_ID = process.env.CHANNEL_ID || "-1002997324714";

/**
 * Generate premium welcome message with invite link
 */
async function sendWelcomeMessage() {
  console.log("🚀 Starting welcome message generation...\n");

  try {
    // 1. Fetch user data from Firebase
    console.log(`📋 Fetching user data for ${USER_ID}...`);
    const userDoc = await db.collection("users").doc(USER_ID).get();

    if (!userDoc.exists) {
      console.error(`❌ User ${USER_ID} not found in database`);
      return;
    }

    const userData = userDoc.data();
    const userName = userData.firstName || userData.username || "User";
    const userLanguage = userData.language || "en";
    const tier = userData.tier || "Basic";

    console.log(`✅ User found: ${userName}`);
    console.log(`   Language: ${userLanguage}`);
    console.log(`   Tier: ${tier}\n`);

    // 2. Generate unique invite link to premium channel
    console.log(`🔗 Generating unique invite link to premium channel...`);
    console.log(`   Channel ID: ${CHANNEL_ID}`);

    // Calculate expiration based on membership expiration (30 days default)
    const expirationDate = userData.membershipExpiresAt?.toDate() ||
                           new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expireTimestamp = Math.floor(expirationDate.getTime() / 1000);

    const invite = await bot.telegram.createChatInviteLink(CHANNEL_ID, {
      member_limit: 1, // One-time use link
      expire_date: expireTimestamp,
      name: `${tier} - User ${USER_ID} - ${userName}`,
    });

    console.log(`✅ Invite link generated: ${invite.invite_link}`);
    console.log(`   Expires: ${expirationDate.toLocaleDateString()}\n`);

    // 3. Generate welcome message in user's language
    const isSpanish = userLanguage === "es";

    const welcomeMessage = isSpanish
      ? `🎉 *¡Bienvenido a PNPtv Premium!*

¡Hola ${userName}! Tu suscripción *${tier}* está activa y lista para usar.

💎 *Beneficios de tu Membresía:*
• Acceso completo al canal premium
• Contenido exclusivo sin restricciones
• Videos y medios en alta calidad
• Soporte prioritario

🔗 *Tu Link de Acceso Personal:*
${invite.invite_link}

⚠️ *IMPORTANTE:* Este es tu link único y personal. No lo compartas con nadie. Solo puede ser usado una vez.

📅 *Detalles:*
• Plan: ${tier}
• Estado: Activo ✅
• Expira: ${expirationDate.toLocaleDateString("es-CO", {
  year: "numeric",
  month: "long",
  day: "numeric",
})}

🎊 ¡Disfruta de todo el contenido premium! Si tienes alguna pregunta, estamos aquí para ayudarte.

📌 Consulta nuestra guía: https://pnptv.app/guide`
      : `🎉 *Welcome to PNPtv Premium!*

Hello ${userName}! Your *${tier}* subscription is active and ready to use.

💎 *Your Membership Benefits:*
• Full access to premium channel
• Exclusive content without restrictions
• High-quality videos and media
• Priority support

🔗 *Your Personal Access Link:*
${invite.invite_link}

⚠️ *IMPORTANT:* This is your unique personal link. Do not share it with anyone. It can only be used once.

📅 *Details:*
• Plan: ${tier}
• Status: Active ✅
• Expires: ${expirationDate.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
})}

🎊 Enjoy all the premium content! If you have any questions, we're here to help.

📌 Check out our guide: https://pnptv.app/guide`;

    // 4. Send the welcome message
    console.log(`📤 Sending welcome message to user ${USER_ID}...`);
    await bot.telegram.sendMessage(USER_ID, welcomeMessage, {
      parse_mode: "Markdown",
    });

    console.log(`✅ Welcome message sent successfully!\n`);

    // 5. Log the action
    await db.collection("users").doc(USER_ID).set(
      {
        lastInviteLinkSent: new Date(),
        lastInviteLink: invite.invite_link,
        inviteLinkExpires: expirationDate,
      },
      { merge: true }
    );

    console.log(`📝 Database updated with invite link details\n`);

    // 6. Summary
    console.log("=".repeat(60));
    console.log("✅ WELCOME MESSAGE SENT SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`👤 User: ${userName} (${USER_ID})`);
    console.log(`💎 Tier: ${tier}`);
    console.log(`🌍 Language: ${userLanguage}`);
    console.log(`🔗 Invite Link: ${invite.invite_link}`);
    console.log(`📅 Expires: ${expirationDate.toISOString()}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error sending welcome message:", error);
    logger.error("Error in sendWelcomeMessage:", error);
    throw error;
  }
}

// Run the script
(async () => {
  try {
    await sendWelcomeMessage();
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Script failed:", error.message);
    process.exit(1);
  }
})();
