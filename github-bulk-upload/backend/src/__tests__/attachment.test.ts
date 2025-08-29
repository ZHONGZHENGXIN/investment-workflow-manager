import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../index';
import prisma from '../utils/database';

describe('Attachment API Tests', () => {
  let authToken: string;
  let userId: string;
  let workflowId: string;
  let executionId: string;
  let executionRecordId: string;

  beforeAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'attachment-test'
        }
      }
    });

    // 创建测试用户
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'attachment-test@example.com',
        password: 'password123',
        firstName: 'Attachment',
        lastName: 'Test'
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;

    // 创建测试工作流
    const workflowResponse = await request(app)
      .post('/api/workflows')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '测试附件流程',
        description: '用于测试附件功能',
        steps: [
          {
            name: '测试步骤',
            description: '测试步骤描述',
            order: 1,
            isRequired: true,
            stepType: 'INPUT'
          }
        ]
      });

    workflowId = workflowResponse.body.data.workflow.id;

    // 创建测试执行记录
    const execution = await prisma.execution.create({
      data: {
        userId,
        workflowId,
        status: 'IN_PROGRESS'
      }
    });
    executionId = execution.id;

    const executionRecord = await prisma.executionRecord.create({
      data: {
        executionId,
        stepId: workflowResponse.body.data.workflow.steps[0].id,
        status: 'PENDING'
      }
    });
    executionRecordId = executionRecord.id;

    // 创建测试文件
    const testDir = './test-files';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // 创建测试图片文件
    const testImageContent = Buffer.from('fake-image-content');
    fs.writeFileSync(path.join(testDir, 'test-image.jpg'), testImageContent);
    
    // 创建测试文档文件
    const testDocContent = 'This is a test document';
    fs.writeFileSync(path.join(testDir, 'test-document.txt'), testDocContent);
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'attachment-test'
        }
      }
    });

    // 清理测试文件
    const testDir = './test-files';
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    await prisma.$disconnect();
  });

  describe('POST /api/attachments/execution-records/:executionRecordId/upload', () => {
    it('should upload a file successfully', async () => {
      const response = await request(app)
        .post(`/api/attachments/execution-records/${executionRecordId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', './test-files/test-image.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attachment).toBeDefined();
      expect(response.body.data.attachment.originalName).toBe('test-image.jpg');
      expect(response.body.data.attachment.fileType).toBe('IMAGE');
    });

    it('should not upload without authentication', async () => {
      const response = await request(app)
        .post(`/api/attachments/execution-records/${executionRecordId}/upload`)
        .attach('file', './test-files/test-image.jpg')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not upload without file', async () => {
      const response = await request(app)
        .post(`/api/attachments/execution-records/${executionRecordId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('没有上传文件');
    });
  });

  describe('POST /api/attachments/execution-records/:executionRecordId/upload-multiple', () => {
    it('should upload multiple files successfully', async () => {
      const response = await request(app)
        .post(`/api/attachments/execution-records/${executionRecordId}/upload-multiple`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', './test-files/test-image.jpg')
        .attach('files', './test-files/test-document.txt')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attachments).toHaveLength(2);
    });
  });

  describe('GET /api/attachments/execution-records/:executionRecordId', () => {
    it('should get attachments list', async () => {
      const response = await request(app)
        .get(`/api/attachments/execution-records/${executionRecordId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.attachments).toBeInstanceOf(Array);
      expect(response.body.data.attachments.length).toBeGreaterThan(0);
    });

    it('should not get attachments without authentication', async () => {
      const response = await request(app)
        .get(`/api/attachments/execution-records/${executionRecordId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/attachments/stats', () => {
    it('should get user attachment statistics', async () => {
      const response = await request(app)
        .get('/api/attachments/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalCount).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/attachments/:attachmentId', () => {
    it('should delete attachment successfully', async () => {
      // 先获取附件列表
      const listResponse = await request(app)
        .get(`/api/attachments/execution-records/${executionRecordId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const attachmentId = listResponse.body.data.attachments[0].id;

      const response = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent attachment', async () => {
      const response = await request(app)
        .delete('/api/attachments/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});