require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PREMIUM_CHANNEL_ID = process.env.CHANNEL_ID || '-1002997324714';

if (!BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function listPremiumChannelMembers() {
  try {
    console.log('=== Premium Channel Members List ===\n');
    console.log(`Channel ID: ${PREMIUM_CHANNEL_ID}\n`);

    // Get channel info
    const chat = await bot.telegram.getChat(PREMIUM_CHANNEL_ID);
    console.log(`Channel Name: ${chat.title || 'Unknown'}`);
    console.log(`Channel Type: ${chat.type}`);

    if (chat.username) {
      console.log(`Channel Username: @${chat.username}`);
    }

    // Get member count
    const memberCount = await bot.telegram.getChatMemberCount(PREMIUM_CHANNEL_ID);
    console.log(`\nTotal Members: ${memberCount}\n`);

    console.log('Note: Telegram bots cannot list all channel members directly.');
    console.log('However, you can get member count and individual member status.\n');

    // Let's check administrators
    console.log('=== Channel Administrators ===\n');
    const admins = await bot.telegram.getChatAdministrators(PREMIUM_CHANNEL_ID);

    admins.forEach((admin, index) => {
      const user = admin.user;
      console.log(`${index + 1}. ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`);
      console.log(`   User ID: ${user.id}`);
      if (user.username) {
        console.log(`   Username: @${user.username}`);
      }
      console.log(`   Status: ${admin.status}`);
      console.log(`   Is Bot: ${user.is_bot ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('\n=== Alternative: Query Firestore for Premium Users ===\n');
    console.log('To get a complete list of premium users, we should query Firestore');
    console.log('for users with active premium memberships and check their channel status.\n');

  } catch (error) {
    console.error('Error fetching channel members:', error.message);

    if (error.response) {
      console.error('API Response:', error.response.description);
    }
  }

  process.exit(0);
}

listPremiumChannelMembers();
