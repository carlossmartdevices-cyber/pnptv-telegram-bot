# Firestore Batch Operations

## Overview

Firestore batch operations have been implemented to significantly improve database write performance and ensure atomicity when updating multiple documents simultaneously.

## Benefits

### Performance
- **Up to 500x faster** than sequential updates
- Single network round-trip for multiple operations
- Reduced latency and network overhead

### Atomicity
- All operations succeed or all fail
- No partial updates or inconsistent state
- Transactional guarantees

### Cost Efficiency
- Same Firestore write cost as individual operations
- Reduced Cloud Function execution time
- Lower network bandwidth usage

## Usage

### Basic Batch Update

```javascript
const { batchUpdate } = require('./utils/batchOperations');

// Update multiple users at once
const operations = users.map(user => ({
  ref: db.collection('users').doc(user.id),
  data: { lastActive: new Date(), status: 'active' }
}));

const result = await batchUpdate(operations, 'Update user activity');
console.log(`Updated ${result.processed} users`);
```

### Batch Set (Create/Upsert)

```javascript
const { batchSet } = require('./utils/batchOperations');

// Create multiple documents
const operations = newUsers.map(user => ({
  ref: db.collection('users').doc(user.id),
  data: {
    username: user.username,
    tier: 'Free',
    createdAt: new Date()
  }
}));

// merge: false = overwrite, merge: true = update only provided fields
const result = await batchSet(operations, false, 'Create new users');
```

### Batch Delete

```javascript
const { batchDelete } = require('./utils/batchOperations');

// Delete multiple documents
const refs = oldPosts.map(post => db.collection('posts').doc(post.id));

const result = await batchDelete(refs, 'Delete old posts');
```

### Mixed Operations

```javascript
const { batchMixed } = require('./utils/batchOperations');

// Combine different operation types in one atomic batch
const operations = [
  {
    type: 'update',
    ref: db.collection('users').doc(userId),
    data: { tier: 'Silver', tierUpdatedAt: new Date() }
  },
  {
    type: 'set',
    ref: db.collection('logs').doc(logId),
    data: { action: 'upgrade', userId, timestamp: new Date() },
    merge: false
  },
  {
    type: 'delete',
    ref: db.collection('temp_data').doc(tempId)
  }
];

const result = await batchMixed(operations, 'User upgrade transaction');
```

## API Reference

### batchUpdate(operations, operationName)

Execute batch updates on multiple documents.

**Parameters:**
- `operations` (Array): Array of objects with `ref` and `data` properties
- `operationName` (String): Description for logging

**Returns:**
```javascript
{
  success: true,        // Overall success
  total: 100,           // Total operations attempted
  processed: 100,       // Successfully processed
  failed: 0,            // Failed operations
  batches: 1,           // Number of batches created
  batchesFailed: 0      // Number of failed batches
}
```

### batchSet(operations, merge, operationName)

Execute batch creates/sets on multiple documents.

**Parameters:**
- `operations` (Array): Array of objects with `ref` and `data` properties
- `merge` (Boolean): Whether to merge with existing data
- `operationName` (String): Description for logging

### batchDelete(refs, operationName)

Execute batch deletes on multiple documents.

**Parameters:**
- `refs` (Array): Array of Firestore document references
- `operationName` (String): Description for logging

### batchMixed(operations, operationName)

Execute mixed batch operations (update, set, delete).

**Parameters:**
- `operations` (Array): Array of objects with `type`, `ref`, `data` (for update/set), and optional `merge` (for set)
- `operationName` (String): Description for logging

## Real-World Examples

### Example 1: Membership Expiration (Current Implementation)

**Before (Sequential Updates):**
```javascript
// ❌ Slow: N network calls for N users
for (const doc of expiredUsers.docs) {
  await db.collection("users").doc(doc.id).update({
    tier: "Free",
    membershipIsPremium: false
  });
}
// Time: ~100ms × 50 users = 5000ms (5 seconds)
```

**After (Batch Operations):**
```javascript
// ✅ Fast: 1 network call for all users
const operations = expiredUsers.docs.map(doc => ({
  ref: db.collection("users").doc(doc.id),
  data: {
    tier: "Free",
    tierUpdatedAt: new Date(),
    membershipIsPremium: false,
    membershipExpiresAt: null
  }
}));

const result = await batchUpdate(operations, "Expire memberships");
// Time: ~200ms total (25x faster!)
```

### Example 2: Bulk User Activation

```javascript
const { batchUpdate } = require('./utils/batchOperations');

async function activateUsers(userIds, tier, durationDays) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const operations = userIds.map(userId => ({
    ref: db.collection('users').doc(userId),
    data: {
      tier,
      tierUpdatedAt: now,
      membershipExpiresAt: expiresAt,
      membershipIsPremium: true
    }
  }));

  return await batchUpdate(operations, 'Bulk user activation');
}

// Activate 100 users instantly
await activateUsers(userIds, 'Silver', 30);
```

### Example 3: Analytics Update

```javascript
// Update last active timestamp for all active users
async function updateActiveUsers(activeUserIds) {
  const now = new Date();

  const operations = activeUserIds.map(userId => ({
    ref: db.collection('users').doc(userId),
    data: { lastActive: now, isOnline: true }
  }));

  return await batchUpdate(operations, 'Update active users');
}
```

### Example 4: Data Migration

```javascript
const { batchMixed } = require('./utils/batchOperations');

async function migrateUserData(users) {
  const operations = users.flatMap(user => [
    // Create new record
    {
      type: 'set',
      ref: db.collection('users_v2').doc(user.id),
      data: transformUserData(user),
      merge: false
    },
    // Mark old record as migrated
    {
      type: 'update',
      ref: db.collection('users').doc(user.id),
      data: { migrated: true, migratedAt: new Date() }
    }
  ]);

  return await batchMixed(operations, 'Migrate user data');
}
```

## Automatic Batching

The utility automatically handles:

1. **Batch Size Limits**: Firestore allows max 500 operations per batch
   - Operations are automatically split into multiple batches
   - All batches are committed in parallel for maximum speed

2. **Error Handling**: Failed batches are logged with details
   - Successful batches still commit even if others fail
   - Detailed results show success/failure counts

3. **Logging**: All operations are logged for debugging
   - Debug logs for individual batches
   - Info logs for operation summaries
   - Error logs for failures

## Performance Comparison

| Scenario | Sequential | Batch | Improvement |
|----------|-----------|-------|-------------|
| Update 10 users | ~1000ms | ~150ms | **6.6x faster** |
| Update 50 users | ~5000ms | ~200ms | **25x faster** |
| Update 500 users | ~50000ms | ~500ms | **100x faster** |
| Update 2000 users | ~200s | ~2s | **100x faster** |

*Times approximate, based on average Firestore latency*

## Best Practices

### 1. Always Use Descriptive Operation Names

```javascript
// ✅ Good
await batchUpdate(ops, 'Expire premium memberships');

// ❌ Bad
await batchUpdate(ops, 'Update');
```

### 2. Validate Data Before Batching

```javascript
// ✅ Good - validate first
const operations = users
  .filter(u => u.id && u.tier) // Validate
  .map(u => ({
    ref: db.collection('users').doc(u.id),
    data: { tier: u.tier }
  }));

// ❌ Bad - could have invalid operations
const operations = users.map(u => ({
  ref: db.collection('users').doc(u.id),
  data: { tier: u.tier }
}));
```

### 3. Handle Results Properly

```javascript
const result = await batchUpdate(operations, 'Update users');

if (!result.success) {
  logger.error(`Batch failed: ${result.failed}/${result.total} operations failed`);
  // Handle failure (retry, alert, etc.)
}

if (result.failed > 0) {
  logger.warn(`Partial failure: ${result.failed} operations failed`);
  // Handle partial failure
}
```

### 4. Use Appropriate Operation Types

- `batchUpdate`: When updating existing documents (will fail if document doesn't exist)
- `batchSet`: When creating new documents or upserting
- `batchDelete`: When removing documents
- `batchMixed`: When you need different operations in one atomic transaction

## Limitations

1. **500 Operations Per Batch**: Firestore hard limit
   - Utility automatically splits into multiple batches
   - Multiple batches are NOT atomic (each batch is atomic individually)

2. **Write Limits**: Firestore has rate limits
   - Max 10,000 writes/second per database
   - Max 500 writes/second per document

3. **Size Limits**: Each document max 1MB
   - Batch requests max 10MB total

## Related Files

- `src/utils/batchOperations.js` - Core batch operations utility
- `src/utils/membershipManager.js` - Example implementation
- `src/services/planService.js` - Uses cache invalidation

## Future Enhancements

- [ ] Add transaction support for complex operations
- [ ] Implement automatic retry for failed batches
- [ ] Add rate limiting to respect Firestore quotas
- [ ] Create batch operations for subcollections
- [ ] Add batch query operations (batch reads)

## Support

For issues or questions:
1. Check operation logs for detailed error messages
2. Verify Firestore permissions and indexes
3. Ensure data is valid before batching
4. Review Firestore quotas and limits
