import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import ExecutionModel, { ExecutionRecordModel } from '../models/Execution';
import WorkflowModel from '../models/Workflow';
import UserModel from '../models/User';
import { setupTestDatabase, cleanupTestDatabase } from './helpers/database';
import { ExecutionStatus, ExecutionPriority, ExecutionRecordStatus } from '../types/models';

describe('Execution Model', () => {
  let testUserId: string;
  let testWorkflowId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    
    // 创建测试用户
    const user = await UserModel.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword'
    });
    testUserId = user.id;

    // 创建测试工作流
    const workflow = await WorkflowModel.create(testUserId, {
      title: '测试工作流',
      description: '测试描述',
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
          estimatedDuration: 60,
          dependencies: ['step1']
        }
      ]
    });
    testWorkflowId = workflow.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('创建执行记录', () => {
    it('应该成功创建执行记录', async () => {
      const executionData = {
        workflowId: testWorkflowId,
        title: '测试执行',
        description: '测试执行描述',
        priority: ExecutionPriority.MEDIUM,
        tags: ['测试', '投资'],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后
      };

      const execution = await ExecutionModel.create(testUserId, executionData);

      expect(execution).toBeDefined();
      expect(execution.id).toBeDefined();
      expect(execution.userId).toBe(testUserId);
      expect(execution.workflowId).toBe(testWorkflowId);
      expect(execution.title).toBe(executionData.title);
      expect(execution.status).toBe(ExecutionStatus.PENDING);
      expect(execution.priority).toBe(ExecutionPriority.MEDIUM);
      expect(execution.tags).toEqual(['测试', '投资']);
      expect(execution.progress).toBe(0);
    });

    it('应该自动创建执行步骤记录', async () => {
      const executionData = {
        workflowId: testWorkflowId,
        title: '测试执行'
      };

      const execution = await ExecutionModel.create(testUserId, executionData);
      const records = await ExecutionRecordModel.findByExecutionId(execution.id);

      expect(records).toHaveLength(2);
      expect(records[0].stepId).toBe('step1');
      expect(records[0].status).toBe(ExecutionRecordStatus.PENDING);
      expect(records[1].stepId).toBe('step2');
      expect(records[1].status).toBe(ExecutionRecordStatus.PENDING);
    });
  });

  describe('查询执行记录', () => {
    let testExecutionId: string;

    beforeEach(async () => {
      const execution = await ExecutionModel.create(testUserId, {
        workflowId: testWorkflowId,
        title: '测试执行'
      });
      testExecutionId = execution.id;
    });

    it('应该能根据ID查询执行记录', async () => {
      const execution = await ExecutionModel.findById(testExecutionId);
      
      expect(execution).toBeDefined();
      expect(execution!.id).toBe(testExecutionId);
      expect(execution!.title).toBe('测试执行');
    });

    it('应该能查询用户的执行记录列表', async () => {
      const result = await ExecutionModel.findMany(
        { userId: testUserId },
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(testExecutionId);
      expect(result.pagination.total).toBe(1);
    });

    it('应该能按状态过滤执行记录', async () => {
      const result = await ExecutionModel.findMany(
        { userId: testUserId, status: ExecutionStatus.PENDING },
        { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(ExecutionStatus.PENDING);
    });
  });

  describe('执行状态管理', () => {
    let testExecutionId: string;

    beforeEach(async () => {
      const execution = await ExecutionModel.create(testUserId, {
        workflowId: testWorkflowId,
        title: '测试执行'
      });
      testExecutionId = execution.id;
    });

    it('应该能暂停执行', async () => {
      const execution = await ExecutionModel.pause(testExecutionId);
      
      expect(execution.status).toBe(ExecutionStatus.PAUSED);
      expect(execution.pausedAt).toBeDefined();
    });

    it('应该能恢复执行', async () => {
      await ExecutionModel.pause(testExecutionId);
      const execution = await ExecutionModel.resume(testExecutionId);
      
      expect(execution.status).toBe(ExecutionStatus.IN_PROGRESS);
      expect(execution.resumedAt).toBeDefined();
    });

    it('应该能完成执行', async () => {
      const execution = await ExecutionModel.complete(testExecutionId);
      
      expect(execution.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution.completedAt).toBeDefined();
    });

    it('应该能取消执行', async () => {
      const execution = await ExecutionModel.cancel(testExecutionId);
      
      expect(execution.status).toBe(ExecutionStatus.CANCELLED);
      expect(execution.cancelledAt).toBeDefined();
    });
  });

  describe('步骤执行管理', () => {
    let testExecutionId: string;
    let testRecordId: string;

    beforeEach(async () => {
      const execution = await ExecutionModel.create(testUserId, {
        workflowId: testWorkflowId,
        title: '测试执行'
      });
      testExecutionId = execution.id;

      const records = await ExecutionRecordModel.findByExecutionId(testExecutionId);
      testRecordId = records[0].id;
    });

    it('应该能开始执行步骤', async () => {
      const record = await ExecutionRecordModel.start(testRecordId);
      
      expect(record.status).toBe(ExecutionRecordStatus.IN_PROGRESS);
      expect(record.startedAt).toBeDefined();
    });

    it('应该能完成执行步骤', async () => {
      await ExecutionRecordModel.start(testRecordId);
      const record = await ExecutionRecordModel.complete(testRecordId, {
        notes: '步骤完成',
        result: { success: true }
      });
      
      expect(record.status).toBe(ExecutionRecordStatus.COMPLETED);
      expect(record.completedAt).toBeDefined();
      expect(record.notes).toBe('步骤完成');
      expect(record.result).toEqual({ success: true });
    });

    it('应该能跳过执行步骤', async () => {
      const record = await ExecutionRecordModel.skip(testRecordId, '不需要执行');
      
      expect(record.status).toBe(ExecutionRecordStatus.SKIPPED);
      expect(record.skippedAt).toBeDefined();
      expect(record.skipReason).toBe('不需要执行');
    });

    it('应该能标记步骤失败', async () => {
      await ExecutionRecordModel.start(testRecordId);
      const record = await ExecutionRecordModel.fail(testRecordId, '执行失败');
      
      expect(record.status).toBe(ExecutionRecordStatus.FAILED);
      expect(record.failedAt).toBeDefined();
      expect(record.failureReason).toBe('执行失败');
    });

    it('应该检查步骤依赖', async () => {
      const records = await ExecutionRecordModel.findByExecutionId(testExecutionId);
      const step2Record = records.find(r => r.stepId === 'step2');
      
      // 步骤2依赖步骤1，步骤1未完成时不能开始
      const canStart = await ExecutionRecordModel.checkDependencies(step2Record!.id);
      expect(canStart).toBe(false);

      // 完成步骤1后，步骤2可以开始
      await ExecutionRecordModel.start(testRecordId);
      await ExecutionRecordModel.complete(testRecordId, { notes: '完成' });
      
      const canStartAfter = await ExecutionRecordModel.checkDependencies(step2Record!.id);
      expect(canStartAfter).toBe(true);
    });
  });

  describe('进度跟踪', () => {
    let testExecutionId: string;

    beforeEach(async () => {
      const execution = await ExecutionModel.create(testUserId, {
        workflowId: testWorkflowId,
        title: '测试执行'
      });
      testExecutionId = execution.id;
    });

    it('应该能更新执行进度', async () => {
      const records = await ExecutionRecordModel.findByExecutionId(testExecutionId);
      
      // 完成第一个步骤
      await ExecutionRecordModel.start(records[0].id);
      await ExecutionRecordModel.complete(records[0].id, { notes: '完成' });
      
      const progress = await ExecutionModel.updateProgress(testExecutionId);
      expect(progress).toBe(50); // 2个步骤完成1个，进度50%
    });

    it('应该能获取执行统计信息', async () => {
      const stats = await ExecutionModel.getStats(testUserId);
      
      expect(stats).toBeDefined();
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(0);
      expect(stats.completed).toBe(0);
    });

    it('应该能获取最近的执行记录', async () => {
      const executions = await ExecutionModel.getRecent(testUserId, 5);
      
      expect(executions).toHaveLength(1);
      expect(executions[0].id).toBe(testExecutionId);
    });

    it('应该能获取进行中的执行记录', async () => {
      await ExecutionModel.update(testExecutionId, { status: ExecutionStatus.IN_PROGRESS });
      
      const executions = await ExecutionModel.getInProgress(testUserId);
      
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe(ExecutionStatus.IN_PROGRESS);
    });
  });

  describe('数据验证', () => {
    it('创建执行记录时应该验证必需字段', async () => {
      await expect(
        ExecutionModel.create(testUserId, {} as any)
      ).rejects.toThrow();
    });

    it('应该验证工作流ID的有效性', async () => {
      await expect(
        ExecutionModel.create(testUserId, {
          workflowId: 'invalid-id',
          title: '测试执行'
        })
      ).rejects.toThrow();
    });

    it('应该验证优先级枚举值', async () => {
      await expect(
        ExecutionModel.create(testUserId, {
          workflowId: testWorkflowId,
          title: '测试执行',
          priority: 'INVALID' as any
        })
      ).rejects.toThrow();
    });
  });
});