#!/usr/bin/env node
/**
 * Firebase Credentials Preparation Script for Railway
 * Prepares Firebase credentials in the correct format for Railway deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Credentials Preparation Tool\n');

// Get credentials file path from command line
const credentialsPath = process.argv[2] || './firebase-credentials.json';

// Check if file exists
if (!fs.existsSync(credentialsPath)) {
  console.error(`❌ File not found: ${credentialsPath}\n`);
  console.log('Usage:');
  console.log('  node prepare-firebase-env.js <path-to-credentials.json>\n');
  console.log('Example:');
  console.log('  node prepare-firebase-env.js ./firebase-credentials.json');
  console.log('  node prepare-firebase-env.js ./src/config/firebase_credentials.json\n');
  process.exit(1);
}

try {
  // Read and parse credentials
  console.log(`📖 Reading: ${credentialsPath}\n`);
  const credentials = JSON.parse(fs.readFileSync(path.resolve(credentialsPath), 'utf8'));

  // Validate required fields
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(field => !credentials[field]);

  if (missingFields.length > 0) {
    console.error(`❌ Invalid credentials file. Missing required fields:\n`);
    missingFields.forEach(field => console.error(`   - ${field}`));
    console.log('\nExpected JSON structure:');
    console.log(JSON.stringify({
      type: "service_account",
      project_id: "your-project-id",
      private_key: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
      client_email: "your-email@project.iam.gserviceaccount.com",
      // ... other fields
    }, null, 2));
    process.exit(1);
  }

  // Verify private_key format
  if (!credentials.private_key.includes('BEGIN PRIVATE KEY') ||
      !credentials.private_key.includes('END PRIVATE KEY')) {
    console.error('❌ Invalid private_key format');
    console.error('   Must include "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----"\n');
    process.exit(1);
  }

  console.log('✅ Credentials file is valid\n');
  console.log(`   Project ID: ${credentials.project_id}`);
  console.log(`   Client Email: ${credentials.client_email}`);
  console.log(`   Type: ${credentials.type}\n`);

  // Minify JSON (single line, no whitespace)
  const minified = JSON.stringify(credentials);

  // Base64 encode as alternative
  const base64 = Buffer.from(minified).toString('base64');

  // Calculate sizes
  const minifiedSize = minified.length;
  const base64Size = base64.length;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 METHOD 1: Minified JSON (RECOMMENDED)\n');
  console.log(`Size: ${minifiedSize} characters\n`);
  console.log('Copy this value to Railway (entire line):\n');
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log(minified);
  console.log('─────────────────────────────────────────────────────────────────────\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 METHOD 2: Base64 Encoded (Alternative)\n');
  console.log(`Size: ${base64Size} characters\n`);
  console.log('Copy this value to Railway:\n');
  console.log('─────────────────────────────────────────────────────────────────────');
  console.log(base64);
  console.log('─────────────────────────────────────────────────────────────────────\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🚀 Railway CLI Commands:\n');
  console.log('Option A: Set variable directly (if not too long)');
  console.log(`railway variables set FIREBASE_CREDENTIALS='${minified.substring(0, 80)}...'`);
  console.log('\nOption B: Set from Railway dashboard (RECOMMENDED for long values)');
  console.log('  1. railway open');
  console.log('  2. Go to: Settings → Variables');
  console.log('  3. Click: + New Variable');
  console.log('  4. Name: FIREBASE_CREDENTIALS');
  console.log('  5. Value: Paste the minified JSON above');
  console.log('  6. Click: Add\n');

  console.log('Option C: Set from file (alternative)');
  console.log(`  echo 'FIREBASE_CREDENTIALS=${minified.substring(0, 50)}...' > railway.env`);
  console.log('  railway variables set --from-file railway.env\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 Other Required Variables:\n');
  console.log(`railway variables set FIREBASE_PROJECT_ID="${credentials.project_id}"`);
  console.log('railway variables set TELEGRAM_BOT_TOKEN="your_bot_token_here"');
  console.log('railway variables set NODE_ENV="production"');
  console.log('railway variables set ADMIN_IDS="your_telegram_user_id"\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ Verification Steps:\n');
  console.log('1. Set variables in Railway:');
  console.log('   railway variables set FIREBASE_CREDENTIALS=\'<paste_minified_json>\'');
  console.log('');
  console.log('2. Verify it was saved:');
  console.log('   railway variables get FIREBASE_CREDENTIALS');
  console.log('   # Should show first ~100 chars');
  console.log('');
  console.log('3. Deploy:');
  console.log('   railway up');
  console.log('');
  console.log('4. Check logs:');
  console.log('   railway logs');
  console.log('');
  console.log('5. Look for these success messages:');
  console.log('   ✅ Using Firebase credentials from environment variable');
  console.log('   ✅ Firebase ha sido inicializado correctamente.');
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💾 Output files created:\n');

  // Save minified version to file
  const minifiedFile = 'firebase-credentials-minified.txt';
  fs.writeFileSync(minifiedFile, minified);
  console.log(`   ✅ ${minifiedFile} (${minifiedSize} chars)`);

  // Save base64 version to file
  const base64File = 'firebase-credentials-base64.txt';
  fs.writeFileSync(base64File, base64);
  console.log(`   ✅ ${base64File} (${base64Size} chars)`);

  // Save railway commands to file
  const commandsFile = 'railway-firebase-commands.sh';
  const commands = `#!/bin/bash
# Railway Firebase Configuration Commands
# Generated: ${new Date().toISOString()}

echo "Setting Firebase variables in Railway..."

# Method 1: Set FIREBASE_CREDENTIALS from minified file
railway variables set FIREBASE_CREDENTIALS="$(cat firebase-credentials-minified.txt)"

# Method 2: Or set from base64 file (alternative)
# railway variables set FIREBASE_CREDENTIALS="$(cat firebase-credentials-base64.txt)"

# Set other required variables
railway variables set FIREBASE_PROJECT_ID="${credentials.project_id}"
railway variables set TELEGRAM_BOT_TOKEN="your_bot_token_here"
railway variables set NODE_ENV="production"
railway variables set ADMIN_IDS="your_telegram_user_id"

echo "Done! Verify with: railway variables"
echo "Deploy with: railway up"
`;
  fs.writeFileSync(commandsFile, commands);
  fs.chmodSync(commandsFile, '755');
  console.log(`   ✅ ${commandsFile} (executable script)`);
  console.log('\n   Run the script: ./' + commandsFile);
  console.log('   Or manually copy values from .txt files\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Preparation complete!\n');
  console.log('Next steps:');
  console.log('  1. Copy the minified JSON to Railway dashboard');
  console.log('  2. Or run: ./railway-firebase-commands.sh');
  console.log('  3. Deploy: railway up');
  console.log('  4. Verify: railway logs\n');

} catch (error) {
  console.error('\n❌ Error processing credentials file:\n');
  console.error(`   ${error.message}\n`);

  if (error instanceof SyntaxError) {
    console.log('The file is not valid JSON. Please verify:');
    console.log('  - File is a valid JSON file from Firebase Console');
    console.log('  - No syntax errors in the JSON');
    console.log('  - File is not corrupted\n');
    console.log('Get credentials from:');
    console.log('  Firebase Console → Project Settings → Service Accounts');
    console.log('  → Generate New Private Key\n');
  }

  process.exit(1);
}
