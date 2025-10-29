const fs = require("fs");
const path = require("path");

// Load locale files
const locales = {};
const localesDir = path.join(__dirname, "../locales");

try {
  const files = fs.readdirSync(localesDir);
  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const lang = file.replace(".json", "");
      const content = fs.readFileSync(
        path.join(localesDir, file),
        "utf-8"
      );
      locales[lang] = JSON.parse(content);
    }
  });
} catch (error) {
  console.error("Error loading locale files:", error);
}

/**
 * Get translated message
 * @param {string} langOrKey - Language code (en, es) or translation key (backwards compatible)
 * @param {string} keyOrLang - Translation key or language code (backwards compatible)
 * @param {Object} params - Parameters to interpolate
 * @returns {string} Translated message
 */
function t(langOrKey, keyOrLang, params = {}) {
  // Support both t(lang, key) and t(key, lang) for backwards compatibility
  let lang, key;

  // If first param is a valid language code, use new signature: t(lang, key)
  if (locales[langOrKey]) {
    lang = langOrKey;
    key = keyOrLang;
  } else {
    // Otherwise use old signature: t(key, lang)
    key = langOrKey;
    lang = keyOrLang || "en";
  }

  const language = locales[lang] || locales.en;
  let message = language[key] || locales.en[key] || key;

  // Replace parameters in the message
  Object.keys(params).forEach((param) => {
    const value = params[param] || "Not set";
    message = message.replace(new RegExp(`{${param}}`, "g"), value);
  });

  return message;
}

/**
 * Get supported languages
 * @returns {Array<string>} Array of language codes
 */
function getSupportedLanguages() {
  return Object.keys(locales);
}

/**
 * Check if language is supported
 * @param {string} lang - Language code
 * @returns {boolean} True if supported
 */
function isLanguageSupported(lang) {
  return locales.hasOwnProperty(lang);
}

module.exports = {
  t,
  getSupportedLanguages,
  isLanguageSupported,
  locales,
};
