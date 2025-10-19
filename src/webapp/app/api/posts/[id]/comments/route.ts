import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'

// GET /api/posts/[id]/comments - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const cursor = searchParams.get('cursor')

    const { db } = getFirebaseAdmin()

    // Verify post exists
    const postDoc = await db.collection('posts').doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Get comments
    let query = db
      .collection('posts')
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .limit(limit)

    if (cursor) {
      const cursorDoc = await db
        .collection('posts')
        .doc(postId)
        .collection('comments')
        .doc(cursor)
        .get()

      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc) as any
      }
    }

    const snapshot = await query.get()

    const comments = []
    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Get author info
      const authorDoc = await db.collection('users').doc(data.userId).get()
      const authorData = authorDoc.data()

      comments.push({
        commentId: doc.id,
        postId,
        userId: data.userId,
        author: {
          userId: data.userId,
          displayName: authorData?.displayName || 'Unknown User',
          username: authorData?.username,
          photoUrl: authorData?.photoUrl,
        },
        content: data.content,
        likes: data.likes || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      })
    }

    return NextResponse.json({
      success: true,
      items: comments,
      hasMore: snapshot.docs.length === limit,
      nextCursor: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST /api/posts/[id]/comments - Create a comment
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

    const postId = params.id
    const { content } = await request.json()

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Comment is too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    const { db } = getFirebaseAdmin()

    // Verify post exists
    const postDoc = await db.collection('posts').doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Create comment
    const commentData = {
      postId,
      userId: payload.userId,
      content: content.trim(),
      likes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const commentRef = await db
      .collection('posts')
      .doc(postId)
      .collection('comments')
      .add(commentData)

    // Increment comment count on post
    await db.collection('posts').doc(postId).update({
      comments: (db as any).FieldValue.increment(1),
      updatedAt: new Date(),
    })

    // Get author info for response
    const authorDoc = await db.collection('users').doc(payload.userId).get()
    const authorData = authorDoc.data()

    return NextResponse.json({
      success: true,
      comment: {
        commentId: commentRef.id,
        postId,
        userId: payload.userId,
        author: {
          userId: payload.userId,
          displayName: authorData?.displayName || 'Unknown User',
          username: authorData?.username,
          photoUrl: authorData?.photoUrl,
        },
        content: commentData.content,
        likes: 0,
        createdAt: commentData.createdAt,
      },
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
