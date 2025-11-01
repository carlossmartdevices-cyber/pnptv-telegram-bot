const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    if (admin.apps.length === 0) {
      let serviceAccount;
      
      // Try to use individual environment variables first (for Railway)
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "default",
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID || "113269534865258515047",
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
          universe_domain: "googleapis.com"
        };
      } 
      // Fall back to JSON credentials
      else if (process.env.FIREBASE_CREDENTIALS) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
      }
      else {
        throw new Error('No Firebase credentials found. Please set FIREBASE_CREDENTIALS or individual Firebase environment variables.');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

      logger.info('Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    process.exit(1);
  }
}

initializeFirebase();

const db = admin.firestore();

module.exports = {
  db,
  admin
};