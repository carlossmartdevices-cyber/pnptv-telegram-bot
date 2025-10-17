/**
 * Tests for Authentication Middleware
 * Tests Telegram WebApp initData validation
 */

const crypto = require('crypto');
const {
  validateTelegramWebAppData,
  validateTelegramLoginPayload,
  authenticateTelegramUser,
  optionalAuth,
  isAdmin,
  requireAdmin,
} = require('../auth');

// Mock logger to avoid console output during tests
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Authentication Middleware', () => {
  const TEST_BOT_TOKEN = 'test_bot_token_123';

  /**
   * Helper function to generate valid initData
   */
  function generateValidInitData(userData, authDate = Math.floor(Date.now() / 1000)) {
    const params = new URLSearchParams({
      auth_date: authDate.toString(),
      user: JSON.stringify(userData),
    });

    // Generate hash
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

  /**
   * Helper to generate valid login payload
   */
  function generateValidLoginPayload(userData, authDate = Math.floor(Date.now() / 1000)) {
    const payload = {
      id: userData.id,
      first_name: userData.first_name,
      username: userData.username,
      auth_date: authDate,
    };

    const dataCheckString = Object.entries(payload)
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

    return { ...payload, hash };
  }

  describe('validateTelegramWebAppData', () => {
    it('should validate correct initData', () => {
      const userData = {
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
      };

      const initData = generateValidInitData(userData);
      const result = validateTelegramWebAppData(initData, TEST_BOT_TOKEN);

      expect(result).not.toBeNull();
      expect(result.id).toBe('123456789');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.username).toBe('testuser');
    });

    it('should reject initData with invalid hash', () => {
      const userData = {
        id: 123456789,
        first_name: 'Test',
        username: 'testuser',
      };

      const initData = generateValidInitData(userData);
      // Tamper with the data
      const tamperedData = initData.replace('testuser', 'hacker');

      const result = validateTelegramWebAppData(tamperedData, TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });

    it('should reject expired initData (older than 24 hours)', () => {
      const userData = {
        id: 123456789,
        first_name: 'Test',
        username: 'testuser',
      };

      // Create initData from 25 hours ago
      const oldAuthDate = Math.floor(Date.now() / 1000) - (25 * 60 * 60);
      const initData = generateValidInitData(userData, oldAuthDate);

      const result = validateTelegramWebAppData(initData, TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });

    it('should reject initData without hash', () => {
      const initData = 'user={"id":123456789}&auth_date=1234567890';
      const result = validateTelegramWebAppData(initData, TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });

    it('should reject initData without user data', () => {
      const params = new URLSearchParams({
        auth_date: Math.floor(Date.now() / 1000).toString(),
        hash: 'somehash',
      });

      const result = validateTelegramWebAppData(params.toString(), TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });

    it('should handle missing initData', () => {
      const result = validateTelegramWebAppData(null, TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });

    it('should handle missing bot token', () => {
      const userData = { id: 123456789, first_name: 'Test' };
      const initData = generateValidInitData(userData);

      const result = validateTelegramWebAppData(initData, null);
      expect(result).toBeNull();
    });
  });

  describe('validateTelegramLoginPayload', () => {
    it('should validate correct login payload', () => {
      const userData = {
        id: 123456789,
        first_name: 'Test',
        username: 'testuser',
      };

      const payload = generateValidLoginPayload(userData);
      const result = validateTelegramLoginPayload(payload, TEST_BOT_TOKEN);

      expect(result).not.toBeNull();
      expect(result.id).toBe('123456789');
      expect(result.firstName).toBe('Test');
      expect(result.username).toBe('testuser');
    });

    it('should reject payload with invalid hash', () => {
      const payload = generateValidLoginPayload({
        id: 123456789,
        first_name: 'Test',
        username: 'testuser',
      });

      payload.username = 'hacker'; // Tamper with data

      const result = validateTelegramLoginPayload(payload, TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });

    it('should reject expired login payload', () => {
      const oldAuthDate = Math.floor(Date.now() / 1000) - (25 * 60 * 60);
      const payload = generateValidLoginPayload({
        id: 123456789,
        first_name: 'Test',
        username: 'testuser',
      }, oldAuthDate);

      const result = validateTelegramLoginPayload(payload, TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });

    it('should reject payload without hash', () => {
      const payload = {
        id: 123456789,
        first_name: 'Test',
        auth_date: Math.floor(Date.now() / 1000),
      };

      const result = validateTelegramLoginPayload(payload, TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });

    it('should handle null payload', () => {
      const result = validateTelegramLoginPayload(null, TEST_BOT_TOKEN);
      expect(result).toBeNull();
    });
  });

  describe('authenticateTelegramUser middleware', () => {
    let req, res, next;

    beforeEach(() => {
      process.env.TELEGRAM_TOKEN = TEST_BOT_TOKEN;

      req = {
        headers: {},
        body: {},
        params: {},
        path: '/api/test',
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      next = jest.fn();
    });

    afterEach(() => {
      delete process.env.TELEGRAM_TOKEN;
    });

    it('should authenticate valid initData from header', () => {
      const userData = { id: 123456789, first_name: 'Test', username: 'testuser' };
      const initData = generateValidInitData(userData);

      req.headers['x-telegram-init-data'] = initData;

      authenticateTelegramUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.telegramUser).toBeDefined();
      expect(req.telegramUser.id).toBe('123456789');
    });

    it('should authenticate valid initData from body', () => {
      const userData = { id: 123456789, first_name: 'Test', username: 'testuser' };
      const initData = generateValidInitData(userData);

      req.body.initData = initData;

      authenticateTelegramUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.telegramUser).toBeDefined();
    });

    it('should reject request without initData', () => {
      authenticateTelegramUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Authentication required'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid initData', () => {
      req.headers['x-telegram-init-data'] = 'invalid_data';

      authenticateTelegramUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid authentication'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when userId in params does not match authenticated user', () => {
      const userData = { id: 123456789, first_name: 'Test', username: 'testuser' };
      const initData = generateValidInitData(userData);

      req.headers['x-telegram-init-data'] = initData;
      req.params.userId = '987654321'; // Different user ID

      authenticateTelegramUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Forbidden'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when userId in body does not match authenticated user', () => {
      const userData = { id: 123456789, first_name: 'Test', username: 'testuser' };
      const initData = generateValidInitData(userData);

      req.headers['x-telegram-init-data'] = initData;
      req.body.userId = '987654321'; // Different user ID

      authenticateTelegramUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('User ID mismatch'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when bot token is not configured', () => {
      delete process.env.TELEGRAM_TOKEN;
      delete process.env.TELEGRAM_BOT_TOKEN;

      req.headers['x-telegram-init-data'] = 'some_data';

      authenticateTelegramUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('configuration error'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    let req, res, next;

    beforeEach(() => {
      process.env.TELEGRAM_TOKEN = TEST_BOT_TOKEN;

      req = {
        headers: {},
        body: {},
      };

      res = {};
      next = jest.fn();
    });

    afterEach(() => {
      delete process.env.TELEGRAM_TOKEN;
    });

    it('should set telegramUser when valid initData is provided', () => {
      const userData = { id: 123456789, first_name: 'Test', username: 'testuser' };
      const initData = generateValidInitData(userData);

      req.headers['x-telegram-init-data'] = initData;

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.telegramUser).toBeDefined();
      expect(req.telegramUser.id).toBe('123456789');
    });

    it('should set telegramUser to null when no initData is provided', () => {
      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.telegramUser).toBeNull();
    });

    it('should set telegramUser to null when invalid initData is provided', () => {
      req.headers['x-telegram-init-data'] = 'invalid_data';

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.telegramUser).toBeNull();
    });
  });

  describe('isAdmin', () => {
    beforeEach(() => {
      process.env.ADMIN_IDS = '111111,222222,333333';
    });

    afterEach(() => {
      delete process.env.ADMIN_IDS;
    });

    it('should return true for admin user IDs', () => {
      expect(isAdmin('111111')).toBe(true);
      expect(isAdmin('222222')).toBe(true);
      expect(isAdmin('333333')).toBe(true);
    });

    it('should return false for non-admin user IDs', () => {
      expect(isAdmin('999999')).toBe(false);
      expect(isAdmin('123456')).toBe(false);
    });

    it('should handle numeric user IDs', () => {
      expect(isAdmin(111111)).toBe(true);
      expect(isAdmin(999999)).toBe(false);
    });
  });

  describe('requireAdmin middleware', () => {
    let req, res, next;

    beforeEach(() => {
      process.env.ADMIN_IDS = '111111,222222';

      req = {
        telegramUser: null,
        method: 'GET',
        path: '/api/admin/test',
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      next = jest.fn();
    });

    afterEach(() => {
      delete process.env.ADMIN_IDS;
    });

    it('should allow admin users', () => {
      req.telegramUser = { id: '111111', username: 'admin1' };

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      req.telegramUser = { id: '999999', username: 'normaluser' };

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Admin access required'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests', () => {
      req.telegramUser = null;

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Authentication required'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
