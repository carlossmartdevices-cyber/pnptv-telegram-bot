'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken } from '@/lib/auth'
import { PricingCard } from '@/components/pricing/PricingCard'
import type { Plan, User } from '@/types'

export default function PlansPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = getAuthToken()
      if (!token) {
        router.push('/login')
        return
      }

      // Load user data and plans in parallel
      const [userResponse, plansResponse] = await Promise.all([
        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/plans'),
      ])

      if (!userResponse.ok) {
        router.push('/login')
        return
      }

      const userData = await userResponse.json()
      const plansData = await plansResponse.json()

      setUser(userData.user)
      setPlans(plansData.plans || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) return

    // If plan is free, no payment needed
    if (plan.tier === 'free') {
      alert('You already have access to the free plan!')
      return
    }

    setIsProcessing(true)

    try {
      // For Daimo Pay integration
      if (plan.paymentMethod === 'daimo') {
        // Redirect to Daimo Pay checkout page
        const checkoutUrl = `/checkout?planId=${plan.id}&amount=${plan.price}&planName=${encodeURIComponent(plan.displayName || plan.name)}`
        router.push(checkoutUrl)
      } else {
        // For other payment methods, show coming soon
        alert(`Payment via ${plan.paymentMethod} coming soon!`)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process payment')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12 animate-pulse">
          <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mx-auto mb-4" />
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-2/3 mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-200 dark:bg-gray-700 rounded-xl h-96 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <span className="text-4xl mb-4 block">😕</span>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentTier = user?.membership?.tier || 'free'

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-24 md:pb-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Unlock premium features and exclusive content. All plans include a 30-day money-back guarantee.
        </p>

        {/* Current Membership Info */}
        {user && currentTier !== 'free' && (
          <div className="mt-6 inline-flex items-center space-x-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <span className="text-green-600 dark:text-green-400 font-medium">
              Current Plan: {currentTier.toUpperCase()}
            </span>
            {user.membership?.expiresAt && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                • Expires{' '}
                {new Date(user.membership.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            currentTier={currentTier}
            onSelect={handleSelectPlan}
            isLoading={isProcessing}
          />
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer">
              What payment methods do you accept?
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
              We accept USDC payments via Daimo Pay for crypto users, and traditional payment methods like credit cards and local payments coming soon.
            </p>
          </details>

          <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer">
              Can I cancel my subscription?
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </details>

          <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer">
              What's the crypto bonus?
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
              When you pay with USDC via Daimo, you receive a bonus percentage added to your account balance that you can use within the platform.
            </p>
          </details>

          <details className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer">
              Can I upgrade or downgrade my plan?
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
              Yes, you can upgrade to a higher tier at any time. The difference will be prorated. Downgrading will take effect at the end of your current billing cycle.
            </p>
          </details>
        </div>
      </div>

      {/* Contact Support */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Have more questions?{' '}
          <a
            href="https://t.me/PNPtvBot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  )
}
