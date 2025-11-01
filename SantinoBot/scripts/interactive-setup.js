#!/usr/bin/env node
/**
 * Interactive Setup Helper
 * Makes it easy to configure the bot
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   🤖 Santino Group Bot - Interactive Setup      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const envPath = path.join(__dirname, '..', '.env');
  
  // Check if .env exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('\n✅ Keeping existing .env file. Run "npm run check-config" to validate.\n');
      rl.close();
      return;
    }
  }

  console.log('\n📝 Please provide the following information:\n');
  console.log('💡 TIP: Press Enter to skip optional fields\n');

  // Required fields
  const botToken = await question('1️⃣  Bot Token (from @BotFather): ');
  const projectId = await question('2️⃣  Firebase Project ID: ');
  const clientEmail = await question('3️⃣  Firebase Client Email: ');
  
  console.log('\n4️⃣  Firebase Private Key:');
  console.log('   (Paste the entire key including BEGIN/END lines, then press Enter twice)\n');
  
  let privateKey = '';
  let emptyLineCount = 0;
  
  while (emptyLineCount < 2) {
    const line = await question('');
    if (line === '') {
      emptyLineCount++;
    } else {
      emptyLineCount = 0;
      privateKey += line + '\\n';
    }
  }

  // Optional fields
  console.log('\n📌 Optional Configuration:\n');
  const groupId = await question('5️⃣  Group ID (optional, -100...): ');
  const channelId = await question('6️⃣  Free Channel ID (optional): ');
  const logLevel = await question('7️⃣  Log Level (default: info): ') || 'info';

  // Build .env content
  const envContent = `# Santino Group Bot Configuration
# Generated: ${new Date().toISOString()}

# Telegram Bot Token
BOT_TOKEN=${botToken}

# Firebase Configuration
FIREBASE_PROJECT_ID=${projectId}
FIREBASE_CLIENT_EMAIL=${clientEmail}
FIREBASE_PRIVATE_KEY="${privateKey.trim()}"

# Group Configuration
${groupId ? `GROUP_ID=${groupId}` : '# GROUP_ID=-1001234567890'}
${channelId ? `FREE_CHANNEL_ID=${channelId}` : '# FREE_CHANNEL_ID=-1001234567891'}

# Logging
LOG_LEVEL=${logLevel}

# Production (optional)
# NODE_ENV=production
# WEBHOOK_URL=https://your-domain.com
# PORT=3000
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║          ✅ Configuration Saved!                 ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log('📁 File created: .env\n');
  console.log('🔍 Next steps:\n');
  console.log('   1. Verify config: npm run check-config');
  console.log('   2. Start the bot: npm start\n');
  console.log('📚 Need help? See GETTING_STARTED.md\n');

  rl.close();
}

main().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});
