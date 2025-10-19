'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Link from 'next/link'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated()) {
      router.push('/login')
    }
  }, [router])

  // If not authenticated, show nothing while redirecting
  if (!isAuthenticated()) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/feed" className="flex items-center space-x-2">
              <span className="text-2xl">💎</span>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                PNPtv
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <NavLink href="/feed" icon="🏠" label="Feed" />
              <NavLink href="/nearby" icon="📍" label="Nearby" />
              <NavLink href="/prime" icon="💎" label="PRIME" />
              <NavLink href="/live" icon="📺" label="Live" />
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold">
                  U
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
        <div className="flex items-center justify-around h-16">
          <MobileNavLink href="/feed" icon="🏠" label="Feed" />
          <MobileNavLink href="/nearby" icon="📍" label="Nearby" />
          <MobileNavLink href="/prime" icon="💎" label="PRIME" />
          <MobileNavLink href="/profile" icon="👤" label="Profile" />
        </div>
      </nav>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}

function MobileNavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center space-y-1 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}
