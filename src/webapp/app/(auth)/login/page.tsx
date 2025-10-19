'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TelegramLoginButton, type TelegramUser } from '@/components/auth/TelegramLoginButton'
import { authenticateWithTelegram } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTelegramAuth = async (user: TelegramUser) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('Authenticating with Telegram...', user)

      const result = await authenticateWithTelegram(user)

      if (result.success) {
        console.log('Authentication successful!')
        // Redirect to main feed
        router.push('/feed')
      } else {
        setError(result.error || 'Authentication failed. Please try again.')
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'PNPtvBot'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full mb-4 shadow-lg">
            <span className="text-4xl">💎</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to PNPtv
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Sign in to start exploring
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <div className="space-y-6">
            {/* Info */}
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Sign in with Telegram
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Quick and secure - no password needed
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start">
                  <span className="text-red-600 dark:text-red-400 mr-2">⚠️</span>
                  <div className="flex-1">
                    <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                      {error}
                    </p>
                    {error.includes('bot') && (
                      <a
                        href={`https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-red-600 dark:text-red-400 underline mt-1 inline-block"
                      >
                        Start the bot first →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Telegram Login Button */}
            <div className="flex justify-center">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">
                    Authenticating...
                  </span>
                </div>
              ) : (
                <TelegramLoginButton
                  botUsername={botUsername}
                  onAuth={handleTelegramAuth}
                  buttonSize="large"
                  requestAccess={true}
                />
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Why Telegram?
                </span>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <BenefitItem
                icon="🔒"
                title="Secure"
                description="Your data is protected by Telegram's encryption"
              />
              <BenefitItem
                icon="⚡"
                title="Fast"
                description="One-click sign in, no forms to fill"
              />
              <BenefitItem
                icon="🔑"
                title="No Passwords"
                description="No need to remember another password"
              />
            </div>

            {/* Help Text */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Don't have Telegram?{' '}
                <a
                  href="https://telegram.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Download it here
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  )
}

function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-start space-x-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}
