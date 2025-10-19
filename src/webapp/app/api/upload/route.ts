import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { getFirebaseAdmin } from '@/lib/firebase'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// POST /api/upload - Upload image to Firebase Storage
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

    // Parse request body
    const data = await request.json()
    const { image, filename, contentType } = data

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      )
    }

    // Validate content type
    if (contentType && !ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Decode base64 image
    let buffer: Buffer
    try {
      // Remove data URI prefix if present (data:image/jpeg;base64,...)
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
      buffer = Buffer.from(base64Data, 'base64')
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid image data' },
        { status: 400 }
      )
    }

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      )
    }

    // Initialize Firebase Storage
    const { storage } = getFirebaseAdmin()
    const bucket = storage.bucket()

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = filename?.split('.').pop() || 'jpg'
    const storagePath = `posts/${payload.userId}/${timestamp}-${randomString}.${extension}`

    // Upload to Firebase Storage
    const file = bucket.file(storagePath)

    await file.save(buffer, {
      metadata: {
        contentType: contentType || 'image/jpeg',
        metadata: {
          uploadedBy: payload.userId,
          uploadedAt: new Date().toISOString(),
        },
      },
      public: true, // Make file publicly accessible
    })

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

    console.log('Image uploaded successfully:', publicUrl)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      storagePath,
      size: buffer.length,
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
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
