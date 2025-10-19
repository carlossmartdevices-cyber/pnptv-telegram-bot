const fs = require('fs');
const path = require('path');

// File paths
const onboardingHelpersPath = path.join(__dirname, '..', 'src', 'bot', 'helpers', 'onboardingHelpers.js');
const startHandlerPath = path.join(__dirname, '..', 'src', 'bot', 'handlers', 'start.js');

// Update onboardingHelpers.js - change URL
let onboardingContent = fs.readFileSync(onboardingHelpersPath, 'utf8');
onboardingContent = onboardingContent.replace(
  'url: "https://t.me/pnptv"',
  'url: "https://t.me/PNPtv"'
);
fs.writeFileSync(onboardingHelpersPath, onboardingContent, 'utf8');
console.log('✓ Updated channel URL in onboardingHelpers.js');

// Update start.js
let startContent = fs.readFileSync(startHandlerPath, 'utf8');

// Change URL
startContent = startContent.replace(
  'url: "https://t.me/pnptv"',
  'url: "https://t.me/PNPtv"'
);

// Remove the entire Mini App section (lines 113-129 approximately)
const miniAppSection = `
        const webAppUrl = process.env.WEB_APP_URL;

        if (webAppUrl && webAppUrl.startsWith("https://")) {
          return ctx.reply(
            lang === "es"
              ? "ðŸŒ Abre nuestra Mini App para una experiencia completa!"
              : "ðŸŒ Open our Mini App for the full experience!",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text:
                        lang === "es"
                          ? "ðŸš€ Abrir Mini App"
                          : "ðŸš€ Open Mini App",
                      web_app: { url: webAppUrl },
                    },
                  ],
                ],
              },
            }
          );
        }

        return ctx.reply(
          lang === "es"
            ? "ðŸ'¡ *Mini App Disponible!*\\n\\nðŸŒ PruÃ©bala en tu navegador:\\n\`http://localhost:3000/demo.html\`\\n\\nðŸ"± Para usarla en Telegram, el administrador necesita configurar HTTPS"
            : "ðŸ'¡ *Mini App Available!*\\n\\nðŸŒ Try it in your browser:\\n\`http://localhost:3000/demo.html\`\\n\\nðŸ"± To use in Telegram, admin needs to setup HTTPS",
          { parse_mode: "Markdown" }
        );`;

// Remove the Mini App section
startContent = startContent.replace(miniAppSection, '');

fs.writeFileSync(startHandlerPath, startContent, 'utf8');
console.log('✓ Updated channel URL in start.js');
console.log('✓ Removed Mini App message from start.js');

console.log('\n✅ Changes applied successfully!');
console.log('Channel URL: https://t.me/PNPtv');
console.log('Mini App message removed');
