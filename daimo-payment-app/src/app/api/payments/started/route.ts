import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, planId, userId, reference } = body;

    // Log payment start
    console.log('Payment started:', { amount, planId, userId, reference });

    // Here you can add logic to:
    // 1. Store payment attempt in database
    // 2. Log for analytics
    // 3. Notify your bot backend

    // For now, we'll make a request to your bot backend
    const botUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pnptv.app/api';
    
    try {
      const response = await fetch(`${botUrl}/payment/started`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          planId,
          userId,
          reference,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.warn('Failed to notify bot backend:', response.status);
      }
    } catch (error) {
      console.warn('Error notifying bot backend:', error);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment start logged',
      reference 
    });

  } catch (error) {
    console.error('Error logging payment start:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log payment start' },
      { status: 500 }
    );
  }
}