'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { DaimoPayButton, useDaimoPayUI } from '@daimo/pay'
import { baseUSDC, optimismUSDC } from '@daimo/pay-common'
import { getAddress } from 'viem'

interface PlanData {
  id: string
  name: string
  displayName: string
  price: number
  duration: number
  features: string[]
  icon: string
}

function PaymentPageContent() {
  const searchParams = useSearchParams()
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentCompleted, setPaymentCompleted] = useState(false)

  const planId = searchParams.get('plan')
  const userId = searchParams.get('user')
  const amount = searchParams.get('amount')

  // Get environment variables
  const appId = process.env.NEXT_PUBLIC_DAIMO_APP_ID || 'pnptv-bot'
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || ''
  const refundAddress = process.env.NEXT_PUBLIC_REFUND_ADDRESS || treasuryAddress

  useEffect(() => {
    async function fetchPlanData() {
      if (!planId || !userId || !amount) {
        setError('Missing required parameters')
        setLoading(false)
        return
      }

      try {
        // Fetch plan details from bot backend
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BOT_URL}/api/plans/${planId}`
        )

        if (!response.ok) {
          throw new Error('Failed to load plan details')
        }

        const data = await response.json()
        setPlanData(data)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching plan:', err)
        setError('Failed to load payment details')
        setLoading(false)
      }
    }

    fetchPlanData()
  }, [planId, userId, amount])

  if (loading) {
    return (
      <div className="container">
        <div className="payment-card">
          <div className="loading">
            <h2>Loading payment details...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="payment-card">
          <div className="error">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (paymentCompleted) {
    return (
      <div className="container">
        <div className="payment-card">
          <div className="success">
            <div className="success-icon">✅</div>
            <h2>Payment Successful!</h2>
            <p>Your subscription has been activated.</p>
            <p>You can close this window and return to Telegram.</p>
            <button
              className="button"
              onClick={() => {
                if (window.Telegram?.WebApp) {
                  window.Telegram.WebApp.close()
                } else {
                  window.close()
                }
              }}
            >
              Return to Telegram
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!treasuryAddress) {
    return (
      <div className="container">
        <div className="payment-card">
          <div className="error">
            <h2>Configuration Error</h2>
            <p>Payment system is not properly configured. Please contact support.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="payment-card">
        <div className="logo">
          <h1>💎 PNPtv</h1>
          <p>Subscription Payment</p>
        </div>

        {planData && (
          <div className="plan-details">
            <h2>
              {planData.icon} {planData.displayName || planData.name}
            </h2>

            <div className="plan-info">
              <label>Price:</label>
              <span>${amount} USDC</span>
            </div>

            <div className="plan-info">
              <label>Duration:</label>
              <span>{planData.duration} days</span>
            </div>

            {planData.features && planData.features.length > 0 && (
              <div className="features">
                <h3>Features:</h3>
                <ul>
                  {planData.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="payment-methods">
          <p><strong>💳 Payment Options:</strong></p>
          <ul>
            <li>• Web3 Wallets (MetaMask, Coinbase Wallet, etc.)</li>
            <li>• Exchanges (Coinbase, Binance)</li>
            <li>• Payment Apps (Venmo, Cash App, etc.)</li>
          </ul>
        </div>

        <div className="payment-section">
          <h3>Complete Payment</h3>
          <DaimoPayButton
            appId={appId}
            intent="Subscribe"
            refundAddress={getAddress(refundAddress)}
            toAddress={getAddress(treasuryAddress)}
            toChain={baseUSDC.chainId}
            toToken={getAddress(baseUSDC.token)}
            toUnits={amount || '0'}
            paymentOptions={['AllExchanges', 'Coinbase', 'Binance']}
            defaultOpen={false}
            closeOnSuccess={true}
            onPaymentStarted={(payment) => {
              console.log('Payment started:', payment)
              // Notify backend that payment was initiated
              fetch(`${process.env.NEXT_PUBLIC_BOT_URL}/api/payments/started`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  planId,
                  amount,
                  reference: payment.reference,
                }),
              }).catch(console.error)
            }}
            onPaymentCompleted={(payment) => {
              console.log('Payment completed:', payment)
              setPaymentCompleted(true)

              // Notify backend that payment completed
              fetch(`${process.env.NEXT_PUBLIC_BOT_URL}/api/payments/completed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  planId,
                  amount,
                  reference: payment.reference,
                }),
              }).catch(console.error)
            }}
          />
        </div>

        <div className="footer">
          <p>Secure payment powered by Daimo Pay</p>
          <p>Settlement on Base Network (USDC)</p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="container"><div className="loading">Loading...</div></div>}>
      <PaymentPageContent />
    </Suspense>
  )
}
