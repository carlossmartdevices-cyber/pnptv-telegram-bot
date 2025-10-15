/**
 * Test Telegram API Connection
 * This script tests if Node.js can connect to Telegram's API
 */

const https = require('https');
const dns = require('dns');

console.log('🔍 Testing Telegram API connection...\n');

// Test 1: DNS Resolution
console.log('1️⃣ Testing DNS resolution...');
dns.resolve4('api.telegram.org', (err, addresses) => {
  if (err) {
    console.error('❌ DNS Resolution failed:', err.message);
  } else {
    console.log('✅ DNS Resolution successful:', addresses);
  }
});

// Test 2: HTTPS Connection
console.log('\n2️⃣ Testing HTTPS connection...');
const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = https.request(options, (res) => {
  console.log('✅ Connection successful!');
  console.log('   Status Code:', res.statusCode);
  console.log('   Headers:', JSON.stringify(res.headers, null, 2));
});

req.on('error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.error('   Error code:', error.code);

  if (error.code === 'ENOTFOUND') {
    console.log('\n💡 Possible solutions:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify firewall settings');
    console.log('   3. Try using a VPN');
    console.log('   4. Check if Telegram is blocked in your region');
    console.log('   5. Try setting DNS to 8.8.8.8 (Google DNS)');
  }
});

req.on('timeout', () => {
  console.error('❌ Connection timeout');
  req.destroy();
});

req.end();

// Test 3: Telegraf Connection
console.log('\n3️⃣ Testing Telegraf library...');
const { Telegraf } = require('telegraf');

const token = process.env.TELEGRAM_TOKEN || '8499797477:AAENAxfDXTwoKw2aaDOjA--ANmCOtP2haFQ';
const bot = new Telegraf(token);

bot.telegram.getMe()
  .then((botInfo) => {
    console.log('✅ Telegraf connection successful!');
    console.log('   Bot name:', botInfo.first_name);
    console.log('   Bot username:', botInfo.username);
    console.log('   Bot ID:', botInfo.id);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Telegraf connection failed:', error.message);
    console.error('   Full error:', error);
    process.exit(1);
  });

setTimeout(() => {
  console.log('\n⏱️ Test timeout - exiting...');
  process.exit(1);
}, 10000);
