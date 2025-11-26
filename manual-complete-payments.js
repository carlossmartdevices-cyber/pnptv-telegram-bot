#!/usr/bin/env node

/**
 * Manual Payment Completion Script
 * Processes all pending payments and allows manual completion with user notifications
 */

const { db } = require('./src/config/firebase');
const membershipManager = require('./src/utils/membershipManager');
const planService = require('./src/services/planService');
const logger = require('./src/utils/logger');

console.log('=== MANUAL PAYMENT COMPLETION SCRIPT ===\n');

async function manualPaymentCompletion() {
  try {
    console.log('💰 Loading pending payments...\n');

    // Get all pending payments
    const paymentsSnapshot = await db.collection('payments')
      .where('status', '==', 'pending')
      .get();

    if (paymentsSnapshot.empty) {
      console.log('✅ No pending payments found!');
      return;
    }

    const pendingPayments = [];
    let totalPendingAmount = 0;

    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      pendingPayments.push({
        id: doc.id,
        ...data
      });
      if (data.amount) {
        totalPendingAmount += data.amount;
      }
    });

    console.log(`🔍 Found ${pendingPayments.length} pending payments worth $${totalPendingAmount.toFixed(2)}\n`);

    // Display all pending payments
    console.log('=== PENDING PAYMENTS ===');
    pendingPayments.forEach((payment, index) => {
      console.log(`${index + 1}. Payment ID: ${payment.id}`);
      console.log(`   Amount: $${payment.amount || 'N/A'}`);
      console.log(`   User ID: ${payment.userId}`);
      console.log(`   Plan: ${payment.planId}`);
      console.log(`   Date: ${payment.createdAt?.toDate?.() || 'N/A'}`);
      console.log(`   Status: ${payment.status}`);
      console.log('');
    });

    // Interactive completion
    console.log('=== COMPLETION OPTIONS ===');
    console.log('1. Complete ALL pending payments');
    console.log('2. Complete specific payment by ID');
    console.log('3. Complete payments for specific user');
    console.log('4. Complete payments by plan');
    console.log('5. Mark as failed (instead of complete)');
    console.log('6. Export payment data (CSV)');
    console.log('0. Exit without changes\n');

    // For automation, we'll complete all payments
    const choice = process.argv[2] || '1';

    switch (choice) {
      case '1':
        await completeAllPayments(pendingPayments);
        break;
      case '2':
        const paymentId = process.argv[3];
        if (!paymentId) {
          console.log('❌ Please provide payment ID: node manual-complete-payments.js 2 <paymentId>');
          return;
        }
        await completeSpecificPayment(paymentId);
        break;
      case '3':
        const userId = process.argv[3];
        if (!userId) {
          console.log('❌ Please provide user ID: node manual-complete-payments.js 3 <userId>');
          return;
        }
        await completeUserPayments(pendingPayments, userId);
        break;
      case '4':
        const planId = process.argv[3];
        if (!planId) {
          console.log('❌ Please provide plan ID: node manual-complete-payments.js 4 <planId>');
          return;
        }
        await completePlanPayments(pendingPayments, planId);
        break;
      case '5':
        await markPaymentsAsFailed(pendingPayments);
        break;
      case '6':
        await exportPaymentData(pendingPayments);
        break;
      case '0':
        console.log('👋 Exiting without changes');
        return;
      default:
        console.log('❌ Invalid choice');
        return;
    }

  } catch (error) {
    console.error('❌ Error in manual payment completion:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

/**
 * Complete all pending payments
 */
async function completeAllPayments(payments) {
  console.log(`🚀 Completing ${payments.length} pending payments...\n`);

  let completed = 0;
  let failed = 0;
  let totalRevenue = 0;

  for (const payment of payments) {
    try {
      const result = await completePayment(payment);
      if (result.success) {
        completed++;
        totalRevenue += payment.amount || 0;
        console.log(`✅ Completed: ${payment.id} ($${payment.amount}) for user ${payment.userId}`);
      } else {
        failed++;
        console.log(`❌ Failed: ${payment.id} - ${result.error}`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ Error completing ${payment.id}: ${error.message}`);
    }
  }

  console.log('\n=== COMPLETION SUMMARY ===');
  console.log(`✅ Completed: ${completed} payments`);
  console.log(`❌ Failed: ${failed} payments`);
  console.log(`💰 Revenue realized: $${totalRevenue.toFixed(2)}`);
}

/**
 * Complete a specific payment by ID
 */
async function completeSpecificPayment(paymentId) {
  console.log(`🎯 Completing specific payment: ${paymentId}...\n`);

  try {
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      console.log(`❌ Payment ${paymentId} not found`);
      return;
    }

    const payment = { id: paymentDoc.id, ...paymentDoc.data() };
    const result = await completePayment(payment);

    if (result.success) {
      console.log(`✅ Payment ${paymentId} completed successfully`);
      console.log(`💰 Amount: $${payment.amount}`);
      console.log(`👤 User: ${payment.userId}`);
      console.log(`📦 Plan: ${payment.planId}`);
    } else {
      console.log(`❌ Failed to complete payment: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

/**
 * Complete payments for a specific user
 */
async function completeUserPayments(payments, userId) {
  const userPayments = payments.filter(p => p.userId === userId);
  
  if (userPayments.length === 0) {
    console.log(`❌ No pending payments found for user ${userId}`);
    return;
  }

  console.log(`🎯 Completing ${userPayments.length} payments for user ${userId}...\n`);

  for (const payment of userPayments) {
    try {
      const result = await completePayment(payment);
      if (result.success) {
        console.log(`✅ Completed: ${payment.id} ($${payment.amount})`);
      } else {
        console.log(`❌ Failed: ${payment.id} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

/**
 * Complete payments for a specific plan
 */
async function completePlanPayments(payments, planId) {
  const planPayments = payments.filter(p => p.planId === planId);
  
  if (planPayments.length === 0) {
    console.log(`❌ No pending payments found for plan ${planId}`);
    return;
  }

  console.log(`🎯 Completing ${planPayments.length} payments for plan ${planId}...\n`);

  for (const payment of planPayments) {
    try {
      const result = await completePayment(payment);
      if (result.success) {
        console.log(`✅ Completed: ${payment.id} ($${payment.amount}) for user ${payment.userId}`);
      } else {
        console.log(`❌ Failed: ${payment.id} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

/**
 * Core payment completion logic
 */
async function completePayment(payment) {
  try {
    // 1. Update payment status
    await db.collection('payments').doc(payment.id).update({
      status: 'payment_completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      completedBy: 'manual_script',
      manualCompletion: true
    });

    // 2. Get plan details
    const plan = await planService.getPlanById(payment.planId);
    if (!plan) {
      return { success: false, error: `Plan ${payment.planId} not found` };
    }

    // 3. Activate membership
    // The membershipManager.activateMembership signature is:
    //   activateMembership(userId, tier, activatedBy = 'admin', durationDays = 30, bot = null, options = {})
    // Pass the plan.tier (string), duration (plan.durationDays or plan.duration), bot instance and payment options.
    const tier = plan.tier || plan.tierName || plan.name || 'Premium';
    const durationDays = plan.durationDays || plan.duration || 30;

    // Try to load bot instance for sending notifications (optional)
    let botInstance = null;
    try {
      // src/bot/index.js exports the bot instance
      botInstance = require('./src/bot/index');
    } catch (e) {
      // Not fatal - we'll proceed without bot notifications
      botInstance = null;
    }

    const activationOptions = {
      paymentAmount: payment.amount || null,
      paymentCurrency: payment.currency || plan.currency || 'USD',
      paymentMethod: payment.paymentMethod || payment.method || plan.paymentMethod || 'manual',
      reference: payment.id,
    };

    const activationResult = await membershipManager.activateMembership(
      payment.userId,
      tier,
      'manual_script',
      durationDays,
      botInstance,
      activationOptions
    );

    if (!activationResult.success) {
      return { success: false, error: 'activation_failed' };
    }

    // 4. Send notification to user (if bot is available)
    try {
      // Try to get bot instance
      const bot = require('./src/bot/index');
      
      if (bot && payment.userId) {
        const confirmMsg = 
          `🎉 *¡Pago Confirmado!*\n\n` +
          `✅ Tu suscripción *${plan.name}* ha sido activada\n\n` +
          `💰 *Monto:* $${payment.amount} USD\n` +
          `⏱️ *Duración:* ${plan.durationDays} días\n` +
          `🔧 *Procesado:* Manualmente por admin\n\n` +
          `¡Gracias por tu suscripción! 🚀`;

        await bot.telegram.sendMessage(payment.userId, confirmMsg, {
          parse_mode: 'Markdown',
        });

        console.log(`   📬 Notification sent to user ${payment.userId}`);
      }
    } catch (notificationError) {
      console.log(`   ⚠️ Could not send notification: ${notificationError.message}`);
    }

    return { success: true };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark payments as failed instead of completed
 */
async function markPaymentsAsFailed(payments) {
  console.log(`❌ Marking ${payments.length} payments as failed...\n`);

  for (const payment of payments) {
    try {
      await db.collection('payments').doc(payment.id).update({
        status: 'payment_failed',
        failedAt: new Date(),
        updatedAt: new Date(),
        failedBy: 'manual_script',
        failureReason: 'Marked as failed by admin'
      });
      console.log(`❌ Marked as failed: ${payment.id}`);
    } catch (error) {
      console.log(`❌ Error marking ${payment.id} as failed: ${error.message}`);
    }
  }
}

/**
 * Export payment data to CSV
 */
async function exportPaymentData(payments) {
  const fs = require('fs');
  const csvHeaders = 'ID,Amount,UserId,PlanId,Status,CreatedAt,UpdatedAt\n';
  
  let csvData = csvHeaders;
  payments.forEach(payment => {
    csvData += `${payment.id},${payment.amount || 0},${payment.userId},${payment.planId},${payment.status},${payment.createdAt?.toDate?.()},${payment.updatedAt?.toDate?.()}\n`;
  });

  const filename = `pending_payments_${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(filename, csvData);
  
  console.log(`📁 Payment data exported to: ${filename}`);
  console.log(`📊 ${payments.length} payments exported`);
}

// Run the script
if (require.main === module) {
  console.log('Usage:');
  console.log('  node manual-complete-payments.js                    # Complete all payments');
  console.log('  node manual-complete-payments.js 2 <paymentId>      # Complete specific payment');
  console.log('  node manual-complete-payments.js 3 <userId>         # Complete user payments');
  console.log('  node manual-complete-payments.js 4 <planId>         # Complete plan payments');
  console.log('  node manual-complete-payments.js 5                  # Mark as failed');
  console.log('  node manual-complete-payments.js 6                  # Export CSV');
  console.log('');
  
  manualPaymentCompletion();
}