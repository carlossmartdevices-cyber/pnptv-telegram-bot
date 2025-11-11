require('dotenv').config();
const { Telegraf } = require('telegraf');
const { db } = require('./src/config/firebase');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PREMIUM_CHANNEL_ID = process.env.CHANNEL_ID || '-1002997324714';

if (!BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Get all channel members (we'll need to do this differently since we can't list all members)
// Instead, we'll use the users in the database who have Premium/Basic tier
async function sendMembershipUpdateBroadcast() {
  try {
    console.log('=== Sending Membership Update Broadcast ===\n');
    console.log(`Started: ${new Date().toLocaleString()}\n`);

    // Get all users with Premium or Basic tier (expired or not)
    const usersSnapshot = await db.collection('users').get();

    const targetUsers = [];
    const now = new Date();

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      const tier = userData.tier || 'Free';

      // Target users who have/had Premium or Basic tier
      if (tier !== 'Free') {
        targetUsers.push({
          userId,
          username: userData.username || 'N/A',
          firstName: userData.firstName || 'User',
          language: userData.language || 'en',
          tier
        });
      }
    });

    console.log(`Found ${targetUsers.length} users with Premium/Basic tier\n`);

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const user of targetUsers) {
      try {
        const lang = user.language;

        // Bilingual message
        const message = lang === 'es'
          ? `📢 *Actualización Importante - Fe de Erratas*\n\n` +
            `Hola ${user.firstName},\n\n` +
            `Hemos detectado que tu membresía necesita ser actualizada en nuestro sistema para activar todos tus beneficios.\n\n` +
            `⚠️ *IMPORTANTE:* Esto NO significa que necesites comprar una nueva membresía. Solo necesitamos que actualices tu información para activar tus beneficios existentes.\n\n` +
            `Por favor, presiona el botón "✅ Actualizar Membresía" abajo para completar este proceso. Tu solicitud será aprobada automáticamente.\n\n` +
            `📌 *Beneficios que se activarán:*\n` +
            `• Acceso completo a medios (fotos, videos, audio)\n` +
            `• Contenido premium desbloqueado\n` +
            `• Características exclusivas\n` +
            `• Búsquedas ilimitadas de miembros cercanos\n\n` +
            `Gracias por tu paciencia y por ser parte de la comunidad PNPtv!`
          : `📢 *Important Update - Correction Notice*\n\n` +
            `Hello ${user.firstName},\n\n` +
            `We've detected that your membership needs to be updated in our system to activate all your benefits.\n\n` +
            `⚠️ *IMPORTANT:* This does NOT mean you need to buy a new membership. We just need you to update your information to activate your existing benefits.\n\n` +
            `Please press the "✅ Update Membership" button below to complete this process. Your request will be approved automatically.\n\n` +
            `📌 *Benefits to be activated:*\n` +
            `• Full media access (photos, videos, audio)\n` +
            `• Premium content unlocked\n` +
            `• Exclusive features\n` +
            `• Unlimited nearby member searches\n\n` +
            `Thank you for your patience and for being part of the PNPtv community!`;

        const keyboard = {
          inline_keyboard: [[
            {
              text: lang === 'es' ? '✅ Actualizar Membresía' : '✅ Update Membership',
              callback_data: 'request_membership_update'
            }
          ]]
        };

        await bot.telegram.sendMessage(user.userId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });

        successCount++;
        console.log(`✅ Sent to ${user.firstName} (@${user.username}) - ID: ${user.userId}`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        failCount++;
        const errorMsg = `Failed for ${user.firstName} (@${user.username}) - ID: ${user.userId}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 BROADCAST SUMMARY\n');
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📈 Total attempted: ${targetUsers.length}`);
    console.log(`\nCompleted: ${new Date().toLocaleString()}`);

    if (errors.length > 0) {
      console.log('\n⚠️ ERRORS:\n');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('Error sending broadcast:', error);
  }

  process.exit(0);
}

sendMembershipUpdateBroadcast();
