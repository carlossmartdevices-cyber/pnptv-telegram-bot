'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DaimoPayButton, DaimoPayProvider } from '@daimo/pay';
import { getAddress } from 'viem';
import AnimatedLogo from '../components/AnimatedLogo';

// Base USDC configuration (preferred over Optimism for better UX)
const baseUSDC = {
  chainId: 8453, // Base mainnet
  token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base
};

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const amount = searchParams.get('amount');
  const planId = searchParams.get('plan');
  const userId = searchParams.get('user');

  // Convert amount to USDC units (6 decimal places)
  const amountUSD = amount ? parseFloat(amount) : 0;
  const amountInUSDC = BigInt(Math.round(amountUSD * 1000000));

  useEffect(() => {
    if (!amount || !planId || !userId) {
      setError('Missing required parameters');
      setIsLoading(false);
      return;
    }

    if (amountUSD < 0.01) {
      setError('Amount too small. Minimum is $0.01 USD');
      setIsLoading(false);
      return;
    }

    console.log('Payment details:', {
      amount: amountUSD,
      amountInUSDC: amountInUSDC.toString(), 
      planId, 
      userId,
      chain: baseUSDC.chainId,
      token: baseUSDC.token
    });

    setIsLoading(false);
  }, [amount, planId, userId, amountUSD, amountInUSDC]);

  const handlePaymentStarted = async (event: any) => {
    try {
      const response = await fetch('/api/payments/started', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          planId,
          userId,
          reference: event.detail.reference,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log payment start');
      }
    } catch (error) {
      console.error('Error logging payment start:', error);
    }
  };

  const handlePaymentCompleted = async (event: any) => {
    try {
      const response = await fetch('/api/payments/completed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          planId,
          userId,
          reference: event.detail.reference,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }

      // Show success message and redirect
      window.location.href = '/success';
    } catch (error) {
      console.error('Error confirming payment:', error);
      setError('Payment confirmation failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Loading...</h2>
            <p className="text-gray-600">Please wait while we prepare your payment</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DaimoPayProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AnimatedLogo size="medium" variant="brand" />
            </div>
            <p className="text-gray-600">Subscription Payment</p>
          </div>

          <div className="space-y-6">
            <div className="border-b pb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">${amount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="font-semibold">Base</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Payment Options:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Web3 Wallets (MetaMask, Coinbase Wallet)</li>
                <li>• Exchanges (Coinbase, Binance)</li>
                <li>• Payment Apps (Venmo, Cash App)</li>
              </ul>
            </div>

            <div className="w-full">
              <DaimoPayButton
                appId={process.env.NEXT_PUBLIC_DAIMO_APP_ID!}
                intent="Subscribe"
                toChain={baseUSDC.chainId}
                toToken={getAddress(baseUSDC.token)}
                toAddress={getAddress(process.env.NEXT_PUBLIC_TREASURY_ADDRESS!)}
                toUnits={amountInUSDC.toString()}
                refundAddress={getAddress(process.env.NEXT_PUBLIC_REFUND_ADDRESS!)}
                metadata={{
                  userId: userId!,
                  planId: planId!,
                  amount: amountUSD.toString()
                }}
                onPaymentStarted={handlePaymentStarted}
                onPaymentCompleted={handlePaymentCompleted}
              />
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Secure payment powered by Daimo Pay</p>
            <p>Settlement on Base Network (USDC)</p>
          </div>
        </div>
      </div>
    </DaimoPayProvider>
  );
}