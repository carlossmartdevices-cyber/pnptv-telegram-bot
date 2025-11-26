require('dotenv').config();
const { db } = require('./src/config/firebase');
const fs = require('fs');
const path = require('path');

async function exportPaymentData() {
  console.log('📊 Exporting Payment Data...\n');
  
  try {
    // 1. Analyze all payments
    console.log('1️⃣  Analyzing all payments...');
    const allPayments = await db.collection('payments').get();
    const statusMap = {};
    const planMap = {};
    const methodMap = {};
    let totalRevenue = 0;
    let completedRevenue = 0;
    
    allPayments.docs.forEach(doc => {
      const data = doc.data();
      
      // Status breakdown
      const status = data.status || 'unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
      
      // Plan breakdown
      const planId = data.planId || 'unknown';
      planMap[planId] = (planMap[planId] || 0) + 1;
      
      // Method breakdown
      const method = data.paymentMethod || data.provider || 'daimo';
      methodMap[method] = (methodMap[method] || 0) + 1;
      
      // Revenue
      totalRevenue += (data.amount || 0);
      if (status === 'payment_completed') {
        completedRevenue += (data.amount || 0);
      }
    });
    
    console.log(`   Total Payments: ${allPayments.size}`);
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`   Completed Revenue: $${completedRevenue.toFixed(2)}\n`);
    
    // 2. Get all subscriptions
    console.log('2️⃣  Exporting subscription data...');
    const usersSnapshot = await db.collection('users')
      .where('tier', '!=', 'Free')
      .get();
    
    console.log(`   Found ${usersSnapshot.size} active subscriptions\n`);
    
    // 3. Export subscriptions to CSV
    let subCsv = 'User ID,Display Name,Tier,Email,Expiration Date,Days Remaining,Created At,Language\n';
    const now = Date.now();
    
    usersSnapshot.docs.forEach((doc) => {
      const user = doc.data();
      const expiresAt = user.membershipExpiresAt || user.expiresAt;
      const expiresDate = expiresAt ? new Date(expiresAt) : null;
      const daysRemaining = expiresDate ? Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24)) : 'N/A';
      
      const displayName = (user.displayName || user.firstName || 'Unknown').replace(/,/g, ';');
      const email = (user.email || 'N/A').replace(/,/g, ';');
      const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
      
      subCsv += `${doc.id},"${displayName}",${user.tier},"${email}",${expiresDate ? expiresDate.toLocaleDateString() : 'N/A'},${daysRemaining},${createdDate},${user.language || 'en'}\n`;
    });
    
    // 4. Export payments to CSV
    let payCsv = 'Payment ID,User ID,Plan,Amount (USD),Status,Method,Created Date,Daimo Payment ID\n';
    
    const recentPayments = await db.collection('payments')
      .orderBy('createdAt', 'desc')
      .get();
    
    recentPayments.docs.forEach((doc) => {
      const payment = doc.data();
      const createdDate = payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A';
      const method = payment.paymentMethod || payment.provider || 'daimo';
      const daimoId = payment.daimoPaymentId || 'N/A';
      
      payCsv += `"${doc.id}",${payment.userId},"${payment.planId}",${payment.amount},"${payment.status}",${method},${createdDate},"${daimoId}"\n`;
    });
    
    // 5. Create summary report
    let summary = '=== PAYMENT SYSTEM ANALYSIS REPORT ===\n';
    summary += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    summary += '=== PAYMENT STATUS BREAKDOWN ===\n';
    Object.entries(statusMap).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      summary += `${status}: ${count}\n`;
    });
    
    summary += '\n=== PAYMENTS BY PLAN ===\n';
    Object.entries(planMap).sort((a, b) => b[1] - a[1]).forEach(([plan, count]) => {
      summary += `${plan}: ${count}\n`;
    });
    
    summary += '\n=== PAYMENT METHODS ===\n';
    Object.entries(methodMap).sort((a, b) => b[1] - a[1]).forEach(([method, count]) => {
      summary += `${method}: ${count}\n`;
    });
    
    summary += '\n=== REVENUE SUMMARY ===\n';
    summary += `Total Revenue (all): $${totalRevenue.toFixed(2)}\n`;
    summary += `Completed Revenue: $${completedRevenue.toFixed(2)}\n`;
    summary += `Pending/Failed: $${(totalRevenue - completedRevenue).toFixed(2)}\n`;
    summary += `Success Rate: ${allPayments.size > 0 ? ((completedRevenue / totalRevenue) * 100).toFixed(1) : 0}%\n`;
    
    summary += '\n=== SUBSCRIPTION SUMMARY ===\n';
    summary += `Active Subscriptions: ${usersSnapshot.size}\n`;
    
    // Count by tier
    const tierMap = {};
    usersSnapshot.docs.forEach((doc) => {
      const tier = doc.data().tier;
      tierMap[tier] = (tierMap[tier] || 0) + 1;
    });
    
    Object.entries(tierMap).sort((a, b) => b[1] - a[1]).forEach(([tier, count]) => {
      summary += `  - ${tier}: ${count}\n`;
    });
    
    // 6. Save files
    const subFile = '/root/bot 1/active-subscriptions.csv';
    const payFile = '/root/bot 1/all-payments.csv';
    const summaryFile = '/root/bot 1/payment-analysis-report.txt';
    
    fs.writeFileSync(subFile, subCsv);
    fs.writeFileSync(payFile, payCsv);
    fs.writeFileSync(summaryFile, summary);
    
    console.log('📁 Files exported:\n');
    console.log(`✅ ${subFile}`);
    console.log(`   Records: ${usersSnapshot.size}`);
    console.log(`   Size: ${(fs.statSync(subFile).size / 1024).toFixed(1)} KB\n`);
    
    console.log(`✅ ${payFile}`);
    console.log(`   Records: ${recentPayments.size}`);
    console.log(`   Size: ${(fs.statSync(payFile).size / 1024).toFixed(1)} KB\n`);
    
    console.log(`✅ ${summaryFile}`);
    console.log(`   Size: ${(fs.statSync(summaryFile).size / 1024).toFixed(1)} KB\n`);
    
    console.log('📊 Summary:');
    console.log(summary);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

exportPaymentData();
