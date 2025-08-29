import request from 'supertest';
import app from '../index';
import { setupTestDatabase, cleanupTestDatabase } from './helpers/database';
import UserModel from '../models/User';
import WorkflowModel from '../models/Workflow';
import ExecutionModel from '../models/Execution';

describe('History API Tests', () => {
  let authToken: string;
  let userId: string;
  let workflowId: string;
  let executionId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // 创建测试用户
    const user = await UserModel.create({
      username: 'historytest',
      email: 'history-test@example.com',
      password: 'hashedpassword'
    });
    userId = user.id;

    // 模拟登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'history-test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // 创建测试工作流
    const workflow = await WorkflowModel.create(userId, {
      name: '测试历史工作流',
      description: '用于历史记录测试',
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
        }
      ]
    });
    workflowId = workflow.id;

    // 创建测试执行记录
    const execution = await ExecutionModel.create(userId, {
      workflowId: workflowId,
      title: '测试执行记录',
      description: '用于历史记录测试'
    });
    executionId = execution.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /api/history/executions', () => {
    it('应该获取执行历史记录列表', async () => {
      const response = await request(app)
        .get('/api/history/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/history/executions?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('应该支持按状态过滤', async () => {
      const response = await request(app)
        .get('/api/history/executions?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该支持按日期范围过滤', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const response = await request(app)
        .get(`/api/history/executions?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get('/api/history/executions?search=测试')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('未认证用户不能访问', async () => {
      const response = await request(app)
        .get('/api/history/executions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/history/executions/:id', () => {
    it('应该获取执行记录详情', async () => {
      const response = await request(app)
        .get(`/api/history/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(executionId);
    });

    it('不存在的记录应该返回404', async () => {
      const response = await request(app)
        .get('/api/history/executions/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/history/stats', () => {
    it('应该获取历史统计信息', async () => {
      const response = await request(app)
        .get('/api/history/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalExecutions).toBeDefined();
      expect(response.body.data.statusBreakdown).toBeDefined();
      expect(response.body.data.completionRate).toBeDefined();
    });

    it('应该支持按工作流过滤统计', async () => {
      const response = await request(app)
        .get(`/api/history/stats?workflowId=${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该支持按时间范围过滤统计', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const response = await request(app)
        .get(`/api/history/stats?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/history/trends', () => {
    it('应该获取趋势分析数据', async () => {
      const response = await request(app)
        .get('/api/history/trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.executionTrends).toBeDefined();
      expect(response.body.data.completionTrends).toBeDefined();
    });

    it('应该支持不同的时间粒度', async () => {
      const response = await request(app)
        .get('/api/history/trends?granularity=weekly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/history/export', () => {
    it('应该导出历史数据', async () => {
      const response = await request(app)
        .post('/api/history/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          filters: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exportId).toBeDefined();
    });

    it('应该支持不同的导出格式', async () => {
      const response = await request(app)
        .post('/api/history/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'json',
          filters: {}
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该验证导出格式', async () => {
      const response = await request(app)
        .post('/api/history/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'invalid-format'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/history/export/:exportId/status', () => {
    it('应该获取导出状态', async () => {
      // 先创建一个导出任务
      const exportResponse = await request(app)
        .post('/api/history/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          filters: {}
        });

      const exportId = exportResponse.body.data.exportId;

      const response = await request(app)
        .get(`/api/history/export/${exportId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });
  });

  describe('GET /api/history/export/:exportId/download', () => {
    it('应该下载导出文件', async () => {
      // 先创建一个导出任务
      const exportResponse = await request(app)
        .post('/api/history/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          filters: {}
        });

      const exportId = exportResponse.body.data.exportId;

      // 等待导出完成（在实际测试中可能需要模拟）
      const response = await request(app)
        .get(`/api/history/export/${exportId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      // 根据导出状态判断响应
      if (response.status === 200) {
        expect(response.headers['content-type']).toContain('text/csv');
      } else if (response.status === 202) {
        expect(response.body.message).toContain('正在处理');
      }
    });
  });
});