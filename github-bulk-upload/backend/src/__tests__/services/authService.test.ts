import { AuthService } from '../../services/authService';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { 
  createTestUser, 
  testUsers, 
  cleanupTestData, 
  apiTest,
  performanceTest 
} from '../testUtils';

const prisma = new PrismaClient();
const authService = new AuthService();

describe('AuthService', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User'
      };

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(userData.email);
      expect(result.data.user.name).toBe(userData.name);
      expect(result.data.token).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      
      // 验证密码已加密
      const user = await prisma.user.findUnique({ where: { email: userData.email } });
      expect(user.password).not.toBe(userData.password);
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });

    it('should not register user with existing email', async () => {
      const userData = testUsers.user;

      // 第一次注册
      await authService.register(userData);

      // 第二次注册相同邮箱
      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('EMAIL_EXISTS');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'Test User'
      };

      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate password requirements', async () => {
      const testCases = [
        { password: '123', description: '太短' },
        { password: 'password', description: '无大写字母和数字' },
        { password: 'PASSWORD123', description: '无小写字母' },
        { password: 'Password', description: '无数字' }
      ];

      for (const testCase of testCases) {
        const userData = {
          email: `test${Math.random()}@example.com`,
          password: testCase.password,
          name: 'Test User'
        };

        const result = await authService.register(userData);

        expect(result.success).toBe(false);
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should validate name requirements', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: '' // 空名称
      };

      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors gracefully', async () => {
      // 模拟数据库错误
      const originalCreate = prisma.user.create;
      prisma.user.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const userData = testUsers.user;
      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('DATABASE_ERROR');

      // 恢复原始方法
      prisma.user.create = originalCreate;
    });

    it('should register user with performance requirements', async () => {
      await performanceTest.expectResponseTime(async () => {
        await authService.register(testUsers.user);
      }, 2000); // 注册应在2秒内完成
    });
  });

  describe('login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser(testUsers.user);
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login(testUsers.user.email, testUsers.user.password);

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(testUsers.user.email);
      expect(result.data.token).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      
      // 验证token有效性
      const decoded = jwt.verify(result.data.token, process.env.JWT_SECRET!);
      expect(decoded).toHaveProperty('userId', testUser.id);
    });

    it('should not login with incorrect password', async () => {
      const result = await authService.login(testUsers.user.email, 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should not login with non-existent email', async () => {
      const result = await authService.login('nonexistent@example.com', testUsers.user.password);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should not login inactive user', async () => {
      // 创建非活跃用户
      const inactiveUser = await createTestUser({
        ...testUsers.user,
        email: 'inactive@example.com'
      });
      
      await prisma.user.update({
        where: { id: inactiveUser.id },
        data: { isActive: false }
      });

      const result = await authService.login('inactive@example.com', testUsers.user.password);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('ACCOUNT_INACTIVE');
    });

    it('should not login unverified user', async () => {
      // 创建未验证用户
      const unverifiedUser = await createTestUser({
        ...testUsers.user,
        email: 'unverified@example.com'
      });
      
      await prisma.user.update({
        where: { id: unverifiedUser.id },
        data: { emailVerified: false }
      });

      const result = await authService.login('unverified@example.com', testUsers.user.password);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('should update last login time', async () => {
      const beforeLogin = new Date();
      
      await authService.login(testUsers.user.email, testUsers.user.password);
      
      const user = await prisma.user.findUnique({ where: { email: testUsers.user.email } });
      expect(user.lastLoginAt).toBeDefined();
      expect(user.lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });

    it('should login with performance requirements', async () => {
      await performanceTest.expectResponseTime(async () => {
        await authService.login(testUsers.user.email, testUsers.user.password);
      }, 1000); // 登录应在1秒内完成
    });
  });

  describe('verifyToken', () => {
    let testUser: any;
    let validToken: string;

    beforeEach(async () => {
      testUser = await createTestUser(testUsers.user);
      const loginResult = await authService.login(testUsers.user.email, testUsers.user.password);
      validToken = loginResult.data.token;
    });

    it('should verify valid token', () => {
      const decoded = authService.verifyToken(validToken);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUser.id);
      expect(decoded.role).toBe(testUser.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        authService.verifyToken('invalid-token');
      }).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id, role: testUser.role },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' } // 已过期
      );

      expect(() => {
        authService.verifyToken(expiredToken);
      }).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        authService.verifyToken('malformed.token.here');
      }).toThrow();
    });
  });

  describe('refreshToken', () => {
    let testUser: any;
    let refreshToken: string;

    beforeEach(async () => {
      testUser = await createTestUser(testUsers.user);
      const loginResult = await authService.login(testUsers.user.email, testUsers.user.password);
      refreshToken = loginResult.data.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const result = await authService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.data.token).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(result.data.token).not.toBe(refreshToken);
    });

    it('should not refresh with invalid refresh token', async () => {
      const result = await authService.refreshToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('getUserById', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser(testUsers.user);
    });

    it('should get user by valid ID', async () => {
      const result = await authService.getUserById(testUser.id);

      expect(result).toBeDefined();
      expect(result.email).toBe(testUsers.user.email);
      expect(result.password).toBeUndefined(); // 密码不应返回
    });

    it('should return null for non-existent ID', async () => {
      const result = await authService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null for invalid ID format', async () => {
      const result = await authService.getUserById('invalid-id-format');

      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser(testUsers.user);
    });

    it('should change password with correct old password', async () => {
      const newPassword = 'NewPassword123!';
      
      const result = await authService.changePassword(
        testUser.id,
        testUsers.user.password,
        newPassword
      );

      expect(result.success).toBe(true);
      
      // 验证新密码可以登录
      const loginResult = await authService.login(testUsers.user.email, newPassword);
      expect(loginResult.success).toBe(true);
    });

    it('should not change password with incorrect old password', async () => {
      const result = await authService.changePassword(
        testUser.id,
        'wrongpassword',
        'NewPassword123!'
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_OLD_PASSWORD');
    });

    it('should validate new password requirements', async () => {
      const result = await authService.changePassword(
        testUser.id,
        testUsers.user.password,
        'weak'
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('logout', () => {
    let testUser: any;
    let token: string;

    beforeEach(async () => {
      testUser = await createTestUser(testUsers.user);
      const loginResult = await authService.login(testUsers.user.email, testUsers.user.password);
      token = loginResult.data.token;
    });

    it('should logout successfully', async () => {
      const result = await authService.logout(token);

      expect(result.success).toBe(true);
    });

    it('should handle logout with invalid token', async () => {
      const result = await authService.logout('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('security tests', () => {
    it('should prevent timing attacks on login', async () => {
      const validEmail = testUsers.user.email;
      const invalidEmail = 'nonexistent@example.com';
      const password = 'Password123!';

      await createTestUser(testUsers.user);

      // 测试多次登录尝试的时间差异
      const times = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await authService.login(validEmail, 'wrongpassword');
        times.push(Date.now() - start);
      }

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await authService.login(invalidEmail, password);
        times.push(Date.now() - start);
      }

      // 时间差异不应过大（防止时序攻击）
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      expect(maxTime - minTime).toBeLessThan(500); // 500ms差异内
    });

    it('should handle concurrent login attempts', async () => {
      await createTestUser(testUsers.user);

      await performanceTest.expectConcurrency(async () => {
        return authService.login(testUsers.user.email, testUsers.user.password);
      }, 10, 5000); // 10个并发请求在5秒内完成
    });
  });
});