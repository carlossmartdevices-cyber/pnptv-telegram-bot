#!/usr/bin/env node

/**
 * Webhook Debug & Health Check
 * Tests webhook connectivity, authentication, and processes failed webhook events
 */

const { db } = require('./src/config/firebase');
const axios = require('axios');
const crypto = require('crypto');

console.log('=== WEBHOOK DEBUG & HEALTH CHECK ===\n');

async function checkWebhookHealth() {
  try {
    console.log('🔍 Checking webhook configuration and connectivity...\n');

    // 1. Check environment variables
    const webhookConfig = {
      DAIMO_WEBHOOK_TOKEN: process.env.DAIMO_WEBHOOK_TOKEN ? '***' + process.env.DAIMO_WEBHOOK_TOKEN.slice(-8) : null,
      DAIMO_WEBHOOK_URL: process.env.DAIMO_WEBHOOK_URL,
      BOT_URL: process.env.BOT_URL,
      webhookEndpoint: process.env.BOT_URL ? `${process.env.BOT_URL}/daimo/webhook` : null
    };

    console.log('📋 Webhook Configuration:');
    Object.entries(webhookConfig).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${value || 'NOT SET'}`);
    });

    // 2. Test webhook endpoint connectivity
    if (webhookConfig.webhookEndpoint) {
      console.log('\n🌐 Testing webhook endpoint connectivity...');
      
      try {
        const response = await axios.get(webhookConfig.webhookEndpoint, {
          timeout: 10000,
          validateStatus: () => true // Accept any status code
        });
        
        console.log(`   📡 Response Status: ${response.status}`);
        console.log(`   📝 Response Headers: ${JSON.stringify(response.headers, null, 2)}`);
        
        if (response.status === 405) {
          console.log('   ✅ Webhook endpoint exists (405 Method Not Allowed for GET is expected)');
        } else if (response.status === 200) {
          console.log('   ✅ Webhook endpoint accessible');
        } else {
          console.log(`   ⚠️  Unexpected status: ${response.status}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Webhook endpoint error: ${error.message}`);
        if (error.code === 'ECONNREFUSED') {
          console.log('   🔧 Server may be down or webhook endpoint not configured');
        }
      }
    }

    // 3. Check recent webhook logs (if available in database)
    console.log('\n📋 Checking recent webhook activity...');
    
    try {
      // Check if there's a webhook_logs collection
      const webhookLogsSnapshot = await db.collection('webhook_logs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      if (!webhookLogsSnapshot.empty) {
        console.log(`   📊 Found ${webhookLogsSnapshot.size} recent webhook logs:`);
        webhookLogsSnapshot.forEach((doc, index) => {
          const data = doc.data();
          console.log(`   ${index + 1}. ${data.timestamp?.toDate?.()} - ${data.status} - ${data.event}`);
        });
      } else {
        console.log('   ⚠️  No webhook logs found in database');
      }
    } catch (error) {
      console.log('   ⚠️  Could not access webhook logs:', error.message);
    }

    // 4. Test webhook authentication
    console.log('\n🔐 Testing webhook authentication...');
    
    if (webhookConfig.DAIMO_WEBHOOK_TOKEN && webhookConfig.webhookEndpoint) {
      try {
        // Simulate a webhook call with proper authentication
        const testPayload = {
          id: 'test_webhook_health_check',
          status: 'payment_completed',
          metadata: { test: true },
          timestamp: new Date().toISOString()
        };

        const authHeader = `Bearer ${process.env.DAIMO_WEBHOOK_TOKEN}`;
        
        const response = await axios.post(webhookConfig.webhookEndpoint, testPayload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'User-Agent': 'Daimo-Webhook-Test/1.0'
          },
          timeout: 10000,
          validateStatus: () => true
        });

        console.log(`   📡 Test webhook response: ${response.status}`);
        
        if (response.status === 200) {
          console.log('   ✅ Webhook authentication working');
        } else if (response.status === 401 || response.status === 403) {
          console.log('   ❌ Webhook authentication failed');
          console.log(`   🔧 Response: ${response.data}`);
        } else {
          console.log(`   ⚠️  Unexpected response: ${response.status} - ${response.statusText}`);
        }

      } catch (error) {
        console.log(`   ❌ Webhook test failed: ${error.message}`);
      }
    }

    // 5. Check for stuck/failed webhooks in payment_intents
    console.log('\n🔍 Checking for payment intents that may need webhook retry...');
    
    const oldUnpaidSnapshot = await db.collection('payment_intents')
      .where('status', '==', 'payment_unpaid')
      .where('createdAt', '<', new Date(Date.now() - 30 * 60 * 1000)) // Older than 30 minutes
      .get();

    if (!oldUnpaidSnapshot.empty) {
      console.log(`   ⚠️  Found ${oldUnpaidSnapshot.size} old unpaid payment intents (>30min old)`);
      console.log('   💡 These may have been paid but webhook processing failed');
      
      oldUnpaidSnapshot.forEach(doc => {
        const data = doc.data();
        const age = Math.round((Date.now() - data.createdAt.toDate().getTime()) / (1000 * 60));
        console.log(`   • ${doc.id.substring(0, 8)}... - $${data.amount} - ${age}min old - User: ${data.userId}`);
      });
    } else {
      console.log('   ✅ No old unpaid payment intents found');
    }

    return {
      webhookConfig,
      healthStatus: 'checked',
      oldUnpaidCount: oldUnpaidSnapshot.size
    };

  } catch (error) {
    console.error('❌ Error in webhook health check:', error);
    throw error;
  }
}

// Manual webhook retry for specific payment intent
async function retryWebhookForIntent(intentId) {
  try {
    console.log(`🔄 Attempting manual webhook retry for intent: ${intentId}`);
    
    const intentDoc = await db.collection('payment_intents').doc(intentId).get();
    if (!intentDoc.exists) {
      throw new Error(`Payment intent ${intentId} not found`);
    }

    const intentData = intentDoc.data();
    
    // Check Daimo API for current status
    const daimoService = require('./src/services/daimoPayService');
    
    try {
      const daimoStatus = await daimoService.getPaymentStatus(intentId);
      console.log(`   📡 Daimo API status: ${JSON.stringify(daimoStatus, null, 2)}`);
      
      if (daimoStatus.status !== intentData.status) {
        console.log(`   🔄 Status mismatch! Local: ${intentData.status}, Daimo: ${daimoStatus.status}`);
        
        // Update local status to match Daimo
        await db.collection('payment_intents').doc(intentId).update({
          status: daimoStatus.status,
          updatedAt: new Date(),
          syncedFromDaimo: true
        });
        
        console.log(`   ✅ Updated local status to: ${daimoStatus.status}`);
      }
      
    } catch (daimoError) {
      console.log(`   ⚠️  Could not fetch Daimo status: ${daimoError.message}`);
    }

  } catch (error) {
    console.error(`❌ Error retrying webhook for ${intentId}:`, error);
  }
}

// Export functions
module.exports = { checkWebhookHealth, retryWebhookForIntent };

// Run if called directly
if (require.main === module) {
  const action = process.argv[2];
  const intentId = process.argv[3];

  if (action === 'retry' && intentId) {
    retryWebhookForIntent(intentId)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('❌ Retry failed:', error);
        process.exit(1);
      });
  } else {
    checkWebhookHealth()
      .then((result) => {
        console.log('\n✅ Webhook health check completed');
        if (result.oldUnpaidCount > 0) {
          console.log(`\n💡 Consider running webhook retry for ${result.oldUnpaidCount} old unpaid intents`);
          console.log('   Usage: node webhook-health-check.js retry <intentId>');
        }
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Health check failed:', error);
        process.exit(1);
      });
  }
}