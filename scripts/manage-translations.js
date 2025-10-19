#!/usr/bin/env node

/**
 * Translation Management Tool
 * Helper script to search, view, and manage bot translations
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const SUPPORTED_LANGS = ['en', 'es'];

// Load translation files
function loadTranslations() {
  const translations = {};
  for (const lang of SUPPORTED_LANGS) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    try {
      translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error(`❌ Error loading ${lang}.json:`, error.message);
      process.exit(1);
    }
  }
  return translations;
}

// Save translations back to files
function saveTranslations(translations) {
  for (const lang of SUPPORTED_LANGS) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(translations[lang], null, 2) + '\n', 'utf-8');
      console.log(`✅ Saved ${lang}.json`);
    } catch (error) {
      console.error(`❌ Error saving ${lang}.json:`, error.message);
    }
  }
}

// Search for a key or text
function searchTranslations(query) {
  const translations = loadTranslations();
  const results = [];

  for (const [lang, texts] of Object.entries(translations)) {
    for (const [key, value] of Object.entries(texts)) {
      if (
        key.toLowerCase().includes(query.toLowerCase()) ||
        value.toLowerCase().includes(query.toLowerCase())
      ) {
        results.push({ lang, key, value });
      }
    }
  }

  return results;
}

// List all translation keys
function listAllKeys() {
  const translations = loadTranslations();
  const enKeys = Object.keys(translations.en).sort();

  console.log('\n📋 Available Translation Keys:\n');
  enKeys.forEach((key, index) => {
    const preview = translations.en[key].substring(0, 60).replace(/\n/g, ' ');
    console.log(`${index + 1}. ${key}`);
    console.log(`   EN: ${preview}${translations.en[key].length > 60 ? '...' : ''}`);
    if (translations.es[key]) {
      const esPreview = translations.es[key].substring(0, 60).replace(/\n/g, ' ');
      console.log(`   ES: ${esPreview}${translations.es[key].length > 60 ? '...' : ''}`);
    } else {
      console.log(`   ES: ⚠️ MISSING TRANSLATION`);
    }
    console.log('');
  });

  console.log(`\n📊 Total keys: ${enKeys.length}\n`);
}

// Find missing translations
function findMissingTranslations() {
  const translations = loadTranslations();
  const enKeys = new Set(Object.keys(translations.en));
  const esKeys = new Set(Object.keys(translations.es));

  const missingInSpanish = [...enKeys].filter(key => !esKeys.has(key));
  const missingInEnglish = [...esKeys].filter(key => !enKeys.has(key));

  console.log('\n🔍 Missing Translations:\n');

  if (missingInSpanish.length > 0) {
    console.log('⚠️  Missing in Spanish (es.json):');
    missingInSpanish.forEach(key => console.log(`   - ${key}`));
    console.log('');
  }

  if (missingInEnglish.length > 0) {
    console.log('⚠️  Missing in English (en.json):');
    missingInEnglish.forEach(key => console.log(`   - ${key}`));
    console.log('');
  }

  if (missingInSpanish.length === 0 && missingInEnglish.length === 0) {
    console.log('✅ All translations are in sync!\n');
  }
}

// Show usage statistics
function showStats() {
  const translations = loadTranslations();

  console.log('\n📊 Translation Statistics:\n');

  for (const [lang, texts] of Object.entries(translations)) {
    const totalKeys = Object.keys(texts).length;
    const totalChars = Object.values(texts).join('').length;
    const avgLength = Math.round(totalChars / totalKeys);

    console.log(`${lang.toUpperCase()}:`);
    console.log(`  Keys: ${totalKeys}`);
    console.log(`  Total characters: ${totalChars.toLocaleString()}`);
    console.log(`  Average length: ${avgLength} chars`);
    console.log('');
  }
}

// View a specific key
function viewKey(keyName) {
  const translations = loadTranslations();

  console.log(`\n🔑 Translation for "${keyName}":\n`);

  for (const [lang, texts] of Object.entries(translations)) {
    if (texts[keyName]) {
      console.log(`${lang.toUpperCase()}:`);
      console.log(texts[keyName]);
      console.log('');
    } else {
      console.log(`${lang.toUpperCase()}: ❌ NOT FOUND\n`);
    }
  }
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];
const param = args[1];

console.log('🌍 PNPtv Translation Manager\n');

switch (command) {
  case 'list':
    listAllKeys();
    break;

  case 'search':
    if (!param) {
      console.log('❌ Usage: npm run translations search <query>\n');
      process.exit(1);
    }
    const results = searchTranslations(param);
    console.log(`\n🔍 Search results for "${param}":\n`);
    if (results.length === 0) {
      console.log('No results found.\n');
    } else {
      results.forEach(({ lang, key, value }) => {
        console.log(`${lang.toUpperCase()} - ${key}:`);
        console.log(`  ${value.substring(0, 100).replace(/\n/g, ' ')}${value.length > 100 ? '...' : ''}\n`);
      });
    }
    break;

  case 'view':
    if (!param) {
      console.log('❌ Usage: npm run translations view <key>\n');
      process.exit(1);
    }
    viewKey(param);
    break;

  case 'missing':
    findMissingTranslations();
    break;

  case 'stats':
    showStats();
    break;

  default:
    console.log('📖 Available commands:\n');
    console.log('  list              - List all translation keys');
    console.log('  search <query>    - Search for text or key');
    console.log('  view <key>        - View a specific translation key');
    console.log('  missing           - Find missing translations');
    console.log('  stats             - Show translation statistics');
    console.log('\nExamples:');
    console.log('  npm run translations list');
    console.log('  npm run translations search welcome');
    console.log('  npm run translations view profileInfo');
    console.log('  npm run translations missing');
    console.log('');
}
