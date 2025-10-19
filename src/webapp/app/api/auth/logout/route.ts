import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // For stateless JWT auth, logout is handled client-side
  // Just return success to confirm the endpoint exists
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  })
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
