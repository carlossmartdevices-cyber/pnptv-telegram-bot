require('dotenv').config();
const { db } = require('./src/config/firebase');
const XLSX = require('xlsx');
const fs = require('fs');

async function exportPremiumUsersToExcel() {
  try {
    console.log('=== Exporting Premium Users to Excel ===\n');
    console.log(`Started: ${new Date().toLocaleString()}\n`);

    // Get all users
    const usersSnapshot = await db.collection('users').get();

    const now = new Date();
    const allUsers = [];
    const premiumUsers = [];
    const expiredUsers = [];

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;

      // Extract all available data
      const tier = userData.tier || 'Free';
      const membershipExpiration = userData.membershipExpiration?.toDate();
      const isPremium = membershipExpiration && membershipExpiration > now;
      const createdAt = userData.createdAt?.toDate();

      const userInfo = {
        // Basic Info
        'User ID': userId,
        'Username': userData.username || 'N/A',
        'First Name': userData.firstName || 'N/A',
        'Last Name': userData.lastName || '',
        'Full Name': `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'N/A',

        // Contact Info
        'Email': userData.email || 'N/A',
        'Phone': userData.phone || 'N/A',

        // Membership Info
        'Tier': tier,
        'Plan ID': userData.planId || 'N/A',
        'Status': isPremium ? 'Active' : (tier !== 'Free' ? 'Expired' : 'Free'),
        'Expiration Date': membershipExpiration ? membershipExpiration.toLocaleDateString() : 'N/A',
        'Expiration Time': membershipExpiration ? membershipExpiration.toLocaleString() : 'N/A',
        'Days Remaining': membershipExpiration ? Math.ceil((membershipExpiration - now) / (1000 * 60 * 60 * 24)) : 'N/A',

        // Account Info
        'Language': userData.language || 'en',
        'Onboarding Complete': userData.onboardingComplete ? 'Yes' : 'No',
        'Created Date': createdAt ? createdAt.toLocaleDateString() : 'N/A',
        'Created Time': createdAt ? createdAt.toLocaleString() : 'N/A',

        // Preferences
        'Broadcast Opt Out': userData.broadcastOptOut ? 'Yes' : 'No',
        'Ads Opt Out': userData.adsOptOut ? 'Yes' : 'No',

        // Location (if available)
        'Latitude': userData.location?.latitude || 'N/A',
        'Longitude': userData.location?.longitude || 'N/A',

        // Additional
        'Bio': userData.bio || 'N/A',
        'Personality': userData.personality || 'N/A',
      };

      allUsers.push(userInfo);

      // Categorize
      if (tier !== 'Free' && isPremium) {
        premiumUsers.push(userInfo);
      } else if (tier !== 'Free' && !isPremium) {
        expiredUsers.push(userInfo);
      }
    });

    console.log(`Total Users: ${allUsers.length}`);
    console.log(`Active Premium: ${premiumUsers.length}`);
    console.log(`Expired Premium: ${expiredUsers.length}`);
    console.log(`Free Users: ${allUsers.length - premiumUsers.length - expiredUsers.length}\n`);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: All Premium/Basic Users (Active + Expired)
    const premiumAndExpired = [...premiumUsers, ...expiredUsers];
    const ws1 = XLSX.utils.json_to_sheet(premiumAndExpired);

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = [];
    const keys = Object.keys(premiumAndExpired[0] || {});

    keys.forEach((key, i) => {
      let maxLen = key.length;
      premiumAndExpired.forEach(row => {
        const val = String(row[key] || '');
        if (val.length > maxLen) maxLen = val.length;
      });
      colWidths.push({ wch: Math.min(maxLen + 2, maxWidth) });
    });
    ws1['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, ws1, 'Premium & Expired Users');

    // Sheet 2: Active Premium Only
    if (premiumUsers.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(premiumUsers);
      ws2['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(workbook, ws2, 'Active Premium');
    }

    // Sheet 3: Expired Premium Only
    if (expiredUsers.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(expiredUsers);
      ws3['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(workbook, ws3, 'Expired Premium');
    }

    // Sheet 4: All Users
    const ws4 = XLSX.utils.json_to_sheet(allUsers);
    ws4['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, ws4, 'All Users');

    // Sheet 5: Summary Statistics
    const summary = [
      { 'Metric': 'Total Users', 'Count': allUsers.length },
      { 'Metric': 'Active Premium Users', 'Count': premiumUsers.length },
      { 'Metric': 'Expired Premium Users', 'Count': expiredUsers.length },
      { 'Metric': 'Free Users', 'Count': allUsers.length - premiumUsers.length - expiredUsers.length },
      { 'Metric': 'Conversion Rate', 'Count': `${((premiumUsers.length / allUsers.length) * 100).toFixed(2)}%` },
      { 'Metric': 'Premium + Expired', 'Count': premiumAndExpired.length },
      { 'Metric': 'Report Generated', 'Count': new Date().toLocaleString() },
    ];
    const ws5 = XLSX.utils.json_to_sheet(summary);
    ws5['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, ws5, 'Summary');

    // Write to file
    const filename = `PNPtv_Users_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Excel file created successfully!\n`);
    console.log(`📁 Filename: ${filename}`);
    console.log(`📍 Location: /root/bot 1/${filename}\n`);
    console.log('📊 Sheets included:');
    console.log('   1. Premium & Expired Users - All users with Premium/Basic tier');
    console.log('   2. Active Premium - Only currently active premium members');
    console.log('   3. Expired Premium - Users whose premium has expired');
    console.log('   4. All Users - Complete user database');
    console.log('   5. Summary - Statistics and metrics\n');
    console.log('📋 Columns included:');
    console.log('   - User ID, Username, Names, Email, Phone');
    console.log('   - Tier, Plan, Status, Expiration Info');
    console.log('   - Language, Onboarding, Created Date');
    console.log('   - Preferences (Opt-outs)');
    console.log('   - Location, Bio, Personality\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('Error exporting to Excel:', error);
  }

  process.exit(0);
}

exportPremiumUsersToExcel();
