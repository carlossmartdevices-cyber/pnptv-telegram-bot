#!/usr/bin/env node

/**
 * PNPtv WebApp Setup Script
 * Sets up the Next.js webapp for the PNPtv Bot
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 PNPtv WebApp Setup');
console.log('=====================\n');

const webappDir = path.join(__dirname, 'src', 'webapp');

try {
  // Check if webapp directory exists
  if (!fs.existsSync(webappDir)) {
    console.log('❌ Webapp directory not found at:', webappDir);
    process.exit(1);
  }
  
  console.log('📁 Webapp directory found');
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(webappDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing webapp dependencies...');
    execSync('npm install', { 
      cwd: webappDir, 
      stdio: 'inherit' 
    });
    console.log('✅ Dependencies installed');
  } else {
    console.log('✅ Dependencies already installed');
  }
  
  // Check for required files
  const requiredFiles = [
    'package.json',
    'next.config.js',
    'tailwind.config.ts',
    'tsconfig.json',
    'app/layout.tsx',
    'app/page.tsx',
    'app/globals.css'
  ];
  
  console.log('\n📋 Checking required files:');
  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    const filePath = path.join(webappDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - MISSING`);
      allFilesExist = false;
    }
  });
  
  if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Please check the webapp setup.');
    process.exit(1);
  }
  
  // Test build
  console.log('\n🏗️  Testing webapp build...');
  try {
    execSync('npm run build', { 
      cwd: webappDir, 
      stdio: 'pipe' 
    });
    console.log('✅ Build successful');
  } catch (error) {
    console.log('⚠️  Build had issues, but continuing...');
  }
  
  console.log('\n🎉 WebApp Setup Complete!');
  console.log('========================');
  console.log('');
  console.log('📱 Development Commands:');
  console.log('  npm run dev:webapp     - Start development server');
  console.log('  npm run build:webapp   - Build for production');
  console.log('  npm run start:webapp   - Start production server');
  console.log('');
  console.log('🌐 URLs:');
  console.log('  Development: http://localhost:3001');
  console.log('  Production:  https://pnptv.app/app');
  console.log('');
  console.log('📚 Documentation:');
  console.log('  See src/webapp/README.md for detailed information');
  console.log('');
  console.log('🔧 Integration:');
  console.log('  The webapp is automatically integrated with the bot server');
  console.log('  Access through Telegram: @PNPtvBot -> /app command');
  
} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
}