#!/usr/bin/env node
/**
 * Send Free Channel Invites to All Onboarded Users (V2 with Rate Limit Handling)
 * This script generates unique one-time invite links for the free channel
 * and sends them to all users who have completed onboarding
 *
 * V2 improvements:
 * - Automatic retry on rate limit errors
 * - Longer delays between requests
 * - Better error handling
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

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to generate invite with retry
async function generateInviteWithRetry(userId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const invite = await bot.telegram.createChatInviteLink(FREE_CHANNEL_ID, {
        member_limit: 1, // One-time use only
        name: `Free - User ${userId}`,
      });
      return { success: true, link: invite.invite_link };
    } catch (error) {
      if (error.response?.error_code === 429) {
        // Rate limit hit - extract retry_after from error
        const retryAfter = error.response?.parameters?.retry_after || 20;
        console.log(`  ⏳ Rate limit hit. Waiting ${retryAfter} seconds... (attempt ${attempt}/${maxRetries})`);
        await sleep((retryAfter + 2) * 1000); // Add 2 extra seconds for safety
      } else {
        return { success: false, error: error.message };
      }
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

async function sendFreeChannelInvites() {
  try {
    console.log('🎉 Starting Free Channel Invite Distribution (V2 with Rate Limit Handling)...\n');
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

    // Collect all users
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

    console.log('⏳ Processing users with automatic rate limit handling...\n');
    console.log('   This will take approximately ' + Math.ceil((totalUsers * 5) / 60) + ' minutes\n');
    console.log('=' .repeat(70) + '\n');

    const startTime = Date.now();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const progress = `[${i + 1}/${totalUsers}]`;

      try {
        console.log(`${progress} Processing @${user.username} (${user.userId})...`);

        // Generate unique one-time invite link with retry
        const inviteResult = await generateInviteWithRetry(user.userId);

        if (!inviteResult.success) {
          inviteErrorCount++;
          errorCount++;
          console.log(`  ❌ Failed to generate invite: ${inviteResult.error}\n`);
          continue;
        }

        const inviteLink = inviteResult.link;
        console.log(`  ✅ Invite generated: ${inviteLink.substring(0, 40)}...`);

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

        // Delay between requests - 5 seconds to be safe with rate limits
        if (i < users.length - 1) {
          await sleep(5000);
        }

      } catch (error) {
        if (error.response?.error_code === 403) {
          blockedCount++;
          console.log(`  ⛔ User blocked bot\n`);
        } else if (error.response?.error_code === 400) {
          errorCount++;
          console.log(`  ❌ Bad request error (likely markdown parsing): ${error.message}\n`);
        } else {
          errorCount++;
          console.log(`  ❌ Error: ${error.message}\n`);
        }
      }

      // Show progress every 10 users
      if ((i + 1) % 10 === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const avgTimePerUser = elapsed / (i + 1);
        const remainingUsers = totalUsers - (i + 1);
        const estimatedTimeLeft = Math.ceil((remainingUsers * avgTimePerUser) / 60);

        console.log(`📊 Progress: ${i + 1}/${totalUsers} | Success: ${successCount} | Errors: ${errorCount} | ETA: ~${estimatedTimeLeft} min\n`);
      }
    }

    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    console.log('\n' + '='.repeat(70));
    console.log('📊 FREE CHANNEL INVITE DISTRIBUTION SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`⛔ Users who blocked bot: ${blockedCount}`);
    console.log(`⚠️  Invite generation errors: ${inviteErrorCount}`);
    console.log(`❌ Other errors: ${errorCount}`);
    console.log(`👥 Total onboarded users: ${totalUsers}`);
    console.log(`⏱️  Total time: ${Math.floor(totalTime / 60)} min ${totalTime % 60} sec`);
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
      totalTimeSeconds: totalTime,
      successRate: ((successCount / totalUsers) * 100).toFixed(2) + '%'
    };

    const fs = require('fs');
    fs.appendFileSync(
      'free-channel-invites-log.txt',
      '\n' + '='.repeat(70) + '\n' +
      'V2 Script Run - ' + new Date().toISOString() + '\n' +
      '='.repeat(70) + '\n' +
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
