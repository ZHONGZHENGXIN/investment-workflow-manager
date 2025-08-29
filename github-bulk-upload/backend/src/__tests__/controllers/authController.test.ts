import request from 'supertest';
import express from 'express';
import { AuthController } from '../../controllers/authController';
import { AuthService } from '../../services/authService';
import { rateLimitMiddleware } from '../../middleware/rateLimit';
import { validateRequest } from '../../middleware/validation';
import { auditLogger } from '../../utils/logger.simple';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../middleware/rateLimit');
jest.mock('../../middleware/validation');
jest.mock('../../utils/logger');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockRateLimit = rateLimitMiddleware as jest.MockedFunction<typeof rateLimitMiddleware>;
const mockValidateRequest = validateRequest as jest.MockedFunction<typeof validateRequest>;
const mockAuditLogger = auditLogger as jest.Mocked<typeof auditLogger>;

const app = express();
app.use(express.json());

// Create controller instance
const authController = new AuthController();

// Mock middleware to pass through
mockRateLimit.mockImplementation((req, res, next) => next());
mockValidateRequest.mockImplementation((schema) => (req, res, next) => next());

// Setup routes
app.post('/register', authController.register.bind(authController));
app.post('/login', authController.login.bind(authController));
app.post('/refresh', authController.refreshToken.bind(authController));
app.post('/logout', authController.logout.bind(authController));
app.get('/profile', authController.getProfile.bind(authController));
app.put('/profile', authController.updateProfile.bind(authController));
app.post('/change-password', authController.changePassword.bind(authController));
app.post('/forgot-password', authController.forgotPassword.bind(authController));
app.post('/reset-password', authController.resetPassword.bind(authController));

describe('AuthController', () => {
  let mockAuthServiceInstance: jest.Mocked<AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock service instance
    mockAuthServiceInstance = {
      register: jest.fn(),
      login: jest.fn(),
      verifyToken: jest.fn(),
      refreshToken: jest.fn(),
      getUserById: jest.fn(),
      changePassword: jest.fn(),
      generatePasswordResetToken: jest.fn(),
      resetPassword: jest.fn(),
      logout: jest.fn()
    } as any;

    // Mock constructor to return our mock instance
    mockAuthService.mockImplementation(() => mockAuthServiceInstance);
  });

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAuthServiceInstance.register.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { user: mockUser },
        message: '注册成功'
      });

      expect(mockAuthServiceInstance.register).toHaveBeenCalledWith(userData);
    });

    it('should return 400 for invalid registration data', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        password: '123' // too short
      };

      mockAuthServiceInstance.register.mockRejectedValue(
        new Error('邮箱格式不正确')
      );

      const response = await request(app)
        .post('/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('邮箱格式不正确');
    });

    it('should return 409 for duplicate user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthServiceInstance.register.mockRejectedValue(
        new Error('用户已存在')
      );

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户已存在');
    });

    it('should handle server errors gracefully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthServiceInstance.register.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('服务器内部错误');
    });
  });

  describe('POST /login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockLoginResult = {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user'
        },
        token: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      mockAuthServiceInstance.login.mockResolvedValue(mockLoginResult);

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockLoginResult,
        message: '登录成功'
      });

      expect(mockAuthServiceInstance.login).toHaveBeenCalledWith(loginData);
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockAuthServiceInstance.login.mockRejectedValue(
        new Error('密码错误')
      );

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('密码错误');
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      mockAuthServiceInstance.login.mockRejectedValue(
        new Error('用户不存在')
      );

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户不存在');
    });

    it('should return 423 for locked account', async () => {
      const loginData = {
        email: 'locked@example.com',
        password: 'password123'
      };

      mockAuthServiceInstance.login.mockRejectedValue(
        new Error('账户已被锁定')
      );

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(423);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('账户已被锁定');
    });
  });

  describe('POST /refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token'
      };

      const mockTokens = {
        token: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      mockAuthServiceInstance.refreshToken.mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTokens,
        message: 'Token刷新成功'
      });

      expect(mockAuthServiceInstance.refreshToken).toHaveBeenCalledWith(refreshData.refreshToken);
    });

    it('should return 401 for invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid-refresh-token'
      };

      mockAuthServiceInstance.refreshToken.mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const response = await request(app)
        .post('/refresh')
        .send(refreshData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  describe('POST /logout', () => {
    it('should logout user successfully', async () => {
      const logoutData = {
        refreshToken: 'valid-refresh-token'
      };

      mockAuthServiceInstance.logout.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/logout')
        .send(logoutData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: '退出登录成功'
      });

      expect(mockAuthServiceInstance.logout).toHaveBeenCalledWith(logoutData.refreshToken);
    });
  });

  describe('GET /profile', () => {
    it('should get user profile successfully', async () => {
      const userId = 'user123';
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      };

      // Mock authentication middleware
      const mockReq = {
        user: { userId },
        headers: { authorization: 'Bearer valid-token' }
      };

      mockAuthServiceInstance.getUserById.mockResolvedValue(mockUser);

      // Since we can't easily mock middleware in this setup, we'll test the controller method directly
      const authControllerInstance = new AuthController();
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authControllerInstance.getProfile(mockReq as any, mockRes as any);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUser }
      });
    });
  });

  describe('POST /change-password', () => {
    it('should change password successfully', async () => {
      const userId = 'user123';
      const passwordData = {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      };

      const mockReq = {
        user: { userId },
        body: passwordData
      };

      mockAuthServiceInstance.changePassword.mockResolvedValue(undefined);

      const authControllerInstance = new AuthController();
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await authControllerInstance.changePassword(mockReq as any, mockRes as any);

      expect(mockAuthServiceInstance.changePassword).toHaveBeenCalledWith(
        userId,
        passwordData.oldPassword,
        passwordData.newPassword
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '密码修改成功'
      });
    });
  });

  describe('POST /forgot-password', () => {
    it('should generate password reset token successfully', async () => {
      const email = 'test@example.com';
      const resetToken = 'reset-token-123';

      mockAuthServiceInstance.generatePasswordResetToken.mockResolvedValue(resetToken);

      const response = await request(app)
        .post('/forgot-password')
        .send({ email })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: '密码重置邮件已发送'
      });

      expect(mockAuthServiceInstance.generatePasswordResetToken).toHaveBeenCalledWith(email);
    });
  });

  describe('POST /reset-password', () => {
    it('should reset password successfully', async () => {
      const resetData = {
        token: 'valid-reset-token',
        newPassword: 'newPassword123'
      };

      mockAuthServiceInstance.resetPassword.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: '密码重置成功'
      });

      expect(mockAuthServiceInstance.resetPassword).toHaveBeenCalledWith(
        resetData.token,
        resetData.newPassword
      );
    });

    it('should return 400 for invalid reset token', async () => {
      const resetData = {
        token: 'invalid-reset-token',
        newPassword: 'newPassword123'
      };

      mockAuthServiceInstance.resetPassword.mockRejectedValue(
        new Error('重置令牌无效或已过期')
      );

      const response = await request(app)
        .post('/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('重置令牌无效或已过期');
    });
  });
});