#!/usr/bin/env node

/**
 * Payment Intent Completion Processor
 * Manually processes completed payment intents and activates memberships
 */

const { db } = require('./src/config/firebase');
const membershipManager = require('./src/utils/membershipManager');
const planService = require('./src/services/planService');
const { monitorPaymentIntents } = require('./monitor-payment-intents');

console.log('=== PAYMENT INTENT COMPLETION PROCESSOR ===\n');

async function processCompletedIntents() {
  try {
    console.log('🔍 Checking for completed payment intents to process...\n');

    // First, monitor current status of all intents
    const monitorResult = await monitorPaymentIntents();
    
    if (monitorResult.completedIntents.length === 0) {
      console.log('⏳ No completed payment intents found. Checking for manually completable intents...');
      
      // Check if any intents might be paid but not updated
      const oldUnpaidSnapshot = await db.collection('payment_intents')
        .where('status', '==', 'payment_unpaid')
        .where('createdAt', '<', new Date(Date.now() - 10 * 60 * 1000)) // Older than 10 minutes
        .get();

      if (!oldUnpaidSnapshot.empty) {
        console.log(`\n🔍 Found ${oldUnpaidSnapshot.size} old unpaid intents. These might need manual verification:`);
        
        oldUnpaidSnapshot.forEach(doc => {
          const data = doc.data();
          const age = Math.round((Date.now() - data.createdAt.toDate().getTime()) / (1000 * 60));
          console.log(`   • ${doc.id} - $${data.amount} - ${age}min old - User: ${data.userId} - Plan: ${data.planId}`);
        });
        
        console.log('\n💡 To manually complete these intents (if actually paid):');
        console.log('   node process-payment-intents.js complete <intentId>');
      }
      
      return;
    }

    console.log(`\n🎉 Found ${monitorResult.completedIntents.length} completed payment intents to process!\n`);

    let processed = 0;
    let failed = 0;
    let totalRevenue = 0;

    for (const intent of monitorResult.completedIntents) {
      try {
        const result = await processCompletedIntent(intent);
        
        if (result.success) {
          processed++;
          totalRevenue += intent.amount || 0;
          console.log(`✅ Processed: ${intent.id} ($${intent.amount}) for user ${intent.userId}`);
        } else {
          failed++;
          console.log(`❌ Failed: ${intent.id} - ${result.error}`);
        }
        
      } catch (error) {
        failed++;
        console.log(`❌ Error processing ${intent.id}: ${error.message}`);
      }
    }

    console.log('\n=== PROCESSING SUMMARY ===');
    console.log(`✅ Processed: ${processed} payment intents`);
    console.log(`❌ Failed: ${failed} payment intents`);
    console.log(`💰 Revenue activated: $${totalRevenue.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error in processing:', error);
    throw error;
  }
}

async function processCompletedIntent(intent) {
  try {
    console.log(`\n🔄 Processing intent: ${intent.id}`);
    console.log(`   Amount: $${intent.amount}`);
    console.log(`   User: ${intent.userId}`);
    console.log(`   Plan: ${intent.planId}`);

    // 1. Get plan details
    const plan = await planService.getPlanById(intent.planId);
    if (!plan) {
      return { success: false, error: `Plan ${intent.planId} not found` };
    }

    console.log(`   Plan Name: ${plan.name}`);
    console.log(`   Plan Tier: ${plan.tier}`);

    // 2. Create a payment record in the payments collection
    const paymentId = `intent_${intent.id}`;
    await db.collection('payments').doc(paymentId).set({
      id: paymentId,
      userId: intent.userId,
      planId: intent.planId,
      amount: intent.amount,
      currency: intent.currency || 'USDC',
      status: 'payment_completed',
      paymentMethod: 'daimo',
      reference: intent.reference || intent.id,
      source: 'payment_intent_processor',
      intentId: intent.id,
      createdAt: intent.createdAt || new Date(),
      completedAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`   ✅ Created payment record: ${paymentId}`);

    // 3. Activate membership
    const tier = plan.tier || plan.tierName || plan.name || 'Premium';
    const durationDays = plan.durationDays || plan.duration || 30;

    // Try to load bot instance for notifications
    let botInstance = null;
    try {
      botInstance = require('./src/bot/index');
    } catch (e) {
      console.log(`   ⚠️  Bot instance not available for notifications`);
    }

    const activationOptions = {
      paymentAmount: intent.amount,
      paymentCurrency: intent.currency || 'USDC',
      paymentMethod: 'Daimo USDC',
      reference: intent.id,
    };

    const activationResult = await membershipManager.activateMembership(
      intent.userId,
      tier,
      'payment_intent_processor',
      durationDays,
      botInstance,
      activationOptions
    );

    if (!activationResult.success) {
      return { success: false, error: 'membership_activation_failed' };
    }

    console.log(`   ✅ Membership activated: ${tier} for ${durationDays} days`);

    // 4. Mark intent as processed
    await db.collection('payment_intents').doc(intent.id).update({
      processedAt: new Date(),
      processedBy: 'payment_intent_processor',
      membershipActivated: true,
      updatedAt: new Date()
    });

    console.log(`   ✅ Intent marked as processed`);

    return { success: true };

  } catch (error) {
    console.error(`❌ Error processing intent ${intent.id}:`, error);
    return { success: false, error: error.message };
  }
}

// Manual completion function
async function manuallyCompleteIntent(intentId, force = false) {
  try {
    console.log(`🔧 Manually completing intent: ${intentId}\n`);

    const intentDoc = await db.collection('payment_intents').doc(intentId).get();
    if (!intentDoc.exists) {
      throw new Error(`Payment intent ${intentId} not found`);
    }

    const intentData = intentDoc.data();
    console.log(`Current status: ${intentData.status}`);
    console.log(`Amount: $${intentData.amount}`);
    console.log(`User: ${intentData.userId}`);
    console.log(`Plan: ${intentData.planId}`);

    if (intentData.status === 'payment_completed' && !force) {
      console.log('⚠️  Intent already completed. Use --force to reprocess.');
      return;
    }

    if (intentData.status === 'payment_unpaid' && !force) {
      console.log('⚠️  Intent shows as unpaid. Only complete if you have verified payment was received.');
      console.log('Use --force to complete anyway.');
      return;
    }

    // Update status to completed
    await db.collection('payment_intents').doc(intentId).update({
      status: 'payment_completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      manuallyCompleted: true,
      completedBy: 'manual_admin'
    });

    console.log('✅ Status updated to payment_completed');

    // Process it
    const result = await processCompletedIntent({
      id: intentId,
      ...intentData,
      status: 'payment_completed'
    });

    if (result.success) {
      console.log('✅ Intent manually completed and processed successfully!');
    } else {
      console.log(`❌ Processing failed: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Manual completion failed:', error);
  }
}

// Export functions
module.exports = { processCompletedIntents, processCompletedIntent, manuallyCompleteIntent };

// Run if called directly
if (require.main === module) {
  const action = process.argv[2];
  const intentId = process.argv[3];
  const force = process.argv.includes('--force');

  if (action === 'complete' && intentId) {
    manuallyCompleteIntent(intentId, force)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('❌ Manual completion failed:', error);
        process.exit(1);
      });
  } else {
    processCompletedIntents()
      .then(() => {
        console.log('\n✅ Payment intent processing completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Processing failed:', error);
        process.exit(1);
      });
  }
}