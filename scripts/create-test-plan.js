require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
});

async function createTestPlan() {
  try {
    const db = admin.firestore();
    
    // Test Plan Data
    const testPlan = {
      id: 'test_plan',
      name: 'Test Plan',
      displayName: 'Test Subscription (0.01 USDC)',
      description: 'Test subscription plan for payment verification',
      amount: 0.01,
      currency: 'USDC',
      duration: 1, // 1 day
      features: [
        '✨ Test Feature 1',
        '🚀 Test Feature 2',
        '🔥 Test Feature 3'
      ],
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add the plan to Firestore
    await db.collection('plans').doc(testPlan.id).set(testPlan);
    console.log('✅ Test plan created successfully:', testPlan.id);
    
    // Verify the plan was created
    const planDoc = await db.collection('plans').doc(testPlan.id).get();
    console.log('📄 Plan data:', planDoc.data());

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test plan:', error);
    process.exit(1);
  }
}

createTestPlan();