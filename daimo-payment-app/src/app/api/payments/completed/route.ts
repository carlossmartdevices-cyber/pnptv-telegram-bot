import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, planId, userId, reference } = body;

    // Log payment completion
    console.log('Payment completed:', { amount, planId, userId, reference });

    // Notify the main bot backend about successful payment
    const botUrl = process.env.BOT_WEBHOOK_URL || process.env.BOT_URL || 'https://pnptv.app';
    
    try {
      const response = await fetch(`${botUrl}/api/payment/completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Daimo-Payment-App/1.0'
        },
        body: JSON.stringify({
          amount,
          planId,
          userId,
          reference,
          timestamp: new Date().toISOString(),
          status: 'completed',
          paymentMethod: 'daimo'
        }),
      });

      if (!response.ok) {
        console.error('Failed to notify bot backend:', response.status);
        // Don't fail the request if backend notification fails
        console.warn('Backend notification failed, but payment was successful');
      } else {
        const result = await response.json();
        console.log('Bot backend notified successfully:', result);
      }

    } catch (error) {
      console.error('Error notifying bot backend:', error);
      // Don't fail the request if backend notification fails
      console.warn('Backend notification error, but payment was successful');
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