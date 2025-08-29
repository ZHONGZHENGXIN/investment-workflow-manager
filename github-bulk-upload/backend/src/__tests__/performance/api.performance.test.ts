import request from 'supertest';
import { performance } from 'perf_hooks';
import app from '../../index';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('API Performance Tests', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'performance@test.com',
        name: 'Performance Test User',
        password: 'hashedpassword',
        role: 'USER',
      },
    });
    testUserId = testUser.id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup
    await prisma.execution.deleteMany({ where: { userId: testUserId } });
    await prisma.workflow.deleteMany({ where: { createdBy: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Authentication Performance', () => {
    it('should handle login requests within acceptable time', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'performance@test.com',
          password: 'password123',
        });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
      console.log(`Login response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should validate JWT tokens quickly', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100); // JWT validation should be very fast
      console.log(`JWT validation time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Workflow API Performance', () => {
    let workflowIds: string[] = [];

    beforeAll(async () => {
      // Create test workflows
      const workflows = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          prisma.workflow.create({
            data: {
              name: `Performance Test Workflow ${i + 1}`,
              description: `Test workflow for performance testing ${i + 1}`,
              steps: [
                {
                  id: `step-${i}-1`,
                  title: `Step 1 for workflow ${i + 1}`,
                  description: 'First step',
                  type: 'MANUAL',
                  required: true,
                  order: 1,
                },
                {
                  id: `step-${i}-2`,
                  title: `Step 2 for workflow ${i + 1}`,
                  description: 'Second step',
                  type: 'MANUAL',
                  required: true,
                  order: 2,
                },
              ],
              createdBy: testUserId,
            },
          })
        )
      );
      workflowIds = workflows.map(w => w.id);
    });

    afterAll(async () => {
      await prisma.workflow.deleteMany({
        where: { id: { in: workflowIds } },
      });
    });

    it('should list workflows efficiently', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(1000); // Should list workflows within 1 second
      console.log(`Workflow list response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should handle concurrent workflow creation', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Concurrent Workflow ${i + 1}`,
            description: 'Test concurrent creation',
            steps: [
              {
                title: 'Test Step',
                description: 'Test step description',
                type: 'MANUAL',
                required: true,
                order: 1,
              },
            ],
          })
      );
      
      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
      
      expect(averageTime).toBeLessThan(2000); // Average should be under 2 seconds
      console.log(`Concurrent workflow creation average time: ${averageTime.toFixed(2)}ms`);
      
      // Cleanup created workflows
      const createdIds = responses.map(r => r.body.id);
      await prisma.workflow.deleteMany({
        where: { id: { in: createdIds } },
      });
    });
  });

  describe('Execution API Performance', () => {
    let testWorkflowId: string;
    let executionIds: string[] = [];

    beforeAll(async () => {
      const workflow = await prisma.workflow.create({
        data: {
          name: 'Execution Performance Test Workflow',
          description: 'For testing execution performance',
          steps: [
            {
              id: 'perf-step-1',
              title: 'Performance Step 1',
              description: 'First performance step',
              type: 'MANUAL',
              required: true,
              order: 1,
            },
            {
              id: 'perf-step-2',
              title: 'Performance Step 2',
              description: 'Second performance step',
              type: 'MANUAL',
              required: true,
              order: 2,
            },
          ],
          createdBy: testUserId,
        },
      });
      testWorkflowId = workflow.id;
    });

    afterAll(async () => {
      await prisma.execution.deleteMany({
        where: { id: { in: executionIds } },
      });
      await prisma.workflow.delete({
        where: { id: testWorkflowId },
      });
    });

    it('should start execution quickly', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: testWorkflowId,
        });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(1000); // Should start within 1 second
      console.log(`Execution start time: ${responseTime.toFixed(2)}ms`);
      
      executionIds.push(response.body.id);
    });

    it('should handle multiple concurrent executions', async () => {
      const concurrentExecutions = 5;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentExecutions }, () =>
        request(app)
          .post('/api/executions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            workflowId: testWorkflowId,
          })
      );
      
      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentExecutions;
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        executionIds.push(response.body.id);
      });
      
      expect(averageTime).toBeLessThan(1500); // Average should be under 1.5 seconds
      console.log(`Concurrent execution average time: ${averageTime.toFixed(2)}ms`);
    });

    it('should update execution steps efficiently', async () => {
      // Create an execution first
      const executionResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: testWorkflowId,
        });
      
      const executionId = executionResponse.body.id;
      executionIds.push(executionId);
      
      const startTime = performance.now();
      
      const response = await request(app)
        .patch(`/api/executions/${executionId}/steps/perf-step-1`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'COMPLETED',
          notes: 'Performance test completion',
        });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500); // Should update within 500ms
      console.log(`Step update time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex queries efficiently', async () => {
      const startTime = performance.now();
      
      // Complex query with joins and filters
      const response = await request(app)
        .get('/api/history?page=1&limit=20&status=COMPLETED&sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${authToken}`);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Complex queries should complete within 2 seconds
      console.log(`Complex query response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 50;
      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/workflows?page=1&limit=${pageSize}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Pagination should be fast
      console.log(`Pagination response time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during heavy operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      for (let i = 0; i < 20; i++) {
        await request(app)
          .get('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle invalid requests quickly', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/workflows/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(404);
      expect(responseTime).toBeLessThan(200); // Error responses should be very fast
      console.log(`Error response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should handle authentication errors quickly', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', 'Bearer invalid-token');
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(401);
      expect(responseTime).toBeLessThan(100); // Auth errors should be immediate
      console.log(`Auth error response time: ${responseTime.toFixed(2)}ms`);
    });
  });
});