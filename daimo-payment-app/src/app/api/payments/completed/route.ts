import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, planId, userId, reference } = body;

    // Log payment completion
    console.log('Payment completed:', { amount, planId, userId, reference });

    // Notify your bot backend about successful payment
    const botUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pnptv.app/api';
    
    try {
      const response = await fetch(`${botUrl}/payment/completed`, {
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
          status: 'completed',
        }),
      });

      if (!response.ok) {
        console.error('Failed to notify bot backend:', response.status);
        return NextResponse.json(
          { success: false, error: 'Failed to notify backend' },
          { status: 500 }
        );
      }

      const result = await response.json();
      console.log('Bot backend notified:', result);

    } catch (error) {
      console.error('Error notifying bot backend:', error);
      return NextResponse.json(
        { success: false, error: 'Backend notification failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment completed successfully',
      reference 
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}