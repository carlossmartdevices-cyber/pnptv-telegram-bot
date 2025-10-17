# Firestore Error Handling

Comprehensive guide for handling Firestore errors in the PNPtv Telegram Bot.

## Table of Contents

1. [Overview](#overview)
2. [Error Handling Utility](#error-handling-utility)
3. [Common Firestore Errors](#common-firestore-errors)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Overview

The PNPtv bot implements a centralized Firestore error handling system that:

- ✅ Detects and categorizes Firestore-specific errors
- ✅ Provides user-friendly error messages
- ✅ Implements automatic retry logic for transient errors
- ✅ Logs errors with appropriate context
- ✅ Returns standardized error responses to clients

### Key Features

- **Automatic Retry**: Transient errors (UNAVAILABLE, DEADLINE_EXCEEDED) are automatically retried with exponential backoff
- **Error Classification**: Errors are categorized by type (permission, quota, availability, etc.)
- **User-Friendly Messages**: Technical errors are translated to user-friendly messages
- **Detailed Logging**: All errors are logged with context for debugging
- **HTTP Status Mapping**: Firestore errors are mapped to appropriate HTTP status codes

## Error Handling Utility

Location: `src/utils/firestoreErrorHandler.js`

### Core Functions

#### `wrapFirestoreOperation(operation, operationName, context)`

Wraps a Firestore operation with error handling.

```javascript
const { wrapFirestoreOperation } = require('../utils/firestoreErrorHandler');

const doc = await wrapFirestoreOperation(
  async () => {
    const userRef = db.collection('users').doc(userId);
    return await userRef.get();
  },
  'fetch user profile',
  { userId, path: req.path }
);
```

**Parameters:**
- `operation`: Async function that performs the Firestore operation
- `operationName`: Descriptive name for logging (e.g., "fetch user profile")
- `context`: Additional context for logging (e.g., userId, path)

**Returns:** Result of the operation

**Throws:** Enhanced error with statusCode, code, and retryable properties

#### `retryFirestoreOperation(operation, options)`

Retries a Firestore operation with exponential backoff.

```javascript
const { retryFirestoreOperation } = require('../utils/firestoreErrorHandler');

const snapshot = await retryFirestoreOperation(
  async () => await db.collection('users').get(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    operationName: 'fetch all users',
    context: { service: 'UserService' }
  }
);
```

**Options:**
- `maxRetries`: Maximum number of retries (default: 3)
- `initialDelay`: Initial delay in ms (default: 1000)
- `maxDelay`: Maximum delay in ms (default: 10000)
- `operationName`: Operation name for logging
- `context`: Additional context for logging

#### `handleFirestoreError(error, operation, context)`

Handles and formats Firestore errors.

```javascript
const { handleFirestoreError } = require('../utils/firestoreErrorHandler');

try {
  // Firestore operation
} catch (error) {
  const errorResponse = handleFirestoreError(error, 'update user profile', {
    userId: req.params.userId,
    path: req.path
  });

  return res.status(errorResponse.statusCode).json({
    success: false,
    error: errorResponse.error,
    retryable: errorResponse.retryable
  });
}
```

**Returns:**
```javascript
{
  statusCode: 403,
  error: "Access denied. Please check your permissions.",
  code: "permission-denied",
  retryable: false,
  details: "Error message" // Only in development
}
```

## Common Firestore Errors

### Permission Errors

**Error Code:** `permission-denied`
**HTTP Status:** 403
**Retryable:** No

**Cause:**
- Firestore security rules deny access
- Missing required authentication
- Insufficient permissions for the operation

**Solution:**
```javascript
// Check Firestore security rules
// Ensure user is authenticated
// Verify user has necessary permissions
```

**Example:**
```javascript
try {
  await db.collection('users').doc(userId).get();
} catch (error) {
  if (error.code === 'permission-denied') {
    logger.error('Firestore permission denied', { userId });
    return res.status(403).json({ error: 'Access denied' });
  }
}
```

### Resource Exhausted

**Error Code:** `resource-exhausted`
**HTTP Status:** 429
**Retryable:** Yes (with backoff)

**Cause:**
- Quota limits exceeded
- Too many requests
- Rate limiting triggered

**Solution:**
```javascript
// Implement retry logic with exponential backoff
// Check Firestore quotas in Firebase Console
// Optimize query patterns to reduce operations
```

**Example:**
```javascript
const snapshot = await retryFirestoreOperation(
  async () => await db.collection('users').get(),
  {
    maxRetries: 3,
    initialDelay: 2000, // Start with longer delay for quota errors
    operationName: 'fetch users'
  }
);
```

### Service Unavailable

**Error Code:** `unavailable`
**HTTP Status:** 503
**Retryable:** Yes

**Cause:**
- Temporary Firestore service outage
- Network connectivity issues
- Regional service disruption

**Solution:**
```javascript
// Automatically retried by retryFirestoreOperation
// Implement fallback to cached data if available
// Show user-friendly message to try again later
```

### Deadline Exceeded

**Error Code:** `deadline-exceeded`
**HTTP Status:** 504
**Retryable:** Yes

**Cause:**
- Operation timeout
- Large query taking too long
- Network latency

**Solution:**
```javascript
// Optimize queries with indexes
// Reduce query result size with limits
// Paginate large datasets
// Implement retry logic
```

**Example:**
```javascript
// Before: Large query without limit
const snapshot = await db.collection('users').get(); // May timeout

// After: Paginated query
const snapshot = await db.collection('users')
  .limit(100)
  .get(); // Less likely to timeout
```

### Not Found

**Error Code:** `not-found`
**HTTP Status:** 404
**Retryable:** No

**Cause:**
- Document doesn't exist
- Collection doesn't exist
- Path typo

**Solution:**
```javascript
const doc = await db.collection('users').doc(userId).get();

if (!doc.exists) {
  return res.status(404).json({
    success: false,
    error: 'User not found'
  });
}
```

### Invalid Argument

**Error Code:** `invalid-argument`
**HTTP Status:** 400
**Retryable:** No

**Cause:**
- Invalid query parameters
- Malformed data
- Invalid field paths

**Solution:**
```javascript
// Validate input before Firestore operation
if (!userId || typeof userId !== 'string') {
  return res.status(400).json({ error: 'Invalid user ID' });
}
```

## Usage Examples

### Example 1: API Endpoint with Error Handling

```javascript
const { wrapFirestoreOperation, handleFirestoreError } = require('../utils/firestoreErrorHandler');

app.get('/api/profile/:userId', authenticateTelegramUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate input
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Wrap Firestore operation
    const doc = await wrapFirestoreOperation(
      async () => {
        const userRef = db.collection('users').doc(userId);
        return await userRef.get();
      },
      'fetch user profile',
      { userId, path: req.path }
    );

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = doc.data();

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    // Handle Firestore-specific errors
    const errorResponse = handleFirestoreError(error, 'fetch user profile', {
      userId: req.params.userId,
      path: req.path
    });

    return res.status(errorResponse.statusCode).json({
      success: false,
      error: errorResponse.error,
      retryable: errorResponse.retryable
    });
  }
});
```

### Example 2: Service with Retry Logic

```javascript
const { retryFirestoreOperation } = require('../utils/firestoreErrorHandler');

class PlanService {
  async getActivePlans() {
    try {
      const snapshot = await retryFirestoreOperation(
        async () => await this.plansCollection
          .where('active', '==', true)
          .orderBy('price', 'asc')
          .get(),
        {
          maxRetries: 3,
          initialDelay: 1000,
          operationName: 'fetch active plans',
          context: { service: 'PlanService' }
        }
      );

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Failed to fetch active plans:', error);
      // Fallback to static plans
      return this.getStaticPlans();
    }
  }
}
```

### Example 3: Update Operation with Error Handling

```javascript
app.put('/api/profile/:userId', authenticateTelegramUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { bio, location } = req.body;

    const { updatedData } = await wrapFirestoreOperation(
      async () => {
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
          const error = new Error('User not found');
          error.statusCode = 404;
          throw error;
        }

        const updateData = {};

        if (bio !== undefined) {
          updateData.bio = bio.trim();
        }

        if (location !== undefined) {
          Object.assign(updateData, prepareLocationUpdate(location));
        }

        updateData.updatedAt = new Date();

        await userRef.update(updateData);

        const updatedDoc = await userRef.get();
        return { updatedData: updatedDoc.data() };
      },
      'update user profile',
      { userId, path: req.path }
    );

    res.json({
      success: true,
      message: 'Profile updated',
      user: updatedData
    });
  } catch (error) {
    const errorResponse = handleFirestoreError(error, 'update user profile', {
      userId: req.params.userId,
      path: req.path
    });

    return res.status(errorResponse.statusCode).json({
      success: false,
      error: errorResponse.error,
      retryable: errorResponse.retryable
    });
  }
});
```

## Best Practices

### 1. Always Validate Input

Validate user input before making Firestore calls to avoid invalid-argument errors.

```javascript
// ✅ Good
if (!userId || typeof userId !== 'string' || !/^\d+$/.test(userId)) {
  return res.status(400).json({ error: 'Invalid user ID' });
}

const doc = await db.collection('users').doc(userId).get();

// ❌ Bad
const doc = await db.collection('users').doc(userId).get(); // No validation
```

### 2. Use Retry Logic for Transient Errors

Wrap critical operations in retry logic to handle temporary failures.

```javascript
// ✅ Good
const snapshot = await retryFirestoreOperation(
  async () => await db.collection('users').get(),
  { maxRetries: 3, operationName: 'fetch users' }
);

// ❌ Bad
const snapshot = await db.collection('users').get(); // No retry
```

### 3. Provide Context in Error Logs

Include relevant context when logging errors for easier debugging.

```javascript
// ✅ Good
const errorResponse = handleFirestoreError(error, 'fetch user profile', {
  userId,
  path: req.path,
  method: req.method
});

// ❌ Bad
logger.error('Error:', error); // No context
```

### 4. Implement Fallback Strategies

Have fallback options for critical operations.

```javascript
// ✅ Good
try {
  return await this.getPlansFromFirestore();
} catch (error) {
  logger.warn('Firestore unavailable, using static plans');
  return this.getStaticPlans(); // Fallback
}

// ❌ Bad
return await this.getPlansFromFirestore(); // No fallback
```

### 5. Use Appropriate Status Codes

Map Firestore errors to correct HTTP status codes.

```javascript
// ✅ Good
const errorResponse = handleFirestoreError(error, 'operation');
return res.status(errorResponse.statusCode).json({ error: errorResponse.error });

// ❌ Bad
return res.status(500).json({ error: 'Error' }); // Always 500
```

### 6. Handle Permission Errors Gracefully

```javascript
// ✅ Good
if (error.code === 'permission-denied') {
  logger.error('Permission denied for user', { userId });
  return res.status(403).json({
    success: false,
    error: 'Access denied. Please check your permissions.'
  });
}

// ❌ Bad
throw error; // Exposes internal error details
```

### 7. Paginate Large Queries

Avoid timeout errors by limiting query results.

```javascript
// ✅ Good
const snapshot = await db.collection('users')
  .limit(100)
  .get();

// ❌ Bad
const snapshot = await db.collection('users').get(); // May timeout
```

### 8. Index Your Queries

Create Firestore indexes for queries to avoid deadline-exceeded errors.

```bash
# Firestore will provide index creation link in error message
# Example index error:
# "The query requires an index. You can create it here: https://console.firebase.google.com/..."
```

## Troubleshooting

### Error: "Missing or insufficient permissions"

**Cause:** Firestore security rules are blocking the operation.

**Solution:**
1. Check Firestore security rules in Firebase Console
2. Verify user authentication is working
3. Ensure the authenticated user has necessary permissions
4. Test security rules in Firestore Rules Playground

### Error: "Quota exceeded"

**Cause:** You've exceeded Firestore usage quotas.

**Solution:**
1. Check quota usage in Firebase Console
2. Implement caching to reduce Firestore reads
3. Optimize queries to reduce operations
4. Consider upgrading Firebase plan if needed

### Error: "Deadline exceeded"

**Cause:** Operation is taking too long.

**Solution:**
1. Create Firestore indexes for queries
2. Reduce query result size with `.limit()`
3. Paginate large datasets
4. Check network connectivity
5. Monitor query performance in Firebase Console

### Error: "Service unavailable"

**Cause:** Temporary Firestore outage.

**Solution:**
1. Implement retry logic (already done in our utility)
2. Check Firebase Status Dashboard: https://status.firebase.google.com/
3. Implement fallback to cached data if available
4. Show user-friendly error message

### Testing Error Handling

You can simulate Firestore errors for testing:

```javascript
// Simulate permission denied error
const simulatePermissionError = () => {
  const error = new Error('Missing or insufficient permissions');
  error.code = 'permission-denied';
  throw error;
};

// Simulate resource exhausted error
const simulateQuotaError = () => {
  const error = new Error('Quota exceeded');
  error.code = 'resource-exhausted';
  throw error;
};

// Test error handling
try {
  simulatePermissionError();
} catch (error) {
  const errorResponse = handleFirestoreError(error, 'test operation');
  console.log(errorResponse);
  // Output: { statusCode: 403, error: 'Access denied. Please check your permissions.', ... }
}
```

## Resources

- [Firestore Error Codes](https://firebase.google.com/docs/reference/node/firebase.firestore#firestoreerrorcode)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Quotas and Limits](https://firebase.google.com/docs/firestore/quotas)
- [Firebase Status Dashboard](https://status.firebase.google.com/)

---

**Last Updated:** 2025-01-17
**Maintained By:** PNPtv Development Team
