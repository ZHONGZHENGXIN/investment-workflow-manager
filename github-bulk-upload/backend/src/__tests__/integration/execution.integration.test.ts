import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../index';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { authService } from '../../services/authService';
import { ExecutionStatus, ExecutionPriority } from '../../services/execution';

describe('Execution Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let workflowId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    
    // 创建测试用户并获取token
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    
    const authResult = await authService.register(userData);
    authToken = authResult.tokens.accessToken;
    userId = authResult.user.id;

    // 创建测试工作流
    const workflowData = {
      title: '测试工作流',
      description: '用于执行测试的工作流',
      category: 'investment',
      steps: [
        {
          id: 'step1',
          title: '步骤1',
          description: '第一个步骤',
          type: 'MANUAL',
          order: 1,
          isRequired: true,
          estimatedDuration: 30,
          dependencies: []
        },
        {
          id: 'step2',
          title: '步骤2',
          description: '第二个步骤',
          type: 'MANUAL',
          order: 2,
          isRequired: true,
          estimatedDuration: 45,
          dependencies: ['step1']
        }
      ]
    };

    const workflowResponse = await request(app)
      .post('/api/workflows')
      .set('Authorization', `Bearer ${authToken}`)
      .send(workflowData)
      .expect(201);

    workflowId = workflowResponse.body.data.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Execution CRUD Operations', () => {
    it('should create and manage execution lifecycle', async () => {
      // 创建执行
      const executionData = {
        workflowId,
        title: '投资项目A执行',
        description: '执行投资项目A的决策流程',
        priority: ExecutionPriority.HIGH,
        tags: ['投资', '项目A'],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后
      };

      const createResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe(executionData.title);
      expect(createResponse.body.data.status).toBe(ExecutionStatus.PENDING);
      expect(createResponse.body.data.progress).toBe(0);

      const executionId = createResponse.body.data.id;

      // 开始执行
      const startResponse = await request(app)
        .post(`/api/executions/${executionId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(startResponse.body.data.status).toBe(ExecutionStatus.IN_PROGRESS);

      // 暂停执行
      const pauseResponse = await request(app)
        .post(`/api/executions/${executionId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(pauseResponse.body.data.status).toBe(ExecutionStatus.PAUSED);

      // 恢复执行
      const resumeResponse = await request(app)
        .post(`/api/executions/${executionId}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(resumeResponse.body.data.status).toBe(ExecutionStatus.IN_PROGRESS);

      // 完成执行
      const completeResponse = await request(app)
        .post(`/api/executions/${executionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(completeResponse.body.data.status).toBe(ExecutionStatus.COMPLETED);
      expect(completeResponse.body.data.progress).toBe(100);
      expect(completeResponse.body.data.completedAt).toBeDefined();
    });

    it('should handle execution cancellation', async () => {
      // 创建执行
      const executionData = {
        workflowId,
        title: '可取消的执行',
        description: '测试取消功能',
        priority: ExecutionPriority.MEDIUM
      };

      const createResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionData)
        .expect(201);

      const executionId = createResponse.body.data.id;

      // 开始执行
      await request(app)
        .post(`/api/executions/${executionId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 取消执行
      const cancelResponse = await request(app)
        .post(`/api/executions/${executionId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cancelResponse.body.data.status).toBe(ExecutionStatus.CANCELLED);

      // 尝试恢复已取消的执行应该失败
      await request(app)
        .post(`/api/executions/${executionId}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should list executions with filters', async () => {
      // 创建多个执行
      const executions = [];
      for (let i = 1; i <= 3; i++) {
        const executionData = {
          workflowId,
          title: `执行 ${i}`,
          description: `描述 ${i}`,
          priority: i === 1 ? ExecutionPriority.HIGH : ExecutionPriority.MEDIUM,
          tags: [`tag${i}`]
        };

        const response = await request(app)
          .post('/api/executions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(executionData)
          .expect(201);

        executions.push(response.body.data);
      }

      // 开始第一个执行
      await request(app)
        .post(`/api/executions/${executions[0].id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 完成第二个执行
      await request(app)
        .post(`/api/executions/${executions[1].id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .post(`/api/executions/${executions[1].id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 测试状态过滤
      const inProgressResponse = await request(app)
        .get(`/api/executions?status=${ExecutionStatus.IN_PROGRESS}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(inProgressResponse.body.data).toHaveLength(1);
      expect(inProgressResponse.body.data[0].status).toBe(ExecutionStatus.IN_PROGRESS);

      // 测试优先级过滤
      const highPriorityResponse = await request(app)
        .get(`/api/executions?priority=${ExecutionPriority.HIGH}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(highPriorityResponse.body.data).toHaveLength(1);
      expect(highPriorityResponse.body.data[0].priority).toBe(ExecutionPriority.HIGH);

      // 测试工作流过滤
      const workflowFilterResponse = await request(app)
        .get(`/api/executions?workflowId=${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(workflowFilterResponse.body.data).toHaveLength(3);
    });
  });

  describe('Execution Step Management', () => {
    it('should manage execution step progress', async () => {
      // 创建执行
      const executionData = {
        workflowId,
        title: '步骤管理测试',
        description: '测试步骤进度管理'
      };

      const createResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionData)
        .expect(201);

      const executionId = createResponse.body.data.id;

      // 开始执行
      await request(app)
        .post(`/api/executions/${executionId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 完成第一个步骤
      const step1Data = {
        stepId: 'step1',
        status: 'COMPLETED',
        notes: '第一个步骤已完成',
        actualDuration: 25
      };

      const step1Response = await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(step1Data)
        .expect(200);

      expect(step1Response.body.success).toBe(true);

      // 获取执行详情，检查进度
      const detailResponse = await request(app)
        .get(`/api/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(detailResponse.body.data.progress).toBeGreaterThan(0);
      expect(detailResponse.body.data.progress).toBeLessThan(100);

      // 完成第二个步骤
      const step2Data = {
        stepId: 'step2',
        status: 'COMPLETED',
        notes: '第二个步骤已完成',
        actualDuration: 40
      };

      await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(step2Data)
        .expect(200);

      // 检查执行是否自动完成
      const finalResponse = await request(app)
        .get(`/api/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalResponse.body.data.progress).toBe(100);
      expect(finalResponse.body.data.status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('Execution Validation', () => {
    it('should validate execution data', async () => {
      // 测试缺少工作流ID
      const invalidData1 = {
        title: '缺少工作流ID'
      };

      await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData1)
        .expect(400);

      // 测试无效的优先级
      const invalidData2 = {
        workflowId,
        title: '无效优先级',
        priority: 'INVALID_PRIORITY'
      };

      await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData2)
        .expect(400);

      // 测试过去的截止日期
      const invalidData3 = {
        workflowId,
        title: '过去的截止日期',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 昨天
      };

      await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData3)
        .expect(400);
    });

    it('should prevent unauthorized workflow access', async () => {
      // 创建另一个用户
      const otherUserData = {
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      };

      const otherAuthResult = await authService.register(otherUserData);
      const otherToken = otherAuthResult.tokens.accessToken;

      // 尝试使用其他用户的工作流创建执行
      const executionData = {
        workflowId, // 属于第一个用户的工作流
        title: '未授权访问测试'
      };

      await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(executionData)
        .expect(403);
    });
  });
});