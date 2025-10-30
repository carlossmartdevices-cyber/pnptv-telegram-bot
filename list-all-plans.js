require('dotenv').config({ path: '/var/www/telegram-bot/.env' });
const admin = require('firebase-admin');

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function listAllPlans() {
  try {
    const snapshot = await db.collection('plans').get();

    console.log('\n=== ALL PLANS IN DATABASE ===\n');
    console.log(`Total: ${snapshot.size} plan(s)\n`);

    if (snapshot.empty) {
      console.log('❌ NO PLANS FOUND!\n');
      console.log('You need to create plans using the admin panel.');
      console.log('Send /admin to your bot and go to Plan Management.\n');
      process.exit(0);
    }

    snapshot.forEach(doc => {
      const plan = doc.data();
      console.log(`Plan ID: ${doc.id}`);
      console.log(`  Name: ${plan.displayName || plan.name}`);
      console.log(`  Duration: ${plan.durationDays || plan.duration} days`);
      console.log(`  Price: $${plan.price} ${plan.currency || 'USD'}`);
      console.log(`  Active: ${plan.active !== false ? 'YES' : 'NO'}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listAllPlans();
