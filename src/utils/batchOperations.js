/**
 * Firestore Batch Operations Utility
 * Provides helper functions for efficient batch updates, creates, and deletes
 */

const { db } = require("../config/firebase");
const logger = require("./logger");

/**
 * Firestore batch size limit
 * @constant {number}
 */
const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Execute batch updates on multiple documents
 * Automatically handles batching when operations exceed 500 items
 *
 * @param {Array<Object>} operations - Array of operation objects
 * @param {Object} operations[].ref - Firestore document reference
 * @param {Object} operations[].data - Data to update
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise<Object>} Results including success/failure counts
 *
 * @example
 * const operations = users.map(user => ({
 *   ref: db.collection('users').doc(user.id),
 *   data: { lastActive: new Date() }
 * }));
 * await batchUpdate(operations, 'Update user activity');
 */
async function batchUpdate(operations, operationName = "Batch update") {
  try {
    if (!Array.isArray(operations) || operations.length === 0) {
      logger.warn(`${operationName}: No operations to process`);
      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
        batches: 0,
      };
    }

    logger.info(`${operationName}: Processing ${operations.length} operations`);

    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    // Build batches
    for (const operation of operations) {
      if (!operation.ref || !operation.data) {
        logger.error(`${operationName}: Invalid operation skipped`, operation);
        continue;
      }

      currentBatch.update(operation.ref, operation.data);
      operationCount++;

      // Create new batch when limit reached
      if (operationCount === FIRESTORE_BATCH_LIMIT) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Add remaining operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    logger.info(`${operationName}: Committing ${batches.length} batch(es)`);

    const results = await Promise.allSettled(
      batches.map((batch, index) =>
        batch.commit().then(() => {
          logger.debug(`${operationName}: Batch ${index + 1}/${batches.length} committed`);
        })
      )
    );

    // Analyze results
    const failedBatches = results.filter((r) => r.status === "rejected");
    const successBatches = results.filter((r) => r.status === "fulfilled");

    if (failedBatches.length > 0) {
      failedBatches.forEach((result, index) => {
        logger.error(`${operationName}: Batch ${index + 1} failed:`, result.reason);
      });
    }

    const processed = successBatches.length * FIRESTORE_BATCH_LIMIT + operationCount;
    const failed = failedBatches.length * FIRESTORE_BATCH_LIMIT;

    logger.info(
      `${operationName}: Complete - ${processed} processed, ${failed} failed, ${batches.length} batch(es)`
    );

    return {
      success: failedBatches.length === 0,
      total: operations.length,
      processed,
      failed,
      batches: batches.length,
      batchesFailed: failedBatches.length,
    };
  } catch (error) {
    logger.error(`${operationName}: Error executing batch operations:`, error);
    throw error;
  }
}

/**
 * Execute batch creates (set) on multiple documents
 *
 * @param {Array<Object>} operations - Array of operation objects
 * @param {Object} operations[].ref - Firestore document reference
 * @param {Object} operations[].data - Data to set
 * @param {boolean} merge - Whether to merge with existing data
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise<Object>} Results including success/failure counts
 *
 * @example
 * const operations = newUsers.map(user => ({
 *   ref: db.collection('users').doc(user.id),
 *   data: { username: user.username, createdAt: new Date() }
 * }));
 * await batchSet(operations, false, 'Create new users');
 */
async function batchSet(operations, merge = false, operationName = "Batch set") {
  try {
    if (!Array.isArray(operations) || operations.length === 0) {
      logger.warn(`${operationName}: No operations to process`);
      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
        batches: 0,
      };
    }

    logger.info(`${operationName}: Processing ${operations.length} operations (merge: ${merge})`);

    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    // Build batches
    for (const operation of operations) {
      if (!operation.ref || !operation.data) {
        logger.error(`${operationName}: Invalid operation skipped`, operation);
        continue;
      }

      currentBatch.set(operation.ref, operation.data, { merge });
      operationCount++;

      // Create new batch when limit reached
      if (operationCount === FIRESTORE_BATCH_LIMIT) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Add remaining operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    logger.info(`${operationName}: Committing ${batches.length} batch(es)`);

    const results = await Promise.allSettled(
      batches.map((batch, index) =>
        batch.commit().then(() => {
          logger.debug(`${operationName}: Batch ${index + 1}/${batches.length} committed`);
        })
      )
    );

    // Analyze results
    const failedBatches = results.filter((r) => r.status === "rejected");
    const successBatches = results.filter((r) => r.status === "fulfilled");

    if (failedBatches.length > 0) {
      failedBatches.forEach((result, index) => {
        logger.error(`${operationName}: Batch ${index + 1} failed:`, result.reason);
      });
    }

    const processed = successBatches.length * FIRESTORE_BATCH_LIMIT + operationCount;
    const failed = failedBatches.length * FIRESTORE_BATCH_LIMIT;

    logger.info(
      `${operationName}: Complete - ${processed} processed, ${failed} failed, ${batches.length} batch(es)`
    );

    return {
      success: failedBatches.length === 0,
      total: operations.length,
      processed,
      failed,
      batches: batches.length,
      batchesFailed: failedBatches.length,
    };
  } catch (error) {
    logger.error(`${operationName}: Error executing batch operations:`, error);
    throw error;
  }
}

/**
 * Execute batch deletes on multiple documents
 *
 * @param {Array<Object>} refs - Array of Firestore document references
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise<Object>} Results including success/failure counts
 *
 * @example
 * const refs = oldPosts.map(post => db.collection('posts').doc(post.id));
 * await batchDelete(refs, 'Delete old posts');
 */
async function batchDelete(refs, operationName = "Batch delete") {
  try {
    if (!Array.isArray(refs) || refs.length === 0) {
      logger.warn(`${operationName}: No operations to process`);
      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
        batches: 0,
      };
    }

    logger.info(`${operationName}: Processing ${refs.length} deletions`);

    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    // Build batches
    for (const ref of refs) {
      if (!ref) {
        logger.error(`${operationName}: Invalid ref skipped`);
        continue;
      }

      currentBatch.delete(ref);
      operationCount++;

      // Create new batch when limit reached
      if (operationCount === FIRESTORE_BATCH_LIMIT) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Add remaining operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    logger.info(`${operationName}: Committing ${batches.length} batch(es)`);

    const results = await Promise.allSettled(
      batches.map((batch, index) =>
        batch.commit().then(() => {
          logger.debug(`${operationName}: Batch ${index + 1}/${batches.length} committed`);
        })
      )
    );

    // Analyze results
    const failedBatches = results.filter((r) => r.status === "rejected");
    const successBatches = results.filter((r) => r.status === "fulfilled");

    if (failedBatches.length > 0) {
      failedBatches.forEach((result, index) => {
        logger.error(`${operationName}: Batch ${index + 1} failed:`, result.reason);
      });
    }

    const processed = successBatches.length * FIRESTORE_BATCH_LIMIT + operationCount;
    const failed = failedBatches.length * FIRESTORE_BATCH_LIMIT;

    logger.info(
      `${operationName}: Complete - ${processed} processed, ${failed} failed, ${batches.length} batch(es)`
    );

    return {
      success: failedBatches.length === 0,
      total: refs.length,
      processed,
      failed,
      batches: batches.length,
      batchesFailed: failedBatches.length,
    };
  } catch (error) {
    logger.error(`${operationName}: Error executing batch deletions:`, error);
    throw error;
  }
}

/**
 * Execute mixed batch operations (update, set, delete)
 * Useful when you need to perform different operations in a single atomic batch
 *
 * @param {Array<Object>} operations - Array of operation objects
 * @param {string} operations[].type - Operation type: 'update', 'set', or 'delete'
 * @param {Object} operations[].ref - Firestore document reference
 * @param {Object} operations[].data - Data for update/set operations
 * @param {boolean} operations[].merge - Merge option for set operations
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise<Object>} Results including success/failure counts
 *
 * @example
 * const operations = [
 *   { type: 'update', ref: userRef, data: { tier: 'Silver' } },
 *   { type: 'set', ref: logRef, data: { action: 'upgrade' }, merge: false },
 *   { type: 'delete', ref: oldDataRef }
 * ];
 * await batchMixed(operations, 'User upgrade transaction');
 */
async function batchMixed(operations, operationName = "Batch mixed") {
  try {
    if (!Array.isArray(operations) || operations.length === 0) {
      logger.warn(`${operationName}: No operations to process`);
      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
        batches: 0,
      };
    }

    logger.info(`${operationName}: Processing ${operations.length} mixed operations`);

    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    // Build batches
    for (const operation of operations) {
      if (!operation.ref || !operation.type) {
        logger.error(`${operationName}: Invalid operation skipped`, operation);
        continue;
      }

      switch (operation.type) {
        case "update":
          if (!operation.data) {
            logger.error(`${operationName}: Update operation missing data`, operation);
            continue;
          }
          currentBatch.update(operation.ref, operation.data);
          break;

        case "set":
          if (!operation.data) {
            logger.error(`${operationName}: Set operation missing data`, operation);
            continue;
          }
          currentBatch.set(operation.ref, operation.data, { merge: operation.merge || false });
          break;

        case "delete":
          currentBatch.delete(operation.ref);
          break;

        default:
          logger.error(`${operationName}: Unknown operation type: ${operation.type}`);
          continue;
      }

      operationCount++;

      // Create new batch when limit reached
      if (operationCount === FIRESTORE_BATCH_LIMIT) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Add remaining operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    logger.info(`${operationName}: Committing ${batches.length} batch(es)`);

    const results = await Promise.allSettled(
      batches.map((batch, index) =>
        batch.commit().then(() => {
          logger.debug(`${operationName}: Batch ${index + 1}/${batches.length} committed`);
        })
      )
    );

    // Analyze results
    const failedBatches = results.filter((r) => r.status === "rejected");
    const successBatches = results.filter((r) => r.status === "fulfilled");

    if (failedBatches.length > 0) {
      failedBatches.forEach((result, index) => {
        logger.error(`${operationName}: Batch ${index + 1} failed:`, result.reason);
      });
    }

    const processed = successBatches.length * FIRESTORE_BATCH_LIMIT + operationCount;
    const failed = failedBatches.length * FIRESTORE_BATCH_LIMIT;

    logger.info(
      `${operationName}: Complete - ${processed} processed, ${failed} failed, ${batches.length} batch(es)`
    );

    return {
      success: failedBatches.length === 0,
      total: operations.length,
      processed,
      failed,
      batches: batches.length,
      batchesFailed: failedBatches.length,
    };
  } catch (error) {
    logger.error(`${operationName}: Error executing mixed batch operations:`, error);
    throw error;
  }
}

module.exports = {
  FIRESTORE_BATCH_LIMIT,
  batchUpdate,
  batchSet,
  batchDelete,
  batchMixed,
};
