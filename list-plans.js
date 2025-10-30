const { db } = require('./src/config/firebase');

async function listPlans() {
  try {
    console.log('Fetching plans from Firebase...\n');

    const plansSnapshot = await db.collection('plans').get();

    if (plansSnapshot.empty) {
      console.log('No plans found in database.');
      return;
    }

    console.log('Found ' + plansSnapshot.size + ' plan(s):\n');
    console.log('='.repeat(80));

    plansSnapshot.forEach((doc) => {
      const plan = doc.data();
      console.log('\nPlan ID: ' + doc.id);
      console.log('  Name: ' + plan.name);
      console.log('  Display Name: ' + (plan.displayName || 'N/A'));
      console.log('  Price: $' + plan.price + ' ' + (plan.currency || 'USD'));
      console.log('  Price in COP: ' + (plan.priceInCOP || 'N/A'));
      console.log('  Duration: ' + (plan.duration || plan.durationDays || 'N/A') + ' days');
      console.log('  Duration Days: ' + (plan.durationDays || 'N/A'));
      console.log('  Payment Method: ' + (plan.paymentMethod || 'N/A'));
      console.log('  Active: ' + (plan.active !== false ? 'Yes' : 'No'));
      console.log('  Icon: ' + (plan.icon || 'N/A'));
      console.log('  Features: ' + (plan.features ? plan.features.length : 0));
      console.log('  ' + '-'.repeat(76));
    });

    console.log('\n' + '='.repeat(80));
    process.exit(0);
  } catch (error) {
    console.error('Error fetching plans:', error);
    process.exit(1);
  }
}

listPlans();
