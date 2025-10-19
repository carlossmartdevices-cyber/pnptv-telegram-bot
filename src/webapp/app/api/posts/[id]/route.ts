import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'

// GET /api/posts/:id - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = getFirebaseAdmin()
    const postDoc = await db.collection('posts').doc(params.id).get()

    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    const data = postDoc.data()!

    // Get author info
    const authorDoc = await db.collection('users').doc(data.userId).get()
    const authorData = authorDoc.data()

    const post = {
      postId: postDoc.id,
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
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    }

    return NextResponse.json({ success: true, post })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/:id - Delete post
export async function DELETE(
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
    const postDoc = await db.collection('posts').doc(params.id).get()

    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    const postData = postDoc.data()!

    // Check if user owns the post
    if (postData.userId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only delete your own posts' },
        { status: 403 }
      )
    }

    // Delete post
    await db.collection('posts').doc(params.id).delete()

    // Decrement user's post count
    await db.collection('users').doc(payload.userId).update({
      'socialStats.posts': (db as any).FieldValue.increment(-1),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
