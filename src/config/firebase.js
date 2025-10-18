require("./env");
const admin = require("firebase-admin");

console.log("Iniciando Firebase...");

let serviceAccount;

// Check if Firebase credentials are in environment variable (Railway/Production)
const rawFirebaseCredentials = process.env.FIREBASE_CREDENTIALS;

if (rawFirebaseCredentials) {
  try {
    // Step 1: Trim whitespace
    let normalizedCredentials = rawFirebaseCredentials.trim();

    // Debug: Log first 200 chars (safe to see structure without exposing secrets)
    console.log(`FIREBASE_CREDENTIALS length: ${normalizedCredentials.length} chars`);
    console.log(`First 200 chars: ${normalizedCredentials.substring(0, 200)}...`);

    // Step 2: Remove any surrounding quotes (single or double)
    normalizedCredentials = normalizedCredentials.replace(/^['"]+|['"]+$/g, "");

    // Step 3: Handle escaped characters
    // Replace literal \n with actual newlines for private_key
    normalizedCredentials = normalizedCredentials
      .replace(/\\"/g, '"')  // Handle escaped quotes
      .replace(/\\\\/g, '\\'); // Handle escaped backslashes

    // Step 4: Try to parse JSON
    try {
      serviceAccount = JSON.parse(normalizedCredentials);
    } catch (parseError) {
      console.error("First parse attempt failed:", parseError.message);

      // Attempt 2: Maybe newlines need to be normalized
      const newlineNormalized = normalizedCredentials.replace(/\r?\n/g, "\\n");

      try {
        serviceAccount = JSON.parse(newlineNormalized);
      } catch (secondError) {
        console.error("Second parse attempt failed:", secondError.message);

        // Attempt 3: Try base64 decoding (in case it's base64 encoded)
        try {
          const base64Decoded = Buffer.from(normalizedCredentials, 'base64').toString('utf-8');
          serviceAccount = JSON.parse(base64Decoded);
          console.log("Successfully parsed base64-encoded credentials");
        } catch (base64Error) {
          console.error("Base64 parse attempt failed:", base64Error.message);
          throw parseError; // Throw original error
        }
      }
    }

    // Step 5: Validate required fields
    if (!serviceAccount.type || !serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error("FIREBASE_CREDENTIALS missing required fields (type, project_id, private_key, client_email)");
    }

    // Step 6: Ensure private_key has proper newlines
    if (serviceAccount && typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    console.log("✅ Using Firebase credentials from environment variable");
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    console.log(`   Client Email: ${serviceAccount.client_email}`);
  } catch (error) {
    console.error("❌ Error parsing FIREBASE_CREDENTIALS:", error.message);
    console.error("   Raw length:", rawFirebaseCredentials.length);
    console.error("   Expected: Valid JSON with type, project_id, private_key, client_email");
    throw new Error(`Invalid FIREBASE_CREDENTIALS format: ${error.message}`);
  }
} else {
  // Use file (Local development)
  try {
    serviceAccount = require("./firebase_credentials.json");
    console.log("✅ Using Firebase credentials from file");
  } catch (error) {
    console.error("❌ Error loading Firebase credentials file:", error.message);
    throw new Error("Firebase credentials not found. Set FIREBASE_CREDENTIALS env var or add firebase_credentials.json");
  }
}

if (!admin.apps.length) {
  const config = {
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  };

  // Add storage bucket if available
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    config.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  } else if (serviceAccount.project_id) {
    // Default to project_id.appspot.com
    config.storageBucket = `${serviceAccount.project_id}.appspot.com`;
  }

  admin.initializeApp(config);
  console.log("Firebase ha sido inicializado correctamente.");
} else {
  console.log("Firebase ya está inicializado.");
}

const db = admin.firestore();

module.exports = { admin, db };
