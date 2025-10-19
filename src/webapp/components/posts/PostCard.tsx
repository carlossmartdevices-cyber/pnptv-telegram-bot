'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { Post } from '@/types'
import { getAuthToken } from '@/lib/auth'
import { CommentList } from '@/components/comments/CommentList'
import { CommentInput } from '@/components/comments/CommentInput'
import { ShareModal } from '@/components/share/ShareModal'

interface PostCardProps {
  post: Post
  onLikeToggle?: () => void
}

export function PostCard({ post, onLikeToggle }: PostCardProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [localLikes, setLocalLikes] = useState(post.likes)
  const [localHasLiked, setLocalHasLiked] = useState(post.hasLiked)
  const [showComments, setShowComments] = useState(false)
  const [commentRefreshKey, setCommentRefreshKey] = useState(0)
  const [localCommentCount, setLocalCommentCount] = useState(post.comments)
  const [showShareModal, setShowShareModal] = useState(false)
  const [localShareCount, setLocalShareCount] = useState(post.shares || 0)

  const handleLike = async () => {
    setIsLiking(true)

    // Optimistic update
    setLocalHasLiked(!localHasLiked)
    setLocalLikes(localHasLiked ? localLikes - 1 : localLikes + 1)

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/posts/${post.postId}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        // Revert optimistic update
        setLocalHasLiked(localHasLiked)
        setLocalLikes(post.likes)
        throw new Error('Failed to like post')
      }

      onLikeToggle?.()
    } catch (error) {
      console.error('Error liking post:', error)
      // Revert already done above
    } finally {
      setIsLiking(false)
    }
  }

  const formattedDate = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : 'just now'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      {/* Author Info */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {post.author.displayName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {post.author.displayName}
            </h3>
            {post.author.username && (
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                @{post.author.username}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {post.content}
        </p>
      </div>

      {/* Media (if any) */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {post.mediaUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt="Post media"
              className="rounded-lg w-full h-48 object-cover"
            />
          ))}
        </div>
      )}

      {/* Location */}
      {post.location && (
        <div className="mb-4 flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
          <span>📍</span>
          <span>{post.location.text}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center space-x-2 group ${
            localHasLiked
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
          } transition-colors disabled:opacity-50`}
        >
          <span className="text-xl group-hover:scale-110 transition-transform">
            {localHasLiked ? '❤️' : '🤍'}
          </span>
          <span className="text-sm font-medium">{localLikes}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center space-x-2 group ${
            showComments
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
          } transition-colors`}
        >
          <span className="text-xl group-hover:scale-110 transition-transform">💬</span>
          <span className="text-sm font-medium">{localCommentCount}</span>
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors group"
        >
          <span className="text-xl group-hover:scale-110 transition-transform">🔄</span>
          <span className="text-sm font-medium">{localShareCount}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4">
          <CommentList postId={post.postId} refreshKey={commentRefreshKey} />
          <CommentInput
            postId={post.postId}
            onCommentAdded={() => {
              setCommentRefreshKey((prev) => prev + 1)
              setLocalCommentCount((prev) => prev + 1)
            }}
          />
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        post={post}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShareComplete={(newShareCount) => {
          setLocalShareCount(newShareCount)
          setShowShareModal(false)
        }}
      />
    </div>
  )
}
