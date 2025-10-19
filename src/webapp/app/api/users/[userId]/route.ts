import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'

// GET /api/users/[userId] - Get user profile
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId

    const { db } = getFirebaseAdmin()
    const userDoc = await db.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()

    return NextResponse.json({
      success: true,
      user: {
        userId: userData?.userId,
        username: userData?.username,
        displayName: userData?.displayName,
        photoUrl: userData?.photoUrl,
        bio: userData?.bio,
        location: userData?.location,
        membership: userData?.membership,
        socialStats: userData?.socialStats || {
          posts: 0,
          followers: 0,
          following: 0,
        },
        createdAt: userData?.createdAt,
      },
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[userId] - Update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    const userId = params.userId

    // Verify user is updating their own profile
    if (payload.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own profile' },
        { status: 403 }
      )
    }

    const { db } = getFirebaseAdmin()

    // Get current user data
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse update data
    const updateData = await request.json()

    // Validate and sanitize update fields
    const allowedFields = ['displayName', 'bio', 'location', 'photoUrl']
    const updates: any = {}

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'displayName') {
          const displayName = updateData[field].trim()
          if (displayName.length === 0) {
            return NextResponse.json(
              { success: false, error: 'Display name cannot be empty' },
              { status: 400 }
            )
          }
          if (displayName.length > 50) {
            return NextResponse.json(
              { success: false, error: 'Display name is too long (max 50 characters)' },
              { status: 400 }
            )
          }
          updates[field] = displayName
        } else if (field === 'bio') {
          const bio = updateData[field].trim()
          if (bio.length > 500) {
            return NextResponse.json(
              { success: false, error: 'Bio is too long (max 500 characters)' },
              { status: 400 }
            )
          }
          updates[field] = bio || null
        } else if (field === 'location') {
          // Location is an object with text and optional coordinates
          if (updateData[field] && typeof updateData[field] === 'object') {
            const locationText = updateData[field].text?.trim()
            if (locationText && locationText.length > 100) {
              return NextResponse.json(
                { success: false, error: 'Location is too long (max 100 characters)' },
                { status: 400 }
              )
            }
            updates[field] = {
              text: locationText || '',
              coordinates: updateData[field].coordinates || null,
            }
          } else {
            updates[field] = null
          }
        } else if (field === 'photoUrl') {
          // Basic URL validation
          const photoUrl = updateData[field]?.trim()
          if (photoUrl && !photoUrl.startsWith('http')) {
            return NextResponse.json(
              { success: false, error: 'Invalid photo URL' },
              { status: 400 }
            )
          }
          updates[field] = photoUrl || null
        } else {
          updates[field] = updateData[field]
        }
      }
    }

    // Add update timestamp
    updates.updatedAt = new Date()
    updates.lastActive = new Date()

    // Update user in Firestore
    await db.collection('users').doc(userId).update(updates)

    // Get updated user data
    const updatedUserDoc = await db.collection('users').doc(userId).get()
    const updatedUserData = updatedUserDoc.data()

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        userId: updatedUserData?.userId,
        username: updatedUserData?.username,
        displayName: updatedUserData?.displayName,
        photoUrl: updatedUserData?.photoUrl,
        bio: updatedUserData?.bio,
        location: updatedUserData?.location,
        membership: updatedUserData?.membership,
        socialStats: updatedUserData?.socialStats,
        createdAt: updatedUserData?.createdAt,
        updatedAt: updatedUserData?.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
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
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
