import { NextRequest, NextResponse } from 'next/server';

const TIER_CONFIGS = {
  'week-pass': { days: 7, displayName: 'Pase Semanal' },
  'month-pass': { days: 30, displayName: 'Pase Mensual' },
  'quarterly-pass': { days: 90, displayName: 'Pase Trimestral' },
  'yearly-pass': { days: 365, displayName: 'Pase Anual' },
  'lifetime-pass': { days: null, displayName: 'Pase de Por Vida' }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, tier } = body;

    console.log('[Prime Activation API] Received request:', { userId, username, tier });

    // Validate input
    if (!userId || !tier) {
      console.error('[Prime Activation API] Missing required fields:', { userId, tier });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
    if (!tierConfig) {
      console.error('[Prime Activation API] Invalid tier:', tier);
      return NextResponse.json(
        { success: false, error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Call the bot API to activate the membership
    const botApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pnptv.app';
    console.log('[Prime Activation API] Calling bot API at:', botApiUrl);

    const response = await fetch(`${botApiUrl}/api/prime-activation/auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        username: username,
        tier: tier,
        migrationActivation: true
      }),
    });

    console.log('[Prime Activation API] Bot API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Prime Activation API] Bot API error:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || 'Activation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Prime Activation API] Bot API success:', data);

    // Calculate dates
    const startDate = new Date();
    const endDate = tierConfig.days
      ? new Date(startDate.getTime() + tierConfig.days * 24 * 60 * 60 * 1000)
      : null; // Lifetime has no end date

    return NextResponse.json({
      success: true,
      displayName: tierConfig.displayName,
      tier: tier,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
      nextPaymentDate: endDate ? endDate.toISOString() : null,
      membershipData: data
    });

  } catch (error) {
    console.error('[Prime Activation API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
