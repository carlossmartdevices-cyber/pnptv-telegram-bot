const fs = require('fs');
const path = require('path');

// File paths
const onboardingHelpersPath = path.join(__dirname, '..', 'src', 'bot', 'helpers', 'onboardingHelpers.js');
const startHandlerPath = path.join(__dirname, '..', 'src', 'bot', 'handlers', 'start.js');

// Read onboardingHelpers.js
let onboardingContent = fs.readFileSync(onboardingHelpersPath, 'utf8');

// Replace the main menu display in onboardingHelpers.js
const onboardingOld = `    // Show main menu
    const mainMenu = getMenu("main", lang);
    await ctx.reply(t("mainMenuIntro", lang), {
      reply_markup: mainMenu,
      parse_mode: "Markdown",
    });`;

const onboardingNew = `    // Show main menu with channel button
    const mainMenu = getMenu("main", lang);
    await ctx.reply(t("mainMenuIntro", lang), {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === "es" ? "¡Únete a nuestro canal gratis!" : "Join our free channel!",
              url: "https://t.me/pnptv",
            },
          ],
        ],
      },
      parse_mode: "Markdown",
    });

    // Show the keyboard menu
    await ctx.reply("👇", {
      reply_markup: mainMenu,
    });`;

onboardingContent = onboardingContent.replace(onboardingOld, onboardingNew);
fs.writeFileSync(onboardingHelpersPath, onboardingContent, 'utf8');
console.log('✓ Updated onboardingHelpers.js');

// Read start.js
let startContent = fs.readFileSync(startHandlerPath, 'utf8');

// Replace the main menu display in start.js
const startOld = `        const mainMenu = getMenu("main", lang);
        await ctx.reply(t("mainMenuIntro", lang), {
          reply_markup: mainMenu,
          parse_mode: "Markdown",
        });`;

const startNew = `        const mainMenu = getMenu("main", lang);
        await ctx.reply(t("mainMenuIntro", lang), {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: lang === "es" ? "¡Únete a nuestro canal gratis!" : "Join our free channel!",
                  url: "https://t.me/pnptv",
                },
              ],
            ],
          },
          parse_mode: "Markdown",
        });

        // Show the keyboard menu
        await ctx.reply("👇", {
          reply_markup: mainMenu,
        });`;

startContent = startContent.replace(startOld, startNew);
fs.writeFileSync(startHandlerPath, startContent, 'utf8');
console.log('✓ Updated start.js');

console.log('\n✅ Channel button added successfully to both files!');
console.log('Button text: "Join our free channel!" (EN) / "¡Únete a nuestro canal gratis!" (ES)');
console.log('Channel: @pnptv (https://t.me/pnptv)');
