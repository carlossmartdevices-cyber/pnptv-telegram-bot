import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'

// POST /api/posts/[id]/share - Share a post
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
    const { db } = getFirebaseAdmin()

    // Verify post exists
    const postDoc = await db.collection('posts').doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    const postData = postDoc.data()

    // Parse request body for share type
    const body = await request.json().catch(() => ({}))
    const shareType = body.shareType || 'link' // link, telegram, twitter, etc.

    // Create share record in subcollection
    const shareData = {
      postId,
      userId: payload.userId,
      shareType,
      createdAt: new Date(),
    }

    await db
      .collection('posts')
      .doc(postId)
      .collection('shares')
      .add(shareData)

    // Increment share count on post
    await db.collection('posts').doc(postId).update({
      shares: (db as any).FieldValue.increment(1),
      updatedAt: new Date(),
    })

    // Get updated share count
    const updatedPostDoc = await db.collection('posts').doc(postId).get()
    const updatedPostData = updatedPostDoc.data()

    console.log(`Post ${postId} shared by user ${payload.userId} via ${shareType}`)

    return NextResponse.json({
      success: true,
      shares: updatedPostData?.shares || 0,
      message: 'Post shared successfully',
    })
  } catch (error) {
    console.error('Error sharing post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to share post' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
