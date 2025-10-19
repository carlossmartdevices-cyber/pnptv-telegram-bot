import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'
import type { Post } from '@/types'

// GET /api/feed - Get feed of posts
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const feedType = searchParams.get('type') || 'main'
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')
    const userId = searchParams.get('userId')

    const { db } = getFirebaseAdmin()

    let query = db.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit)

    // Apply filters based on feed type
    if (feedType === 'prime') {
      query = query.where('visibility', '==', 'prime') as any
    } else if (feedType === 'nearby') {
      query = query.where('visibility', 'in', ['public', 'nearby']) as any
    } else {
      // Main feed - public posts
      query = query.where('visibility', 'in', ['public']) as any
    }

    // Filter by specific user
    if (userId) {
      query = query.where('userId', '==', userId) as any
    }

    // Pagination cursor
    if (cursor) {
      const cursorDoc = await db.collection('posts').doc(cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc) as any
      }
    }

    const snapshot = await query.get()

    const posts: Post[] = []
    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Get author info
      const authorDoc = await db.collection('users').doc(data.userId).get()
      const authorData = authorDoc.data()

      // Check if current user liked this post
      const likeId = `${payload.userId}_${doc.id}`
      const likeDoc = await db.collection('interactions').doc(likeId).get()

      posts.push({
        postId: doc.id,
        userId: data.userId,
        author: {
          userId: data.userId,
          displayName: authorData?.displayName || 'Unknown User',
          username: authorData?.username,
          photoUrl: authorData?.photoUrl,
        },
        content: data.content,
        mediaUrls: data.mediaUrls || [],
        location: data.location,
        visibility: data.visibility,
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        hasLiked: likeDoc.exists,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      })
    }

    return NextResponse.json({
      success: true,
      items: posts,
      hasMore: snapshot.docs.length === limit,
      nextCursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
    })
  } catch (error) {
    console.error('Error fetching feed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feed' },
      { status: 500 }
    )
  }
}
