import { NextRequest, NextResponse } from 'next/server'
import { validateTelegramAuthComplete } from '@/lib/telegram'
import { generateToken } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'
import type { TelegramAuthData } from '@/lib/telegram'
import type { User } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const telegramData: TelegramAuthData = await request.json()

    console.log('Telegram auth request:', {
      id: telegramData.id,
      username: telegramData.username,
    })

    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error. Please contact support.',
        },
        { status: 500 }
      )
    }

    // Validate Telegram authentication
    const validation = validateTelegramAuthComplete(telegramData, botToken)

    if (!validation.valid) {
      console.error('Telegram auth validation failed:', validation.error)
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 401 }
      )
    }

    // Get Firestore instance
    const { db } = getFirebaseAdmin()

    // Check if user exists in bot database
    const userId = telegramData.id.toString()
    const userDoc = await db.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      console.error('User not found in database:', userId)
      return NextResponse.json(
        {
          success: false,
          error: 'User not found. Please start the bot first.',
          botUrl: `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'PNPtvBot'}`,
        },
        { status: 403 }
      )
    }

    const userData = userDoc.data() as User

    // Update last active timestamp
    await db.collection('users').doc(userId).update({
      lastActive: new Date(),
      lastLoginWeb: new Date(),
    })

    // Generate JWT token
    const token = generateToken({
      userId,
      telegramId: telegramData.id,
      username: telegramData.username,
    })

    console.log('Authentication successful for user:', userId)

    // Return success with token and user data
    return NextResponse.json({
      success: true,
      token,
      user: {
        userId: userData.userId,
        telegramId: telegramData.id,
        username: telegramData.username || userData.username,
        firstName: telegramData.first_name,
        lastName: telegramData.last_name,
        displayName: userData.displayName || telegramData.first_name,
        photoUrl: telegramData.photo_url || userData.photoUrl,
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
        lastActive: new Date(),
      },
    })
  } catch (error) {
    console.error('Error in Telegram auth endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error. Please try again.',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
