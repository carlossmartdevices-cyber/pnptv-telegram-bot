import { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { amount, userId } = await req.json();

    if (!amount || !userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), { status: 400 });
    }

    // Verify user exists and is eligible for payment
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), { status: 404 });
    }

    // Check if user has any existing active subscriptions
    const subscriptions = await db.collection('subscriptions')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();

    if (!subscriptions.empty) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User already has an active subscription'
      }), { status: 400 });
    }

    // Verify payment amount
    const numericAmount = parseFloat(amount);
    const validAmount = process.env.SUBSCRIPTION_AMOUNT ? 
      parseFloat(process.env.SUBSCRIPTION_AMOUNT) : 
      10;

    if (numericAmount !== validAmount) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid payment amount'
      }), { status: 400 });
    }

    // All checks passed
    return new Response(JSON.stringify({
      success: true,
      message: 'Payment verification successful'
    }), { status: 200 });

  } catch (error) {
    console.error('Payment verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { status: 500 });
  }
}