import request from 'supertest';
import app from '../index';
import { setupTestDatabase, cleanupTestDatabase } from './helpers/database';
import UserModel from '../models/User';
import WorkflowModel from '../models/Workflow';
import ExecutionModel from '../models/Execution';

describe('Review API Tests', () => {
  let authToken: string;
  let userId: string;
  let workflowId: string;
  let executionId: string;
  let reviewId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // 创建测试用户
    const user = await UserModel.create({
      username: 'reviewtest',
      email: 'review-test@example.com',
      password: 'hashedpassword'
    });
    userId = user.id;

    // 模拟登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'review-test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // 创建测试工作流
    const workflow = await WorkflowModel.create(userId, {
      name: '测试复盘工作流',
      description: '用于复盘测试',
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
      description: '用于复盘测试'
    });
    executionId = execution.id;

    // 完成执行记录以便进行复盘
    await ExecutionModel.complete(executionId);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/reviews', () => {
    it('应该创建复盘记录', async () => {
      const reviewData = {
        executionId: executionId,
        title: '测试复盘',
        content: '这是一个测试复盘内容',
        rating: 4,
        tags: ['测试', '复盘'],
        improvements: ['改进点1', '改进点2'],
        lessons: ['经验1', '经验2']
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(reviewData.title);
      expect(response.body.data.rating).toBe(reviewData.rating);
      expect(response.body.data.tags).toEqual(reviewData.tags);
      
      reviewId = response.body.data.id;
    });

    it('应该验证必需字段', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '缺少执行ID的复盘'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('应该验证评分范围', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          executionId: executionId,
          title: '无效评分复盘',
          rating: 6 // 超出1-5范围
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('未认证用户不能创建复盘', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({
          executionId: executionId,
          title: '未认证复盘'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reviews', () => {
    it('应该获取复盘记录列表', async () => {
      const response = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/reviews?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('应该支持按评分过滤', async () => {
      const response = await request(app)
        .get('/api/reviews?rating=4')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该支持按标签过滤', async () => {
      const response = await request(app)
        .get('/api/reviews?tags=测试')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get('/api/reviews?search=测试')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('应该获取复盘记录详情', async () => {
      const response = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(reviewId);
      expect(response.body.data.title).toBe('测试复盘');
    });

    it('不存在的复盘记录应该返回404', async () => {
      const response = await request(app)
        .get('/api/reviews/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('应该更新复盘记录', async () => {
      const updateData = {
        title: '更新后的复盘标题',
        content: '更新后的复盘内容',
        rating: 5,
        tags: ['更新', '测试']
      };

      const response = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.rating).toBe(updateData.rating);
    });

    it('不存在的复盘记录应该返回404', async () => {
      const response = await request(app)
        .put('/api/reviews/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '更新不存在的复盘'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('应该删除复盘记录', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 验证复盘记录已被删除
      const getResponse = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('不存在的复盘记录应该返回404', async () => {
      const response = await request(app)
        .delete('/api/reviews/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reviews/analytics', () => {
    beforeEach(async () => {
      // 创建一些测试数据用于分析
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          executionId: executionId,
          title: '分析测试复盘1',
          rating: 4,
          tags: ['分析', '测试']
        });

      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          executionId: executionId,
          title: '分析测试复盘2',
          rating: 3,
          tags: ['分析', '改进']
        });
    });

    it('应该获取复盘分析数据', async () => {
      const response = await request(app)
        .get('/api/reviews/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.averageRating).toBeDefined();
      expect(response.body.data.ratingDistribution).toBeDefined();
      expect(response.body.data.commonTags).toBeDefined();
      expect(response.body.data.trendsOverTime).toBeDefined();
    });

    it('应该支持按时间范围过滤分析', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const response = await request(app)
        .get(`/api/reviews/analytics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该支持按工作流过滤分析', async () => {
      const response = await request(app)
        .get(`/api/reviews/analytics?workflowId=${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reviews/summary', () => {
    it('应该获取智能摘要', async () => {
      const response = await request(app)
        .get('/api/reviews/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.keyInsights).toBeDefined();
      expect(response.body.data.commonImprovements).toBeDefined();
      expect(response.body.data.successPatterns).toBeDefined();
    });

    it('应该支持按时间范围生成摘要', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const response = await request(app)
        .get(`/api/reviews/summary?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reviews/trends', () => {
    it('应该获取复盘趋势数据', async () => {
      const response = await request(app)
        .get('/api/reviews/trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ratingTrends).toBeDefined();
      expect(response.body.data.volumeTrends).toBeDefined();
      expect(response.body.data.tagTrends).toBeDefined();
    });

    it('应该支持不同的时间粒度', async () => {
      const response = await request(app)
        .get('/api/reviews/trends?granularity=monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});