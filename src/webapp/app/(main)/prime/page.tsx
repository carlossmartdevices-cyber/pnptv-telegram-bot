'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken } from '@/lib/auth'
import { PostComposer } from '@/components/posts/PostComposer'
import { FeedList } from '@/components/feed/FeedList'
import type { User } from '@/types'

export default function PrimePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        router.push('/login')
        return
      }

      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error loading user:', error)
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const isPrimeOrPremium = () => {
    if (!user?.membership) return false
    const tier = user.membership.tier
    return tier === 'prime' || tier === 'premium'
  }

  const getMembershipExpiry = () => {
    if (!user?.membership?.expiresAt) return null
    const expiryDate = new Date(user.membership.expiresAt)
    const now = new Date()
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysLeft
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
        </div>
      </div>
    )
  }

  // Not a PRIME/Premium member
  if (!isPrimeOrPremium()) {
    return (
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Upgrade Prompt */}
        <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl shadow-lg p-8 text-white">
          <div className="text-center">
            <div className="text-6xl mb-4">💎</div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome to PRIME
            </h1>
            <p className="text-yellow-100 mb-6 text-lg">
              Unlock exclusive content, no ads, and premium features
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl mb-2">🚫</div>
                <h3 className="font-semibold mb-1">Ad-Free Experience</h3>
                <p className="text-sm text-yellow-100">Browse without interruptions</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl mb-2">⭐</div>
                <h3 className="font-semibold mb-1">Exclusive Content</h3>
                <p className="text-sm text-yellow-100">Access PRIME-only posts</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-2xl mb-2">🎁</div>
                <h3 className="font-semibold mb-1">Premium Features</h3>
                <p className="text-sm text-yellow-100">Early access to new features</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/plans')}
              className="px-8 py-3 bg-white text-yellow-600 font-bold rounded-lg hover:bg-yellow-50 transition-colors shadow-xl"
            >
              Upgrade to PRIME
            </button>
          </div>
        </div>

        {/* Preview (Limited) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              PRIME Content Locked
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Subscribe to PRIME to view exclusive content from premium creators
            </p>
            <button
              onClick={() => router.push('/plans')}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    )
  }

  // PRIME/Premium member
  const daysLeft = getMembershipExpiry()

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* PRIME Header */}
      <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">💎</span>
              <h1 className="text-2xl font-bold">
                PRIME Feed
              </h1>
            </div>
            <p className="text-yellow-100">
              Exclusive content for {user.membership?.tier === 'premium' ? 'Premium' : 'PRIME'} members
            </p>
          </div>

          {daysLeft !== null && daysLeft > 0 && daysLeft < 7 && (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-sm font-medium">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Post Composer (PRIME visibility option) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-xl">💎</span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share with PRIME Members
          </h2>
        </div>
        <PostComposer onPostCreated={handlePostCreated} />
      </div>

      {/* PRIME Feed */}
      <FeedList key={refreshKey} feedType="prime" />
    </div>
  )
}
