#!/usr/bin/env node

/**
 * Debug script to see exact API request being sent to Daimo
 */

const axios = require('axios');
const logger = require('./src/utils/logger');

const DAIMO_API_URL = 'https://pay.daimo.com/api/payment';
const DAIMO_API_KEY = process.env.DAIMO_API_KEY;
const DESTINATION_ADDRESS = process.env.DAIMO_DESTINATION_ADDRESS;
const REFUND_ADDRESS = process.env.DAIMO_REFUND_ADDRESS;

const SUPPORTED_CHAINS = {
  BASE: 8453,
};

const USDC_TOKENS = {
  [SUPPORTED_CHAINS.BASE]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

async function debugPaymentRequest() {
  console.log('🔍 Debugging Daimo Pay API Request\n');

  const paymentData = {
    display: {
      intent: 'Test Subscription',
      preferredChains: [SUPPORTED_CHAINS.BASE],
      preferredTokens: [
        { chain: SUPPORTED_CHAINS.BASE, address: USDC_TOKENS[SUPPORTED_CHAINS.BASE] },
      ],
      paymentOptions: [
        'Coinbase',
        'CashApp',
        'Venmo',
        'AllExchanges',
        'AllWallets',
      ],
    },
    destination: {
      destinationAddress: DESTINATION_ADDRESS,
      chainId: SUPPORTED_CHAINS.BASE,
      tokenAddress: USDC_TOKENS[SUPPORTED_CHAINS.BASE],
      amountUnits: '10.00',
    },
    refundAddress: REFUND_ADDRESS,
    metadata: {
      userId: 'debug_test',
      planId: 'debug',
      test: 'true',
    },
  };

  console.log('📤 REQUEST PAYLOAD:');
  console.log(JSON.stringify(paymentData, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    const response = await axios.post(DAIMO_API_URL, paymentData, {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': DAIMO_API_KEY,
      },
    });

    console.log('✅ API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n📱 Checkout URL:', response.data.url);
    console.log('\n💡 Open this URL and check what payment options appear\n');

  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('\nFull Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugPaymentRequest();
