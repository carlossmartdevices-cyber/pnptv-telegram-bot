import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'
import type { User } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'No authentication token provided',
        },
        { status: 401 }
      )
    }

    // Verify JWT token
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired token',
        },
        { status: 401 }
      )
    }

    // Get user from database
    const { db } = getFirebaseAdmin()
    const userDoc = await db.collection('users').doc(payload.userId).get()

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      )
    }

    const userData = userDoc.data() as User

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        userId: userData.userId,
        telegramId: payload.telegramId,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        photoUrl: userData.photoUrl,
        bio: userData.bio,
        location: userData.location,
        membership: userData.membership,
        socialStats: userData.socialStats || {
          posts: 0,
          followers: 0,
          following: 0,
        },
        settings: userData.settings,
        createdAt: userData.createdAt,
        lastActive: userData.lastActive,
      },
    })
  } catch (error) {
    console.error('Error in /api/auth/me:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
