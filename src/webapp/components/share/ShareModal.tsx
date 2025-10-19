'use client'

import { useState } from 'react'
import { getAuthToken } from '@/lib/auth'
import type { Post } from '@/types'

interface ShareModalProps {
  post: Post
  isOpen: boolean
  onClose: () => void
  onShareComplete?: (newShareCount: number) => void
}

export function ShareModal({ post, isOpen, onClose, onShareComplete }: ShareModalProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  if (!isOpen) return null

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${post.postId}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setIsCopied(true)

      // Track share via API
      await trackShare('link')

      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      alert('Failed to copy link')
    }
  }

  const trackShare = async (shareType: string) => {
    try {
      setIsSharing(true)
      const token = getAuthToken()
      const response = await fetch(`/api/posts/${post.postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shareType }),
      })

      if (response.ok) {
        const data = await response.json()
        onShareComplete?.(data.shares)
      }
    } catch (error) {
      console.error('Failed to track share:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleShareVia = async (platform: string) => {
    const text = post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '')
    let url = ''

    switch (platform) {
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
        break
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
        break
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`
        break
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
        break
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
      await trackShare(platform)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Share Post
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Share Options */}
        <div className="space-y-3 mb-6">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            disabled={isSharing}
            className="w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">🔗</span>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                {isCopied ? 'Link Copied!' : 'Copy Link'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Copy post URL to clipboard
              </p>
            </div>
            {isCopied && <span className="text-green-600 dark:text-green-400">✓</span>}
          </button>

          {/* Telegram */}
          <button
            onClick={() => handleShareVia('telegram')}
            disabled={isSharing}
            className="w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">✈️</span>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">Share on Telegram</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Share with your Telegram contacts
              </p>
            </div>
          </button>

          {/* Twitter/X */}
          <button
            onClick={() => handleShareVia('twitter')}
            disabled={isSharing}
            className="w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">𝕏</span>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">Share on X (Twitter)</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Post to your X timeline
              </p>
            </div>
          </button>

          {/* WhatsApp */}
          <button
            onClick={() => handleShareVia('whatsapp')}
            disabled={isSharing}
            className="w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">💬</span>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">Share on WhatsApp</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send via WhatsApp chat
              </p>
            </div>
          </button>

          {/* Facebook */}
          <button
            onClick={() => handleShareVia('facebook')}
            disabled={isSharing}
            className="w-full flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">📘</span>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">Share on Facebook</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Post to your Facebook feed
              </p>
            </div>
          </button>
        </div>

        {/* Post Preview */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
          <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
            {post.content}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-mono truncate">
            {shareUrl}
          </p>
        </div>
      </div>
    </div>
  )
}
