const { db } = require("../config/firebase");
const logger = require("../utils/logger");

const COLLECTION = "reactivationRequests";

async function createReactivationRequest(data) {
  try {
    const now = new Date();
    const payload = {
      status: "pending",
      createdAt: now,
      updatedAt: now,
      ...data,
    };

    const docRef = await db.collection(COLLECTION).add(payload);
    logger.info("Created reactivation request", {
      requestId: docRef.id,
      userId: data.userId,
      planKey: data.planKey,
    });

    return { id: docRef.id, ...payload };
  } catch (error) {
    logger.error("Failed to create reactivation request", error);
    throw error;
  }
}

async function updateReactivationRequest(requestId, updates) {
  try {
    const docRef = db.collection(COLLECTION).doc(requestId);
    const payload = {
      ...updates,
      updatedAt: new Date(),
    };

    await docRef.set(payload, { merge: true });
    logger.info("Updated reactivation request", {
      requestId,
      updates: Object.keys(updates),
    });
  } catch (error) {
    logger.error("Failed to update reactivation request", error);
    throw error;
  }
}

async function getReactivationRequest(requestId) {
  const doc = await db.collection(COLLECTION).doc(requestId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
}

module.exports = {
  createReactivationRequest,
  updateReactivationRequest,
  getReactivationRequest,
};
