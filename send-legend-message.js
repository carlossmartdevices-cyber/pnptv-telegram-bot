// Send congratulatory message to @The_TatBat in the group
const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const GROUP_ID = process.env.FREE_GROUP_ID;
const username = 'The_TatBat';

const { escapeMdV2 } = require('./src/utils/telegramEscapes');

const usernameEscaped = escapeMdV2(username);

const messageES = escapeMdV2(`🎉 Felicitaciones @${username}!
Has recibido la insignia *Legend* en PNPtv por tu trayectoria y actitud legendaria en la comunidad.
¡Gracias por ser parte de la familia y por inspirar a todos! 🏆`);
const messageEN = escapeMdV2(`🎉 Congratulations @${username}!
You have received the *Legend* badge in PNPtv for your legendary attitude and history in the community.
Thank you for inspiring everyone and being part of the family! 🏆`);


(async () => {
  try {
    await bot.telegram.sendMessage(GROUP_ID, messageES, { parse_mode: 'MarkdownV2' });
    await bot.telegram.sendMessage(GROUP_ID, messageEN, { parse_mode: 'MarkdownV2' });
    console.log('Spanish and English congratulatory messages sent to @The_TatBat');
    process.exit(0);
  } catch (err) {
    console.error('Error sending the message:', err);
    process.exit(1);
  }
})();
