require("./env");
const admin = require("firebase-admin");

console.log("Iniciando Firebase...");

let serviceAccount;

// Check if Firebase credentials are in environment variable (Railway/Production)
const rawFirebaseCredentials = process.env.FIREBASE_CREDENTIALS;

if (rawFirebaseCredentials) {
  try {
    let normalizedCredentials = rawFirebaseCredentials.trim();

    normalizedCredentials = normalizedCredentials.replace(/^['"]+|['"]+$/g, "");

    try {
      serviceAccount = JSON.parse(normalizedCredentials);
    } catch (parseError) {
      const newlineNormalized = normalizedCredentials.replace(/\r?\n/g, "\\n");
      serviceAccount = JSON.parse(newlineNormalized);
    }

    if (serviceAccount && typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    console.log("Using Firebase credentials from environment variable");
  } catch (error) {
    console.error("Error parsing FIREBASE_CREDENTIALS:", error.message);
    throw new Error("Invalid FIREBASE_CREDENTIALS format");
  }
} else {
  // Use file (Local development)
  try {
    serviceAccount = require("./firebase_credentials.json");
    console.log("Using Firebase credentials from file");
  } catch (error) {
    console.error("Error loading Firebase credentials file:", error.message);
    throw new Error("Firebase credentials not found. Set FIREBASE_CREDENTIALS env var or add firebase_credentials.json");
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  console.log("Firebase ha sido inicializado correctamente.");
} else {
  console.log("Firebase ya está inicializado.");
}

const db = admin.firestore();

module.exports = { admin, db };
