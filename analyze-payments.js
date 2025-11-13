require('dotenv').config();
const { db } = require('./src/config/firebase');
const ExcelJS = require('exceljs');

async function analyzePayments() {
  console.log('🔍 Analyzing Payment System...\n');
  
  try {
    // 1. Payment breakdown by status
    console.log('1️⃣  Payment Status Breakdown:');
    const allPayments = await db.collection('payments').get();
    const statusMap = {};
    allPayments.docs.forEach(doc => {
      const status = doc.data().status || 'unknown';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    
    Object.entries(statusMap).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    // 2. Payment breakdown by plan
    console.log('\n2️⃣  Payments by Plan:');
    const planMap = {};
    allPayments.docs.forEach(doc => {
      const planId = doc.data().planId || 'unknown';
      planMap[planId] = (planMap[planId] || 0) + 1;
    });
    
    Object.entries(planMap).sort((a, b) => b[1] - a[1]).forEach(([plan, count]) => {
      console.log(`   ${plan}: ${count}`);
    });
    
    // 3. Payment method analysis
    console.log('\n3️⃣  Payment Method Analysis:');
    const methodMap = {};
    allPayments.docs.forEach(doc => {
      const method = doc.data().paymentMethod || doc.data().provider || 'not_recorded';
      methodMap[method] = (methodMap[method] || 0) + 1;
    });
    
    Object.entries(methodMap).forEach(([method, count]) => {
      console.log(`   ${method}: ${count}`);
    });
    
    // 4. Revenue analysis
    console.log('\n4️⃣  Revenue Breakdown:');
    let totalRevenue = 0;
    let completedRevenue = 0;
    allPayments.docs.forEach(doc => {
      const data = doc.data();
      totalRevenue += (data.amount || 0);
      if (data.status === 'payment_completed') {
        completedRevenue += (data.amount || 0);
      }
    });
    
    console.log(`   Total Amount (all): $${totalRevenue.toFixed(2)}`);
    console.log(`   Completed Revenue: $${completedRevenue.toFixed(2)}`);
    console.log(`   Pending/Failed: $${(totalRevenue - completedRevenue).toFixed(2)}`);
    
    // 5. Get subscriptions for Excel
    console.log('\n5️⃣  Generating subscription data for Excel...');
    const usersSnapshot = await db.collection('users')
      .where('tier', '!=', 'Free')
      .get();
    
    console.log(`   Found ${usersSnapshot.size} active subscriptions\n`);
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Active Subscriptions
    const subSheet = workbook.addWorksheet('Active Subscriptions', { pageSetup: { paperSize: 9, orientation: 'landscape' } });
    subSheet.columns = [
      { header: 'User ID', key: 'userId', width: 15 },
      { header: 'Telegram Name', key: 'displayName', width: 20 },
      { header: 'Tier', key: 'tier', width: 20 },
      { header: 'Expiration Date', key: 'expiresAt', width: 18 },
      { header: 'Days Remaining', key: 'daysRemaining', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Language', key: 'language', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 18 },
    ];
    
    const now = Date.now();
    usersSnapshot.docs.forEach((doc) => {
      const user = doc.data();
      const expiresAt = user.membershipExpiresAt || user.expiresAt;
      const expiresDate = expiresAt ? new Date(expiresAt) : null;
      const daysRemaining = expiresDate ? Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24)) : 'N/A';
      
      subSheet.addRow({
        userId: doc.id,
        displayName: user.displayName || user.firstName || 'Unknown',
        tier: user.tier,
        expiresAt: expiresDate ? expiresDate.toLocaleDateString() : 'N/A',
        daysRemaining: daysRemaining,
        email: user.email || 'N/A',
        language: user.language || 'en',
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
      });
    });
    
    // Format header row
    subSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    subSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Sheet 2: All Payments
    const paySheet = workbook.addWorksheet('All Payments', { pageSetup: { paperSize: 9, orientation: 'landscape' } });
    paySheet.columns = [
      { header: 'Payment ID', key: 'paymentId', width: 25 },
      { header: 'User ID', key: 'userId', width: 15 },
      { header: 'Plan', key: 'planId', width: 18 },
      { header: 'Amount (USD)', key: 'amount', width: 12 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Method', key: 'method', width: 15 },
      { header: 'Created Date', key: 'createdAt', width: 16 },
      { header: 'Daimo Payment ID', key: 'daimoId', width: 25 },
    ];
    
    const recentPayments = await db.collection('payments')
      .orderBy('createdAt', 'desc')
      .get();
    
    recentPayments.docs.forEach((doc) => {
      const payment = doc.data();
      paySheet.addRow({
        paymentId: doc.id,
        userId: payment.userId,
        planId: payment.planId,
        amount: payment.amount,
        status: payment.status,
        method: payment.paymentMethod || payment.provider || 'daimo',
        createdAt: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A',
        daimoId: payment.daimoPaymentId || 'N/A',
      });
    });
    
    // Format header row
    paySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    paySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Sheet 3: Summary Statistics
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    
    summarySheet.addRow({ metric: 'Total Payments', value: allPayments.size });
    summarySheet.addRow({ metric: 'Active Subscriptions', value: usersSnapshot.size });
    summarySheet.addRow({ metric: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}` });
    summarySheet.addRow({ metric: 'Completed Revenue', value: `$${completedRevenue.toFixed(2)}` });
    summarySheet.addRow({ metric: 'Pending/Failed', value: `$${(totalRevenue - completedRevenue).toFixed(2)}` });
    
    Object.entries(statusMap).forEach(([status, count]) => {
      summarySheet.addRow({ metric: `Payments - ${status}`, value: count });
    });
    
    summarySheet.addRow({ metric: '', value: '' });
    summarySheet.addRow({ metric: 'BY PLAN', value: '' });
    
    Object.entries(planMap).sort((a, b) => b[1] - a[1]).forEach(([plan, count]) => {
      summarySheet.addRow({ metric: `  - ${plan}`, value: count });
    });
    
    summarySheet.addRow({ metric: '', value: '' });
    summarySheet.addRow({ metric: 'PAYMENT METHODS', value: '' });
    
    Object.entries(methodMap).forEach(([method, count]) => {
      summarySheet.addRow({ metric: `  - ${method}`, value: count });
    });
    
    // Save file
    const filename = '/root/bot 1/payment-analysis.xlsx';
    await workbook.xlsx.writeFile(filename);
    console.log(`✅ Excel file created: ${filename}`);
    console.log(`   Size: ${require('fs').statSync(filename).size} bytes`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

analyzePayments();
