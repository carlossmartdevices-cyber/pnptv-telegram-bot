# Testing Guide

This document describes the test suite for the PNPtv bot application, covering critical security and functionality tests.

## Overview

The test suite includes comprehensive tests for:

1. **Telegram Authentication Middleware** - Validates initData security
2. **Payment Creation Endpoint** - Tests payment link generation
3. **Plans Endpoint** - Tests subscription plan retrieval
4. **Nearby Users Endpoint** - Tests geolocation-based user queries
5. **Profile Endpoints** - Tests user profile operations

## Test Framework

- **Test Runner**: Jest
- **HTTP Testing**: Supertest
- **Coverage**: 28+ test cases covering critical security paths

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
# Authentication middleware tests
npm test -- src/web/middleware/__tests__/auth.test.js

# Server API endpoint tests
npm test -- src/web/__tests__/server.test.js

# Validation utility tests
npm test -- src/utils/__tests__/validation.test.js
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Structure

### 1. Authentication Middleware Tests
**Location**: `src/web/middleware/__tests__/auth.test.js`

#### Test Coverage:
- ✓ Validates correct Telegram WebApp initData
- ✓ Rejects initData with invalid hash (tampering protection)
- ✓ Rejects expired initData (older than 24 hours)
- ✓ Rejects initData without hash
- ✓ Rejects initData without user data
- ✓ Validates Telegram Login Widget payloads
- ✓ Middleware authentication flow
- ✓ User ID mismatch detection (prevents spoofing)
- ✓ Admin authentication and authorization

**Key Security Features Tested**:
```javascript
// Hash validation prevents data tampering
validateTelegramWebAppData(initData, botToken)

// Time-based validation prevents replay attacks
if (now - authDate > maxAge) { /* reject */ }

// User ID matching prevents unauthorized access
if (req.params.userId !== userData.id) { /* reject */ }
```

### 2. Server API Endpoint Tests
**Location**: `src/web/__tests__/server.test.js`

#### Test Coverage:

##### GET /api/plans
- ✓ Returns list of available subscription plans
- ✓ Handles database errors gracefully

##### POST /api/payment/create
- ✓ Creates payment link for valid authenticated request
- ✓ Rejects unauthenticated requests
- ✓ Validates required parameters (userId, planId)
- ✓ Validates user exists in database
- ✓ Validates plan exists
- ✓ Handles payment gateway errors

##### GET /api/profile/:userId
- ✓ Returns profile for authenticated user
- ✓ Rejects unauthenticated requests
- ✓ Validates userId format (must be positive integer)
- ✓ Prevents accessing other users' profiles
- ✓ Returns 404 for non-existent users

##### PUT /api/profile/:userId
- ✓ Updates user bio
- ✓ Updates user location
- ✓ Validates bio length (max 500 characters)
- ✓ Validates userId format
- ✓ Requires request body

##### POST /api/map/nearby
- ✓ Returns nearby users for valid location
- ✓ Rejects unauthenticated requests
- ✓ Validates coordinate format
- ✓ Requires request body with location data

## Test Data Security

### Test Bot Token
Tests use a dedicated test bot token that is **never** used in production:
```javascript
const TEST_BOT_TOKEN = 'test_bot_token_123';
```

### Mocked Dependencies
All external services are mocked to prevent:
- Real API calls during testing
- Database modifications
- Payment processing
- External service costs

```javascript
jest.mock('../../config/firebase');
jest.mock('../../services/planService');
jest.mock('../../config/epayco');
```

## Writing New Tests

### Test Template for API Endpoints

```javascript
describe('POST /api/my-endpoint', () => {
  it('should succeed with valid input', async () => {
    // Arrange: Setup mocks and test data
    const testUser = { id: '123456789', first_name: 'Test' };
    const initData = generateValidInitData(testUser);

    // Act: Make request
    const response = await request(app)
      .post('/api/my-endpoint')
      .set('x-telegram-init-data', initData)
      .send({ /* request body */ })
      .expect(200);

    // Assert: Verify response
    expect(response.body.success).toBe(true);
  });

  it('should reject invalid input', async () => {
    // Test error cases
  });
});
```

### Test Template for Middleware

```javascript
describe('myMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should call next() for valid input', () => {
    myMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
```

## Common Test Utilities

### Generate Valid Telegram initData
```javascript
function generateValidInitData(userData, authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({
    auth_date: authDate.toString(),
    user: JSON.stringify(userData),
  });

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(TEST_BOT_TOKEN)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  params.append('hash', hash);
  return params.toString();
}
```

## Continuous Integration

Tests should be run:
- Before every commit (pre-commit hook)
- On every pull request
- Before deployment

### Example GitHub Actions Workflow
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## Coverage Goals

Current coverage targets:
- **Critical security paths**: 100%
- **API endpoints**: 90%+
- **Utility functions**: 85%+

View coverage report:
```bash
npm test -- --coverage --coverageReporters=html
# Open coverage/index.html in browser
```

## Troubleshooting

### Tests Failing Locally

1. **Check Node version**: Requires Node.js 18+
```bash
node --version
```

2. **Clean install dependencies**:
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Check environment variables**:
Ensure test environment variables are not conflicting with .env

4. **Clear Jest cache**:
```bash
npm test -- --clearCache
```

### Mock Issues

If mocks aren't working:
- Verify mock path matches actual module path
- Check mock is called before importing module
- Use `jest.resetModules()` between tests if needed

## Best Practices

1. **Test Naming**: Use descriptive test names that explain the scenario
   ```javascript
   it('should reject request when userId does not match authenticated user')
   ```

2. **AAA Pattern**: Arrange, Act, Assert
   ```javascript
   // Arrange
   const mockData = setupMockData();

   // Act
   const result = functionUnderTest(mockData);

   // Assert
   expect(result).toBe(expectedValue);
   ```

3. **Test Isolation**: Each test should be independent
   - Use `beforeEach` to reset state
   - Don't rely on test execution order
   - Clean up after tests in `afterEach`

4. **Mock External Services**: Never make real API calls in tests
   - Mock database operations
   - Mock payment gateways
   - Mock external APIs

5. **Test Edge Cases**: Don't just test happy paths
   - Invalid input
   - Missing data
   - Boundary conditions
   - Error scenarios

## Security Testing Checklist

When adding new endpoints or features, ensure tests cover:

- [ ] Authentication required
- [ ] Authorization (user can only access their own data)
- [ ] Input validation (type, format, length)
- [ ] SQL/NoSQL injection prevention
- [ ] XSS prevention (if rendering user input)
- [ ] Rate limiting (if applicable)
- [ ] CSRF protection (if applicable)
- [ ] Data sanitization
- [ ] Error messages don't leak sensitive info

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Telegram Bot API - Validating Data](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

## Contributing

When contributing tests:

1. Follow existing test structure and naming conventions
2. Ensure all tests pass before submitting PR
3. Add tests for new features
4. Update this documentation if adding new test categories
5. Maintain or improve code coverage

## Questions?

For questions about testing:
- Check existing test files for examples
- Review Jest documentation
- Open an issue on GitHub
