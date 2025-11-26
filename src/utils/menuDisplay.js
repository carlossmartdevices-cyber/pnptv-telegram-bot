/**
 * Menu Display Utility with Media Support
 * Helper functions to display menus with attached media
 */

const { getMenuMedia } = require("./menuManager");
const { getMenu } = require("../config/menus");
const logger = require("./logger");

/**
 * Display a menu with media if available
 * @param {object} ctx - Telegraf context
 * @param {string} menuType - Menu type (main, profile, etc.)
 * @param {string} messageText - Text to display with the menu
 * @param {object} options - Additional options (parse_mode, etc.)
 * @returns {Promise<void>}
 */
async function sendMenuWithMedia(ctx, menuType, messageText, options = {}) {
  try {
    const lang = ctx.session?.language || "en";
    const menu = getMenu(menuType, lang);

    // Try to get media for this menu
    const media = await getMenuMedia(menuType, "main") || await getMenuMedia(menuType, "default");

    const sendOptions = {
      parse_mode: options.parse_mode || "Markdown",
      reply_markup: menu,
      ...options,
    };

    if (media) {
      // Send with media
      try {
        if (media.type === "photo") {
          await ctx.replyWithPhoto(media.fileId, {
            caption: messageText,
            ...sendOptions,
          });
        } else if (media.type === "video") {
          await ctx.replyWithVideo(media.fileId, {
            caption: messageText,
            ...sendOptions,
          });
        } else if (media.type === "animation") {
          await ctx.replyWithAnimation(media.fileId, {
            caption: messageText,
            ...sendOptions,
          });
        } else {
          // Fallback to text if media type is unknown
          await ctx.reply(messageText, sendOptions);
        }

        logger.info(`Sent ${menuType} menu with ${media.type} media to user ${ctx.from.id}`);
      } catch (mediaError) {
        // If media fails, fallback to text only
        logger.warn(`Failed to send menu with media, falling back to text: ${mediaError.message}`);
        await ctx.reply(messageText, sendOptions);
      }
    } else {
      // No media, send text only
      await ctx.reply(messageText, sendOptions);
    }
  } catch (error) {
    logger.error(`Error in sendMenuWithMedia for ${menuType}:`, error);
    // Fallback to basic text menu
    const menu = getMenu(menuType, ctx.session?.language || "en");
    await ctx.reply(messageText, {
      parse_mode: "Markdown",
      reply_markup: menu,
    });
  }
}

/**
 * Edit a menu message with media
 * @param {object} ctx - Telegraf context
 * @param {string} menuType - Menu type
 * @param {string} messageText - New text
 * @param {object} options - Additional options
 * @returns {Promise<void>}
 */
async function editMenuWithMedia(ctx, menuType, messageText, options = {}) {
  try {
    const lang = ctx.session?.language || "en";
    const menu = getMenu(menuType, lang);

    const editOptions = {
      parse_mode: options.parse_mode || "Markdown",
      reply_markup: menu,
      ...options,
    };

    // For inline menus, we can edit the text
    await ctx.editMessageText(messageText, editOptions);

    logger.info(`Edited ${menuType} menu message for user ${ctx.from.id}`);
  } catch (error) {
    logger.error(`Error editing menu message for ${menuType}:`, error);
    // If edit fails, send a new message
    await sendMenuWithMedia(ctx, menuType, messageText, options);
  }
}

/**
 * Send main menu with optional media
 * @param {object} ctx - Telegraf context
 * @param {string} messageText - Optional custom message
 * @returns {Promise<void>}
 */
async function sendMainMenu(ctx, messageText = null) {
  const lang = ctx.session?.language || "en";
  const { t } = require("./i18n");

  const text = messageText || t("mainMenuIntro", lang);

  await sendMenuWithMedia(ctx, "main", text);
}

/**
 * Get menu with language support
 * @param {string} menuType - Menu type
 * @param {string} lang - Language code
 * @returns {object} Menu configuration
 */
function getMenuForDisplay(menuType, lang = "en") {
  return getMenu(menuType, lang);
}

module.exports = {
  sendMenuWithMedia,
  editMenuWithMedia,
  sendMainMenu,
  getMenuForDisplay,
};
