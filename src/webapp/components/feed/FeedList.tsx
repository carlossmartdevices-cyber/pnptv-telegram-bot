'use client'

import { useEffect, useState } from 'react'
import { PostCard } from '@/components/posts/PostCard'
import type { Post, FeedType } from '@/types'
import { getAuthToken } from '@/lib/auth'

interface FeedListProps {
  feedType: FeedType
  userId?: string
}

export function FeedList({ feedType, userId }: FeedListProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | undefined>()

  const loadPosts = async (loadMore = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const token = getAuthToken()
      const params = new URLSearchParams({
        type: feedType,
        limit: '20',
      })

      if (loadMore && cursor) {
        params.append('cursor', cursor)
      }

      if (userId) {
        params.append('userId', userId)
      }

      const response = await fetch(`/api/feed?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load feed')
      }

      const data = await response.json()

      if (loadMore) {
        setPosts((prev) => [...prev, ...data.items])
      } else {
        setPosts(data.items)
      }

      setHasMore(data.hasMore)
      setCursor(data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [feedType, userId])

  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
          >
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <span className="text-4xl mb-4 block">😕</span>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => loadPosts()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <span className="text-6xl mb-4 block">📝</span>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No posts yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Be the first to share something!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.postId} post={post} onLikeToggle={() => loadPosts()} />
      ))}

      {hasMore && (
        <button
          onClick={() => loadPosts(true)}
          disabled={isLoading}
          className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
