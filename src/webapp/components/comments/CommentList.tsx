'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { Comment } from '@/types'
import { getAuthToken } from '@/lib/auth'

interface CommentListProps {
  postId: string
  refreshKey?: number
}

export function CommentList({ postId, refreshKey = 0 }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | undefined>()

  const loadComments = async (loadMore = false) => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: '20',
      })

      if (loadMore && cursor) {
        params.append('cursor', cursor)
      }

      const response = await fetch(`/api/posts/${postId}/comments?${params}`)

      if (!response.ok) {
        throw new Error('Failed to load comments')
      }

      const data = await response.json()

      if (loadMore) {
        setComments((prev) => [...prev, ...data.items])
      } else {
        setComments(data.items)
      }

      setHasMore(data.hasMore)
      setCursor(data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete comment')
      }

      // Remove comment from local state
      setComments((prev) => prev.filter((c) => c.commentId !== commentId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  useEffect(() => {
    loadComments()
  }, [postId, refreshKey])

  if (isLoading && comments.length === 0) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-start space-x-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="flex-1">
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="mt-4 text-center py-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No comments yet. Be the first to comment!
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.commentId}
          comment={comment}
          onDelete={handleDeleteComment}
        />
      ))}

      {hasMore && (
        <button
          onClick={() => loadComments(true)}
          disabled={isLoading}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load more comments'}
        </button>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  onDelete,
}: {
  comment: Comment
  onDelete: (commentId: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  const formattedDate = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
    : 'just now'

  return (
    <div className="flex items-start space-x-3 group">
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
        {comment.author.displayName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {comment.author.displayName}
              </span>
              {comment.author.username && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{comment.author.username}
                </span>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-opacity"
              >
                ⋯
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10">
                  <button
                    onClick={() => {
                      onDelete(comment.commentId)
                      setShowMenu(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>

        <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{formattedDate}</span>
          {comment.likes > 0 && (
            <button className="hover:text-primary-600 dark:hover:text-primary-400">
              {comment.likes} likes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
