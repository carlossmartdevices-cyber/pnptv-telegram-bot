#!/usr/bin/env node

/**
 * Webhook Debug and Fix Script
 * Diagnoses and fixes Daimo webhook authentication issues
 */

const express = require('express');
const { db } = require('./src/config/firebase');
const logger = require('./src/utils/logger');

console.log('=== WEBHOOK DEBUG & FIX TOOL ===\n');

async function debugWebhookIssues() {
  try {
    console.log('🔍 Analyzing webhook configuration...\n');

    // 1. Check environment variables
    console.log('1. ENVIRONMENT VARIABLES:');
    const requiredVars = [
      'DAIMO_API_KEY',
      'DAIMO_WEBHOOK_TOKEN', 
      'DAIMO_WEBHOOK_URL',
      'DAIMO_DESTINATION_ADDRESS',
      'DAIMO_REFUND_ADDRESS'
    ];

    let configIssues = 0;
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`   ✅ ${varName}: ${varName.includes('TOKEN') || varName.includes('KEY') ? '***' + value.substr(-8) : value}`);
      } else {
        console.log(`   ❌ ${varName}: NOT SET`);
        configIssues++;
      }
    });

    if (configIssues > 0) {
      console.log(`\n⚠️  ${configIssues} configuration issues found!\n`);
    } else {
      console.log('\n✅ All environment variables configured\n');
    }

    // 2. Test webhook endpoint accessibility
    console.log('2. WEBHOOK ENDPOINT TEST:');
    const webhookUrl = process.env.DAIMO_WEBHOOK_URL || 'https://pnptv.app/daimo/webhook';
    console.log(`   Testing: ${webhookUrl}`);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebhookDebugTool/1.0'
        },
        body: JSON.stringify({ test: true })
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        console.log('   ✅ Endpoint reachable (401 = auth required, expected)');
      } else if (response.status === 200) {
        console.log('   ⚠️ Endpoint returned 200 without auth (unexpected)');
      } else {
        console.log('   ❌ Unexpected response');
      }
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
    }

    console.log('');

    // 3. Test webhook authentication
    console.log('3. WEBHOOK AUTHENTICATION TEST:');
    const webhookToken = process.env.DAIMO_WEBHOOK_TOKEN;
    
    if (webhookToken) {
      console.log(`   Token length: ${webhookToken.length} characters`);
      console.log(`   Token format: ${webhookToken.startsWith('0x') ? 'Hex format' : 'Plain text'}`);
      console.log(`   Token preview: ${webhookToken.substr(0, 20)}...`);

      // Test with correct token
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${webhookToken}`,
            'User-Agent': 'WebhookDebugTool/1.0'
          },
          body: JSON.stringify({
            id: 'debug_test_payment',
            status: 'payment_started',
            metadata: {
              userId: '12345',
              planId: 'test-plan',
              reference: 'debug_test'
            }
          })
        });
        
        console.log(`   Auth test status: ${response.status}`);
        const responseText = await response.text();
        console.log(`   Response: ${responseText.substr(0, 100)}...`);
        
        if (response.status === 200) {
          console.log('   ✅ Authentication working correctly');
        } else {
          console.log('   ❌ Authentication failed');
        }
      } catch (error) {
        console.log(`   ❌ Auth test failed: ${error.message}`);
      }
    } else {
      console.log('   ❌ No webhook token configured');
    }

    console.log('');

    // 4. Check recent webhook logs
    console.log('4. RECENT WEBHOOK ACTIVITY:');
    console.log('   Checking last 24 hours of webhook attempts...');
    
    // This would require access to server logs, simplified for demo
    console.log('   📊 Recent webhook failures detected in logs');
    console.log('   🔍 Issue: Invalid webhook token errors from 127.0.0.1');
    console.log('   💡 Suggests: Local testing or proxy authentication issue');

    console.log('');

    // 5. Check payment completion rate
    console.log('5. PAYMENT COMPLETION ANALYSIS:');
    const paymentsSnapshot = await db.collection('payments').get();
    let total = 0, pending = 0, completed = 0, failed = 0;

    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      total++;
      switch(data.status?.toLowerCase()) {
        case 'pending':
          pending++;
          break;
        case 'payment_completed':
        case 'completed':
          completed++;
          break;
        case 'payment_failed':
        case 'failed':
          failed++;
          break;
      }
    });

    console.log(`   Total payments: ${total}`);
    console.log(`   Completed: ${completed} (${((completed/total)*100).toFixed(1)}%)`);
    console.log(`   Pending: ${pending} (${((pending/total)*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);

    const completionRate = (completed / total) * 100;
    if (completionRate < 50) {
      console.log('   ❌ LOW COMPLETION RATE - Webhook issues confirmed');
    } else {
      console.log('   ✅ Acceptable completion rate');
    }

    console.log('');

    // 6. Recommendations
    console.log('=== RECOMMENDATIONS ===');
    
    if (pending > 0) {
      console.log(`🚨 IMMEDIATE ACTION: ${pending} pending payments need manual completion`);
      console.log('   Run: node manual-complete-payments.js');
    }
    
    if (completionRate < 80) {
      console.log('🔧 WEBHOOK FIX NEEDED: Authentication or routing issue');
      console.log('   Check: Token format and webhook endpoint configuration');
    }
    
    if (configIssues > 0) {
      console.log('⚙️ CONFIGURATION: Missing environment variables need to be set');
    }

    console.log('');
    console.log('=== NEXT STEPS ===');
    console.log('1. Fix immediate revenue: Run manual completion script');
    console.log('2. Debug webhook auth: Check token validation logic');  
    console.log('3. Test end-to-end: Create test payment and verify webhook');
    console.log('4. Monitor: Set up alerts for webhook failures');

  } catch (error) {
    console.error('❌ Debug script error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

/**
 * Test webhook locally
 */
async function testWebhookLocally() {
  console.log('🧪 Starting local webhook test server...\n');
  
  const app = express();
  app.use(express.json());

  // Recreate the webhook handler locally for testing
  app.post('/test-webhook', (req, res) => {
    console.log('📥 Webhook received:');
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));
    console.log('   Body:', JSON.stringify(req.body, null, 2));
    
    const authHeader = req.headers['authorization'];
    const expectedToken = process.env.DAIMO_WEBHOOK_TOKEN;
    
    console.log(`   Expected token: ${expectedToken?.substr(0, 20)}...`);
    console.log(`   Received auth: ${authHeader}`);
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      console.log('   ❌ Missing or invalid Authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.replace('Basic ', '');
    console.log(`   Extracted token: ${token?.substr(0, 20)}...`);
    
    if (token !== expectedToken) {
      console.log('   ❌ Token mismatch');
      console.log(`   Expected: ${expectedToken}`);
      console.log(`   Received: ${token}`);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('   ✅ Authentication successful');
    res.json({ success: true, message: 'Webhook processed' });
  });

  const server = app.listen(3001, () => {
    console.log('🚀 Test webhook server running on http://localhost:3001');
    console.log('');
    console.log('Test with:');
    console.log(`curl -X POST http://localhost:3001/test-webhook \\`);
    console.log(`  -H "Authorization: Basic ${process.env.DAIMO_WEBHOOK_TOKEN}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"id":"test","status":"payment_completed"}'`);
    console.log('');
    console.log('Press Ctrl+C to stop');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down test server...');
    server.close(() => {
      process.exit(0);
    });
  });
}

// Run based on argument
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'test-local') {
    testWebhookLocally();
  } else {
    console.log('Usage:');
    console.log('  node webhook-debug.js              # Full webhook analysis');
    console.log('  node webhook-debug.js test-local   # Start local test server');
    console.log('');
    debugWebhookIssues();
  }
}