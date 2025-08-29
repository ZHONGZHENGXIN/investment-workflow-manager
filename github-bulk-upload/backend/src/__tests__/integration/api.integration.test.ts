import request from 'supertest';
import app from '../../index';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';

describe('API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let workflowId: string;
  let executionId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('完整的用户流程测试', () => {
    it('应该完成完整的用户注册到执行工作流的流程', async () => {
      // 1. 用户注册
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'integrationtest',
          email: 'integration@example.com',
          password: 'password123',
          firstName: 'Integration',
          lastName: 'Test'
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe('integration@example.com');
      
      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;

      // 2. 创建工作流
      const workflowResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '集成测试工作流',
          description: '用于集成测试的工作流',
          category: '测试',
          tags: ['集成测试', '自动化'],
          steps: [
            {
              id: 'step1',
              title: '准备阶段',
              description: '准备执行所需的资源',
              type: 'MANUAL',
              order: 1,
              isRequired: true,
              estimatedDuration: 30,
              dependencies: []
            },
            {
              id: 'step2',
              title: '执行阶段',
              description: '执行主要任务',
              type: 'MANUAL',
              order: 2,
              isRequired: true,
              estimatedDuration: 60,
              dependencies: ['step1']
            },
            {
              id: 'step3',
              title: '验证阶段',
              description: '验证执行结果',
              type: 'MANUAL',
              order: 3,
              isRequired: false,
              estimatedDuration: 15,
              dependencies: ['step2']
            }
          ]
        })
        .expect(201);

      expect(workflowResponse.body.success).toBe(true);
      expect(workflowResponse.body.data.name).toBe('集成测试工作流');
      expect(workflowResponse.body.data.steps).toHaveLength(3);
      
      workflowId = workflowResponse.body.data.id;

      // 3. 创建执行记录
      const executionResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflowId,
          title: '集成测试执行',
          description: '集成测试的执行记录',
          priority: 'HIGH',
          tags: ['集成测试'],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(201);

      expect(executionResponse.body.success).toBe(true);
      expect(executionResponse.body.data.title).toBe('集成测试执行');
      expect(executionResponse.body.data.status).toBe('PENDING');
      
      executionId = executionResponse.body.data.id;

      // 4. 获取执行记录详情（包含步骤记录）
      const executionDetailResponse = await request(app)
        .get(`/api/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(executionDetailResponse.body.success).toBe(true);
      expect(executionDetailResponse.body.data.id).toBe(executionId);

      // 5. 获取执行步骤记录
      const recordsResponse = await request(app)
        .get(`/api/executions/${executionId}/records`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(recordsResponse.body.success).toBe(true);
      expect(recordsResponse.body.data).toHaveLength(3);
      
      const records = recordsResponse.body.data;
      const step1Record = records.find((r: any) => r.stepId === 'step1');
      const step2Record = records.find((r: any) => r.stepId === 'step2');
      const step3Record = records.find((r: any) => r.stepId === 'step3');

      expect(step1Record).toBeDefined();
      expect(step2Record).toBeDefined();
      expect(step3Record).toBeDefined();

      // 6. 开始执行第一个步骤
      const startStep1Response = await request(app)
        .post(`/api/executions/${executionId}/records/${step1Record.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(startStep1Response.body.success).toBe(true);
      expect(startStep1Response.body.data.status).toBe('IN_PROGRESS');

      // 7. 完成第一个步骤
      const completeStep1Response = await request(app)
        .post(`/api/executions/${executionId}/records/${step1Record.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: '第一个步骤已完成',
          result: { success: true, data: '准备工作完成' }
        })
        .expect(200);

      expect(completeStep1Response.body.success).toBe(true);
      expect(completeStep1Response.body.data.status).toBe('COMPLETED');

      // 8. 开始执行第二个步骤
      const startStep2Response = await request(app)
        .post(`/api/executions/${executionId}/records/${step2Record.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(startStep2Response.body.success).toBe(true);

      // 9. 完成第二个步骤
      await request(app)
        .post(`/api/executions/${executionId}/records/${step2Record.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: '第二个步骤已完成',
          result: { success: true, data: '主要任务完成' }
        })
        .expect(200);

      // 10. 跳过第三个步骤（非必需）
      const skipStep3Response = await request(app)
        .post(`/api/executions/${executionId}/records/${step3Record.id}/skip`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: '验证步骤在此次测试中不需要'
        })
        .expect(200);

      expect(skipStep3Response.body.success).toBe(true);
      expect(skipStep3Response.body.data.status).toBe('SKIPPED');

      // 11. 完成整个执行
      const completeExecutionResponse = await request(app)
        .post(`/api/executions/${executionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(completeExecutionResponse.body.success).toBe(true);
      expect(completeExecutionResponse.body.data.status).toBe('COMPLETED');

      // 12. 创建复盘记录
      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          executionId: executionId,
          title: '集成测试复盘',
          content: '这次集成测试执行得很顺利，所有步骤都按预期完成。',
          rating: 5,
          tags: ['成功', '集成测试'],
          improvements: ['可以考虑自动化更多步骤'],
          lessons: ['集成测试流程验证有效']
        })
        .expect(201);

      expect(reviewResponse.body.success).toBe(true);
      expect(reviewResponse.body.data.rating).toBe(5);

      // 13. 获取历史记录
      const historyResponse = await request(app)
        .get('/api/history/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);

      // 14. 获取统计信息
      const statsResponse = await request(app)
        .get('/api/history/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.totalExecutions).toBeGreaterThan(0);

      // 15. 获取复盘分析
      const analyticsResponse = await request(app)
        .get('/api/reviews/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.averageRating).toBeDefined();
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该正确处理权限错误', async () => {
      // 尝试访问其他用户的工作流
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      const otherToken = otherUserResponse.body.data.token;

      // 尝试访问第一个用户的工作流
      const unauthorizedResponse = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(unauthorizedResponse.body.success).toBe(false);
      expect(unauthorizedResponse.body.error.code).toBe('ACCESS_DENIED');
    });

    it('应该正确处理数据验证错误', async () => {
      // 尝试创建无效的工作流
      const invalidWorkflowResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少必需的name字段
          description: '无效的工作流',
          steps: []
        })
        .expect(400);

      expect(invalidWorkflowResponse.body.success).toBe(false);
      expect(invalidWorkflowResponse.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该正确处理资源不存在的情况', async () => {
      // 尝试获取不存在的工作流
      const notFoundResponse = await request(app)
        .get('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(notFoundResponse.body.success).toBe(false);
      expect(notFoundResponse.body.error.code).toBe('NOT_FOUND_ERROR');
    });

    it('应该正确处理未认证的请求', async () => {
      // 不提供认证token
      const unauthenticatedResponse = await request(app)
        .get('/api/workflows')
        .expect(401);

      expect(unauthenticatedResponse.body.success).toBe(false);
      expect(unauthenticatedResponse.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('并发操作测试', () => {
    it('应该正确处理并发的步骤操作', async () => {
      // 创建一个新的执行记录用于并发测试
      const concurrentExecutionResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflowId,
          title: '并发测试执行',
          description: '用于测试并发操作'
        });

      const concurrentExecutionId = concurrentExecutionResponse.body.data.id;

      // 获取步骤记录
      const recordsResponse = await request(app)
        .get(`/api/executions/${concurrentExecutionId}/records`)
        .set('Authorization', `Bearer ${authToken}`);

      const records = recordsResponse.body.data;
      const step1Record = records.find((r: any) => r.stepId === 'step1');

      // 尝试同时开始同一个步骤多次
      const concurrentRequests = Array(3).fill(null).map(() =>
        request(app)
          .post(`/api/executions/${concurrentExecutionId}/records/${step1Record.id}/start`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(concurrentRequests);
      
      // 应该只有一个请求成功，其他的应该失败或返回相同状态
      const successfulResults = results.filter(result => 
        result.status === 'fulfilled' && result.value.status === 200
      );
      
      expect(successfulResults.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理批量操作', async () => {
      const startTime = Date.now();

      // 创建多个工作流
      const workflowPromises = Array(5).fill(null).map((_, index) =>
        request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `性能测试工作流 ${index + 1}`,
            description: `性能测试工作流 ${index + 1}`,
            steps: [
              {
                id: `step1_${index}`,
                title: `步骤1 - ${index}`,
                type: 'MANUAL',
                order: 1,
                isRequired: true,
                estimatedDuration: 30,
                dependencies: []
              }
            ]
          })
      );

      const workflowResults = await Promise.all(workflowPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 批量创建应该在5秒内完成
      expect(duration).toBeLessThan(5000);
      
      // 所有工作流都应该创建成功
      workflowResults.forEach(result => {
        expect(result.status).toBe(201);
        expect(result.body.success).toBe(true);
      });
    });
  });

  describe('数据一致性测试', () => {
    it('应该保持数据一致性', async () => {
      // 创建执行记录
      const executionResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflowId,
          title: '数据一致性测试执行'
        });

      const testExecutionId = executionResponse.body.data.id;

      // 获取初始统计
      const initialStatsResponse = await request(app)
        .get('/api/history/stats')
        .set('Authorization', `Bearer ${authToken}`);

      const initialStats = initialStatsResponse.body.data;

      // 完成执行
      await request(app)
        .post(`/api/executions/${testExecutionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      // 获取更新后的统计
      const updatedStatsResponse = await request(app)
        .get('/api/history/stats')
        .set('Authorization', `Bearer ${authToken}`);

      const updatedStats = updatedStatsResponse.body.data;

      // 统计数据应该正确更新
      expect(updatedStats.totalExecutions).toBe(initialStats.totalExecutions + 1);
    });
  });
});