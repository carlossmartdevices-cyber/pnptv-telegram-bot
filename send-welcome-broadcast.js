#!/usr/bin/env node
/**
 * Send Welcome/Onboarding Completion Message to All Users
 * This script sends the main menu intro message to all bot users
 */

const { Telegraf } = require('telegraf');
const { db } = require('./src/config/firebase');
require('./src/config/env');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Message texts for both languages
const messages = {
  en: {
    text: `💎 **Welcome to PNPtv on Telegram!**

🌟 Your gateway to the hottest PNP amateur content featuring Latino men smoking and slamming.

🔥 **Explore Everything PNPtv Offers:**

👤 **Your Profile** — Update your info and share your location
💎 **Premium Membership** — Access exclusive content with Santino and his boys
📍 **Connect Locally** — Find and meet members near you
💬 **24/7 Support** — Get help whenever you need it

✨ Ready to dive in? Use the menu below! 🚀`,
    buttons: [
      [
        {
          text: "💎 Subscribe to PRIME Channel",
          callback_data: "show_subscription_plans",
        },
      ],
      [
        {
          text: "👤 My Profile",
          callback_data: "show_my_profile",
        },
      ],
      [
        {
          text: "🌍 Who is nearby?",
          callback_data: "show_nearby",
        },
      ],
      [
        {
          text: "🤖 PNPtv! Support",
          callback_data: "show_help",
        },
      ],
    ]
  },
  es: {
    text: `💎 **¡Bienvenido a PNPtv en Telegram!**

🌟 Tu acceso al mejor contenido amateur PNP con hombres latinos fumando y slamming.

🔥 **Explora Todo lo que PNPtv Ofrece:**

👤 **Tu Perfil** — Actualiza tu info y comparte tu ubicación
💎 **Membresía Premium** — Accede a contenido exclusivo con Santino y sus chicos
📍 **Conecta Localmente** — Encuentra y conoce miembros cerca de ti
💬 **Soporte 24/7** — Obtén ayuda cuando la necesites

✨ ¿Listo para comenzar? ¡Usa el menú abajo! 🚀`,
    buttons: [
      [
        {
          text: "💎 Suscríbete al Canal PRIME",
          callback_data: "show_subscription_plans",
        },
      ],
      [
        {
          text: "👤 Mi Perfil",
          callback_data: "show_my_profile",
        },
      ],
      [
        {
          text: "🌍 ¿Quién está cerca?",
          callback_data: "show_nearby",
        },
      ],
      [
        {
          text: "🤖 PNPtv! Soporte",
          callback_data: "show_help",
        },
      ],
    ]
  }
};

async function sendBroadcast() {
  try {
    console.log('📡 Starting broadcast to all users...\n');

    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    console.log(`👥 Found ${totalUsers} users in database\n`);

    let successCount = 0;
    let errorCount = 0;
    let blockedCount = 0;

    // Process users in batches to avoid rate limits
    const batchSize = 30; // Telegram allows ~30 messages per second
    const batchDelay = 1000; // 1 second between batches

    let users = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        userId: doc.id,
        language: userData.language || 'en',
        username: userData.username || 'Unknown'
      });
    });

    // Send messages in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(users.length / batchSize);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)...`);

      // Send to all users in this batch
      const promises = batch.map(async (user) => {
        try {
          const message = messages[user.language] || messages.en;

          await bot.telegram.sendMessage(user.userId, message.text, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: message.buttons
            }
          });

          successCount++;
          console.log(`  ✅ Sent to @${user.username} (${user.userId})`);
        } catch (error) {
          if (error.response?.error_code === 403) {
            blockedCount++;
            console.log(`  ⛔ User blocked bot: @${user.username} (${user.userId})`);
          } else {
            errorCount++;
            console.log(`  ❌ Error sending to @${user.username}: ${error.message}`);
          }
        }
      });

      // Wait for all messages in batch to complete
      await Promise.all(promises);

      // Delay before next batch (except for last batch)
      if (i + batchSize < users.length) {
        console.log(`⏳ Waiting ${batchDelay}ms before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 BROADCAST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`⛔ Users who blocked bot: ${blockedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`👥 Total users: ${totalUsers}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error during broadcast:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the broadcast
sendBroadcast();
