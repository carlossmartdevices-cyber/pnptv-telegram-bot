import { useState, useEffect } from 'react'
import { DaimoPayButton } from '@daimo/pay'
import { getAddress } from 'viem'
import './CheckoutPage.css'

function CheckoutPage() {
  const [planData, setPlanData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get payment details from URL
  const params = new URLSearchParams(window.location.search)
  const planId = params.get('plan')
  const userId = params.get('user')
  const amount = parseFloat(params.get('amount'))

  useEffect(() => {
    // Fetch plan details from API
    const fetchPlanData = async () => {
      try {
        const response = await fetch(`/api/plans/${planId}`)
        if (!response.ok) throw new Error('Failed to load plan')
        const data = await response.json()
        setPlanData(data)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    if (planId) {
      fetchPlanData()
    } else {
      setError('Invalid payment link')
      setLoading(false)
    }
  }, [planId])

  // Generate reference for tracking (plan_user_timestamp format)
  const reference = `${planId}_${userId}_${Date.now()}`

  const handlePaymentStarted = async (data) => {
    console.log('Payment started:', data)

    // Store payment intent in database for webhook lookup
    try {
      await fetch('/api/payments/started', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          planId,
          amount,
          reference,
        }),
      })
    } catch (err) {
      console.error('Failed to store payment intent:', err)
    }
  }

  const handlePaymentCompleted = (data) => {
    console.log('Payment completed:', data)
    // Webhook will handle subscription activation
    // Redirect to success page
    window.location.href = `/payment/success?plan=${planId}&ref=${reference}`
  }

  if (loading) {
    return (
      <div className="checkout-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="checkout-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h2>Payment Error</h2>
          <p>{error}</p>
          <button onClick={() => window.close()} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-container">
      <header className="checkout-header">
        <div className="logo">
          <span className="logo-icon">🎥</span>
          <span className="logo-text">PNPtv</span>
        </div>
      </header>

      <main className="checkout-main">
        <div className="checkout-card">
          <div className="plan-header">
            <div className="plan-icon">{planData?.icon || '💎'}</div>
            <h1 className="plan-name">{planData?.displayName || planData?.name}</h1>
            <p className="plan-description">{planData?.description}</p>
          </div>

          <div className="plan-features">
            <h3>What's included:</h3>
            <ul>
              {planData?.features?.map((feature, index) => (
                <li key={index}>
                  <span className="check-icon">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="price-section">
            <div className="price-label">Total amount</div>
            <div className="price-amount">
              <span className="price-value">${amount}</span>
              <span className="price-currency">USDC</span>
            </div>
            <div className="price-duration">
              Billed for {planData?.duration} days
            </div>
          </div>

          <div className="payment-section">
            <DaimoPayButton
              appId={import.meta.env.VITE_DAIMO_APP_ID || 'pay-televisionlatina-VxZH9SQoHYasAoQmdWKuUw'}
              intent="Pay"
              toAddress={getAddress(import.meta.env.VITE_TREASURY_ADDRESS || '0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0')}
              toChain={10}
              toToken={getAddress('0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85')}
              toUnits={(amount * 1000000).toString()}
              refundAddress={getAddress(import.meta.env.VITE_REFUND_ADDRESS || '0x98a1b6fdFAE5cF3A274b921d8AcDB441E697a5B0')}
              metadata={{
                userId: userId,
                plan: planId,
                reference: reference,
              }}
              onPaymentStarted={handlePaymentStarted}
              onPaymentCompleted={handlePaymentCompleted}
              closeOnSuccess={true}
            >
              Complete Payment
            </DaimoPayButton>
          </div>

          <div className="payment-info">
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <span className="info-text">Secure payment powered by Daimo Pay</span>
            </div>
            <div className="info-item">
              <span className="info-icon">⚡</span>
              <span className="info-text">Pay with USDC from any exchange, wallet, or payment app (Cash App, Zelle, Venmo, Revolut and Wise)</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="checkout-footer">
        <p>© 2025 PNPtv Digital Community</p>
        <a href="mailto:support@pnptv.app">support@pnptv.app</a>
      </footer>
    </div>
  )
}

export default CheckoutPage
