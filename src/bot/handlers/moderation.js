const moderationService = require('../../services/moderationService');
const logger = require('../../utils/logger');
const { isAdmin } = require('../../config/admin');
const { escapeMdV2, escapeHtml, escapeArray } = require('../../utils/telegramEscapes');

/**
 * Moderation Handlers
 * Admin commands for managing blacklist and viewing violations
 */

// Uses centralized isAdmin from config/admin

/**
 * /blacklist - Show current blacklist
 */
async function handleShowBlacklist(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('⛔ This command is only available to administrators.');
      return;
    }

    const blacklist = await moderationService.getBlacklist();
    const stats = await moderationService.getStats();

    const header = `🛡️ *Moderation Blacklist*\n\n`;
    const statsText = `📊 *Statistics:*\n` +
      `• Blacklisted Words: ${escapeMdV2(stats.blacklistedWords)}\n` +
      `• Blacklisted Links: ${escapeMdV2(stats.blacklistedLinks)}\n` +
      `• Total Violations: ${escapeMdV2(stats.totalViolations)}\n` +
      `• Users with Violations: ${escapeMdV2(stats.totalUsers)}\n\n`;

    const wordsSection = `🚫 *Blacklisted Words (${escapeMdV2(blacklist.words.length) }):*\n` +
      (blacklist.words.length > 0
  ? blacklist.words.slice(0, 20).map(w => '• `' + escapeMdV2(w) + '`').join('\n') +
          (blacklist.words.length > 20 ? `\n... and ${escapeMdV2(blacklist.words.length - 20)} more` : '')
        : '• No words blacklisted\n');

    const linksSection = `\n🔗 *Blacklisted Links (${escapeMdV2(blacklist.links.length)}):*\n` +
      (blacklist.links.length > 0
  ? blacklist.links.slice(0, 10).map(l => '• `' + escapeMdV2(l) + '`').join('\n') +
          (blacklist.links.length > 10 ? `\n... and ${escapeMdV2(blacklist.links.length - 10)} more` : '')
        : '• No links blacklisted\n');

    const commandsText = `\n💡 *Commands:*\n` +
      `• /addword <word> - Add word to blacklist\n` +
      `• /removeword <word> - Remove word\n` +
      `• /addlink <link> - Add link pattern\n` +
      `• /removelink <link> - Remove link\n` +
      `• /violations @user - Check user violations\n` +
      `• /clearviolations @user - Clear violations`;

    const message = header + statsText + wordsSection + linksSection + commandsText;

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logger.error('Error showing blacklist:', error);
    await ctx.reply('❌ Error retrieving blacklist.');
  }
}

/**
 * /addword - Add word(s) to blacklist
 */
async function handleAddWord(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('⛔ This command is only available to administrators.');
      return;
    }

    const args = ctx.message.text.replace('/addword', '').trim();

    if (!args) {
      await ctx.reply(
        `*Add Word to Blacklist*\n\n` +
        `Usage: /addword word1 word2 ...\n\n` +
        `Example: /addword spam scam fake`,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const words = args.split(/\s+/);
    const result = await moderationService.addBlacklistWords(words, ctx.from.id);

    await ctx.reply(
      `✅ *Words Added to Blacklist*\n\n` +
      `Added: ${escapeMdV2(result.addedWords.join(', '))}\n` +
      `Total blacklisted words: ${escapeMdV2(result.totalWords)}`,
      { parse_mode: 'MarkdownV2' }
    );

    logger.info(`Admin ${ctx.from.id} added words to blacklist: ${words.join(', ')}`);
  } catch (error) {
    logger.error('Error adding word to blacklist:', error);
    await ctx.reply('❌ Error adding word to blacklist.');
  }
}

/**
 * /removeword - Remove word(s) from blacklist
 */
async function handleRemoveWord(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('⛔ This command is only available to administrators.');
      return;
    }

    const args = ctx.message.text.replace('/removeword', '').trim();

    if (!args) {
      await ctx.reply(
        `*Remove Word from Blacklist*\n\n` +
        `Usage: /removeword word1 word2 ...\n\n` +
        `Example: /removeword spam scam`,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const words = args.split(/\s+/);
    const result = await moderationService.removeBlacklistWords(words, ctx.from.id);

    await ctx.reply(
      `✅ *Words Removed from Blacklist*\n\n` +
      `Removed: ${escapeMdV2(result.removedWords.join(', '))}\n` +
      `Total blacklisted words: ${escapeMdV2(result.totalWords)}`,
      { parse_mode: 'MarkdownV2' }
    );

    logger.info(`Admin ${ctx.from.id} removed words from blacklist: ${words.join(', ')}`);
  } catch (error) {
    logger.error('Error removing word from blacklist:', error);
    await ctx.reply('❌ Error removing word from blacklist.');
  }
}

/**
 * /addlink - Add link pattern to blacklist
 */
async function handleAddLink(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('⛔ This command is only available to administrators.');
      return;
    }

    const args = ctx.message.text.replace('/addlink', '').trim();

    if (!args) {
      await ctx.reply(
        `*Add Link to Blacklist*\n\n` +
        `Usage: /addlink pattern\n\n` +
        `Examples:\n` +
        `/addlink t.me/spam\n` +
        `/addlink scamsite.com\n` +
        `/addlink bit.ly`,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const links = args.split(/\s+/);
    const result = await moderationService.addBlacklistLinks(links, ctx.from.id);

    await ctx.reply(
      `✅ *Links Added to Blacklist*\n\n` +
      `Added: ${escapeMdV2(result.addedLinks.join(', '))}\n` +
      `Total blacklisted links: ${escapeMdV2(result.totalLinks)}`,
      { parse_mode: 'MarkdownV2' }
    );

    logger.info(`Admin ${ctx.from.id} added links to blacklist: ${links.join(', ')}`);
  } catch (error) {
    logger.error('Error adding link to blacklist:', error);
    await ctx.reply('❌ Error adding link to blacklist.');
  }
}

/**
 * /removelink - Remove link pattern from blacklist
 */
async function handleRemoveLink(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('⛔ This command is only available to administrators.');
      return;
    }

    const args = ctx.message.text.replace('/removelink', '').trim();

    if (!args) {
      await ctx.reply(
        `*Remove Link from Blacklist*\n\n` +
        `Usage: /removelink pattern\n\n` +
        `Example: /removelink t.me/spam`,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const links = args.split(/\s+/);
    const result = await moderationService.removeBlacklistLinks(links, ctx.from.id);

    await ctx.reply(
      `✅ *Links Removed from Blacklist*\n\n` +
      `Removed: ${escapeMdV2(result.removedLinks.join(', '))}\n` +
      `Total blacklisted links: ${escapeMdV2(result.totalLinks)}`,
      { parse_mode: 'MarkdownV2' }
    );

    logger.info(`Admin ${ctx.from.id} removed links from blacklist: ${links.join(', ')}`);
  } catch (error) {
    logger.error('Error removing link from blacklist:', error);
    await ctx.reply('❌ Error removing link from blacklist.');
  }
}

/**
 * /violations - Check user violations
 */
async function handleCheckViolations(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('⛔ This command is only available to administrators.');
      return;
    }

    // Get user ID from mention or reply
    let userId;
    if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id;
    } else {
      const args = ctx.message.text.replace('/violations', '').trim();
      // Try to extract user ID from mention or direct ID
      const match = args.match(/(\d+)/);
      if (match) {
        userId = match[1];
      }
    }

    if (!userId) {
      await ctx.reply(
        `*Check User Violations*\n\n` +
        `Usage:\n` +
        `• Reply to user's message with /violations\n` +
        `• /violations user_id\n` +
        `• /violations @username`,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const violations = await moderationService.getUserViolations(userId);

    if (violations.totalViolations === 0) {
      await ctx.reply(`✅ User ${escapeMdV2(userId)} has no violations.`, { parse_mode: 'MarkdownV2' });
      return;
    }

    const recentViolations = violations.violations.slice(-5).reverse();

    const header = `⚠️ *User Violations Report*\n\n`;
    const idLine = `👤 User ID: \`` + escapeMdV2(userId) + `\`\n`;
    const totalsLine = `📊 Total Violations: ${escapeMdV2(violations.totalViolations) }\n`;
    const firstLine = `📅 First Violation: ${escapeMdV2(violations.firstViolation.toDate().toLocaleString()) }\n`;
    const lastLine = `📅 Last Violation: ${escapeMdV2(violations.lastViolation.toDate().toLocaleString()) }\n\n`;

    const recentHeader = `📋 *Recent Violations (last 5):*\n`;
    const recentText = recentViolations.map((v, i) =>
      `${escapeMdV2(String(i + 1))}. ${escapeMdV2(v.type)} (${escapeMdV2(v.severity)})\n` +
      `   • Content: ${escapeMdV2(v.content || 'N/A')}\n` +
      `   • Action: ${escapeMdV2(v.punishment?.action || 'none')}\n` +
      `   • Date: ${escapeMdV2(v.timestamp.toDate().toLocaleString())}`
    ).join('\n\n');

    const message = header + idLine + totalsLine + firstLine + lastLine + recentHeader + recentText;

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logger.error('Error checking violations:', error);
    await ctx.reply('❌ Error retrieving violations.');
  }
}

/**
 * /clearviolations - Clear user violations
 */
async function handleClearViolations(ctx) {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply('⛔ This command is only available to administrators.');
      return;
    }

    // Get user ID from mention or reply
    let userId;
    if (ctx.message.reply_to_message) {
      userId = ctx.message.reply_to_message.from.id;
    } else {
      const args = ctx.message.text.replace('/clearviolations', '').trim();
      const match = args.match(/(\d+)/);
      if (match) {
        userId = match[1];
      }
    }

    if (!userId) {
      await ctx.reply(
        `*Clear User Violations*\n\n` +
        `Usage:\n` +
        `• Reply to user's message with /clearviolations\n` +
        `• /clearviolations user_id`,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

  await moderationService.clearUserViolations(userId, ctx.from.id);
  await ctx.reply(`✅ Cleared all violations for user ${escapeMdV2(userId)}`, { parse_mode: 'MarkdownV2' });

    logger.info(`Admin ${ctx.from.id} cleared violations for user ${userId}`);
  } catch (error) {
    logger.error('Error clearing violations:', error);
    await ctx.reply('❌ Error clearing violations.');
  }
}

module.exports = {
  handleShowBlacklist,
  handleAddWord,
  handleRemoveWord,
  handleAddLink,
  handleRemoveLink,
  handleCheckViolations,
  handleClearViolations
};
