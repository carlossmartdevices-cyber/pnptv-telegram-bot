import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { sendTelegramMessage, addUserToChannel } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Basic ${process.env.DAIMO_WEBHOOK_TOKEN}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    
    // Handle payment completion
    if (payload.event === 'payment.completed') {
      const { userId, planId, amount, reference } = payload.data;
      
      // Store payment record in Firebase
      await db.collection('payments').doc(reference).set({
        userId,
        planId,
        amount,
        status: 'completed',
        timestamp: new Date(),
      });

      // Update user subscription
      await db.collection('subscriptions').doc(userId).set({
        planId,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      // Add user to Telegram channel
      await addUserToChannel(userId);

      // Send confirmation message
      await sendTelegramMessage(`
✅ New Subscription Activated!
👤 User ID: ${userId}
💎 Plan: ${planId}
💰 Amount: ${amount} USDC
      `);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}