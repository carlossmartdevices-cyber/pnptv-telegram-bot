import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-3xl">💎</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              PNPtv
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Connect, Share, and{' '}
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Discover
              </span>
            </h2>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Join PNPtv, the social platform that brings people together. Share moments, discover nearby connections, and enjoy premium content.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
              >
                🚀 Start Exploring
              </Link>

              <a
                href="https://t.me/YOUR_BOT_USERNAME"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 text-lg font-medium text-primary-700 bg-white dark:bg-gray-800 dark:text-primary-400 border-2 border-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                💬 Open in Telegram
              </a>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 animate-slide-up">
            <FeatureCard
              emoji="🌍"
              title="Nearby"
              description="Discover people and content around you with geolocation-based feed"
            />
            <FeatureCard
              emoji="💎"
              title="PNPtv PRIME"
              description="Access exclusive premium content and features with your subscription"
            />
            <FeatureCard
              emoji="📺"
              title="Live Streaming"
              description="Watch and broadcast live content to connect in real-time"
            />
            <FeatureCard
              emoji="🔒"
              title="Secure Login"
              description="Sign in securely with Telegram - no passwords needed"
            />
            <FeatureCard
              emoji="💳"
              title="Crypto Payments"
              description="Subscribe and pay with crypto or fiat using Daimo Pay"
            />
            <FeatureCard
              emoji="🤝"
              title="Social Network"
              description="Build your profile, follow users, and engage with posts"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <p>&copy; 2025 PNPtv. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string
  title: string
  description: string
}) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
    </div>
  )
}
