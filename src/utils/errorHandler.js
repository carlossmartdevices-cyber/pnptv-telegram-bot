/**
 * Centralized Error Handler
 * Provides consistent error handling and logging across the application
 */

const logger = require('./logger');

/**
 * Custom Application Error Class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error types
 */
class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
    this.type = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.type = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.type = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.type = 'NotFoundError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, false);
    this.type = 'DatabaseError';
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 503, false);
    this.service = service;
    this.type = 'ExternalServiceError';
  }
}

/**
 * Express error handling middleware
 */
function errorHandler(err, req, res, next) {
  let error = err;

  // Convert non-AppError errors to AppError
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new AppError(message, statusCode, false);
  }

  // Log error
  const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Error occurred:', {
    type: error.type || 'Error',
    message: error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    userId: req.telegramUser?.id || req.params?.userId || 'unknown',
    stack: error.stack,
    isOperational: error.isOperational,
  });

  // Send error response
  const response = {
    success: false,
    error: error.message,
    type: error.type || 'Error',
    timestamp: error.timestamp || new Date().toISOString(),
  };

  // Include field name for validation errors
  if (error.field) {
    response.field = error.field;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && !error.isOperational) {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(reason, promise) {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason,
    promise: promise,
  });

  // Don't exit in production, but log the error
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled Rejection:', reason);
  }
}

/**
 * Handle uncaught exceptions
 */
function handleUncaughtException(error) {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });

  // Exit process for uncaught exceptions
  console.error('Uncaught Exception:', error);
  process.exit(1);
}

/**
 * Validate required fields in request
 */
function validateRequired(data, requiredFields, customMessages = {}) {
  const missing = [];
  const invalid = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    const message = customMessages[missing[0]] || `Missing required field: ${missing.join(', ')}`;
    throw new ValidationError(message, missing[0]);
  }

  return true;
}

/**
 * Sanitize error message for user display
 */
function sanitizeErrorMessage(error) {
  // Remove sensitive information from error messages
  const message = error.message || 'An error occurred';

  // Replace sensitive patterns
  const sanitized = message
    .replace(/FIREBASE_[A-Z_]+/g, '[REDACTED]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{10,}\b/g, '[ID]')
    .replace(/sk_live_[a-zA-Z0-9]+/g, '[API_KEY]');

  return sanitized;
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  errorHandler,
  asyncHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  validateRequired,
  sanitizeErrorMessage,
};
