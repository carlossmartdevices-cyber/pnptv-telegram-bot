const { db } = require('./src/config/firebase');

async function fixPlans() {
  try {
    console.log('Starting plan fixes...\n');

    const plansSnapshot = await db.collection('plans').get();

    if (plansSnapshot.empty) {
      console.log('No plans found in database.');
      return;
    }

    console.log('Found ' + plansSnapshot.size + ' plan(s)\n');
    console.log('='.repeat(80));

    let updated = 0;
    let deleted = 0;

    for (const doc of plansSnapshot.docs) {
      const plan = doc.data();
      const planId = doc.id;

      // Delete test plan
      if (planId === 'test_plan' || plan.name === 'Test Plan') {
        console.log(`\n🗑️  DELETING: ${planId} - ${plan.name}`);
        await db.collection('plans').doc(planId).delete();
        deleted++;
        continue;
      }

      // Update payment method to daimo
      if (plan.paymentMethod !== 'daimo') {
        console.log(`\n✏️  UPDATING: ${planId} - ${plan.name}`);
        console.log(`   Old payment method: ${plan.paymentMethod || 'N/A'}`);
        console.log(`   New payment method: daimo`);
        
        await db.collection('plans').doc(planId).update({
          paymentMethod: 'daimo',
          requiresManualActivation: false
        });
        updated++;
      } else {
        console.log(`\n✓  OK: ${planId} - ${plan.name} (already using daimo)`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Complete!`);
    console.log(`   Updated: ${updated} plan(s)`);
    console.log(`   Deleted: ${deleted} plan(s)`);
    console.log(`\nAll plans now use Daimo Pay with automatic activation.\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error fixing plans:', error);
    process.exit(1);
  }
}

fixPlans();
