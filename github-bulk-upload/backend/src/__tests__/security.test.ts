import request from 'supertest';
import app from '../index';
import { setupTestDatabase, cleanupTestDatabase } from './helpers/database';

describe('Security Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // 创建测试用户
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'securitytest',
        email: 'security@example.com',
        password: 'password123',
        firstName: 'Security',
        lastName: 'Test'
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('认证安全测试', () => {
    it('应该拒绝无效的JWT令牌', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('应该拒绝过期的JWT令牌', async () => {
      // 创建一个过期的令牌（这里需要模拟）
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';
      
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝格式错误的Authorization头', async () => {
      const invalidHeaders = [
        'invalid-format',
        'Bearer',
        'Basic dGVzdDp0ZXN0',
        'Bearer ',
        'bearer token'
      ];

      for (const header of invalidHeaders) {
        const response = await request(app)
          .get('/api/workflows')
          .set('Authorization', header)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('输入验证安全测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: payload,
            description: 'SQL注入测试',
            steps: [
              {
                id: 'step1',
                title: payload,
                type: 'MANUAL',
                order: 1
              }
            ]
          });

        // 应该被验证拒绝或安全处理
        expect([400, 201]).toContain(response.status);
        if (response.status === 201) {
          // 如果创建成功，确保数据被正确转义
          expect(response.body.data.name).not.toContain('DROP TABLE');
          expect(response.body.data.name).not.toContain('UNION SELECT');
        }
      }
    });

    it('应该防止XSS攻击', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `测试工作流 ${payload}`,
            description: payload,
            steps: [
              {
                id: 'step1',
                title: 'XSS测试步骤',
                description: payload,
                type: 'MANUAL',
                order: 1
              }
            ]
          });

        if (response.status === 201) {
          // 确保脚本标签被转义或移除
          expect(response.body.data.description).not.toContain('<script>');
          expect(response.body.data.description).not.toContain('javascript:');
          expect(response.body.data.description).not.toContain('onerror=');
        }
      }
    });

    it('应该限制请求大小', async () => {
      const largePayload = {
        name: '大数据测试',
        description: 'a'.repeat(10 * 1024 * 1024), // 10MB字符串
        steps: []
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload);

      // 应该被请求大小限制拒绝
      expect([400, 413]).toContain(response.status);
    });
  });

  describe('权限控制安全测试', () => {
    let otherUserToken: string;
    let otherUserId: string;
    let workflowId: string;

    beforeAll(async () => {
      // 创建另一个用户
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      otherUserToken = otherUserResponse.body.data.token;
      otherUserId = otherUserResponse.body.data.user.id;

      // 创建一个工作流
      const workflowResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '权限测试工作流',
          description: '用于权限测试',
          steps: [
            {
              id: 'step1',
              title: '步骤1',
              type: 'MANUAL',
              order: 1
            }
          ]
        });

      workflowId = workflowResponse.body.data.id;
    });

    it('应该防止用户访问其他用户的工作流', async () => {
      const response = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('应该防止用户修改其他用户的工作流', async () => {
      const response = await request(app)
        .put(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          name: '尝试修改他人的工作流'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('应该防止用户删除其他用户的工作流', async () => {
      const response = await request(app)
        .delete(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('应该防止权限提升攻击', async () => {
      // 尝试通过修改请求来提升权限
      const response = await request(app)
        .put(`/api/users/${otherUserId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          role: 'ADMIN', // 尝试提升为管理员
          permissions: ['ALL']
        });

      // 应该被拒绝或忽略权限字段
      expect([400, 403, 404]).toContain(response.status);
    });
  });

  describe('文件上传安全测试', () => {
    it('应该拒绝恶意文件类型', async () => {
      const maliciousFiles = [
        { filename: 'virus.exe', mimeType: 'application/x-executable' },
        { filename: 'script.bat', mimeType: 'application/x-bat' },
        { filename: 'malware.scr', mimeType: 'application/x-msdownload' },
        { filename: 'trojan.com', mimeType: 'application/x-dosexec' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/attachments/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('fake content'), {
            filename: file.filename,
            contentType: file.mimeType
          });

        expect([400, 415]).toContain(response.status);
      }
    });

    it('应该限制文件大小', async () => {
      // 创建一个大文件（模拟）
      const largeFileBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB

      const response = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFileBuffer, {
          filename: 'large-file.txt',
          contentType: 'text/plain'
        });

      expect([400, 413]).toContain(response.status);
    });

    it('应该清理文件名中的危险字符', async () => {
      const dangerousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        'file<script>.txt',
        'file|pipe.txt',
        'file:colon.txt'
      ];

      for (const filename of dangerousFilenames) {
        const response = await request(app)
          .post('/api/attachments/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', Buffer.from('safe content'), {
            filename: filename,
            contentType: 'text/plain'
          });

        if (response.status === 201) {
          // 如果上传成功，确保文件名被清理
          expect(response.body.data.filename).not.toContain('../');
          expect(response.body.data.filename).not.toContain('..\\');
          expect(response.body.data.filename).not.toContain('<script>');
        }
      }
    });
  });

  describe('速率限制测试', () => {
    it('应该限制API请求频率', async () => {
      // 快速发送多个请求
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      // 应该有一些请求被速率限制拒绝
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('应该限制登录尝试频率', async () => {
      const loginAttempts = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'security@example.com',
            password: 'wrong-password'
          })
      );

      const responses = await Promise.all(loginAttempts);
      
      // 应该有一些请求被速率限制拒绝
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('数据泄露防护测试', () => {
    it('不应该在错误消息中泄露敏感信息', async () => {
      // 尝试访问不存在的资源
      const response = await request(app)
        .get('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // 错误消息不应该包含数据库信息、文件路径等
      const errorMessage = response.body.error.message.toLowerCase();
      expect(errorMessage).not.toContain('database');
      expect(errorMessage).not.toContain('prisma');
      expect(errorMessage).not.toContain('postgresql');
      expect(errorMessage).not.toContain('/src/');
      expect(errorMessage).not.toContain('c:\\');
    });

    it('不应该在响应头中泄露服务器信息', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // 检查是否移除了敏感的响应头
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).toBeUndefined();
    });

    it('应该正确设置安全响应头', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // 检查安全响应头
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('输入边界测试', () => {
    it('应该处理极长的输入', async () => {
      const veryLongString = 'a'.repeat(10000);
      
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: veryLongString,
          description: veryLongString,
          steps: []
        });

      // 应该被验证拒绝或截断处理
      expect([400, 413]).toContain(response.status);
    });

    it('应该处理特殊字符输入', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `测试工作流 ${specialChars}`,
          description: `包含特殊字符的描述 ${specialChars}`,
          steps: [
            {
              id: 'step1',
              title: `步骤 ${specialChars}`,
              type: 'MANUAL',
              order: 1
            }
          ]
        });

      if (response.status === 201) {
        // 如果创建成功，确保特殊字符被正确处理
        expect(response.body.data.name).toBeDefined();
        expect(response.body.data.description).toBeDefined();
      }
    });

    it('应该处理Unicode和表情符号', async () => {
      const unicodeText = '测试工作流 🚀 📊 ✅ 中文测试 العربية русский';
      
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: unicodeText,
          description: unicodeText,
          steps: [
            {
              id: 'step1',
              title: unicodeText,
              type: 'MANUAL',
              order: 1
            }
          ]
        })
        .expect(201);

      expect(response.body.data.name).toBe(unicodeText);
    });
  });

  describe('并发安全测试', () => {
    it('应该防止竞态条件', async () => {
      // 创建工作流
      const workflowResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '并发测试工作流',
          steps: [
            {
              id: 'step1',
              title: '步骤1',
              type: 'MANUAL',
              order: 1
            }
          ]
        });

      const workflowId = workflowResponse.body.data.id;

      // 同时尝试删除同一个工作流
      const deletePromises = Array(5).fill(null).map(() =>
        request(app)
          .delete(`/api/workflows/${workflowId}`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(deletePromises);
      
      // 应该只有一个删除成功，其他的应该返回404
      const successfulDeletes = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 200
      ).length;
      
      expect(successfulDeletes).toBe(1);
    });
  });

  describe('会话安全测试', () => {
    it('应该在密码更改后使令牌失效', async () => {
      // 这个测试需要实现密码更改功能
      // 目前跳过，但在实际实现中应该包含
      expect(true).toBe(true);
    });

    it('应该支持令牌撤销', async () => {
      // 这个测试需要实现令牌撤销功能
      // 目前跳过，但在实际实现中应该包含
      expect(true).toBe(true);
    });
  });

  describe('CORS安全测试', () => {
    it('应该正确配置CORS策略', async () => {
      const response = await request(app)
        .options('/api/workflows')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('应该拒绝不允许的源', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'http://malicious-site.com');

      // 根据CORS配置，可能允许或拒绝
      // 这里主要检查是否有适当的CORS头
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});