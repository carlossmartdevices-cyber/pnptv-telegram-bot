import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'

export async function POST(request: NextRequest) {
  try {
    // Extract and verify token (optional - best effort)
    const authHeader = request.headers.get('Authorization')
    const token = extractTokenFromHeader(authHeader)

    if (token) {
      const payload = verifyToken(token)

      if (payload) {
        // Update user's last logout timestamp
        const { db } = getFirebaseAdmin()
        await db.collection('users').doc(payload.userId).update({
          lastLogoutWeb: new Date(),
          lastActive: new Date(),
        })
      }
    }

    // For stateless JWT auth, logout is handled client-side
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    // Still return success since client-side logout should proceed
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
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
