/**
 * Menu Manager with Media Support
 * Handles menu configuration storage and retrieval from Firestore
 */

const { db } = require("../config/firebase");
const logger = require("../utils/logger");

const MENU_COLLECTION = "menuConfigs";
const MENU_MEDIA_COLLECTION = "menuMedia";

/**
 * Get menu configuration from Firestore
 * Falls back to default config if not found
 * @param {string} menuType - Menu type (main, profile, admin, subscription)
 * @param {string} lang - Language code
 * @returns {Promise<object>} Menu configuration
 */
async function getMenuConfig(menuType, lang = null) {
  try {
    const docId = lang ? `${menuType}_${lang}` : menuType;
    const menuDoc = await db.collection(MENU_COLLECTION).doc(docId).get();

    if (menuDoc.exists) {
      return menuDoc.data();
    }

    // Fallback to default configuration
    const { getMenu } = require("../config/menus");
    return { config: getMenu(menuType, lang), fromDefaults: true };
  } catch (error) {
    logger.error(`Error getting menu config ${menuType}:`, error);
    // Fallback to defaults on error
    const { getMenu } = require("../config/menus");
    return { config: getMenu(menuType, lang), fromDefaults: true };
  }
}

/**
 * Save menu configuration to Firestore
 * @param {string} menuType - Menu type
 * @param {string} lang - Language code (null for non-localized menus)
 * @param {object} config - Menu configuration
 * @returns {Promise<void>}
 */
async function saveMenuConfig(menuType, lang, config) {
  try {
    const docId = lang ? `${menuType}_${lang}` : menuType;
    await db.collection(MENU_COLLECTION).doc(docId).set(
      {
        menuType,
        language: lang,
        config,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    logger.info(`Menu config saved: ${docId}`);
  } catch (error) {
    logger.error(`Error saving menu config ${menuType}:`, error);
    throw error;
  }
}

/**
 * Get menu item media (photo/video)
 * @param {string} menuType - Menu type
 * @param {string} itemId - Menu item identifier
 * @returns {Promise<object|null>} Media object or null
 */
async function getMenuMedia(menuType, itemId) {
  try {
    const mediaDoc = await db
      .collection(MENU_MEDIA_COLLECTION)
      .doc(`${menuType}_${itemId}`)
      .get();

    if (mediaDoc.exists) {
      return mediaDoc.data();
    }

    return null;
  } catch (error) {
    logger.error(`Error getting menu media for ${menuType}/${itemId}:`, error);
    return null;
  }
}

/**
 * Save menu item media
 * @param {string} menuType - Menu type
 * @param {string} itemId - Menu item identifier
 * @param {object} mediaData - Media data (fileId, type, caption, etc.)
 * @returns {Promise<void>}
 */
async function saveMenuMedia(menuType, itemId, mediaData) {
  try {
    await db
      .collection(MENU_MEDIA_COLLECTION)
      .doc(`${menuType}_${itemId}`)
      .set(
        {
          menuType,
          itemId,
          ...mediaData,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    logger.info(`Menu media saved: ${menuType}/${itemId}`);
  } catch (error) {
    logger.error(`Error saving menu media for ${menuType}/${itemId}:`, error);
    throw error;
  }
}

/**
 * Delete menu item media
 * @param {string} menuType - Menu type
 * @param {string} itemId - Menu item identifier
 * @returns {Promise<void>}
 */
async function deleteMenuMedia(menuType, itemId) {
  try {
    await db
      .collection(MENU_MEDIA_COLLECTION)
      .doc(`${menuType}_${itemId}`)
      .delete();

    logger.info(`Menu media deleted: ${menuType}/${itemId}`);
  } catch (error) {
    logger.error(`Error deleting menu media for ${menuType}/${itemId}:`, error);
    throw error;
  }
}

/**
 * Get all media for a menu
 * @param {string} menuType - Menu type
 * @returns {Promise<array>} Array of media objects
 */
async function getAllMenuMedia(menuType) {
  try {
    const snapshot = await db
      .collection(MENU_MEDIA_COLLECTION)
      .where("menuType", "==", menuType)
      .get();

    const mediaList = [];
    snapshot.forEach((doc) => {
      mediaList.push({ id: doc.id, ...doc.data() });
    });

    return mediaList;
  } catch (error) {
    logger.error(`Error getting all menu media for ${menuType}:`, error);
    return [];
  }
}

/**
 * Reset menu to defaults
 * @param {string} menuType - Menu type
 * @param {string} lang - Language code
 * @returns {Promise<void>}
 */
async function resetMenuToDefaults(menuType, lang) {
  try {
    const docId = lang ? `${menuType}_${lang}` : menuType;
    await db.collection(MENU_COLLECTION).doc(docId).delete();

    logger.info(`Menu reset to defaults: ${docId}`);
  } catch (error) {
    logger.error(`Error resetting menu ${menuType}:`, error);
    throw error;
  }
}

/**
 * List all saved menu configurations
 * @returns {Promise<array>} Array of menu configurations
 */
async function listAllMenuConfigs() {
  try {
    const snapshot = await db.collection(MENU_COLLECTION).get();

    const configs = [];
    snapshot.forEach((doc) => {
      configs.push({ id: doc.id, ...doc.data() });
    });

    return configs;
  } catch (error) {
    logger.error("Error listing menu configs:", error);
    return [];
  }
}

module.exports = {
  getMenuConfig,
  saveMenuConfig,
  getMenuMedia,
  saveMenuMedia,
  deleteMenuMedia,
  getAllMenuMedia,
  resetMenuToDefaults,
  listAllMenuConfigs,
};
