#!/usr/bin/env node

/**
 * Create a $100 one-time payment link via Daimo Pay
 * Payable with Revolut and other payment methods
 */

require('dotenv').config();
const daimoPayService = require('./src/services/daimoPayService');

async function createOneTimePayment() {
  console.log('💰 Creating $100 One-Time Payment Link...\n');

  try {
    const paymentResult = await daimoPayService.createPayment({
      planName: 'One-Time Payment - $100 USD',
      amount: 100.00,
      userId: 'onetime_payment_user',
      planId: 'onetime_100usd',
      userName: 'One-Time Payment',
      chainId: daimoPayService.SUPPORTED_CHAINS.BASE,
    });

    console.log('✅ Payment Link Created Successfully!\n');
    console.log('📋 Payment Details:');
    console.log(`   💰 Amount: $${paymentResult.amount} USDC`);
    console.log(`   🆔 Payment ID: ${paymentResult.paymentId}`);
    console.log(`   🌐 Network: Base (ultra-low fees)`);
    console.log(`   ⚡ Status: ${paymentResult.status}`);
    
    console.log('\n🔗 PAYMENT LINK:');
    console.log(`   ${paymentResult.checkoutUrl}`);
    
    console.log('\n💳 PAYMENT METHODS SUPPORTED:');
    console.log('   ✅ Revolut → USDC conversion');
    console.log('   ✅ Cash App → USDC');
    console.log('   ✅ Venmo → USDC');
    console.log('   ✅ Zelle → USDC');
    console.log('   ✅ Coinbase / Binance');
    console.log('   ✅ PayPal (via exchanges)');
    console.log('   ✅ Any crypto wallet with USDC');
    
    console.log('\n📱 HOW TO PAY WITH REVOLUT:');
    console.log('   1. Open the payment link above');
    console.log('   2. Select "Revolut" or similar option');
    console.log('   3. Convert your currency to USDC');
    console.log('   4. Complete the payment');
    console.log('   5. Payment confirmed on blockchain');
    
    console.log('\n🔒 SECURITY:');
    console.log('   • Blockchain-secured payment');
    console.log('   • Automatic refund on failure');
    console.log('   • No credit card required');
    console.log('   • Ultra-low fees on Base network');
    
    console.log('\n⏰ VALIDITY: 24 hours from creation');
    console.log('🌐 NETWORK: Base (Coinbase L2) - Lowest fees');

  } catch (error) {
    console.error('❌ Failed to create payment link:');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('DAIMO_API_KEY')) {
      console.error('   → API key is not configured properly');
    } else if (error.message.includes('DESTINATION_ADDRESS')) {
      console.error('   → Destination address is not configured');
    } else {
      console.error('   → Check network connectivity and API configuration');
    }
  }
}

createOneTimePayment();