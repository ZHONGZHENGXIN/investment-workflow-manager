import request from 'supertest';
import app from '../index';
import prisma from '../utils/database';

describe('Workflow API Tests', () => {
  let authToken: string;
  let userId: string;
  let workflowId: string;

  beforeAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'workflow-test'
        }
      }
    });

    // 创建测试用户并获取token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'workflow-test@example.com',
        password: 'password123',
        firstName: 'Workflow',
        lastName: 'Test'
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'workflow-test'
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/workflows', () => {
    it('should create a new workflow successfully', async () => {
      const workflowData = {
        name: '测试投资流程',
        description: '这是一个测试投资流程',
        steps: [
          {
            name: '市场分析',
            description: '分析市场趋势和机会',
            order: 1,
            isRequired: true,
            stepType: 'CHECKLIST'
          },
          {
            name: '风险评估',
            description: '评估投资风险',
            order: 2,
            isRequired: true,
            stepType: 'INPUT'
          }
        ]
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workflow.name).toBe(workflowData.name);
      expect(response.body.data.workflow.steps).toHaveLength(2);
      
      workflowId = response.body.data.workflow.id;
    });

    it('should not create workflow without authentication', async () => {
      const workflowData = {
        name: '测试流程',
        steps: []
      };

      const response = await request(app)
        .post('/api/workflows')
        .send(workflowData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '缺少名称和步骤'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/workflows', () => {
    it('should get user workflows', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workflows).toBeInstanceOf(Array);
      expect(response.body.data.workflows.length).toBeGreaterThan(0);
    });

    it('should not get workflows without authentication', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/workflows/:id', () => {
    it('should get workflow by id', async () => {
      const response = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workflow.id).toBe(workflowId);
      expect(response.body.data.workflow.steps).toBeDefined();
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await request(app)
        .get('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/workflows/:id', () => {
    it('should update workflow successfully', async () => {
      const updateData = {
        name: '更新后的投资流程',
        description: '更新后的描述',
        isActive: false
      };

      const response = await request(app)
        .put(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workflow.name).toBe(updateData.name);
      expect(response.body.data.workflow.isActive).toBe(false);
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await request(app)
        .put('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '测试' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/workflows/:id/duplicate', () => {
    it('should duplicate workflow successfully', async () => {
      const response = await request(app)
        .post(`/api/workflows/${workflowId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '复制的投资流程' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workflow.name).toBe('复制的投资流程');
      expect(response.body.data.workflow.id).not.toBe(workflowId);
    });
  });

  describe('GET /api/workflows/:id/stats', () => {
    it('should get workflow statistics', async () => {
      const response = await request(app)
        .get(`/api/workflows/${workflowId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.totalExecutions).toBeDefined();
      expect(response.body.data.stats.statusBreakdown).toBeDefined();
    });
  });

  describe('DELETE /api/workflows/:id', () => {
    it('should delete workflow successfully', async () => {
      const response = await request(app)
        .delete(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 验证工作流已被删除
      const getResponse = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await request(app)
        .delete('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});