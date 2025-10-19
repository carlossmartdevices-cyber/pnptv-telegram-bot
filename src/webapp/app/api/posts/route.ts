import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'
import type { Post } from '@/types'

// GET /api/posts - List posts (with filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')
    const userId = searchParams.get('userId')

    const { db } = getFirebaseAdmin()

    let query = db.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(limit)

    // Filter by user if specified
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

      posts.push({
        postId: doc.id,
        userId: data.userId,
        author: {
          userId: data.userId,
          displayName: authorData?.displayName || 'Unknown',
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
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// POST /api/posts - Create new post
export async function POST(request: NextRequest) {
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

    // Get post data
    const { content, mediaUrls, location, visibility } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Content is too long (max 5000 characters)' },
        { status: 400 }
      )
    }

    // Create post in Firestore
    const { db } = getFirebaseAdmin()

    const postData = {
      userId: payload.userId,
      content: content.trim(),
      mediaUrls: mediaUrls || [],
      location: location || null,
      visibility: visibility || 'public',
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const postRef = await db.collection('posts').add(postData)

    // Update user's post count
    await db.collection('users').doc(payload.userId).update({
      'socialStats.posts': (db as any).FieldValue.increment(1),
      lastActive: new Date(),
    })

    return NextResponse.json({
      success: true,
      postId: postRef.id,
      post: {
        postId: postRef.id,
        ...postData,
      },
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
