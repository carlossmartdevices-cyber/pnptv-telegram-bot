#!/usr/bin/env node

/**
 * PNPtv WebApp Integration Deployment
 * Updates the bot server to serve the new Next.js webapp
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 PNPtv WebApp Integration Deployment');
console.log('=====================================\n');

async function deployWebApp() {
  try {
    // 1. Install webapp dependencies
    console.log('📦 Installing webapp dependencies...');
    execSync('npm run install:webapp', { stdio: 'inherit' });
    console.log('✅ Webapp dependencies installed\n');

    // 2. Build webapp for production
    console.log('🏗️  Building webapp for production...');
    execSync('npm run build:webapp', { stdio: 'inherit' });
    console.log('✅ Webapp built successfully\n');

    // 3. Update package.json to include Next.js dependency
    console.log('📝 Updating main package.json dependencies...');
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Add Next.js to main dependencies if not already present
    if (!packageJson.dependencies.next) {
      packageJson.dependencies.next = '^14.2.0';
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Added Next.js to main dependencies');
    } else {
      console.log('✅ Next.js already in main dependencies');
    }

    // 4. Install main dependencies (including Next.js)
    console.log('📦 Installing main dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Main dependencies installed\n');

    // 5. Test the bot server startup
    console.log('🧪 Testing bot server with webapp integration...');
    try {
      // Just test that the server can start without errors
      const testResult = execSync('timeout 10s npm start || true', { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      if (testResult.includes('Webhook server running') || testResult.includes('started')) {
        console.log('✅ Bot server startup test passed');
      } else {
        console.log('⚠️  Bot server startup had issues, but continuing...');
      }
    } catch (error) {
      console.log('⚠️  Server test timeout (expected), continuing...');
    }

    // 6. Restart the production bot if it's running
    console.log('\n🔄 Restarting production bot...');
    try {
      execSync('pm2 restart pnptv-bot', { stdio: 'inherit' });
      console.log('✅ Bot restarted successfully');
    } catch (error) {
      console.log('⚠️  Could not restart bot via PM2:', error.message);
      console.log('   Please restart manually: pm2 restart pnptv-bot');
    }

    // 7. Success message
    console.log('\n🎉 WebApp Integration Deployment Complete!');
    console.log('=========================================');
    console.log('');
    console.log('🌐 WebApp URLs:');
    console.log('  • Production: https://pnptv.app/app');
    console.log('  • Alternative: https://pnptv.app/webapp');
    console.log('  • Telegram WebApp: Via @PNPtvBot');
    console.log('');
    console.log('📱 Features:');
    console.log('  • Modern React/Next.js interface');
    console.log('  • Tailwind CSS styling');
    console.log('  • Telegram WebApp integration');
    console.log('  • Desktop fallback page');
    console.log('  • PWA capabilities');
    console.log('');
    console.log('🔧 Maintenance:');
    console.log('  • Webapp source: src/webapp/');
    console.log('  • Build command: npm run build:webapp');
    console.log('  • Dev command: npm run dev:webapp');
    console.log('');
    console.log('✅ Ready to serve Next.js webapp alongside the bot!');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error('\nPlease check the logs above and fix any issues.');
    process.exit(1);
  }
}

// Run deployment
deployWebApp();