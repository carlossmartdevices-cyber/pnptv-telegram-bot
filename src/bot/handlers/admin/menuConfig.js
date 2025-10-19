/**
 * Advanced Menu Configuration Admin Panel
 * Allows editing menus and adding media directly from Telegram
 */

const { t } = require("../../../utils/i18n");
const logger = require("../../../utils/logger");
const {
  getMenuConfig,
  saveMenuConfig,
  getMenuMedia,
  saveMenuMedia,
  deleteMenuMedia,
  getAllMenuMedia,
  resetMenuToDefaults,
} = require("../../../utils/menuManager");
const { getMenu } = require("../../../config/menus");

/**
 * Main menu configuration interface
 */
async function showMenuConfig(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const message = t("adminMenuConfigMain", lang);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("adminMenuEditMain", lang),
              callback_data: "admin_menu_edit_main",
            },
          ],
          [
            {
              text: t("adminMenuEditProfile", lang),
              callback_data: "admin_menu_edit_profile",
            },
            {
              text: t("adminMenuEditSubscription", lang),
              callback_data: "admin_menu_edit_subscription",
            },
          ],
          [
            {
              text: t("adminMenuMediaManager", lang),
              callback_data: "admin_menu_media",
            },
          ],
          [
            {
              text: t("adminMenuReset", lang),
              callback_data: "admin_menu_reset_prompt",
            },
          ],
          [
            {
              text: t("back", lang),
              callback_data: "admin_back",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} opened menu configuration`);
  } catch (error) {
    logger.error("Error showing menu config:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Edit main menu (keyboard menu with language variants)
 */
async function editMainMenu(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const message = t("adminMenuEditMainPrompt", lang);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🇬🇧 " + t("editEnglishMenu", lang),
              callback_data: "admin_menu_edit_main_en",
            },
            {
              text: "🇪🇸 " + t("editSpanishMenu", lang),
              callback_data: "admin_menu_edit_main_es",
            },
          ],
          [
            {
              text: t("adminMenuPreview", lang),
              callback_data: "admin_menu_preview_main",
            },
          ],
          [
            {
              text: t("back", lang),
              callback_data: "admin_menus",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Error editing main menu:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Show current menu structure for editing
 */
async function showMenuForEdit(ctx, menuType, menuLang = null) {
  try {
    const lang = ctx.session.language || "en";

    // Get current menu configuration
    const menuData = await getMenuConfig(menuType, menuLang);
    const currentMenu = menuData.config || getMenu(menuType, menuLang);

    let message = t("adminCurrentMenuStructure", lang, { menuType, menuLang: menuLang || "all" });
    message += "\n\n";

    // Display current structure
    if (menuType === "main" && menuLang) {
      // Keyboard menu
      message += t("currentButtons", lang) + "\n\n";
      if (currentMenu.keyboard) {
        currentMenu.keyboard.forEach((row, idx) => {
          message += `**Row ${idx + 1}:**\n`;
          row.forEach((btn, btnIdx) => {
            message += `  ${btnIdx + 1}. ${btn}\n`;
          });
          message += "\n";
        });
      }
    } else if (currentMenu.inline_keyboard) {
      // Inline menu
      message += t("currentButtons", lang) + "\n\n";
      currentMenu.inline_keyboard.forEach((row, idx) => {
        message += `**Row ${idx + 1}:**\n`;
        row.forEach((btn, btnIdx) => {
          message += `  ${btnIdx + 1}. ${btn.text}\n`;
          if (btn.callback_data) {
            message += `     → \`${btn.callback_data}\`\n`;
          }
        });
        message += "\n";
      });
    }

    message += "\n" + t("adminMenuEditInstructions", lang);

    // Store editing context in session
    if (!ctx.session.menuEdit) {
      ctx.session.menuEdit = {};
    }
    ctx.session.menuEdit = {
      menuType,
      menuLang,
      waitingFor: "menu_structure",
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("adminMenuAddButton", lang),
              callback_data: `admin_menu_add_button_${menuType}_${menuLang || "none"}`,
            },
          ],
          [
            {
              text: t("adminMenuRemoveButton", lang),
              callback_data: `admin_menu_remove_button_${menuType}_${menuLang || "none"}`,
            },
          ],
          [
            {
              text: t("adminMenuReorder", lang),
              callback_data: `admin_menu_reorder_${menuType}_${menuLang || "none"}`,
            },
          ],
          [
            {
              text: t("adminMenuSave", lang),
              callback_data: `admin_menu_save_${menuType}_${menuLang || "none"}`,
            },
          ],
          [
            {
              text: t("back", lang),
              callback_data: "admin_menus",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Error showing menu for edit:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Media Manager - Main interface
 */
async function showMediaManager(ctx) {
  try {
    const lang = ctx.session.language || "en";

    const message = t("adminMenuMediaManagerMain", lang);

    // Get all menu types with media
    const mainMedia = await getAllMenuMedia("main");
    const profileMedia = await getAllMenuMedia("profile");
    const subscriptionMedia = await getAllMenuMedia("subscription");

    let mediaInfo = "\n\n**Current Media:**\n";
    mediaInfo += `🏠 Main Menu: ${mainMedia.length} items\n`;
    mediaInfo += `👤 Profile Menu: ${profileMedia.length} items\n`;
    mediaInfo += `💎 Subscription Menu: ${subscriptionMedia.length} items\n`;

    await ctx.reply(message + mediaInfo, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("adminMenuAddMedia", lang) + " 🏠 Main",
              callback_data: "admin_menu_media_add_main",
            },
          ],
          [
            {
              text: t("adminMenuViewMedia", lang) + " 🏠 Main",
              callback_data: "admin_menu_media_view_main",
            },
            {
              text: t("adminMenuDeleteMedia", lang) + " 🏠 Main",
              callback_data: "admin_menu_media_delete_main",
            },
          ],
          [
            {
              text: t("adminMenuAddMedia", lang) + " 👤 Profile",
              callback_data: "admin_menu_media_add_profile",
            },
          ],
          [
            {
              text: t("adminMenuAddMedia", lang) + " 💎 Subscription",
              callback_data: "admin_menu_media_add_subscription",
            },
          ],
          [
            {
              text: t("back", lang),
              callback_data: "admin_menus",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Error showing media manager:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Add media to menu item
 */
async function startAddMedia(ctx, menuType) {
  try {
    const lang = ctx.session.language || "en";

    const message = t("adminMenuAddMediaPrompt", lang, { menuType });

    // Set session state
    ctx.session.menuEdit = {
      menuType,
      waitingFor: "media_upload",
      step: "awaiting_media",
    };

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("cancel", lang),
              callback_data: "admin_menu_media",
            },
          ],
        ],
      },
    });

    logger.info(`Admin ${ctx.from.id} started adding media to ${menuType}`);
  } catch (error) {
    logger.error("Error starting add media:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Handle media upload for menu
 */
async function handleMediaUpload(ctx) {
  try {
    const lang = ctx.session.language || "en";

    if (!ctx.session.menuEdit || ctx.session.menuEdit.waitingFor !== "media_upload") {
      return;
    }

    const { menuType } = ctx.session.menuEdit;

    let mediaData = {};

    // Check for photo
    if (ctx.message.photo) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      mediaData = {
        type: "photo",
        fileId: photo.file_id,
        fileUniqueId: photo.file_unique_id,
        width: photo.width,
        height: photo.height,
      };
    }
    // Check for video
    else if (ctx.message.video) {
      mediaData = {
        type: "video",
        fileId: ctx.message.video.file_id,
        fileUniqueId: ctx.message.video.file_unique_id,
        width: ctx.message.video.width,
        height: ctx.message.video.height,
        duration: ctx.message.video.duration,
      };
    }
    // Check for animation (GIF)
    else if (ctx.message.animation) {
      mediaData = {
        type: "animation",
        fileId: ctx.message.animation.file_id,
        fileUniqueId: ctx.message.animation.file_unique_id,
        width: ctx.message.animation.width,
        height: ctx.message.animation.height,
        duration: ctx.message.animation.duration,
      };
    } else {
      await ctx.reply(t("adminMenuMediaInvalidType", lang));
      return;
    }

    // Store caption if provided
    if (ctx.message.caption) {
      mediaData.caption = ctx.message.caption;
    }

    // Ask for menu item ID
    ctx.session.menuEdit.mediaData = mediaData;
    ctx.session.menuEdit.step = "awaiting_item_id";

    await ctx.reply(t("adminMenuMediaItemIdPrompt", lang), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("cancel", lang),
              callback_data: "admin_menu_media",
            },
          ],
        ],
      },
    });
  } catch (error) {
    logger.error("Error handling media upload:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Handle menu item ID for media
 */
async function handleMediaItemId(ctx) {
  try {
    const lang = ctx.session.language || "en";

    if (
      !ctx.session.menuEdit ||
      ctx.session.menuEdit.step !== "awaiting_item_id" ||
      !ctx.message.text
    ) {
      return;
    }

    const { menuType, mediaData } = ctx.session.menuEdit;
    const itemId = ctx.message.text.trim();

    // Save media
    await saveMenuMedia(menuType, itemId, mediaData);

    await ctx.reply(t("adminMenuMediaSaved", lang, { menuType, itemId }), {
      parse_mode: "Markdown",
    });

    // Clear session
    delete ctx.session.menuEdit;

    // Show media manager again
    await showMediaManager(ctx);

    logger.info(`Admin ${ctx.from.id} saved media for ${menuType}/${itemId}`);
  } catch (error) {
    logger.error("Error handling media item ID:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * View all media for a menu
 */
async function viewMenuMedia(ctx, menuType) {
  try {
    const lang = ctx.session.language || "en";

    const mediaList = await getAllMenuMedia(menuType);

    if (mediaList.length === 0) {
      await ctx.reply(t("adminMenuNoMedia", lang, { menuType }));
      return;
    }

    let message = t("adminMenuMediaList", lang, { menuType, count: mediaList.length });
    message += "\n\n";

    mediaList.forEach((media, idx) => {
      message += `**${idx + 1}. ${media.itemId}**\n`;
      message += `   Type: ${media.type}\n`;
      if (media.caption) {
        message += `   Caption: ${media.caption}\n`;
      }
      message += `   Updated: ${new Date(media.updatedAt).toLocaleDateString()}\n\n`;
    });

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("back", lang),
              callback_data: "admin_menu_media",
            },
          ],
        ],
      },
    });

    // Send preview of first media item
    if (mediaList.length > 0) {
      const firstMedia = mediaList[0];
      try {
        if (firstMedia.type === "photo") {
          await ctx.replyWithPhoto(firstMedia.fileId, {
            caption: `Preview: ${firstMedia.itemId}`,
          });
        } else if (firstMedia.type === "video") {
          await ctx.replyWithVideo(firstMedia.fileId, {
            caption: `Preview: ${firstMedia.itemId}`,
          });
        } else if (firstMedia.type === "animation") {
          await ctx.replyWithAnimation(firstMedia.fileId, {
            caption: `Preview: ${firstMedia.itemId}`,
          });
        }
      } catch (err) {
        logger.warn(`Could not send media preview: ${err.message}`);
      }
    }
  } catch (error) {
    logger.error("Error viewing menu media:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Delete media from menu
 */
async function deleteMenuMediaPrompt(ctx, menuType) {
  try {
    const lang = ctx.session.language || "en";

    const mediaList = await getAllMenuMedia(menuType);

    if (mediaList.length === 0) {
      await ctx.reply(t("adminMenuNoMedia", lang, { menuType }));
      return;
    }

    let keyboard = [];
    mediaList.forEach((media) => {
      keyboard.push([
        {
          text: `❌ ${media.itemId}`,
          callback_data: `admin_menu_media_delete_confirm_${menuType}_${media.itemId}`,
        },
      ]);
    });

    keyboard.push([
      {
        text: t("back", lang),
        callback_data: "admin_menu_media",
      },
    ]);

    await ctx.reply(t("adminMenuDeleteMediaPrompt", lang, { menuType }), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  } catch (error) {
    logger.error("Error showing delete menu media prompt:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Confirm and delete media
 */
async function confirmDeleteMedia(ctx, menuType, itemId) {
  try {
    const lang = ctx.session.language || "en";

    await deleteMenuMedia(menuType, itemId);

    await ctx.answerCbQuery(t("adminMenuMediaDeleted", lang));
    await ctx.reply(t("adminMenuMediaDeletedSuccess", lang, { menuType, itemId }));

    // Show media manager again
    await showMediaManager(ctx);

    logger.info(`Admin ${ctx.from.id} deleted media for ${menuType}/${itemId}`);
  } catch (error) {
    logger.error("Error deleting media:", error);
    await ctx.reply(t("error", lang));
  }
}

/**
 * Preview menu with media
 */
async function previewMenuWithMedia(ctx, menuType) {
  try {
    const lang = ctx.session.language || "en";

    // Get menu config
    const menuData = await getMenuConfig(menuType, lang);
    const menu = menuData.config || getMenu(menuType, lang);

    // Get media for this menu
    const mediaList = await getAllMenuMedia(menuType);
    const mediaMap = {};
    mediaList.forEach((media) => {
      mediaMap[media.itemId] = media;
    });

    // Check if we have media to show
    const mainMedia = mediaMap["main"] || mediaMap["default"];

    if (mainMedia) {
      const caption = t("adminMenuPreviewCaption", lang, { menuType });

      if (mainMedia.type === "photo") {
        await ctx.replyWithPhoto(mainMedia.fileId, {
          caption,
          parse_mode: "Markdown",
          reply_markup: menu,
        });
      } else if (mainMedia.type === "video") {
        await ctx.replyWithVideo(mainMedia.fileId, {
          caption,
          parse_mode: "Markdown",
          reply_markup: menu,
        });
      } else if (mainMedia.type === "animation") {
        await ctx.replyWithAnimation(mainMedia.fileId, {
          caption,
          parse_mode: "Markdown",
          reply_markup: menu,
        });
      }
    } else {
      await ctx.reply(t("adminMenuPreviewNoMedia", lang, { menuType }), {
        parse_mode: "Markdown",
        reply_markup: menu,
      });
    }

    logger.info(`Admin ${ctx.from.id} previewed ${menuType} menu with media`);
  } catch (error) {
    logger.error("Error previewing menu with media:", error);
    await ctx.reply(t("error", lang));
  }
}

module.exports = {
  showMenuConfig,
  editMainMenu,
  showMenuForEdit,
  showMediaManager,
  startAddMedia,
  handleMediaUpload,
  handleMediaItemId,
  viewMenuMedia,
  deleteMenuMediaPrompt,
  confirmDeleteMedia,
  previewMenuWithMedia,
};
