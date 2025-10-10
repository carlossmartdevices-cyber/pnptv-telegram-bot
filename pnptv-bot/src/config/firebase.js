/**
 * Firebase Configuration
 * Initializes Firebase Admin SDK and Firestore database
 */

const admin = require("firebase-admin");
const path = require("path");

// Load service account key
const serviceAccountPath =
  process.env.FIREBASE_CREDENTIALS || "./serviceAccountKey.json";
let serviceAccount;

try {
  serviceAccount = require(path.resolve(serviceAccountPath));
} catch (error) {
  console.error("❌ Error loading Firebase credentials:", error.message);
  console.error(
    "Make sure serviceAccountKey.json exists in the root directory"
  );
  process.exit(1);
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.error("❌ Error initializing Firebase:", error.message);
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// Firestore settings for better performance
db.settings({
  ignoreUndefinedProperties: true,
  timestampsInSnapshots: true,
});

// FieldValue for server-side operations
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

// Collection references for easy access
const collections = {
  users: db.collection("users"),
  posts: db.collection("posts"),
  lives: db.collection("lives"),
  transactions: db.collection("transactions"),
  reports: db.collection("reports"),
  messages: db.collection("messages"),
  achievements: db.collection("achievements"),
  dailyQuests: db.collection("dailyQuests"),
  leaderboards: db.collection("leaderboards"),
  subscriptions: db.collection("subscriptions"),
  notifications: db.collection("notifications"),
  blocks: db.collection("blocks"),
  matches: db.collection("matches"),
  stories: db.collection("stories"),
};

/**
 * Helper function to check if Firestore is connected
 */
async function checkFirestoreConnection() {
  try {
    await db.collection("_health_check").doc("test").set({
      timestamp: FieldValue.serverTimestamp(),
    });
    await db.collection("_health_check").doc("test").delete();
    console.log("✅ Firestore connection verified");
    return true;
  } catch (error) {
    console.error("❌ Firestore connection failed:", error.message);
    return false;
  }
}

/**
 * Helper function to get document safely
 */
async function getDocument(collectionName, documentId) {
  try {
    const doc = await db.collection(collectionName).doc(documentId).get();
    if (!doc.exists) {
      return { success: false, error: "Document not found" };
    }
    return { success: true, data: doc.data() };
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to set document safely
 */
async function setDocument(collectionName, documentId, data, merge = true) {
  try {
    await db.collection(collectionName).doc(documentId).set(data, { merge });
    return { success: true };
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to update document safely
 */
async function updateDocument(collectionName, documentId, updates) {
  try {
    await db.collection(collectionName).doc(documentId).update(updates);
    return { success: true };
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to delete document safely
 */
async function deleteDocument(collectionName, documentId) {
  try {
    await db.collection(collectionName).doc(documentId).delete();
    return { success: true };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to query collection
 */
async function queryCollection(
  collectionName,
  filters = [],
  orderBy = null,
  limit = null
) {
  try {
    let query = db.collection(collectionName);

    // Apply filters
    filters.forEach((filter) => {
      query = query.where(filter.field, filter.operator, filter.value);
    });

    // Apply ordering
    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction || "asc");
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    const documents = [];

    snapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return { success: true, documents, count: documents.length };
  } catch (error) {
    console.error(`Error querying collection ${collectionName}:`, error);
    return { success: false, error: error.message, documents: [] };
  }
}

/**
 * Helper function for batch operations
 */
function createBatch() {
  return db.batch();
}

/**
 * Helper function to commit batch
 */
async function commitBatch(batch) {
  try {
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error("Error committing batch:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize required collections and indexes
 */
async function initializeCollections() {
  console.log("📋 Initializing collections...");

  const collectionsList = Object.keys(collections);

  for (const collectionName of collectionsList) {
    try {
      // Create a dummy document to ensure collection exists
      const testDoc = db.collection(collectionName).doc("_init");
      await testDoc.set({
        initialized: true,
        timestamp: FieldValue.serverTimestamp(),
      });
      await testDoc.delete();
      console.log(`✅ Collection '${collectionName}' ready`);
    } catch (error) {
      console.error(
        `❌ Error initializing collection '${collectionName}':`,
        error.message
      );
    }
  }

  console.log("✅ All collections initialized");
}

/**
 * Cleanup old data (optional maintenance function)
 */
async function cleanupOldData(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  console.log(`🧹 Cleaning up data older than ${daysOld} days...`);

  try {
    // Clean up old daily quests
    const oldQuests = await db
      .collection("dailyQuests")
      .where("createdAt", "<", cutoffDate)
      .get();

    const batch = db.batch();
    let count = 0;

    oldQuests.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Cleaned up ${count} old daily quests`);
    }

    return { success: true, cleaned: count };
  } catch (error) {
    console.error("Error cleaning up old data:", error);
    return { success: false, error: error.message };
  }
}

// Export everything
module.exports = {
  // Admin SDK
  admin,

  // Firestore
  db,
  FieldValue,
  Timestamp,

  // Collections
  collections,

  // Helper functions
  checkFirestoreConnection,
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
  queryCollection,
  createBatch,
  commitBatch,
  initializeCollections,
  cleanupOldData,
};
