'use client'

import { useState } from 'react'
import { PostComposer } from '@/components/posts/PostComposer'
import { FeedList } from '@/components/feed/FeedList'

export default function FeedPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePostCreated = () => {
    // Trigger feed refresh when new post is created
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to PNPtv! 🎉
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Share your thoughts, connect with others, and discover amazing content
        </p>
      </div>

      {/* Post Composer */}
      <PostComposer onPostCreated={handlePostCreated} />

      {/* Feed */}
      <FeedList key={refreshKey} feedType="main" />
    </div>
  )
}
