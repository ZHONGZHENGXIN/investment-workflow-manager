import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import WorkflowModel, { WorkflowStepModel } from '../../models/Workflow';
import UserModel from '../../models/User';
import { CreateWorkflowInput, CreateUserInput } from '../../types/models';

const prisma = new PrismaClient();

describe('WorkflowModel', () => {
  let testUser: any;

  beforeAll(async () => {
    await prisma.$connect();
    
    // 创建测试用户
    const userData: CreateUserInput = {
      email: 'workflow-test@example.com',
      password: 'password123',
      firstName: 'Workflow',
      lastName: 'Tester',
    };
    testUser = await UserModel.create(userData);
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.workflow.deleteMany({
      where: {
        userId: testUser.id,
      },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 清理工作流测试数据
    await prisma.workflow.deleteMany({
      where: {
        userId: testUser.id,
      },
    });
  });

  describe('create', () => {
    it('should create a workflow without steps', async () => {
      const workflowData: CreateWorkflowInput = {
        name: 'Test Workflow',
        description: 'A test workflow',
        category: 'Testing',
        tags: ['test', 'example'],
      };

      const workflow = await WorkflowModel.create(testUser.id, workflowData);

      expect(workflow.name).toBe(workflowData.name);
      expect(workflow.description).toBe(workflowData.description);
      expect(workflow.category).toBe(workflowData.category);
      expect(workflow.tags).toEqual(workflowData.tags);
      expect(workflow.userId).toBe(testUser.id);
      expect(workflow.status).toBe('DRAFT'); // 默认状态
      expect(workflow.version).toBe(1); // 默认版本
      expect(workflow.isActive).toBe(true); // 默认激活
      expect(workflow.isTemplate).toBe(false); // 默认不是模板
    });

    it('should create a workflow with steps', async () => {
      const workflowData: CreateWorkflowInput = {
        name: 'Test Workflow with Steps',
        description: 'A test workflow with steps',
        steps: [
          {
            name: 'Step 1',
            description: 'First step',
            order: 1,
            isRequired: true,
            stepType: 'CHECKLIST',
          },
          {
            name: 'Step 2',
            description: 'Second step',
            order: 2,
            isRequired: false,
            stepType: 'INPUT',
          },
        ],
      };

      const workflow = await WorkflowModel.create(testUser.id, workflowData);

      expect(workflow.steps).toBeDefined();
      expect(workflow.steps?.length).toBe(2);
      expect(workflow.steps?.[0].name).toBe('Step 1');
      expect(workflow.steps?.[0].order).toBe(1);
      expect(workflow.steps?.[1].name).toBe('Step 2');
      expect(workflow.steps?.[1].order).toBe(2);
    });
  });

  describe('findById', () => {
    it('should find workflow by id with relations', async () => {
      const workflowData: CreateWorkflowInput = {
        name: 'Find Test Workflow',
        description: 'A workflow for find testing',
      };

      const createdWorkflow = await WorkflowModel.create(testUser.id, workflowData);
      const foundWorkflow = await WorkflowModel.findById(createdWorkflow.id);

      expect(foundWorkflow).toBeDefined();
      expect(foundWorkflow?.id).toBe(createdWorkflow.id);
      expect(foundWorkflow?.name).toBe(workflowData.name);
      expect(foundWorkflow?.user).toBeDefined();
      expect(foundWorkflow?.user?.id).toBe(testUser.id);
      expect(foundWorkflow?._count).toBeDefined();
    });

    it('should return null for non-existent workflow', async () => {
      const foundWorkflow = await WorkflowModel.findById('non-existent-id');
      expect(foundWorkflow).toBeNull();
    });
  });

  describe('update', () => {
    it('should update workflow and increment version', async () => {
      const workflowData: CreateWorkflowInput = {
        name: 'Update Test Workflow',
        description: 'Original description',
      };

      const workflow = await WorkflowModel.create(testUser.id, workflowData);
      expect(workflow.version).toBe(1);

      const updatedWorkflow = await WorkflowModel.update(workflow.id, {
        name: 'Updated Workflow Name',
        description: 'Updated description',
      });

      expect(updatedWorkflow.name).toBe('Updated Workflow Name');
      expect(updatedWorkflow.description).toBe('Updated description');
      expect(updatedWorkflow.version).toBe(2); // 版本应该增加
    });
  });

  describe('duplicate', () => {
    it('should duplicate workflow with steps', async () => {
      const workflowData: CreateWorkflowInput = {
        name: 'Original Workflow',
        description: 'Original description',
        steps: [
          {
            name: 'Original Step',
            description: 'Original step description',
            order: 1,
            isRequired: true,
          },
        ],
      };

      const originalWorkflow = await WorkflowModel.create(testUser.id, workflowData);
      const duplicatedWorkflow = await WorkflowModel.duplicate(
        originalWorkflow.id,
        testUser.id,
        'Duplicated Workflow'
      );

      expect(duplicatedWorkflow.name).toBe('Duplicated Workflow');
      expect(duplicatedWorkflow.description).toBe(originalWorkflow.description);
      expect(duplicatedWorkflow.version).toBe(1); // 新版本从1开始
      expect(duplicatedWorkflow.steps?.length).toBe(1);
      expect(duplicatedWorkflow.steps?.[0].name).toBe('Original Step');
      expect(duplicatedWorkflow.id).not.toBe(originalWorkflow.id); // 不同的ID
    });
  });

  describe('softDelete and restore', () => {
    it('should soft delete and restore workflow', async () => {
      const workflowData: CreateWorkflowInput = {
        name: 'Delete Test Workflow',
        description: 'A workflow for delete testing',
      };

      const workflow = await WorkflowModel.create(testUser.id, workflowData);
      expect(workflow.isActive).toBe(true);

      // 软删除
      const deletedWorkflow = await WorkflowModel.softDelete(workflow.id);
      expect(deletedWorkflow.isActive).toBe(false);

      // 恢复
      const restoredWorkflow = await WorkflowModel.restore(workflow.id);
      expect(restoredWorkflow.isActive).toBe(true);
    });
  });

  describe('findMany', () => {
    it('should return paginated workflows', async () => {
      // 创建多个工作流
      const workflows = Array.from({ length: 5 }, (_, i) => ({
        name: `Test Workflow ${i}`,
        description: `Description ${i}`,
      }));

      await Promise.all(
        workflows.map(data => WorkflowModel.create(testUser.id, data))
      );

      const result = await WorkflowModel.findMany({}, { page: 1, limit: 3 });

      expect(result.data.length).toBe(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should filter workflows by category', async () => {
      await WorkflowModel.create(testUser.id, {
        name: 'Investment Workflow',
        category: 'Investment',
      });

      await WorkflowModel.create(testUser.id, {
        name: 'Trading Workflow',
        category: 'Trading',
      });

      const investmentResults = await WorkflowModel.findMany({
        category: 'Investment',
      });

      expect(investmentResults.data.length).toBe(1);
      expect(investmentResults.data[0].category).toBe('Investment');
    });

    it('should search workflows by name and description', async () => {
      await WorkflowModel.create(testUser.id, {
        name: 'Stock Analysis',
        description: 'Analyze stock performance',
      });

      await WorkflowModel.create(testUser.id, {
        name: 'Bond Research',
        description: 'Research bond opportunities',
      });

      const searchResults = await WorkflowModel.findMany({
        search: 'stock',
      });

      expect(searchResults.data.length).toBe(1);
      expect(searchResults.data[0].name).toBe('Stock Analysis');
    });

    it('should filter workflows by tags', async () => {
      await WorkflowModel.create(testUser.id, {
        name: 'Tagged Workflow 1',
        tags: ['finance', 'analysis'],
      });

      await WorkflowModel.create(testUser.id, {
        name: 'Tagged Workflow 2',
        tags: ['finance', 'trading'],
      });

      await WorkflowModel.create(testUser.id, {
        name: 'Tagged Workflow 3',
        tags: ['research'],
      });

      const financeResults = await WorkflowModel.findMany({
        tags: ['finance'],
      });

      expect(financeResults.data.length).toBe(2);

      const analysisResults = await WorkflowModel.findMany({
        tags: ['finance', 'analysis'],
      });

      expect(analysisResults.data.length).toBe(1);
      expect(analysisResults.data[0].name).toBe('Tagged Workflow 1');
    });
  });

  describe('findTemplates', () => {
    it('should return only template workflows', async () => {
      await WorkflowModel.create(testUser.id, {
        name: 'Regular Workflow',
        isTemplate: false,
      });

      await WorkflowModel.create(testUser.id, {
        name: 'Template Workflow',
        isTemplate: true,
      });

      const templates = await WorkflowModel.findTemplates();

      expect(templates.data.length).toBe(1);
      expect(templates.data[0].name).toBe('Template Workflow');
      expect(templates.data[0].isTemplate).toBe(true);
    });
  });

  describe('checkAccess', () => {
    it('should allow access to own workflow', async () => {
      const workflow = await WorkflowModel.create(testUser.id, {
        name: 'Private Workflow',
      });

      const hasAccess = await WorkflowModel.checkAccess(workflow.id, testUser.id);
      expect(hasAccess).toBe(true);
    });

    it('should allow access to public template', async () => {
      const workflow = await WorkflowModel.create(testUser.id, {
        name: 'Public Template',
        isTemplate: true,
        status: 'ACTIVE',
      });

      // 创建另一个用户
      const otherUser = await UserModel.create({
        email: 'other@example.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User',
      });

      const hasAccess = await WorkflowModel.checkAccess(workflow.id, otherUser.id);
      expect(hasAccess).toBe(true);

      // 清理
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should deny access to private workflow of other user', async () => {
      const workflow = await WorkflowModel.create(testUser.id, {
        name: 'Private Workflow',
        isTemplate: false,
      });

      // 创建另一个用户
      const otherUser = await UserModel.create({
        email: 'other2@example.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User',
      });

      const hasAccess = await WorkflowModel.checkAccess(workflow.id, otherUser.id);
      expect(hasAccess).toBe(false);

      // 清理
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });
});

describe('WorkflowStepModel', () => {
  let testUser: any;
  let testWorkflow: any;

  beforeAll(async () => {
    await prisma.$connect();
    
    // 创建测试用户和工作流
    const userData: CreateUserInput = {
      email: 'step-test@example.com',
      password: 'password123',
      firstName: 'Step',
      lastName: 'Tester',
    };
    testUser = await UserModel.create(userData);
    
    testWorkflow = await WorkflowModel.create(testUser.id, {
      name: 'Step Test Workflow',
      description: 'A workflow for step testing',
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.workflow.delete({ where: { id: testWorkflow.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 清理步骤测试数据
    await prisma.workflowStep.deleteMany({
      where: { workflowId: testWorkflow.id },
    });
  });

  describe('create', () => {
    it('should create a workflow step', async () => {
      const stepData = {
        name: 'Test Step',
        description: 'A test step',
        order: 1,
        isRequired: true,
        stepType: 'CHECKLIST' as const,
        estimatedTime: 30,
      };

      const step = await WorkflowStepModel.create(testWorkflow.id, stepData);

      expect(step.name).toBe(stepData.name);
      expect(step.description).toBe(stepData.description);
      expect(step.order).toBe(stepData.order);
      expect(step.isRequired).toBe(stepData.isRequired);
      expect(step.stepType).toBe(stepData.stepType);
      expect(step.estimatedTime).toBe(stepData.estimatedTime);
      expect(step.workflowId).toBe(testWorkflow.id);
    });
  });

  describe('createMany', () => {
    it('should create multiple workflow steps', async () => {
      const stepsData = [
        {
          name: 'Step 1',
          description: 'First step',
          order: 1,
          isRequired: true,
        },
        {
          name: 'Step 2',
          description: 'Second step',
          order: 2,
          isRequired: false,
        },
      ];

      const result = await WorkflowStepModel.createMany(testWorkflow.id, stepsData);
      expect(result.count).toBe(2);

      const steps = await WorkflowStepModel.findByWorkflowId(testWorkflow.id);
      expect(steps.length).toBe(2);
      expect(steps[0].name).toBe('Step 1');
      expect(steps[1].name).toBe('Step 2');
    });
  });

  describe('reorder', () => {
    it('should reorder workflow steps', async () => {
      // 创建步骤
      const step1 = await WorkflowStepModel.create(testWorkflow.id, {
        name: 'Step 1',
        order: 1,
      });

      const step2 = await WorkflowStepModel.create(testWorkflow.id, {
        name: 'Step 2',
        order: 2,
      });

      const step3 = await WorkflowStepModel.create(testWorkflow.id, {
        name: 'Step 3',
        order: 3,
      });

      // 重新排序
      await WorkflowStepModel.reorder(testWorkflow.id, [
        { id: step3.id, order: 1 },
        { id: step1.id, order: 2 },
        { id: step2.id, order: 3 },
      ]);

      const reorderedSteps = await WorkflowStepModel.findByWorkflowId(testWorkflow.id);
      expect(reorderedSteps[0].name).toBe('Step 3');
      expect(reorderedSteps[0].order).toBe(1);
      expect(reorderedSteps[1].name).toBe('Step 1');
      expect(reorderedSteps[1].order).toBe(2);
      expect(reorderedSteps[2].name).toBe('Step 2');
      expect(reorderedSteps[2].order).toBe(3);
    });
  });
});