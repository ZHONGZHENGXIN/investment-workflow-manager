import { WorkflowService } from '../../services/workflowService';
import { PrismaClient } from '@prisma/client';
import { 
  createTestUser, 
  createTestWorkflow,
  testUsers, 
  cleanupTestData, 
  apiTest,
  performanceTest 
} from '../testUtils';

const prisma = new PrismaClient();
const workflowService = new WorkflowService();

describe('WorkflowService', () => {
  let testUser: any;

  beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser(testUsers.user);
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('createWorkflow', () => {
    it('should create a new workflow successfully', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [
          {
            id: '1',
            name: 'Step 1',
            description: 'First step',
            type: 'manual',
            required: true,
            order: 1
          },
          {
            id: '2',
            name: 'Step 2',
            description: 'Second step',
            type: 'approval',
            required: false,
            order: 2
          }
        ],
        userId: testUser.id
      };

      const result = await workflowService.createWorkflow(workflowData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(workflowData.name);
      expect(result.data.description).toBe(workflowData.description);
      expect(result.data.steps).toEqual(workflowData.steps);
      expect(result.data.userId).toBe(workflowData.userId);
      expect(result.data.status).toBe('draft');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name',
        steps: [],
        userId: testUser.id
      };

      const result = await workflowService.createWorkflow(invalidData as any);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate workflow name length', async () => {
      const workflowData = {
        name: 'A'.repeat(256), // 超长名称
        description: 'Test description',
        steps: [],
        userId: testUser.id
      };

      const result = await workflowService.createWorkflow(workflowData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate steps structure', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test description',
        steps: [
          {
            // 缺少必需字段
            name: 'Step 1'
          }
        ],
        userId: testUser.id
      };

      const result = await workflowService.createWorkflow(workflowData as any);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate user existence', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test description',
        steps: [],
        userId: 'non-existent-user'
      };

      const result = await workflowService.createWorkflow(workflowData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('USER_NOT_FOUND');
    });

    it('should create workflow with performance requirements', async () => {
      const workflowData = {
        name: 'Performance Test Workflow',
        description: 'Test description',
        steps: [],
        userId: testUser.id
      };

      await performanceTest.expectResponseTime(async () => {
        await workflowService.createWorkflow(workflowData);
      }, 1000);
    });
  });

  describe('getWorkflowById', () => {
    let testWorkflow: any;

    beforeEach(async () => {
      testWorkflow = await createTestWorkflow(testUser.id);
    });

    it('should return workflow by id', async () => {
      const result = await workflowService.getWorkflowById(testWorkflow.id);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(testWorkflow.id);
      expect(result.data.name).toBe(testWorkflow.name);
      expect(result.data.userId).toBe(testUser.id);
    });

    it('should return error for non-existent workflow', async () => {
      const result = await workflowService.getWorkflowById('non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('WORKFLOW_NOT_FOUND');
    });

    it('should include user information', async () => {
      const result = await workflowService.getWorkflowById(testWorkflow.id, { includeUser: true });

      expect(result.success).toBe(true);
      expect(result.data.user).toBeDefined();
      expect(result.data.user.email).toBe(testUser.email);
    });

    it('should include execution count', async () => {
      const result = await workflowService.getWorkflowById(testWorkflow.id, { includeStats: true });

      expect(result.success).toBe(true);
      expect(result.data.stats).toBeDefined();
      expect(result.data.stats.executionCount).toBeDefined();
    });
  });

  describe('updateWorkflow', () => {
    let testWorkflow: any;

    beforeEach(async () => {
      testWorkflow = await createTestWorkflow(testUser.id);
    });

    it('should update workflow successfully', async () => {
      const updateData = {
        name: 'Updated Workflow',
        description: 'Updated description',
        steps: [
          {
            id: '1',
            name: 'Updated Step',
            description: 'Updated step description',
            type: 'manual',
            required: true,
            order: 1
          }
        ]
      };

      const result = await workflowService.updateWorkflow(testWorkflow.id, updateData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(updateData.name);
      expect(result.data.description).toBe(updateData.description);
      expect(result.data.steps).toEqual(updateData.steps);
    });

    it('should not update non-existent workflow', async () => {
      const updateData = {
        name: 'Updated Workflow'
      };

      const result = await workflowService.updateWorkflow('non-existent-id', updateData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('WORKFLOW_NOT_FOUND');
    });

    it('should validate update data', async () => {
      const updateData = {
        name: '', // 空名称
      };

      const result = await workflowService.updateWorkflow(testWorkflow.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should not update workflow with active executions', async () => {
      // 创建活跃执行
      await prisma.execution.create({
        data: {
          workflowId: testWorkflow.id,
          userId: testUser.id,
          status: 'running',
          startedAt: new Date(),
          steps: []
        }
      });

      const updateData = {
        steps: [] // 尝试修改步骤
      };

      const result = await workflowService.updateWorkflow(testWorkflow.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('WORKFLOW_HAS_ACTIVE_EXECUTIONS');
    });
  });

  describe('deleteWorkflow', () => {
    let testWorkflow: any;

    beforeEach(async () => {
      testWorkflow = await createTestWorkflow(testUser.id);
    });

    it('should delete workflow successfully', async () => {
      const result = await workflowService.deleteWorkflow(testWorkflow.id);

      expect(result.success).toBe(true);

      // 验证工作流已删除
      const getResult = await workflowService.getWorkflowById(testWorkflow.id);
      expect(getResult.success).toBe(false);
    });

    it('should not delete non-existent workflow', async () => {
      const result = await workflowService.deleteWorkflow('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('WORKFLOW_NOT_FOUND');
    });

    it('should not delete workflow with executions', async () => {
      // 创建执行记录
      await prisma.execution.create({
        data: {
          workflowId: testWorkflow.id,
          userId: testUser.id,
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          steps: []
        }
      });

      const result = await workflowService.deleteWorkflow(testWorkflow.id);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('WORKFLOW_HAS_EXECUTIONS');
    });

    it('should soft delete workflow when configured', async () => {
      const result = await workflowService.deleteWorkflow(testWorkflow.id, { softDelete: true });

      expect(result.success).toBe(true);

      // 验证工作流被软删除
      const workflow = await prisma.workflow.findUnique({
        where: { id: testWorkflow.id }
      });
      expect(workflow.deletedAt).toBeDefined();
    });
  });

  describe('getUserWorkflows', () => {
    beforeEach(async () => {
      // 创建多个工作流
      await createTestWorkflow(testUser.id, { name: 'Workflow 1' });
      await createTestWorkflow(testUser.id, { name: 'Workflow 2' });
      await createTestWorkflow(testUser.id, { name: 'Workflow 3', status: 'active' });
    });

    it('should return user workflows', async () => {
      const result = await workflowService.getUserWorkflows(testUser.id);

      expect(result.success).toBe(true);
      expect(result.data.workflows).toHaveLength(3);
      expect(result.data.workflows.every(w => w.userId === testUser.id)).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await workflowService.getUserWorkflows(testUser.id, {
        page: 1,
        limit: 2
      });

      expect(result.success).toBe(true);
      expect(result.data.workflows).toHaveLength(2);
      expect(result.data.pagination.total).toBe(3);
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.limit).toBe(2);
    });

    it('should support filtering by status', async () => {
      const result = await workflowService.getUserWorkflows(testUser.id, {
        status: 'active'
      });

      expect(result.success).toBe(true);
      expect(result.data.workflows).toHaveLength(1);
      expect(result.data.workflows[0].status).toBe('active');
    });

    it('should support search by name', async () => {
      const result = await workflowService.getUserWorkflows(testUser.id, {
        search: 'Workflow 1'
      });

      expect(result.success).toBe(true);
      expect(result.data.workflows).toHaveLength(1);
      expect(result.data.workflows[0].name).toBe('Workflow 1');
    });

    it('should support sorting', async () => {
      const result = await workflowService.getUserWorkflows(testUser.id, {
        sortBy: 'name',
        sortOrder: 'desc'
      });

      expect(result.success).toBe(true);
      expect(result.data.workflows[0].name).toBe('Workflow 3');
    });
  });

  describe('duplicateWorkflow', () => {
    let testWorkflow: any;

    beforeEach(async () => {
      testWorkflow = await createTestWorkflow(testUser.id, {
        name: 'Original Workflow',
        description: 'Original description'
      });
    });

    it('should duplicate workflow successfully', async () => {
      const result = await workflowService.duplicateWorkflow(testWorkflow.id, {
        name: 'Duplicated Workflow'
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Duplicated Workflow');
      expect(result.data.description).toBe(testWorkflow.description);
      expect(result.data.steps).toEqual(testWorkflow.steps);
      expect(result.data.id).not.toBe(testWorkflow.id);
    });

    it('should auto-generate name if not provided', async () => {
      const result = await workflowService.duplicateWorkflow(testWorkflow.id);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Original Workflow (副本)');
    });
  });

  describe('validateWorkflow', () => {
    it('should validate workflow structure', async () => {
      const validWorkflow = {
        name: 'Valid Workflow',
        description: 'Valid description',
        steps: [
          {
            id: '1',
            name: 'Step 1',
            description: 'First step',
            type: 'manual',
            required: true,
            order: 1
          }
        ]
      };

      const result = await workflowService.validateWorkflow(validWorkflow);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.errors).toHaveLength(0);
    });

    it('should detect validation errors', async () => {
      const invalidWorkflow = {
        name: '', // 空名称
        steps: [
          {
            id: '1',
            name: 'Step 1',
            // 缺少必需字段
          }
        ]
      };

      const result = await workflowService.validateWorkflow(invalidWorkflow as any);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.errors.length).toBeGreaterThan(0);
    });

    it('should detect circular dependencies in steps', async () => {
      const workflowWithCircularDeps = {
        name: 'Circular Workflow',
        steps: [
          {
            id: '1',
            name: 'Step 1',
            type: 'manual',
            dependencies: ['2']
          },
          {
            id: '2',
            name: 'Step 2',
            type: 'manual',
            dependencies: ['1']
          }
        ]
      };

      const result = await workflowService.validateWorkflow(workflowWithCircularDeps as any);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.errors.some(e => e.includes('循环依赖'))).toBe(true);
    });
  });

  describe('performance and concurrency tests', () => {
    it('should handle concurrent workflow creation', async () => {
      const workflowData = {
        name: 'Concurrent Workflow',
        description: 'Test description',
        steps: [],
        userId: testUser.id
      };

      await performanceTest.expectConcurrency(async () => {
        return workflowService.createWorkflow({
          ...workflowData,
          name: `${workflowData.name} ${Math.random()}`
        });
      }, 5, 3000);
    });

    it('should handle large workflow with many steps', async () => {
      const largeWorkflowData = {
        name: 'Large Workflow',
        description: 'Workflow with many steps',
        steps: Array.from({ length: 100 }, (_, i) => ({
          id: `step-${i + 1}`,
          name: `Step ${i + 1}`,
          description: `Description for step ${i + 1}`,
          type: 'manual',
          required: i % 2 === 0,
          order: i + 1
        })),
        userId: testUser.id
      };

      await performanceTest.expectResponseTime(async () => {
        await workflowService.createWorkflow(largeWorkflowData);
      }, 2000);
    });
  });
});