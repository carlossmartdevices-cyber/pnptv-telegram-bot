'use client'

import type { Plan } from '@/types'

interface PricingCardProps {
  plan: Plan
  currentTier?: string
  onSelect: (plan: Plan) => void
  isLoading?: boolean
}

export function PricingCard({ plan, currentTier, onSelect, isLoading }: PricingCardProps) {
  const isCurrentPlan = currentTier === plan.tier
  const isFree = plan.tier === 'free'

  return (
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 p-6 transition-all ${
        plan.recommended
          ? 'border-primary-500 scale-105 shadow-xl'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
      }`}
    >
      {/* Recommended Badge */}
      {plan.recommended && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg">
            ⭐ Recommended
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-lg">
            ✓ Current
          </span>
        </div>
      )}

      {/* Icon & Name */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">{plan.icon}</div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {plan.displayName || plan.name}
        </h3>
        {plan.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {plan.description}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center space-x-1">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            ${plan.price}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            /{plan.duration || 30} days
          </span>
        </div>

        {/* COP Price */}
        {plan.priceInCOP && plan.priceInCOP > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ≈ ${plan.priceInCOP.toLocaleString()} COP
          </p>
        )}

        {/* Crypto Bonus */}
        {plan.cryptoBonus && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
            🪙 {plan.cryptoBonus}
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {plan.features.map((feature: string, index: number) => (
          <li key={index} className="flex items-start space-x-2">
            <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(plan)}
        disabled={isLoading || isCurrentPlan || isFree}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
          plan.recommended
            ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl'
            : isCurrentPlan
            ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
            : isFree
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400'
        }`}
      >
        {isLoading ? (
          'Processing...'
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : isFree ? (
          'Always Free'
        ) : (
          `Get ${plan.displayName || plan.name}`
        )}
      </button>

      {/* Payment Method Info */}
      {plan.paymentMethod && plan.paymentMethod !== 'none' && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
          {plan.paymentMethod === 'daimo' && '💳 Pay with USDC via Daimo'}
          {plan.paymentMethod === 'epayco' && '💳 Pay with ePayco'}
          {plan.paymentMethod === 'nequi' && '💳 Pay with Nequi'}
        </p>
      )}
    </div>
  )
}
