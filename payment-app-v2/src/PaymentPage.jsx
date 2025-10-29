import { useState, useEffect } from 'react'
import { DaimoPayButton } from '@daimo/pay'
import { getAddress } from 'viem'
import './PaymentPage.css'

const APP_ID = 'televisionlatina'
const TREASURY_ADDRESS = '0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0'
const USDC_OPTIMISM = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'

function PaymentPage() {
  const [planData, setPlanData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get payment details from URL
  const params = new URLSearchParams(window.location.search)
  const planId = params.get('plan')
  const userId = params.get('user')
  const amount = parseFloat(params.get('amount'))

  console.log('[PNPtv Payment] URL params:', { planId, userId, amount })

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        console.log('[PNPtv Payment] Fetching plan:', planId)
        const response = await fetch(`/api/plans/${planId}`)

        if (!response.ok) {
          throw new Error('Failed to load plan')
        }

        const data = await response.json()
        console.log('[PNPtv Payment] Plan loaded:', data)
        setPlanData(data)
        setLoading(false)
      } catch (err) {
        console.error('[PNPtv Payment] Error:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    if (planId && userId && amount) {
      fetchPlanData()
    } else {
      setError('Missing payment parameters')
      setLoading(false)
    }
  }, [planId, userId, amount])

  const handlePaymentStarted = (event) => {
    console.log('[PNPtv Payment] Payment started:', event)
  }

  const handlePaymentCompleted = (event) => {
    console.log('[PNPtv Payment] Payment completed:', event)
    alert('Payment successful! Your subscription will be activated shortly.')
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>⚠️ Payment Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h1>🎥 PNPtv</h1>
          <h2>{planData?.displayName || planData?.name}</h2>
          <p>{planData?.description}</p>
        </div>

        <div className="features">
          <h3>What's included:</h3>
          <ul>
            {planData?.features?.map((feature, index) => (
              <li key={index}>✓ {feature}</li>
            ))}
          </ul>
        </div>

        <div className="price">
          <div className="price-label">Total amount</div>
          <div className="price-amount">${amount.toFixed(2)} USDC</div>
          <div className="price-duration">
            {planData?.duration} days access
          </div>
        </div>

        <div className="payment-button">
          <DaimoPayButton
            appId={APP_ID}
            toAddress={getAddress(TREASURY_ADDRESS)}
            toChain={10}
            toToken={getAddress(USDC_OPTIMISM)}
            toUnits={amount.toFixed(2)}
            refundAddress={getAddress(TREASURY_ADDRESS)}
            intent="Pay"
            preferredChains={[10]}
            preferredTokens={[
              { chain: 10, address: getAddress(USDC_OPTIMISM) }
            ]}
            metadata={{
              userId,
              plan: planId,
              reference: `${planId}_${userId}_${Date.now()}`
            }}
            onPaymentStarted={handlePaymentStarted}
            onPaymentCompleted={handlePaymentCompleted}
            closeOnSuccess={true}
          >
            Pay ${amount.toFixed(2)} USDC
          </DaimoPayButton>
        </div>

        <div className="info">
          <p>🔒 Secure payment powered by Daimo Pay</p>
          <p>⚡ Pay with USDC from any wallet or exchange</p>
        </div>
      </div>
    </div>
  )
}

export default PaymentPage
