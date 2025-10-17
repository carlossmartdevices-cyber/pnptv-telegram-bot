/**
 * Firestore Error Handler Utility
 * Provides centralized error handling for Firestore operations
 */

const logger = require('./logger');

/**
 * Firestore error codes
 * @see https://firebase.google.com/docs/reference/node/firebase.firestore#firestoreerrorcode
 */
const FirestoreErrorCodes = {
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown',
  INVALID_ARGUMENT: 'invalid-argument',
  DEADLINE_EXCEEDED: 'deadline-exceeded',
  NOT_FOUND: 'not-found',
  ALREADY_EXISTS: 'already-exists',
  PERMISSION_DENIED: 'permission-denied',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  FAILED_PRECONDITION: 'failed-precondition',
  ABORTED: 'aborted',
  OUT_OF_RANGE: 'out-of-range',
  UNIMPLEMENTED: 'unimplemented',
  INTERNAL: 'internal',
  UNAVAILABLE: 'unavailable',
  DATA_LOSS: 'data-loss',
  UNAUTHENTICATED: 'unauthenticated',
};

/**
 * HTTP status codes for Firestore errors
 */
const ErrorStatusCodes = {
  [FirestoreErrorCodes.CANCELLED]: 499,
  [FirestoreErrorCodes.UNKNOWN]: 500,
  [FirestoreErrorCodes.INVALID_ARGUMENT]: 400,
  [FirestoreErrorCodes.DEADLINE_EXCEEDED]: 504,
  [FirestoreErrorCodes.NOT_FOUND]: 404,
  [FirestoreErrorCodes.ALREADY_EXISTS]: 409,
  [FirestoreErrorCodes.PERMISSION_DENIED]: 403,
  [FirestoreErrorCodes.RESOURCE_EXHAUSTED]: 429,
  [FirestoreErrorCodes.FAILED_PRECONDITION]: 400,
  [FirestoreErrorCodes.ABORTED]: 409,
  [FirestoreErrorCodes.OUT_OF_RANGE]: 400,
  [FirestoreErrorCodes.UNIMPLEMENTED]: 501,
  [FirestoreErrorCodes.INTERNAL]: 500,
  [FirestoreErrorCodes.UNAVAILABLE]: 503,
  [FirestoreErrorCodes.DATA_LOSS]: 500,
  [FirestoreErrorCodes.UNAUTHENTICATED]: 401,
};

/**
 * User-friendly error messages
 */
const ErrorMessages = {
  [FirestoreErrorCodes.PERMISSION_DENIED]: 'Access denied. Please check your permissions.',
  [FirestoreErrorCodes.RESOURCE_EXHAUSTED]: 'Service quota exceeded. Please try again later.',
  [FirestoreErrorCodes.UNAVAILABLE]: 'Service temporarily unavailable. Please try again.',
  [FirestoreErrorCodes.DEADLINE_EXCEEDED]: 'Request timeout. Please try again.',
  [FirestoreErrorCodes.NOT_FOUND]: 'Resource not found.',
  [FirestoreErrorCodes.ALREADY_EXISTS]: 'Resource already exists.',
  [FirestoreErrorCodes.INVALID_ARGUMENT]: 'Invalid request parameters.',
  [FirestoreErrorCodes.UNAUTHENTICATED]: 'Authentication required.',
  [FirestoreErrorCodes.INTERNAL]: 'Internal server error. Please try again later.',
  [FirestoreErrorCodes.ABORTED]: 'Operation aborted due to conflict. Please retry.',
};

/**
 * Check if error is a Firestore error
 * @param {Error} error - Error object
 * @returns {boolean}
 */
function isFirestoreError(error) {
  return error && (
    error.code in FirestoreErrorCodes ||
    Object.values(FirestoreErrorCodes).includes(error.code)
  );
}

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean}
 */
function isRetryableError(error) {
  if (!isFirestoreError(error)) {
    return false;
  }

  const retryableCodes = [
    FirestoreErrorCodes.UNAVAILABLE,
    FirestoreErrorCodes.DEADLINE_EXCEEDED,
    FirestoreErrorCodes.ABORTED,
    FirestoreErrorCodes.INTERNAL,
    FirestoreErrorCodes.RESOURCE_EXHAUSTED,
  ];

  return retryableCodes.includes(error.code);
}

/**
 * Get HTTP status code for Firestore error
 * @param {Error} error - Error object
 * @returns {number} HTTP status code
 */
function getHttpStatusCode(error) {
  if (!isFirestoreError(error)) {
    return 500;
  }

  return ErrorStatusCodes[error.code] || 500;
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
function getUserMessage(error) {
  if (!isFirestoreError(error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  return ErrorMessages[error.code] || 'An error occurred. Please try again.';
}

/**
 * Handle Firestore error with detailed logging
 * @param {Error} error - Error object
 * @param {string} operation - Operation description (e.g., "fetch user profile")
 * @param {Object} context - Additional context for logging
 * @returns {Object} Error response object with status and message
 */
function handleFirestoreError(error, operation, context = {}) {
  const isFirestore = isFirestoreError(error);
  const statusCode = getHttpStatusCode(error);
  const userMessage = getUserMessage(error);
  const isRetryable = isRetryableError(error);

  // Log detailed error information
  const logContext = {
    operation,
    errorCode: error.code,
    isFirestoreError: isFirestore,
    isRetryable,
    statusCode,
    ...context,
  };

  // Log at appropriate level based on error severity
  if (statusCode >= 500) {
    logger.error(`Firestore error during ${operation}:`, {
      message: error.message,
      stack: error.stack,
      ...logContext,
    });
  } else if (statusCode >= 400) {
    logger.warn(`Firestore error during ${operation}:`, {
      message: error.message,
      ...logContext,
    });
  } else {
    logger.info(`Firestore operation ${operation} completed with code ${error.code}`, logContext);
  }

  // Return standardized error response
  return {
    statusCode,
    error: userMessage,
    code: error.code,
    retryable: isRetryable,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  };
}

/**
 * Wrap Firestore operation with error handling
 * @param {Function} operation - Async function to execute
 * @param {string} operationName - Name of the operation for logging
 * @param {Object} context - Additional context for logging
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} Throws standardized error
 */
async function wrapFirestoreOperation(operation, operationName, context = {}) {
  try {
    return await operation();
  } catch (error) {
    const errorResponse = handleFirestoreError(error, operationName, context);

    // Create enhanced error object
    const enhancedError = new Error(errorResponse.error);
    enhancedError.statusCode = errorResponse.statusCode;
    enhancedError.code = errorResponse.code;
    enhancedError.retryable = errorResponse.retryable;
    enhancedError.originalError = error;

    throw enhancedError;
  }
}

/**
 * Retry Firestore operation with exponential backoff
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {string} options.operationName - Name of the operation for logging
 * @param {Object} options.context - Additional context for logging
 * @returns {Promise<any>} Result of the operation
 */
async function retryFirestoreOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    operationName = 'Firestore operation',
    context = {},
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt === maxRetries) {
        logger.error(`${operationName} failed after ${maxRetries + 1} attempts`, {
          errorCode: error.code,
          ...context,
        });
        throw error;
      }

      // Log retry attempt
      logger.warn(`${operationName} failed, retrying (attempt ${attempt + 1}/${maxRetries})`, {
        errorCode: error.code,
        nextRetryDelay: delay,
        ...context,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff with jitter
      delay = Math.min(delay * 2 + Math.random() * 1000, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create Express middleware for Firestore error handling
 * @param {string} operationName - Name of the operation
 * @returns {Function} Express middleware
 */
function createFirestoreErrorMiddleware(operationName) {
  return (error, req, res, next) => {
    if (isFirestoreError(error)) {
      const errorResponse = handleFirestoreError(error, operationName, {
        path: req.path,
        method: req.method,
        userId: req.telegramUser?.id,
      });

      return res.status(errorResponse.statusCode).json({
        success: false,
        error: errorResponse.error,
        retryable: errorResponse.retryable,
      });
    }

    // Pass to next error handler if not a Firestore error
    next(error);
  };
}

module.exports = {
  FirestoreErrorCodes,
  isFirestoreError,
  isRetryableError,
  getHttpStatusCode,
  getUserMessage,
  handleFirestoreError,
  wrapFirestoreOperation,
  retryFirestoreOperation,
  createFirestoreErrorMiddleware,
};
