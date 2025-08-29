import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../index';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { authService } from '../../services/authService';

describe('Load Testing', () => {
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // 创建测试用户并获取token
    const userData = {
      username: 'loadtestuser',
      email: 'loadtest@example.com',
      password: 'password123'
    };
    
    const authResult = await authService.register(userData);
    authToken = authResult.tokens.accessToken;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('API Performance Tests', () => {
    it('should handle concurrent workflow requests', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, index) => 
        request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Load Test Workflow ${index}`,
            description: `Performance test workflow ${index}`,
            category: 'test',
            steps: [
              {
                id: `step-${index}`,
                title: `Step ${index}`,
                type: 'MANUAL',
                order: 1,
                isRequired: true,
                estimatedDuration: 30,
                dependencies: []
              }
            ]
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证所有请求都成功
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // 性能断言
      expect(duration).toBeLessThan(10000); // 应在10秒内完成
      console.log(`${concurrentRequests} concurrent requests completed in ${duration}ms`);
      console.log(`Average response time: ${duration / concurrentRequests}ms`);
    });

    it('should handle large workflow list requests efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/workflows?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(2000); // 应在2秒内完成
      
      console.log(`Large list request completed in ${duration}ms`);
    });

    it('should handle complex workflow execution efficiently', async () => {
      // 创建复杂工作流
      const complexWorkflow = {
        title: 'Complex Performance Test Workflow',
        description: 'Workflow with many steps for performance testing',
        category: 'performance',
        steps: Array.from({ length: 20 }, (_, index) => ({
          id: `complex-step-${index}`,
          title: `Complex Step ${index}`,
          description: `This is a complex step ${index} with detailed description`,
          type: 'MANUAL',
          order: index + 1,
          isRequired: true,
          estimatedDuration: 30,
          dependencies: index > 0 ? [`complex-step-${index - 1}`] : []
        }))
      };

      const workflowResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(complexWorkflow)
        .expect(201);

      const workflowId = workflowResponse.body.data.id;

      // 创建执行
      const startTime = Date.now();
      
      const executionResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId,
          title: 'Complex Performance Test Execution',
          description: 'Testing execution performance with complex workflow'
        })
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(executionResponse.body.success).toBe(true);
      expect(duration).toBeLessThan(3000); // 应在3秒内完成
      
      console.log(`Complex workflow execution created in ${duration}ms`);
    });

    it('should handle database query performance', async () => {
      const startTime = Date.now();
      
      // 执行复杂查询
      const response = await request(app)
        .get('/api/workflows?search=test&category=performance&sortBy=createdAt&sortOrder=desc&page=1&limit=50')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1500); // 应在1.5秒内完成
      
      console.log(`Complex database query completed in ${duration}ms`);
    });

    it('should handle memory usage efficiently', async () => {
      const initialMemory = process.memoryUsage();
      
      // 执行多个内存密集型操作
      const promises = Array.from({ length: 20 }, () => 
        request(app)
          .get('/api/workflows?limit=100')
          .set('Authorization', `Bearer ${authToken}`)
      );

      await Promise.all(promises);
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // 内存增长不应超过50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('File Upload Performance Tests', () => {
    it('should handle large file uploads efficiently', async () => {
      // 创建一个模拟的大文件（1MB）
      const largeFileContent = Buffer.alloc(1024 * 1024, 'a');
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/attachments/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFileContent, 'large-test-file.txt')
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 应在5秒内完成
      
      console.log(`Large file upload completed in ${duration}ms`);
    });

    it('should handle multiple concurrent file uploads', async () => {
      const fileContent = Buffer.alloc(100 * 1024, 'b'); // 100KB files
      const concurrentUploads = 10;
      
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentUploads }, (_, index) => 
        request(app)
          .post('/api/attachments/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', fileContent, `concurrent-file-${index}.txt`)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(duration).toBeLessThan(8000); // 应在8秒内完成
      
      console.log(`${concurrentUploads} concurrent uploads completed in ${duration}ms`);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle bulk data operations efficiently', async () => {
      const bulkWorkflows = Array.from({ length: 100 }, (_, index) => ({
        title: `Bulk Workflow ${index}`,
        description: `Bulk test workflow ${index}`,
        category: 'bulk-test',
        steps: [
          {
            id: `bulk-step-${index}`,
            title: `Bulk Step ${index}`,
            type: 'MANUAL',
            order: 1,
            isRequired: true,
            estimatedDuration: 30,
            dependencies: []
          }
        ]
      }));

      const startTime = Date.now();
      
      // 批量创建工作流
      const promises = bulkWorkflows.map(workflow => 
        request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send(workflow)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      expect(duration).toBeLessThan(15000); // 应在15秒内完成
      
      console.log(`Bulk creation of 100 workflows completed in ${duration}ms`);
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalWorkflows');
      expect(response.body.data).toHaveProperty('totalExecutions');
      expect(duration).toBeLessThan(2000); // 应在2秒内完成
      
      console.log(`Dashboard stats query completed in ${duration}ms`);
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limits correctly', async () => {
      const requests = Array.from({ length: 100 }, () => 
        request(app)
          .get('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(requests);
      
      const successfulRequests = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 200
      ).length;
      
      const rateLimitedRequests = responses.filter(
        result => result.status === 'fulfilled' && result.value.status === 429
      ).length;

      // 应该有一些请求被限流
      expect(rateLimitedRequests).toBeGreaterThan(0);
      console.log(`Successful requests: ${successfulRequests}, Rate limited: ${rateLimitedRequests}`);
    });
  });
});