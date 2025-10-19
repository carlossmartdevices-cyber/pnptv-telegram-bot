'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuthToken } from '@/lib/auth'

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planId = searchParams.get('planId')
  const amount = searchParams.get('amount')
  const planName = searchParams.get('planName')

  useEffect(() => {
    // Verify user is authenticated
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
    }

    // Verify required parameters
    if (!planId || !amount || !planName) {
      setError('Missing payment information')
    }
  }, [planId, amount, planName, router])

  const handlePaymentClick = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Here you would integrate with Daimo Pay
      // For now, show a message that the integration is in progress

      alert(
        `Daimo Pay Integration\n\nPlan: ${planName}\nAmount: $${amount} USDC\n\nThis feature will open Daimo Pay checkout in the next version. For now, please contact support to complete your purchase.`
      )

      // TODO: Implement Daimo Pay integration
      // const response = await fetch('/api/payments/create', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${getAuthToken()}`,
      //   },
      //   body: JSON.stringify({
      //     planId,
      //     amount,
      //     currency: 'USDC',
      //   }),
      // })

      // if (response.ok) {
      //   const data = await response.json()
      //   // Redirect to Daimo Pay
      //   window.location.href = data.checkoutUrl
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  if (error && !planId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-red-200 dark:border-red-800">
          <div className="text-center">
            <span className="text-4xl mb-4 block">❌</span>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => router.push('/plans')}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Back to Plans
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 pb-24 md:pb-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/plans')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <span>←</span>
          <span>Back to Plans</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Complete Your Purchase
        </h1>
      </div>

      {/* Order Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Order Summary
        </h2>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Plan</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {planName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Duration</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              30 days
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              USDC (Daimo Pay)
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <div className="flex justify-between text-lg">
              <span className="font-bold text-gray-900 dark:text-white">Total</span>
              <span className="font-bold text-primary-600 dark:text-primary-400">
                ${amount} USDC
              </span>
            </div>
          </div>
        </div>

        {/* Crypto Bonus */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-2xl">🪙</span>
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                Crypto Bonus
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Pay with crypto and receive a bonus added to your account!
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Payment Button */}
        <button
          onClick={handlePaymentClick}
          disabled={isProcessing}
          className="w-full py-4 px-6 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold rounded-lg hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-lg"
        >
          {isProcessing ? 'Processing...' : `Pay $${amount} USDC with Daimo`}
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          Secure payment powered by Daimo Pay. Your payment information is encrypted and secure.
        </p>
      </div>

      {/* Security Badges */}
      <div className="flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <span>🔒</span>
          <span className="text-sm">Secure Payment</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>✅</span>
          <span className="text-sm">30-Day Guarantee</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>⚡</span>
          <span className="text-sm">Instant Activation</span>
        </div>
      </div>
    </div>
  )
}
