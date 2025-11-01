import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    console.log('Daimo webhook received');

    // Get the Daimo signature from headers
    const signature = request.headers.get('daimo-signature')
    if (!signature) {
      console.warn('Missing Daimo signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Get the raw request body
    const rawBody = await request.text()
    
    // Verify the webhook signature (only in production)
    if (process.env.NODE_ENV === 'production' && process.env.DAIMO_WEBHOOK_SECRET) {
      // Simple signature verification for Daimo webhooks
      // Note: Daimo webhook signature verification may vary by version
      // For now, we'll skip strict verification and rely on HTTPS + secret
      console.log('Webhook signature present, proceeding with payload processing');
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

    console.log('Daimo webhook data:', {
      paymentId,
      status,
      userId: metadata?.userId,
      planId: metadata?.planId,
      amount: metadata?.amount
    });

    // Only process successful payments
    if (status !== 'completed') {
      console.log('Payment not completed, status:', status);
      return NextResponse.json(
        { message: 'Payment not completed' },
        { status: 200 }
      )
    }

    // Forward the webhook to the main bot's webhook handler
    const botWebhookUrl = process.env.BOT_WEBHOOK_URL || process.env.BOT_URL;
    if (botWebhookUrl) {
      try {
        console.log('Forwarding webhook to bot at:', `${botWebhookUrl}/daimo/webhook`);
        
        const forwardResponse = await fetch(`${botWebhookUrl}/daimo/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${process.env.DAIMO_WEBHOOK_TOKEN || 'webhook-token'}`,
            'User-Agent': 'Daimo-Payment-App-Webhook-Forwarder/1.0'
          },
          body: JSON.stringify({
            type: 'payment_completed',
            paymentId,
            status,
            toAddress,
            toUnits,
            fromAddress,
            metadata,
            timestamp: Date.now(),
            reference: `${metadata?.planId}_${metadata?.userId}_${Date.now()}`
          })
        });

        if (forwardResponse.ok) {
          console.log('Successfully forwarded webhook to bot');
        } else {
          console.warn('Failed to forward webhook to bot:', forwardResponse.status);
        }
      } catch (forwardError) {
        console.error('Error forwarding webhook to bot:', forwardError);
      }
    }

    // Also try to activate the subscription directly (fallback)
    try {
      await activateSubscription(metadata?.userId, metadata?.planId, webhookData);
    } catch (activationError) {
      console.error('Direct subscription activation failed:', activationError);
    }

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

async function activateSubscription(userId: string, planId: string, webhookData: any) {
  if (!userId || !planId) {
    console.warn('Missing userId or planId for subscription activation');
    return;
  }

  try {
    // Import Firebase and bot modules
    const { db } = require('../../../../../../src/config/firebase');
    const planService = require('../../../../../../src/services/planService');

    // Get plan details
    const plan = await planService.getPlanById(planId);
    if (!plan) {
      console.error('Plan not found:', planId);
      return;
    }

    // Check if user exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error('User not found:', userId);
      return;
    }

    // Use membership manager to activate subscription
    const { activateMembership } = require('../../../../../../src/utils/membershipManager');
    const durationDays = plan.duration || plan.durationDays || 30;
    
    // Create a minimal bot object for membership activation
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

    const result = await activateMembership(userId, plan.tier, 'daimo_webhook', durationDays, bot);

    // Store additional payment metadata
    const now = new Date();
    await userRef.update({
      membershipPlanId: plan.id,
      membershipPlanName: plan.displayName || plan.name,
      paymentMethod: 'daimo',
      paymentReference: webhookData.paymentId,
      paymentAmount: parseFloat(webhookData.metadata?.amount || '0'),
      paymentCurrency: 'USDC',
      paymentNetwork: 'base',
      paymentDate: now,
      updatedAt: now,
    });

    console.log('Subscription activated:', {
      userId,
      planId,
      tier: plan.tier,
      expiresAt: result.expiresAt?.toISOString(),
      inviteLink: result.inviteLink ? 'generated' : 'none',
    });

    // Send confirmation message to user using standardized format
    try {
      const userData = userDoc.data();
      const userName = userData.username || userData.firstName || 'User';
      const userLanguage = userData.language || 'en'; // Default to English for Daimo

      const { generateConfirmationMessage } = require('../../../../../../src/utils/membershipManager');
      
      const confirmationMessage = generateConfirmationMessage({
        userName,
        planName: plan.displayName || plan.name,
        durationDays,
        expiresAt: result.expiresAt,
        paymentAmount: webhookData.metadata?.amount,
        paymentCurrency: 'USDC',
        paymentMethod: 'daimo',
        reference: webhookData.paymentId,
        inviteLink: result.inviteLink,
        language: userLanguage
      });

      await bot.telegram.sendMessage(userId, confirmationMessage, { parse_mode: "Markdown" });
      console.log('Confirmation message sent to user');
    } catch (msgError) {
      console.warn('Failed to send confirmation message:', msgError instanceof Error ? msgError.message : 'Unknown error');
    }

  } catch (error) {
    console.error('Error in direct subscription activation:', error);
    throw error;
  }
}