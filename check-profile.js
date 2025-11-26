const { db } = require('./src/config/firebase.js');
const logger = require('./src/utils/logger.js');

async function checkAndFixProfiles() {
  try {
    console.log('🔍 Scanning profiles for issues...\n');

    const usersSnapshot = await db.collection('users').limit(100).get();
    
    let issuesFound = 0;
    let issuesFixed = 0;
    const issues = [];

    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      const userId = doc.id;

      // Check for critical fields
      const requiredFields = ['userId', 'username', 'language', 'tier', 'createdAt'];
      const missingFields = [];

      for (const field of requiredFields) {
        if (!user[field]) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        console.log(`❌ User ${userId} missing fields: ${missingFields.join(', ')}`);
        issues.push({ userId, missingFields, user });
        issuesFound++;
      }

      // Check tier validity
      const validTiers = ['Free', 'Silver', 'Golden', 'Diamond', 'Lifetime'];
      if (user.tier && !validTiers.includes(user.tier)) {
        console.log(`⚠️  User ${userId} has invalid tier: "${user.tier}"`);
        issues.push({ userId, invalidTier: user.tier });
        issuesFound++;
      }

      // Check language validity
      const validLanguages = ['en', 'es'];
      if (user.language && !validLanguages.includes(user.language)) {
        console.log(`⚠️  User ${userId} has invalid language: "${user.language}"`);
        issues.push({ userId, invalidLanguage: user.language });
        issuesFound++;
      }

      // Check membership expiration if tier is premium
      if (user.tier !== 'Free' && user.tier !== 'Lifetime') {
        if (!user.membershipExpiresAt) {
          console.log(`⚠️  User ${userId} has tier "${user.tier}" but no expiration date`);
          issues.push({ userId, noExpirationForTier: user.tier });
          issuesFound++;
        } else {
          const expiresAt = new Date(user.membershipExpiresAt);
          if (expiresAt < new Date()) {
            console.log(`⚠️  User ${userId} membership expired at ${expiresAt.toISOString()}`);
            issues.push({ userId, expiredMembership: expiresAt });
            issuesFound++;
          }
        }
      }

      // Check bio/location for excessive length
      if (user.bio && user.bio.length > 500) {
        console.log(`⚠️  User ${userId} bio is too long (${user.bio.length} chars)`);
        issues.push({ userId, bioTooLong: user.bio.length });
        issuesFound++;
      }

      if (user.location && user.location.length > 100) {
        console.log(`⚠️  User ${userId} location is too long (${user.location.length} chars)`);
        issues.push({ userId, locationTooLong: user.location.length });
        issuesFound++;
      }
    });

    if (issuesFound === 0) {
      console.log('✅ All profiles look good! No issues detected.\n');
      return;
    }

    console.log(`\n⚠️  Found ${issuesFound} issue(s). Attempting fixes...\n`);

    // Fix issues
    for (const issue of issues) {
      const { userId } = issue;
      const updates = {};

      // Fix missing required fields
      if (issue.missingFields) {
        console.log(`🔧 Fixing missing fields for user ${userId}`);
        
        const userData = issue.user;
        if (!userData.userId) updates.userId = userId;
        if (!userData.username) updates.username = 'Anonymous';
        if (!userData.language) updates.language = 'en';
        if (!userData.tier) updates.tier = 'Free';
        if (!userData.createdAt) updates.createdAt = new Date();

        await db.collection('users').doc(userId).update(updates);
        console.log(`✅ Fixed missing fields for ${userId}`);
        issuesFixed++;
      }

      // Fix invalid tier
      if (issue.invalidTier) {
        console.log(`🔧 Fixing invalid tier for user ${userId}: "${issue.invalidTier}" → "Free"`);
        await db.collection('users').doc(userId).update({ tier: 'Free' });
        console.log(`✅ Fixed tier for ${userId}`);
        issuesFixed++;
      }

      // Fix invalid language
      if (issue.invalidLanguage) {
        console.log(`🔧 Fixing invalid language for user ${userId}: "${issue.invalidLanguage}" → "en"`);
        await db.collection('users').doc(userId).update({ language: 'en' });
        console.log(`✅ Fixed language for ${userId}`);
        issuesFixed++;
      }

      // Fix bio/location length
      if (issue.bioTooLong) {
        const bio = issue.user.bio.substring(0, 500);
        console.log(`🔧 Trimming bio for user ${userId}`);
        await db.collection('users').doc(userId).update({ bio });
        console.log(`✅ Trimmed bio for ${userId}`);
        issuesFixed++;
      }

      if (issue.locationTooLong) {
        const location = issue.user.location.substring(0, 100);
        console.log(`🔧 Trimming location for user ${userId}`);
        await db.collection('users').doc(userId).update({ location });
        console.log(`✅ Trimmed location for ${userId}`);
        issuesFixed++;
      }
    }

    console.log(`\n✅ Fixed ${issuesFixed} issue(s)`);
    console.log(`📊 Summary: ${issuesFound} issue(s) found, ${issuesFixed} issue(s) fixed`);

  } catch (error) {
    logger.error('Error checking profiles:', error);
    console.error('Error:', error.message);
  }
}

checkAndFixProfiles();
