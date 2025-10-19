'use client'

import { useState } from 'react'
import { getAuthToken } from '@/lib/auth'
import { ImageUpload } from '@/components/upload/ImageUpload'

interface PostComposerProps {
  onPostCreated?: () => void
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaUrls, setMediaUrls] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError('Please write something first')
      return
    }

    setIsPosting(true)
    setError(null)

    try {
      const token = getAuthToken()
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          visibility: 'public',
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create post')
      }

      // Success!
      setContent('')
      setMediaUrls([])
      onPostCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            rows={3}
            disabled={isPosting}
          />
        </div>

        {/* Image Upload */}
        <div className="mb-4">
          <ImageUpload onUploadComplete={setMediaUrls} maxImages={4} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {mediaUrls.length > 0 && (
              <span>{mediaUrls.length} image{mediaUrls.length !== 1 ? 's' : ''} attached</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isPosting || (!content.trim() && mediaUrls.length === 0)}
            className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
