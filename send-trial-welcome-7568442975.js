/**
 * Send trial welcome message to user 7568442975
 * Manual message send after successful activation
 */

require("./src/config/env");
const { Telegraf } = require("telegraf");
const { db } = require("./src/config/firebase");

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const USER_ID = "7568442975";
const INVITE_LINK = "https://t.me/+q_mOuoXnAs85YmVh";

async function sendTrialWelcome() {
  console.log("📤 Sending trial welcome message...\n");

  try {
    // Get user data
    const userDoc = await db.collection("users").doc(USER_ID).get();
    const userData = userDoc.data();
    const userName = (userData.firstName || userData.username || "User").replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    const expiresAt = userData.membershipExpiresAt.toDate();

    // Spanish welcome message for trial
    const message = `🎉 <b>¡Bienvenido a tu Prueba Premium de PNPtv!</b>

¡Hola ${userName}! Tu prueba gratuita de <b>7 días</b> de Premium está activa y lista para usar.

💎 <b>Beneficios de tu Prueba Premium:</b>
• Acceso completo al canal premium por 7 días
• Contenido exclusivo sin restricciones
• Videos y medios en alta calidad
• Soporte prioritario

🔗 <b>Tu Link de Acceso Personal:</b>
${INVITE_LINK}

⚠️ <b>IMPORTANTE:</b> Este es tu link único y personal. No lo compartas con nadie. Solo puede ser usado una vez.

📅 <b>Detalles de tu Prueba:</b>
• Plan: Premium (Prueba de 7 días)
• Estado: Activo ✅
• Activado: ${new Date().toLocaleDateString("es-CO", {
  year: "numeric",
  month: "long",
  day: "numeric"
})}
• Expira: ${expiresAt.toLocaleDateString("es-CO", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric"
})}

⏰ <b>¡Tu prueba termina en 7 días!</b>

🎊 ¡Disfruta de todo el contenido premium durante tu prueba! Si tienes alguna pregunta, estamos aquí para ayudarte.

💡 <b>Después de tu prueba:</b> Puedes continuar con una suscripción premium completa para mantener el acceso a todo el contenido exclusivo.

📌 Consulta nuestra guía: https://pnptv.app/guide`;

    // Send message
    await bot.telegram.sendMessage(USER_ID, message, {
      parse_mode: "HTML",
    });

    console.log("✅ Trial welcome message sent successfully!\n");
    console.log("=".repeat(60));
    console.log("👤 User: " + userName + " (" + USER_ID + ")");
    console.log("💎 Trial: 7-Day Premium Trial");
    console.log("🔗 Link: " + INVITE_LINK);
    console.log("📅 Expires: " + expiresAt.toISOString());
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

(async () => {
  try {
    await sendTrialWelcome();
    console.log("\n✅ Done!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  }
})();
