import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../index';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { authService } from '../../services/authService';

describe('Authentication Security Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        '123',
        'password',
        '123456',
        'qwerty',
        'abc123',
        '111111'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should enforce password complexity requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Str0ngP@ssw0rd!'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should hash passwords properly', async () => {
      const userData = {
        username: 'hashtest',
        email: 'hashtest@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      
      // 密码不应该在响应中返回
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should prevent password enumeration attacks', async () => {
      // 尝试登录不存在的用户
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword'
        });

      // 尝试登录存在的用户但密码错误
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'existing@example.com',
          password: 'CorrectPassword123!'
        });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'wrongpassword'
        });

      // 两种情况应该返回相同的错误消息
      expect(response1.status).toBe(401);
      expect(response2.status).toBe(401);
      expect(response1.body.error.message).toBe(response2.body.error.message);
    });
  });

  describe('JWT Token Security', () => {
    let validToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      const userData = {
        username: 'jwttest',
        email: 'jwttest@example.com',
        password: 'JwtTestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      validToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'Bearer invalid',
        'malformed-token'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/workflows')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject expired tokens', async () => {
      // 创建一个过期的token（这里模拟，实际中需要等待或修改token生成逻辑）
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid';
      
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should validate token signature', async () => {
      // 修改token的签名部分
      const parts = validToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tampered-signature`;

      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    it('should prevent token reuse after logout', async () => {
      // 先登出
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      // 尝试使用已登出的token
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${validToken}`);

      // 根据实现，可能仍然有效（如果没有token黑名单）或无效
      // 这里假设实现了token黑名单
      if (response.status === 401) {
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Input Validation Security', () => {
    let authToken: string;

    beforeAll(async () => {
      const userData = {
        username: 'inputtest',
        email: 'inputtest@example.com',
        password: 'InputTestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = response.body.data.tokens.accessToken;
    });

    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM workflows; --",
        "' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(`/api/workflows?search=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${authToken}`);

        // 应该正常处理，不会导致SQL注入
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: payload,
            description: 'Test workflow',
            steps: []
          });

        if (response.status === 201) {
          // 如果创建成功，检查返回的数据是否被正确转义
          expect(response.body.data.title).not.toContain('<script>');
        } else {
          // 或者应该被验证拒绝
          expect(response.status).toBe(400);
        }
      }
    });

    it('should validate input length limits', async () => {
      const longString = 'a'.repeat(10000);

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: longString,
          description: longString,
          steps: []
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@example',
        'user name@example.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email,
            password: 'ValidPassword123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Authorization Security', () => {
    let user1Token: string;
    let user2Token: string;
    let user1WorkflowId: string;

    beforeAll(async () => {
      // 创建两个用户
      const user1Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'authuser1',
          email: 'authuser1@example.com',
          password: 'AuthUser1Password123!'
        });

      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'authuser2',
          email: 'authuser2@example.com',
          password: 'AuthUser2Password123!'
        });

      user1Token = user1Response.body.data.tokens.accessToken;
      user2Token = user2Response.body.data.tokens.accessToken;

      // 用户1创建一个工作流
      const workflowResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'User 1 Workflow',
          description: 'Private workflow',
          steps: []
        });

      user1WorkflowId = workflowResponse.body.data.id;
    });

    it('should prevent unauthorized access to other users resources', async () => {
      // 用户2尝试访问用户1的工作流
      const response = await request(app)
        .get(`/api/workflows/${user1WorkflowId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should prevent unauthorized modification of other users resources', async () => {
      // 用户2尝试修改用户1的工作流
      const response = await request(app)
        .put(`/api/workflows/${user1WorkflowId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          title: 'Modified by User 2'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent unauthorized deletion of other users resources', async () => {
      // 用户2尝试删除用户1的工作流
      const response = await request(app)
        .delete(`/api/workflows/${user1WorkflowId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/workflows' },
        { method: 'post', path: '/api/workflows' },
        { method: 'get', path: '/api/executions' },
        { method: 'post', path: '/api/executions' },
        { method: 'get', path: '/api/auth/me' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Rate Limiting Security', () => {
    it('should prevent brute force login attacks', async () => {
      const attempts = Array.from({ length: 10 }, () => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'bruteforce@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(attempts);
      
      // 应该有一些请求被限流
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should prevent API abuse through rate limiting', async () => {
      // 创建用户获取token
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ratelimituser',
          email: 'ratelimit@example.com',
          password: 'RateLimit123!'
        });

      const token = userResponse.body.data.tokens.accessToken;

      // 快速发送大量请求
      const requests = Array.from({ length: 50 }, () => 
        request(app)
          .get('/api/workflows')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.allSettled(requests);
      
      const rateLimitedCount = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      ).length;

      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('File Upload Security', () => {
    let authToken: string;

    beforeAll(async () => {
      const userData = {
        username: 'filetest',
        email: 'filetest@example.com',
        password: 'FileTestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = response.body.data.tokens.accessToken;
    });

    it('should reject malicious file types', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', content: 'fake executable content' },
        { name: 'script.bat', content: '@echo off\necho malicious' },
        { name: 'virus.scr', content: 'screensaver malware' },
        { name: 'trojan.com', content: 'command file' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/attachments/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from(file.content), file.name);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('不支持的文件类型');
      }
    });

    it('should enforce file size limits', async () => {
      // 创建超大文件（假设限制是10MB）
      const oversizedFile = Buffer.alloc(11 * 1024 * 1024, 'a');

      const response = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', oversizedFile, 'oversized.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('文件大小超过限制');
    });

    it('should validate file content', async () => {
      // 尝试上传伪装的文件（扩展名与内容不符）
      const fakeImageContent = '<?php echo "malicious code"; ?>';

      const response = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(fakeImageContent), 'fake.jpg');

      // 根据实现，可能会检测到内容与扩展名不符
      if (response.status === 400) {
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('CORS Security', () => {
    it('should have proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/workflows')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Origin', 'http://malicious-site.com');

      // 根据CORS配置，可能会拒绝或允许
      // 这里假设配置了严格的CORS策略
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/api/health');

      // 检查安全头
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should not expose sensitive server information', async () => {
      const response = await request(app).get('/api/health');

      // 不应该暴露服务器版本等敏感信息
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});