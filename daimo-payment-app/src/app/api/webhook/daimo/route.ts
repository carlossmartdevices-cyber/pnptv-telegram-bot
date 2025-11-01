import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@daimo/pay'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
const app = initializeApp()
const db = getFirestore(app)

export async function POST(request: Request) {
  try {
    // Get the Daimo signature from headers
    const signature = request.headers.get('daimo-signature')
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Get the raw request body
    const rawBody = await request.text()
    
    // Verify the webhook signature
    const isValid = verifyWebhookSignature(
      rawBody,
      signature,
      process.env.DAIMO_WEBHOOK_SECRET!
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse the webhook payload
    const webhookData = JSON.parse(rawBody)
    const { 
      paymentId,
      status,
      toAddress,
      toUnits,
      fromAddress,
      metadata 
    } = webhookData

    // Only process successful payments
    if (status !== 'completed') {
      return NextResponse.json(
        { message: 'Payment not completed' },
        { status: 200 }
      )
    }

    // Store payment information in Firestore
    await db.collection('payments').doc(paymentId).set({
      paymentId,
      status,
      toAddress,
      toUnits,
      fromAddress,
      metadata,
      timestamp: Date.now()
    })

    // Grant subscription access (you'll need to implement this based on your needs)
    await grantSubscriptionAccess(metadata.userId, metadata.planId)

    return NextResponse.json(
      { message: 'Payment processed successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function grantSubscriptionAccess(userId: string, planId: string) {
  try {
    // Update user's subscription in Firestore
    await db.collection('users').doc(userId).set({
      subscriptionPlan: planId,
      subscriptionStartDate: Date.now(),
      subscriptionStatus: 'active'
    }, { merge: true })

    // You can add additional logic here, such as:
    // - Sending confirmation emails
    // - Updating Telegram bot state
    // - Triggering other subscription-related tasks
    
  } catch (error) {
    console.error('Error granting subscription access:', error)
    throw error
  }
}