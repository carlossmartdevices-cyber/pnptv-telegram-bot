require('dotenv').config();

// Simple Firebase connection
const admin = require('firebase-admin');

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const db = admin.firestore();

async function checkPlans() {
  try {
    console.log('Checking plans in Firebase...\n');
    
    const snapshot = await db.collection('plans').get();
    
    if (snapshot.empty) {
      console.log('❌ No plans found in Firebase!');
      console.log('\nYou need to create plans first using the admin panel in your bot.');
      console.log('Send /admin to your bot and create plans.\n');
      process.exit(1);
    }
    
    console.log('✅ Found', snapshot.size, 'plan(s)\n');
    
    const plans = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      plans.push({
        id: doc.id,
        ...data
      });
    });
    
    // Print as JSON for easy reading
    console.log(JSON.stringify(plans, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPlans();
