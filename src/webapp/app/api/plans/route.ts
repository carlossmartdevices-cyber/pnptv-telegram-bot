import { NextRequest, NextResponse } from 'next/server'
import { getFirebaseAdmin } from '@/lib/firebase'

// GET /api/plans - Get all active plans
export async function GET(request: NextRequest) {
  try {
    const { db } = getFirebaseAdmin()

    // Get active plans from Firestore
    const snapshot = await db
      .collection('plans')
      .where('active', '==', true)
      .get()

    if (snapshot.empty) {
      // Return default plans if none in Firestore
      return NextResponse.json({
        success: true,
        plans: getDefaultPlans(),
      })
    }

    // Sort plans by price in memory
    const plans = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => (a.price || 0) - (b.price || 0))

    return NextResponse.json({
      success: true,
      plans,
    })
  } catch (error) {
    console.error('Error fetching plans:', error)

    // Return default plans on error
    return NextResponse.json({
      success: true,
      plans: getDefaultPlans(),
    })
  }
}

// Default plans fallback
function getDefaultPlans() {
  return [
    {
      id: 'free',
      name: 'free',
      displayName: 'Free',
      tier: 'free',
      price: 0,
      priceInCOP: 0,
      currency: 'USD',
      duration: 30,
      icon: '🆓',
      description: 'Basic access to PNPtv platform',
      features: [
        'Public posts',
        'Comment and like',
        'Basic profile',
        'Standard support',
      ],
      active: true,
      recommended: false,
      paymentMethod: 'none',
    },
    {
      id: 'prime',
      name: 'prime',
      displayName: 'PRIME',
      tier: 'prime',
      price: 5,
      priceInCOP: 20000,
      currency: 'USD',
      duration: 30,
      icon: '💎',
      description: 'Premium features and exclusive content',
      features: [
        'Everything in Free',
        'Ad-free experience',
        'PRIME exclusive content',
        'Priority support',
        'Custom profile badge',
      ],
      active: true,
      recommended: true,
      paymentMethod: 'daimo',
      cryptoBonus: '10% bonus in USDC',
    },
    {
      id: 'premium',
      name: 'premium',
      displayName: 'Premium',
      tier: 'premium',
      price: 10,
      priceInCOP: 40000,
      currency: 'USD',
      duration: 30,
      icon: '⭐',
      description: 'Ultimate PNPtv experience',
      features: [
        'Everything in PRIME',
        'Early access to features',
        'Unlimited media uploads',
        'Analytics dashboard',
        'VIP support',
        'Exclusive events access',
      ],
      active: true,
      recommended: false,
      paymentMethod: 'daimo',
      cryptoBonus: '15% bonus in USDC',
    },
  ]
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
