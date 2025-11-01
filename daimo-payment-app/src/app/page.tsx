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

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  priceInCOP: number;
  currency: string;
  duration: number;
  durationDays: number;
  tier: string;
  features: string[];
  icon: string;
  active: boolean;
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const amount = searchParams.get('amount');
  const planId = searchParams.get('plan');
  const userId = searchParams.get('user');

  // Convert amount to USDC units (6 decimal places)
  const amountUSD = amount ? parseFloat(amount) : (selectedPlan ? selectedPlan.price : 0);
  const amountInUSDC = BigInt(Math.round(amountUSD * 1000000));

  // Load plans on component mount
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch('/api/plans');
        const data = await response.json();
        
        if (data.success) {
          setPlans(data.plans);
          console.log('Loaded plans:', data.plans.length, 'source:', data.source);
        } else {
          throw new Error(data.error || 'Failed to load plans');
        }
      } catch (error) {
        console.error('Error loading plans:', error);
        setError('Failed to load subscription plans');
      }
    };

    loadPlans();
  }, []);

  // Handle plan selection and validation
  useEffect(() => {
    if (plans.length === 0) {
      return; // Still loading plans
    }

    // If no parameters provided, show plan selection
    if (!planId || !userId) {
      setIsLoading(false);
      return;
    }

    // Find the selected plan
    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      setError(`Plan "${planId}" not found`);
      setIsLoading(false);
      return;
    }

    setSelectedPlan(plan);

    // Use plan price if amount not specified
    const finalAmount = amount ? parseFloat(amount) : plan.price;
    
    if (finalAmount < 0.01) {
      setError('Amount too small. Minimum is $0.01 USD');
      setIsLoading(false);
      return;
    }

    console.log('Payment details:', {
      amount: finalAmount,
      amountInUSDC: BigInt(Math.round(finalAmount * 1000000)).toString(), 
      planId: plan.id,
      planName: plan.displayName,
      userId,
      chain: baseUSDC.chainId,
      token: baseUSDC.token
    });

    setIsLoading(false);
  }, [plans, amount, planId, userId]);

  const handlePaymentStarted = async (event: any) => {
    try {
      const response = await fetch('/api/payments/started', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountUSD,
          planId: selectedPlan?.id || planId,
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
          amount: amountUSD,
          planId: selectedPlan?.id || planId,
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

  // Show plan selection if no plan specified
  if (!planId && !isLoading && plans.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AnimatedLogo size="medium" variant="brand" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Choose Your Plan</h1>
            <p className="text-gray-600">Select a subscription plan to continue</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">{plan.icon}</div>
                  <h3 className="text-xl font-bold">{plan.displayName}</h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>

                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-indigo-600">${plan.price}</div>
                  <div className="text-sm text-gray-500">{plan.durationDays} days</div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('plan', plan.id);
                    params.set('amount', plan.price.toString());
                    if (userId) params.set('user', userId);
                    window.location.search = params.toString();
                  }}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Select Plan
                </button>
              </div>
            ))}
          </div>

          {!userId && (
            <div className="mt-8 text-center">
              <p className="text-red-600 text-sm">
                ⚠️ Missing user ID. Please return to the Telegram bot to generate a proper payment link.
              </p>
            </div>
          )}
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
                <span className="text-gray-600">Plan:</span>
                <span className="font-semibold">{selectedPlan?.displayName || planId}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">${amountUSD.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold">{selectedPlan?.durationDays || '30'} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="font-semibold">Base</span>
              </div>
            </div>

            {selectedPlan && selectedPlan.features.length > 0 && (
              <div className="border-b pb-6">
                <h3 className="font-semibold mb-2">Plan Features:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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