import { NextRequest, NextResponse } from 'next/server';

const TIER_CONFIGS = {
  'week-pass': { displayName: 'Pase Semanal' },
  'month-pass': { displayName: 'Pase Mensual' },
  'quarterly-pass': { displayName: 'Pase Trimestral' },
  'yearly-pass': { displayName: 'Pase Anual' },
  'lifetime-pass': { displayName: 'Pase de Por Vida' }
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const username = formData.get('username') as string;
    const tier = formData.get('tier') as string;
    const proofFile = formData.get('proof') as File;

    console.log('[Manual Activation API] Received request:', { userId, username, tier, fileName: proofFile?.name });

    // Validate input
    if (!userId || !tier || !proofFile) {
      console.error('[Manual Activation API] Missing required fields:', { userId, tier, hasFile: !!proofFile });
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
    if (!tierConfig) {
      console.error('[Manual Activation API] Invalid tier:', tier);
      return NextResponse.json(
        { success: false, error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Create FormData to send file to bot API
    const apiFormData = new FormData();
    apiFormData.append('userId', userId);
    apiFormData.append('username', username || '');
    apiFormData.append('tier', tier);
    apiFormData.append('proof', proofFile);

    // Call the bot API to submit for manual review
    const botApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pnptv.app';
    console.log('[Manual Activation API] Calling bot API at:', botApiUrl);

    const response = await fetch(`${botApiUrl}/api/prime-activation/manual`, {
      method: 'POST',
      body: apiFormData,
    });

    console.log('[Manual Activation API] Bot API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Manual Activation API] Bot API error:', errorData);
      return NextResponse.json(
        { success: false, error: errorData.error || 'Submission failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Manual Activation API] Bot API success:', data);

    return NextResponse.json({
      success: true,
      displayName: tierConfig.displayName,
      tier: tier,
      reviewData: data,
      message: 'Tu comprobante ha sido enviado para revisión. Recibirás una notificación cuando sea aprobado.'
    });

  } catch (error) {
    console.error('[Manual Activation API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
