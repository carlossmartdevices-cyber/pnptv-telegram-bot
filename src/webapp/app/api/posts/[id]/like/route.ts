import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'

// POST /api/posts/:id/like - Toggle like on post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { db } = getFirebaseAdmin()
    const postId = params.id

    // Check if post exists
    const postDoc = await db.collection('posts').doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if user already liked this post
    const likeId = `${payload.userId}_${postId}`
    const likeDoc = await db.collection('interactions').doc(likeId).get()

    let hasLiked = false
    let newLikeCount = postDoc.data()!.likes || 0

    if (likeDoc.exists) {
      // Unlike - remove interaction
      await db.collection('interactions').doc(likeId).delete()

      // Decrement likes count
      newLikeCount = Math.max(0, newLikeCount - 1)
      await db.collection('posts').doc(postId).update({
        likes: newLikeCount,
      })

      hasLiked = false
    } else {
      // Like - create interaction
      await db.collection('interactions').doc(likeId).set({
        userId: payload.userId,
        postId,
        type: 'like',
        createdAt: new Date(),
      })

      // Increment likes count
      newLikeCount += 1
      await db.collection('posts').doc(postId).update({
        likes: newLikeCount,
      })

      hasLiked = true
    }

    return NextResponse.json({
      success: true,
      hasLiked,
      likes: newLikeCount,
    })
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle like' },
      { status: 500 }
    )
  }
}
