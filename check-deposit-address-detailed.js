#!/usr/bin/env node

/**
 * Detailed Deposit Address Verification Script
 * Checks that 0xcaf17dbbccc0e9ac87dad1af1f2fe3ba3a4d0613 is the configured USDC Base deposit address
 */

const { db } = require('./src/config/firebase');

console.log('=== DEPOSIT ADDRESS VERIFICATION ===\n');

const TARGET_ADDRESS = '0xcaf17dbbccc0e9ac87dad1af1f2fe3ba3a4d0613';

async function verifyDepositAddress() {
  try {
    console.log('🔍 Checking environment configuration...\n');

    // Check environment variables
    const envConfig = {
      DAIMO_DESTINATION_ADDRESS: process.env.DAIMO_DESTINATION_ADDRESS,
      DAIMO_REFUND_ADDRESS: process.env.DAIMO_REFUND_ADDRESS,
      NEXT_PUBLIC_TREASURY_ADDRESS: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
      NEXT_PUBLIC_REFUND_ADDRESS: process.env.NEXT_PUBLIC_REFUND_ADDRESS,
    };

    console.log('📋 Environment Variables:');
    Object.entries(envConfig).forEach(([key, value]) => {
      const matches = value === TARGET_ADDRESS;
      const status = matches ? '✅' : (value ? '❌' : '⚠️ ');
      console.log(`   ${status} ${key}: ${value || 'NOT SET'}`);
      if (value && value !== TARGET_ADDRESS) {
        console.log(`      Expected: ${TARGET_ADDRESS}`);
        console.log(`      Actual:   ${value}`);
      }
    });

    console.log('\n🔍 Checking Daimo service configuration...\n');

    // Check service configuration
    const daimoService = require('./src/services/daimoPayService');
    const config = daimoService.getConfig();
    
    console.log('📋 Daimo Service Config:');
    console.log(`   ✅ Service Enabled: ${config.enabled}`);
    console.log(`   🔑 API Key: ${config.apiKey || 'NOT SET'}`);
    console.log(`   📍 Destination: ${config.destinationAddress || 'NOT SET'}`);
    console.log(`   🔄 Refund: ${config.refundAddress || 'NOT SET'}`);
    console.log(`   🪝 Webhook: ${config.webhookUrl || 'NOT SET'}`);

    const destMatches = config.destinationAddress === TARGET_ADDRESS;
    const refundMatches = config.refundAddress === TARGET_ADDRESS;
    
    console.log(`\n📊 Address Verification:`);
    console.log(`   ${destMatches ? '✅' : '❌'} Destination matches target`);
    console.log(`   ${refundMatches ? '✅' : '❌'} Refund matches target`);

    console.log('\n🔍 Checking payment records for address usage...\n');

    // Check payment_intents collection
    const paymentIntentsSnapshot = await db.collection('payment_intents').get();
    let intentMatches = 0;
    let intentTotal = 0;

    paymentIntentsSnapshot.forEach(doc => {
      const data = doc.data();
      intentTotal++;
      if (data.destinationAddress === TARGET_ADDRESS) {
        intentMatches++;
      }
    });

    console.log(`📋 Payment Intents Analysis:`);
    console.log(`   📊 Total documents: ${intentTotal}`);
    console.log(`   ✅ Using target address: ${intentMatches}`);
    console.log(`   📈 Match rate: ${intentTotal > 0 ? Math.round((intentMatches / intentTotal) * 100) : 0}%`);

    // Check payments collection
    const paymentsSnapshot = await db.collection('payments').get();
    let paymentMatches = 0;
    let paymentTotal = 0;
    let paymentDetails = [];

    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      paymentTotal++;
      
      // Check various fields where the address might be stored
      const fields = ['destinationAddress', 'toAddress', 'recipientAddress', 'walletAddress'];
      let hasTargetAddress = false;
      
      fields.forEach(field => {
        if (data[field] === TARGET_ADDRESS) {
          hasTargetAddress = true;
          paymentMatches++;
        }
      });

      // Collect payment details for analysis
      paymentDetails.push({
        id: doc.id,
        amount: data.amount,
        status: data.status,
        userId: data.userId,
        planId: data.planId,
        hasTargetAddress,
        addresses: fields.reduce((acc, field) => {
          if (data[field]) acc[field] = data[field];
          return acc;
        }, {}),
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
    });

    console.log(`\n📋 Payments Collection Analysis:`);
    console.log(`   📊 Total documents: ${paymentTotal}`);
    console.log(`   ✅ Using target address: ${paymentMatches}`);
    console.log(`   📈 Match rate: ${paymentTotal > 0 ? Math.round((paymentMatches / paymentTotal) * 100) : 0}%`);

    // Show recent payments details
    if (paymentDetails.length > 0) {
      console.log(`\n📋 Recent Payment Details (last 5):`);
      const recentPayments = paymentDetails
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      recentPayments.forEach((payment, index) => {
        console.log(`\n   ${index + 1}. Payment ID: ${payment.id}`);
        console.log(`      Amount: $${payment.amount || 'N/A'}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      User: ${payment.userId}`);
        console.log(`      Plan: ${payment.planId}`);
        console.log(`      Has Target Address: ${payment.hasTargetAddress ? '✅' : '❌'}`);
        if (Object.keys(payment.addresses).length > 0) {
          console.log(`      Addresses found:`);
          Object.entries(payment.addresses).forEach(([field, addr]) => {
            const matches = addr === TARGET_ADDRESS;
            console.log(`        ${matches ? '✅' : '❌'} ${field}: ${addr}`);
          });
        }
        console.log(`      Date: ${payment.createdAt}`);
      });
    }

    console.log('\n=== VERIFICATION SUMMARY ===');
    
    const envMatches = Object.values(envConfig).filter(v => v === TARGET_ADDRESS).length;
    const envTotal = Object.values(envConfig).filter(v => v).length;
    const configOK = destMatches && refundMatches;
    
    console.log(`✅ Environment Variables: ${envMatches}/${envTotal} match target`);
    console.log(`${configOK ? '✅' : '❌'} Service Configuration: ${configOK ? 'CORRECT' : 'INCORRECT'}`);
    console.log(`📊 Payment Intents: ${intentMatches}/${intentTotal} use target address`);
    console.log(`📊 Payments: ${paymentMatches}/${paymentTotal} use target address`);
    
    console.log(`\n🎯 Target Address: ${TARGET_ADDRESS}`);
    console.log(`📍 Network: Base (Chain ID: 8453)`);
    console.log(`💱 Token: USDC`);
    console.log(`🔗 Verification: ${configOK ? 'PASS ✅' : 'FAIL ❌'}`);

    if (!configOK) {
      console.log(`\n⚠️  CONFIGURATION ISSUE DETECTED:`);
      if (!destMatches) {
        console.log(`   • Destination address mismatch`);
        console.log(`     Expected: ${TARGET_ADDRESS}`);
        console.log(`     Actual:   ${config.destinationAddress}`);
      }
      if (!refundMatches) {
        console.log(`   • Refund address mismatch`);
        console.log(`     Expected: ${TARGET_ADDRESS}`);
        console.log(`     Actual:   ${config.refundAddress}`);
      }
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the verification
if (require.main === module) {
  verifyDepositAddress();
}