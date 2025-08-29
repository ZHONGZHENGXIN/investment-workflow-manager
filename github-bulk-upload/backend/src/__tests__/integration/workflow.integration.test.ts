import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../index';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { authService } from '../../services/authService';

describe('Workflow Integration Tests', () => {
  let authToken: string;
  let userId: string;

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
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Workflow CRUD Operations', () => {
    it('should create, read, update, and delete a workflow', async () => {
      // 创建工作流
      const workflowData = {
        title: '投资决策流程',
        description: '完整的投资决策工作流',
        category: 'investment',
        steps: [
          {
            id: 'step1',
            title: '市场分析',
            description: '分析市场趋势和机会',
            type: 'MANUAL',
            order: 1,
            isRequired: true,
            estimatedDuration: 60,
            dependencies: []
          },
          {
            id: 'step2',
            title: '风险评估',
            description: '评估投资风险',
            type: 'MANUAL',
            order: 2,
            isRequired: true,
            estimatedDuration: 45,
            dependencies: ['step1']
          }
        ]
      };

      // 创建工作流
      const createResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe(workflowData.title);
      expect(createResponse.body.data.steps).toHaveLength(2);

      const workflowId = createResponse.body.data.id;

      // 读取工作流
      const readResponse = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.data.id).toBe(workflowId);
      expect(readResponse.body.data.title).toBe(workflowData.title);

      // 更新工作流
      const updateData = {
        title: '更新的投资决策流程',
        description: '更新后的描述'
      };

      const updateResponse = await request(app)
        .put(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe(updateData.title);
      expect(updateResponse.body.data.description).toBe(updateData.description);

      // 删除工作流
      await request(app)
        .delete(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 验证删除
      await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should list workflows with pagination', async () => {
      // 创建多个工作流
      const workflows = [];
      for (let i = 1; i <= 5; i++) {
        const workflowData = {
          title: `工作流 ${i}`,
          description: `描述 ${i}`,
          category: 'investment',
          steps: [
            {
              id: `step${i}`,
              title: `步骤 ${i}`,
              type: 'MANUAL',
              order: 1,
              isRequired: true,
              estimatedDuration: 30,
              dependencies: []
            }
          ]
        };

        const response = await request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send(workflowData)
          .expect(201);

        workflows.push(response.body.data);
      }

      // 测试分页
      const listResponse = await request(app)
        .get('/api/workflows?page=1&limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data).toHaveLength(3);
      expect(listResponse.body.pagination.total).toBe(5);
      expect(listResponse.body.pagination.totalPages).toBe(2);

      // 测试搜索
      const searchResponse = await request(app)
        .get('/api/workflows?search=工作流 1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].title).toBe('工作流 1');
    });

    it('should handle unauthorized access', async () => {
      // 创建工作流
      const workflowData = {
        title: '测试工作流',
        description: '测试描述',
        steps: [
          {
            id: 'step1',
            title: '步骤1',
            type: 'MANUAL',
            order: 1,
            isRequired: true,
            estimatedDuration: 30,
            dependencies: []
          }
        ]
      };

      const createResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      const workflowId = createResponse.body.data.id;

      // 创建另一个用户
      const otherUserData = {
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      };

      const otherAuthResult = await authService.register(otherUserData);
      const otherToken = otherAuthResult.tokens.accessToken;

      // 尝试访问其他用户的工作流
      await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      // 尝试更新其他用户的工作流
      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: '恶意更新' })
        .expect(403);

      // 尝试删除其他用户的工作流
      await request(app)
        .delete(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('Workflow Validation', () => {
    it('should validate workflow data', async () => {
      // 测试缺少标题
      const invalidData1 = {
        description: '缺少标题',
        steps: []
      };

      await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData1)
        .expect(400);

      // 测试无效的步骤
      const invalidData2 = {
        title: '测试工作流',
        description: '测试描述',
        steps: [
          {
            id: '',
            title: '',
            type: 'INVALID_TYPE',
            order: -1
          }
        ]
      };

      await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData2)
        .expect(400);
    });

    it('should validate step dependencies', async () => {
      const invalidData = {
        title: '依赖错误工作流',
        description: '测试循环依赖',
        steps: [
          {
            id: 'step1',
            title: '步骤1',
            type: 'MANUAL',
            order: 1,
            dependencies: ['step2']
          },
          {
            id: 'step2',
            title: '步骤2',
            type: 'MANUAL',
            order: 2,
            dependencies: ['step1'] // 循环依赖
          }
        ]
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});