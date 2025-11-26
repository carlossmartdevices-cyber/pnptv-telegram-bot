#!/usr/bin/env node
/**
 * Send Free Channel Invites to All Onboarded Users
 * This script generates unique one-time invite links for the free channel
 * and sends them to all users who have completed onboarding
 */

const { Telegraf } = require('telegraf');
const { db } = require('./src/config/firebase');
const logger = require('./src/utils/logger');
require('./src/config/env');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const FREE_CHANNEL_ID = process.env.FREE_CHANNEL_ID || "-1003159260496";

// Message texts for both languages
const messages = {
  en: `🎉 *Welcome to PNPtv Community!*

Here's your exclusive invite to our free channel. This link can only be used once:

{INVITE_LINK}

💡 *What's inside:*
• Exclusive PNP content updates
• Community announcements
• Special events & live streams
• Connect with other members

⚠️ *Important:* This is a one-time invite link created just for you. Don't share it with others!

Ready to join? Click the link above! 🚀`,

  es: `🎉 *¡Bienvenido a la Comunidad PNPtv!*

Aquí está tu invitación exclusiva a nuestro canal gratuito. Este enlace solo se puede usar una vez:

{INVITE_LINK}

💡 *¿Qué hay dentro?*
• Actualizaciones de contenido PNP exclusivo
• Anuncios de la comunidad
• Eventos especiales y transmisiones en vivo
• Conecta con otros miembros

⚠️ *Importante:* Este es un enlace de invitación único creado solo para ti. ¡No lo compartas con otros!

¿Listo para unirte? ¡Haz clic en el enlace de arriba! 🚀`
};

async function sendFreeChannelInvites() {
  try {
    console.log('🎉 Starting Free Channel Invite Distribution...\n');
    console.log(`📺 Free Channel ID: ${FREE_CHANNEL_ID}\n`);

    // Get all users who completed onboarding
    const usersSnapshot = await db.collection('users')
      .where('onboardingComplete', '==', true)
      .get();

    const totalUsers = usersSnapshot.size;
    console.log(`👥 Found ${totalUsers} users who completed onboarding\n`);

    if (totalUsers === 0) {
      console.log('⚠️  No onboarded users found. Exiting...');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;
    let blockedCount = 0;
    let inviteErrorCount = 0;

    // Process users one at a time to avoid rate limits on invite link generation
    // Telegram has strict limits on createChatInviteLink API
    const users = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        userId: doc.id,
        language: userData.language || 'en',
        username: userData.username || 'Unknown',
        email: userData.email || 'No email'
      });
    });

    console.log('⏳ Processing users (this may take a while due to rate limits)...\n');
    console.log('=' .repeat(70) + '\n');

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = `[${i + 1}/${totalUsers}]`;

      try {
        // Generate unique one-time invite link for this user
        console.log(`${progress} Generating invite for @${user.username} (${user.userId})...`);

        let inviteLink = null;
        try {
          const invite = await bot.telegram.createChatInviteLink(FREE_CHANNEL_ID, {
            member_limit: 1, // One-time use only
            name: `Free - User ${user.userId}`,
          });
          inviteLink = invite.invite_link;
          console.log(`  ✅ Invite link generated: ${inviteLink.substring(0, 40)}...`);
        } catch (inviteError) {
          inviteErrorCount++;
          console.log(`  ⚠️  Failed to generate invite link: ${inviteError.message}`);

          // Continue to next user if we can't generate invite
          errorCount++;
          continue;
        }

        // Prepare message with the invite link
        const messageTemplate = messages[user.language] || messages.en;
        const message = messageTemplate.replace('{INVITE_LINK}', inviteLink);

        // Send message to user
        await bot.telegram.sendMessage(user.userId, message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        });

        successCount++;
        console.log(`  ✅ Message sent successfully!\n`);

        // Delay between requests to avoid rate limits
        // Telegram allows ~30 messages per second, but invite link generation has stricter limits
        if (i < users.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }

      } catch (error) {
        if (error.response?.error_code === 403) {
          blockedCount++;
          console.log(`  ⛔ User blocked bot\n`);
        } else {
          errorCount++;
          console.log(`  ❌ Error: ${error.message}\n`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 FREE CHANNEL INVITE DISTRIBUTION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`⛔ Users who blocked bot: ${blockedCount}`);
    console.log(`⚠️  Invite generation errors: ${inviteErrorCount}`);
    console.log(`❌ Other errors: ${errorCount}`);
    console.log(`👥 Total onboarded users: ${totalUsers}`);
    console.log(`📺 Channel ID: ${FREE_CHANNEL_ID}`);
    console.log('='.repeat(70));

    // Log details to file
    const logData = {
      timestamp: new Date().toISOString(),
      channelId: FREE_CHANNEL_ID,
      totalUsers,
      successCount,
      blockedCount,
      inviteErrorCount,
      errorCount,
      successRate: ((successCount / totalUsers) * 100).toFixed(2) + '%'
    };

    const fs = require('fs');
    fs.appendFileSync(
      'free-channel-invites-log.txt',
      JSON.stringify(logData, null, 2) + '\n\n'
    );

    console.log('\n✅ Log saved to: free-channel-invites-log.txt\n');

  } catch (error) {
    console.error('❌ Fatal error during invite distribution:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
sendFreeChannelInvites();
