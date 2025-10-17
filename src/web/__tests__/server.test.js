/**
 * Tests for Web Server API Endpoints
 * Tests critical endpoints: payment creation, plans, nearby users, and profiles
 */

const request = require('supertest');
const crypto = require('crypto');
const { app } = require('../server');

// Mock dependencies
jest.mock('../../config/firebase', () => ({
  db: {
    collection: jest.fn(),
  },
  admin: {
    storage: jest.fn(() => ({
      bucket: jest.fn(),
    })),
  },
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../services/planService');
jest.mock('../../config/epayco');
jest.mock('../../utils/membershipManager');
jest.mock('../../services/profileService');
jest.mock('../../utils/geolocation');

const { db } = require('../../config/firebase');
const planService = require('../../services/planService');
const epayco = require('../../config/epayco');
const { getMembershipInfo } = require('../../utils/membershipManager');
const { buildUserResponse, prepareLocationUpdate } = require('../../services/profileService');

describe('Web Server API Endpoints', () => {
  const TEST_BOT_TOKEN = 'test_bot_token_123';

  beforeAll(() => {
    process.env.TELEGRAM_TOKEN = TEST_BOT_TOKEN;
    process.env.EPAYCO_PUBLIC_KEY = 'test_public_key';
    process.env.EPAYCO_PRIVATE_KEY = 'test_private_key';
    process.env.EPAYCO_P_CUST_ID = 'test_cust_id';
    process.env.EPAYCO_P_KEY = 'test_p_key';
    process.env.BOT_URL = 'https://test.com';
  });

  afterAll(() => {
    delete process.env.TELEGRAM_TOKEN;
    delete process.env.EPAYCO_PUBLIC_KEY;
    delete process.env.EPAYCO_PRIVATE_KEY;
    delete process.env.EPAYCO_P_CUST_ID;
    delete process.env.EPAYCO_P_KEY;
    delete process.env.BOT_URL;
  });

  /**
   * Helper function to generate valid Telegram initData
   */
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

  describe('GET /api/plans', () => {
    it('should return list of available plans', async () => {
      const mockPlans = [
        {
          id: 'silver',
          name: 'Silver',
          price: 5,
          priceInCOP: 20000,
          currency: 'COP',
          durationDays: 30,
          features: ['Feature 1', 'Feature 2'],
          tier: 'Silver',
        },
        {
          id: 'golden',
          name: 'Golden',
          price: 10,
          priceInCOP: 40000,
          currency: 'COP',
          durationDays: 30,
          features: ['Feature 1', 'Feature 2', 'Feature 3'],
          tier: 'Golden',
        },
      ];

      planService.listPlans.mockResolvedValue(mockPlans);

      const response = await request(app)
        .get('/api/plans')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        plans: mockPlans,
      });

      expect(planService.listPlans).toHaveBeenCalled();
    });

    it('should handle errors when fetching plans', async () => {
      planService.listPlans.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/plans')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/payment/create', () => {
    const testUserId = '123456789';
    const testUser = {
      id: testUserId,
      first_name: 'Test',
      username: 'testuser',
    };

    beforeEach(() => {
      // Mock Firestore user document
      const mockUserDoc = {
        exists: true,
        data: () => ({
          userId: testUserId,
          username: 'testuser',
          email: 'test@example.com',
        }),
      };

      const mockUserRef = {
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockUserRef),
      });
    });

    it('should create payment link for valid request', async () => {
      const mockPlan = {
        id: 'silver',
        name: 'Silver Plan',
        priceInCOP: 20000,
        currency: 'COP',
        durationDays: 30,
        description: 'Silver membership',
      };

      planService.getPlanById.mockResolvedValue(mockPlan);
      planService.getPlanBySlug.mockResolvedValue(mockPlan);

      epayco.createPaymentLink.mockResolvedValue({
        success: true,
        paymentUrl: 'https://checkout.epayco.co/test',
        reference: 'REF123',
      });

      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .post('/api/payment/create')
        .set('x-telegram-init-data', initData)
        .send({
          userId: testUserId,
          planId: 'silver',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        paymentUrl: expect.any(String),
        reference: expect.any(String),
        plan: expect.objectContaining({
          id: 'silver',
        }),
      });

      expect(epayco.createPaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockPlan.name,
          amount: mockPlan.priceInCOP,
          userId: testUserId,
          plan: mockPlan.id,
        })
      );
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/payment/create')
        .send({
          userId: testUserId,
          planId: 'silver',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject request with missing userId', async () => {
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .post('/api/payment/create')
        .set('x-telegram-init-data', initData)
        .send({
          planId: 'silver',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should reject request with missing planId', async () => {
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .post('/api/payment/create')
        .set('x-telegram-init-data', initData)
        .send({
          userId: testUserId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should reject request for non-existent user', async () => {
      const mockUserDoc = {
        exists: false,
      };

      const mockUserRef = {
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockUserRef),
      });

      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .post('/api/payment/create')
        .set('x-telegram-init-data', initData)
        .send({
          userId: testUserId,
          planId: 'silver',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User not found');
    });

    it('should reject request for invalid plan', async () => {
      planService.getPlanById.mockResolvedValue(null);
      planService.getPlanBySlug.mockResolvedValue(null);

      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .post('/api/payment/create')
        .set('x-telegram-init-data', initData)
        .send({
          userId: testUserId,
          planId: 'invalid_plan',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid plan identifier');
    });

    it('should handle payment gateway errors', async () => {
      const mockPlan = {
        id: 'silver',
        name: 'Silver Plan',
        priceInCOP: 20000,
        currency: 'COP',
        durationDays: 30,
      };

      planService.getPlanById.mockResolvedValue(mockPlan);

      epayco.createPaymentLink.mockResolvedValue({
        success: false,
        error: 'Payment gateway error',
      });

      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .post('/api/payment/create')
        .set('x-telegram-init-data', initData)
        .send({
          userId: testUserId,
          planId: 'silver',
        })
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/profile/:userId', () => {
    const testUserId = '123456789';
    const testUser = {
      id: testUserId,
      first_name: 'Test',
      username: 'testuser',
    };

    it('should return user profile for authenticated user', async () => {
      const mockUserData = {
        userId: testUserId,
        username: 'testuser',
        firstName: 'Test',
        bio: 'Test bio',
        tier: 'Silver',
      };

      const mockUserDoc = {
        exists: true,
        data: () => mockUserData,
      };

      const mockUserRef = {
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockUserRef),
      });

      const mockMembership = {
        tier: 'Silver',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      getMembershipInfo.mockResolvedValue(mockMembership);

      const mockProfile = {
        userId: testUserId,
        username: 'testuser',
        firstName: 'Test',
        bio: 'Test bio',
        tier: 'Silver',
        membership: mockMembership,
      };

      buildUserResponse.mockReturnValue(mockProfile);

      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .get(`/api/profile/${testUserId}`)
        .set('x-telegram-init-data', initData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(buildUserResponse).toHaveBeenCalledWith(
        testUserId,
        mockUserData,
        mockMembership
      );
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/profile/${testUserId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject request with invalid userId format', async () => {
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .get('/api/profile/invalid-user-id')
        .set('x-telegram-init-data', initData)
        .expect(400);

      expect(response.body.error).toContain('Invalid user ID');
    });

    it('should reject when accessing different user profile', async () => {
      const otherUserId = '987654321';
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .get(`/api/profile/${otherUserId}`)
        .set('x-telegram-init-data', initData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Forbidden');
    });

    it('should return 404 for non-existent user', async () => {
      const mockUserDoc = {
        exists: false,
      };

      const mockUserRef = {
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockUserRef),
      });

      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .get(`/api/profile/${testUserId}`)
        .set('x-telegram-init-data', initData)
        .expect(404);

      expect(response.body.error).toContain('User not found');
    });
  });

  describe('PUT /api/profile/:userId', () => {
    const testUserId = '123456789';
    const testUser = {
      id: testUserId,
      first_name: 'Test',
      username: 'testuser',
    };

    beforeEach(() => {
      const mockUserData = {
        userId: testUserId,
        username: 'testuser',
        firstName: 'Test',
        bio: 'Old bio',
      };

      const mockUserDoc = {
        exists: true,
        data: () => mockUserData,
      };

      const mockUserRef = {
        get: jest.fn().mockResolvedValue(mockUserDoc),
        update: jest.fn().mockResolvedValue({}),
      };

      db.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue(mockUserRef),
      });

      getMembershipInfo.mockResolvedValue(null);
      buildUserResponse.mockReturnValue({
        userId: testUserId,
        username: 'testuser',
        bio: 'New bio',
      });
    });

    it('should update user bio', async () => {
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .put(`/api/profile/${testUserId}`)
        .set('x-telegram-init-data', initData)
        .send({
          bio: 'New bio',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Profile updated');
      expect(response.body.user).toBeDefined();
    });

    it('should update user location', async () => {
      prepareLocationUpdate.mockReturnValue({
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        locationName: 'New York, USA',
        locationUpdatedAt: expect.any(Date),
      });

      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .put(`/api/profile/${testUserId}`)
        .set('x-telegram-init-data', initData)
        .send({
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(prepareLocationUpdate).toHaveBeenCalled();
    });

    it('should reject bio exceeding max length', async () => {
      const longBio = 'a'.repeat(501);
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .put(`/api/profile/${testUserId}`)
        .set('x-telegram-init-data', initData)
        .send({
          bio: longBio,
        })
        .expect(400);

      expect(response.body.error).toContain('Bio must be');
    });

    it('should reject invalid userId format', async () => {
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .put('/api/profile/invalid-id')
        .set('x-telegram-init-data', initData)
        .send({
          bio: 'New bio',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid user ID');
    });

    it('should reject update without body', async () => {
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .put(`/api/profile/${testUserId}`)
        .set('x-telegram-init-data', initData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/map/nearby', () => {
    const testUserId = '123456789';
    const testUser = {
      id: testUserId,
      first_name: 'Test',
      username: 'testuser',
    };

    it('should return nearby users for valid location', async () => {
      const mockUsers = [
        {
          userId: '111111',
          username: 'user1',
          tier: 'Silver',
          distance: 5,
          distanceFormatted: '5 km',
          distanceCategory: 'nearby',
        },
        {
          userId: '222222',
          username: 'user2',
          tier: 'Golden',
          distance: 10,
          distanceFormatted: '10 km',
          distanceCategory: 'nearby',
        },
      ];

      // Mock Firestore query
      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          mockUsers.forEach((user) => {
            callback({
              id: user.userId,
              data: () => ({
                username: user.username,
                tier: user.tier,
                location: { latitude: 40.7128, longitude: -74.0060 },
              }),
            });
          });
        }),
      };

      const mockQuery = {
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockSnapshot),
      };

      const mockCollection = {
        where: jest.fn().mockReturnValue(mockQuery),
      };

      db.collection.mockReturnValue(mockCollection);

      const { findUsersWithinRadius } = require('../../utils/geolocation');
      findUsersWithinRadius.mockReturnValue(mockUsers);

      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .post('/api/map/nearby')
        .set('x-telegram-init-data', initData)
        .send({
          userId: testUserId,
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 25,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/map/nearby')
        .send({
          userId: testUserId,
          latitude: 40.7128,
          longitude: -74.0060,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject request with invalid coordinates', async () => {
      const initData = generateValidInitData(testUser);

      const { isValidLocation } = require('../../utils/geolocation');
      isValidLocation.mockReturnValue(false);

      const response = await request(app)
        .post('/api/map/nearby')
        .set('x-telegram-init-data', initData)
        .send({
          userId: testUserId,
          latitude: 999, // Invalid
          longitude: 999, // Invalid
        })
        .expect(400);

      expect(response.body.error).toContain('Valid latitude and longitude required');
    });

    it('should reject request without body', async () => {
      const initData = generateValidInitData(testUser);

      const response = await request(app)
        .post('/api/map/nearby')
        .set('x-telegram-init-data', initData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/config/public', () => {
    it('should return public configuration', async () => {
      process.env.TELEGRAM_LOGIN_BOT = 'test_bot';
      process.env.WEB_APP_URL = 'https://app.test.com';

      const response = await request(app)
        .get('/api/config/public')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.telegramLoginBot).toBe('test_bot');
      expect(response.body.miniAppUrl).toBe('https://app.test.com');

      delete process.env.TELEGRAM_LOGIN_BOT;
      delete process.env.WEB_APP_URL;
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Route not found');
      expect(response.body.path).toBe('/api/non-existent-route');
    });
  });
});
