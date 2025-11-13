#!/usr/bin/env node

/**
 * Comprehensive Test Script for User Facing Commands
 * Validates all 16 active user commands are registered
 * Run: node verify-user-commands.js
 */

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

// User facing commands
const USER_COMMANDS = [
  { cmd: 'start', desc: 'Begin onboarding & setup profile', priority: 'high' },
  { cmd: 'help', desc: 'Show help menu with available features', priority: 'high' },
  { cmd: 'profile', desc: 'View & edit your profile', priority: 'high' },
  { cmd: 'menu', desc: 'Show main menu with quick actions', priority: 'high' },
  { cmd: 'subscribe', desc: 'Browse & purchase subscription plans', priority: 'high' },
  { cmd: 'nearby', desc: 'Find members near location (Premium only)', priority: 'medium' },
  { cmd: 'aichat', desc: 'Start AI chat conversation', priority: 'high' },
  { cmd: 'endchat', desc: 'End current AI chat session', priority: 'medium' },
  { cmd: 'toptracks', desc: 'View top played tracks in group', priority: 'medium' },
  { cmd: 'zoomroom', desc: 'Schedule a group video call', priority: 'high' },
  { cmd: 'upcoming', desc: 'View upcoming events & calls', priority: 'medium' },
  { cmd: 'settimezone', desc: 'Set your timezone for events', priority: 'medium' },
  { cmd: 'rules', desc: 'View community rules & guidelines', priority: 'high' },
  { cmd: 'library', desc: 'Access music library', priority: 'high' },
  { cmd: 'optout', desc: 'Stop receiving broadcast messages', priority: 'medium' },
  { cmd: 'optin', desc: 'Resume receiving broadcast messages', priority: 'medium' },
];

async function verifyCommandsInCode() {
  log.header('📝 Verifying Commands in Bot Code');

  const botIndexPath = path.join(__dirname, 'src', 'bot', 'index.js');
  
  if (!fs.existsSync(botIndexPath)) {
    log.error(`Bot file not found: ${botIndexPath}`);
    return { found: 0, missing: USER_COMMANDS.length, commands: [] };
  }

  const botCode = fs.readFileSync(botIndexPath, 'utf8');
  const results = [];
  let found = 0;
  let missing = 0;

  for (const { cmd, desc, priority } of USER_COMMANDS) {
    // Check if command is registered (not commented)
    const activeRegex = new RegExp(`bot\\.command\\("${cmd}"`, 'g');
    const isActive = activeRegex.test(botCode) && !botCode.includes(`// bot.command("${cmd}"`);

    if (isActive) {
      log.success(`/${cmd.padEnd(15)} registered`);
      found++;
      results.push({ cmd, status: 'active', priority });
    } else {
      log.error(`/${cmd.padEnd(15)} NOT FOUND or commented out`);
      missing++;
      results.push({ cmd, status: 'missing', priority });
    }
  }

  return { found, missing, commands: results };
}

async function verifyCommandsFile() {
  log.header('📋 Verifying COMMANDS_ACTIVE.txt');

  const commandsFile = path.join(__dirname, 'COMMANDS_ACTIVE.txt');
  
  if (!fs.existsSync(commandsFile)) {
    log.warn('COMMANDS_ACTIVE.txt not found');
    return { found: 0, missing: USER_COMMANDS.length };
  }

  const fileContent = fs.readFileSync(commandsFile, 'utf8');
  let found = 0;
  let missing = 0;

  for (const { cmd } of USER_COMMANDS) {
    if (fileContent.includes(`/${cmd}`)) {
      found++;
    } else {
      missing++;
      log.warn(`/${cmd} not in COMMANDS_ACTIVE.txt`);
    }
  }

  return { found, missing };
}

async function checkLegacyAlias() {
  log.header('🔄 Checking Legacy Alias');

  const botIndexPath = path.join(__dirname, 'src', 'bot', 'index.js');
  const botCode = fs.readFileSync(botIndexPath, 'utf8');

  if (botCode.includes('bot.command("schedulecall"') && botCode.includes('// Legacy alias')) {
    log.success('Legacy alias /schedulecall preserved');
    return true;
  } else {
    log.warn('Legacy alias /schedulecall may not be properly configured');
    return false;
  }
}

async function testCommandStaticAnalysis() {
  log.header('🔍 Static Code Analysis');

  const botIndexPath = path.join(__dirname, 'src', 'bot', 'index.js');
  const botCode = fs.readFileSync(botIndexPath, 'utf8');

  // Count total active commands (not commented)
  const commandMatches = botCode.match(/^bot\.command\("([^"]+)"/gm) || [];
  const activeCommands = commandMatches.filter(m => !m.startsWith('//')).length;

  log.info(`Total registered commands: ${commandMatches.length}`);
  log.info(`Active commands: ${activeCommands}`);

  // Check for syntax errors in command definitions
  const botStart = botCode.includes('bot.start(');
  const botAction = botCode.includes('bot.action(');
  
  if (botStart) log.success('bot.start() found');
  if (botAction) log.success('bot.action() found');

  return { commandMatches: commandMatches.length, activeCommands };
}

async function generateReport(codeVerif, fileVerif, alias, analysis) {
  log.header('📊 Test Report');

  console.log('\n' + '='.repeat(70));
  console.log('   PNPtv Bot - User Commands Verification Report');
  console.log('='.repeat(70));

  console.log(`\n📝 Code Verification:`);
  console.log(`   Commands Found: ${codeVerif.found}/${USER_COMMANDS.length}`);
  console.log(`   Commands Missing: ${codeVerif.missing}/${USER_COMMANDS.length}`);
  console.log(`   Status: ${codeVerif.found === USER_COMMANDS.length ? '✅ ALL FOUND' : '⚠️ SOME MISSING'}`);

  console.log(`\n📋 File Verification:`);
  console.log(`   In COMMANDS_ACTIVE.txt: ${fileVerif.found}/${USER_COMMANDS.length}`);
  console.log(`   Missing from file: ${fileVerif.missing}/${USER_COMMANDS.length}`);
  console.log(`   Status: ${fileVerif.found === USER_COMMANDS.length ? '✅ ALL DOCUMENTED' : '⚠️ NEEDS UPDATE'}`);

  console.log(`\n🔄 Legacy Compatibility:`);
  console.log(`   /schedulecall alias: ${alias ? '✅ PRESENT' : '⚠️ MISSING'}`);

  console.log(`\n🔍 Static Analysis:`);
  console.log(`   Total Registered: ${analysis.commandMatches}`);
  console.log(`   Active Commands: ${analysis.activeCommands}`);

  // Success criteria
  console.log('\n' + '='.repeat(70));
  const success = codeVerif.found === USER_COMMANDS.length && 
                 fileVerif.found === USER_COMMANDS.length && 
                 alias;

  if (success) {
    console.log(`${colors.green}✅ ALL TESTS PASSED${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ SOME ISSUES FOUND${colors.reset}`);
  }
  console.log('='.repeat(70) + '\n');

  return success;
}

async function runFullTest() {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 PNPtv Bot - User Commands Verification');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  try {
    const codeVerif = await verifyCommandsInCode();
    const fileVerif = await verifyCommandsFile();
    const alias = await checkLegacyAlias();
    const analysis = await testCommandStaticAnalysis();

    const success = await generateReport(codeVerif, fileVerif, alias, analysis);

    process.exit(success ? 0 : 1);
  } catch (error) {
    log.error(`Test execution failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run verification
runFullTest();
