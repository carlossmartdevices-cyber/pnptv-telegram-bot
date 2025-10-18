/**
 * Tests for Session Manager
 * Tests session creation, validation, refresh, and revocation
 */

const sessionManager = require('../sessionManager');

// Mock Firestore
jest.mock('../../config/firebase', () => {
  const mockFirestore = {
    collection: jest.fn(),
  };
  return { db: mockFirestore };
});

const { db } = require('../../config/firebase');

describe('Session Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session with valid user data', async () => {
      const mockSessionRef = { id: 'session123' };
      const mockAdd = jest.fn().mockResolvedValue(mockSessionRef);
      const mockGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });

      db.collection.mockReturnValue({
        add: mockAdd,
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: mockGet,
      });

      const result = await sessionManager.createSession('12345', {
        username: 'testuser',
        firstName: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session123');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(3600); // 1 hour
      expect(mockAdd).toHaveBeenCalledTimes(1);
    });

    it('should throw error if userId is missing', async () => {
      await expect(sessionManager.createSession(null)).rejects.toThrow('User ID is required');
    });

    it('should cleanup old sessions when MAX_SESSIONS exceeded', async () => {
      const mockSessionRef = { id: 'session123' };
      const mockAdd = jest.fn().mockResolvedValue(mockSessionRef);

      // Mock 6 existing sessions (over MAX_SESSIONS_PER_USER = 5)
      const mockExistingSessions = Array(6).fill(null).map((_, i) => ({
        ref: { update: jest.fn() },
        data: () => ({ userId: '12345', createdAt: new Date() }),
      }));

      const mockGet = jest.fn().mockResolvedValue({
        empty: false,
        size: 6,
        docs: mockExistingSessions,
      });

      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };

      db.collection.mockReturnValue({
        add: mockAdd,
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: mockGet,
      });

      db.batch = jest.fn().mockReturnValue(mockBatch);

      const result = await sessionManager.createSession('12345', {
        username: 'testuser',
      });

      expect(result.success).toBe(true);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('validateAccessToken', () => {
    it('should validate a valid access token', async () => {
      const mockSessionDoc = {
        id: 'session123',
        ref: { update: jest.fn() },
        data: () => ({
          userId: '12345',
          username: 'testuser',
          firstName: 'Test',
          accessTokenExpiry: { toDate: () => new Date(Date.now() + 3600000) }, // 1 hour from now
          active: true,
        }),
      };

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [mockSessionDoc],
        }),
      });

      const result = await sessionManager.validateAccessToken('valid_token_123');

      expect(result).toBeTruthy();
      expect(result.userId).toBe('12345');
      expect(result.username).toBe('testuser');
      expect(mockSessionDoc.ref.update).toHaveBeenCalledWith({
        lastUsedAt: expect.any(Date),
      });
    });

    it('should return null for expired access token', async () => {
      const mockSessionDoc = {
        id: 'session123',
        data: () => ({
          userId: '12345',
          accessTokenExpiry: { toDate: () => new Date(Date.now() - 3600000) }, // 1 hour ago
          active: true,
        }),
      };

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [mockSessionDoc],
        }),
      });

      const result = await sessionManager.validateAccessToken('expired_token');

      expect(result).toBeNull();
    });

    it('should return null for non-existent token', async () => {
      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: true,
          docs: [],
        }),
      });

      const result = await sessionManager.validateAccessToken('nonexistent_token');

      expect(result).toBeNull();
    });

    it('should return null for null/undefined token', async () => {
      expect(await sessionManager.validateAccessToken(null)).toBeNull();
      expect(await sessionManager.validateAccessToken(undefined)).toBeNull();
      expect(await sessionManager.validateAccessToken('')).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockSessionDoc = {
        id: 'session123',
        ref: { update: jest.fn() },
        data: () => ({
          userId: '12345',
          refreshTokenExpiry: { toDate: () => new Date(Date.now() + 86400000) }, // 1 day from now
          createdAt: { toDate: () => new Date(Date.now() - 1800000) }, // 30 min ago (over threshold)
          active: true,
        }),
      };

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [mockSessionDoc],
        }),
      });

      const result = await sessionManager.refreshAccessToken('valid_refresh_token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined(); // Should be rotated
      expect(mockSessionDoc.ref.update).toHaveBeenCalled();
    });

    it('should return null for expired refresh token', async () => {
      const mockSessionDoc = {
        id: 'session123',
        ref: { update: jest.fn() },
        data: () => ({
          userId: '12345',
          refreshTokenExpiry: { toDate: () => new Date(Date.now() - 86400000) }, // 1 day ago
          active: true,
        }),
      };

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [mockSessionDoc],
        }),
      });

      const result = await sessionManager.refreshAccessToken('expired_refresh_token');

      expect(result).toBeNull();
      // Should deactivate expired session
      expect(mockSessionDoc.ref.update).toHaveBeenCalledWith({ active: false });
    });

    it('should not rotate refresh token if under threshold', async () => {
      const mockSessionDoc = {
        id: 'session123',
        ref: { update: jest.fn() },
        data: () => ({
          userId: '12345',
          refreshTokenExpiry: { toDate: () => new Date(Date.now() + 86400000) },
          createdAt: { toDate: () => new Date(Date.now() - 60000) }, // 1 min ago (under threshold)
          active: true,
        }),
      };

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [mockSessionDoc],
        }),
      });

      const originalRefreshToken = 'refresh_token_123';
      const result = await sessionManager.refreshAccessToken(originalRefreshToken);

      expect(result.success).toBe(true);
      expect(result.refreshToken).toBe(originalRefreshToken); // Not rotated
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session by id', async () => {
      const mockUpdate = jest.fn();

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: mockUpdate,
        }),
      });

      const result = await sessionManager.revokeSession('session123');

      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        active: false,
        revokedAt: expect.any(Date),
      });
    });

    it('should return false for null sessionId', async () => {
      const result = await sessionManager.revokeSession(null);
      expect(result).toBe(false);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active sessions for a user', async () => {
      const mockSessions = [
        { ref: { update: jest.fn() } },
        { ref: { update: jest.fn() } },
        { ref: { update: jest.fn() } },
      ];

      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          size: 3,
          docs: mockSessions,
        }),
      });

      db.batch = jest.fn().mockReturnValue(mockBatch);

      const result = await sessionManager.revokeAllUserSessions('12345');

      expect(result).toBe(3);
      expect(mockBatch.update).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should return 0 if no active sessions found', async () => {
      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: true,
          size: 0,
          docs: [],
        }),
      });

      const result = await sessionManager.revokeAllUserSessions('12345');
      expect(result).toBe(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      const mockExpiredSessions = [
        { ref: { update: jest.fn() } },
        { ref: { update: jest.fn() } },
      ];

      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };

      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: false,
          size: 2,
          docs: mockExpiredSessions,
        }),
      });

      db.batch = jest.fn().mockReturnValue(mockBatch);

      const result = await sessionManager.cleanupExpiredSessions();

      expect(result).toBe(2);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should return 0 if no expired sessions', async () => {
      db.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          empty: true,
          size: 0,
          docs: [],
        }),
      });

      const result = await sessionManager.cleanupExpiredSessions();
      expect(result).toBe(0);
    });
  });

  describe('SESSION_CONFIG', () => {
    it('should export correct configuration', () => {
      const { SESSION_CONFIG } = sessionManager;

      expect(SESSION_CONFIG.ACCESS_TOKEN_EXPIRY).toBe(3600); // 1 hour
      expect(SESSION_CONFIG.REFRESH_TOKEN_EXPIRY).toBe(2592000); // 30 days
      expect(SESSION_CONFIG.MAX_SESSIONS_PER_USER).toBe(5);
      expect(SESSION_CONFIG.TOKEN_ROTATION_THRESHOLD).toBe(900); // 15 minutes
    });
  });
});
