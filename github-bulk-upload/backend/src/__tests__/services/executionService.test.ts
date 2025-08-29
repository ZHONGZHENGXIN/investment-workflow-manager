import { ExecutionService } from '../../services/executionService';
import prisma from '../../utils/database';
import { ExecutionStatus, StepStatus } from '../../types/execution';
import { businessMetricsTracking } from '../../middleware/monitoring';
import { businessLogger, auditLogger } from '../../utils/logger.simple';

// Mock dependencies
jest.mock('../../utils/database', () => ({
  __esModule: true,
  default: {
    workflow: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    execution: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn()
    },
    executionRecord: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock('../../middleware/monitoring');
jest.mock('../../utils/logger');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBusinessMetrics = businessMetricsTracking as jest.Mocked<typeof businessMetricsTracking>;
const mockBusinessLogger = businessLogger as jest.Mocked<typeof businessLogger>;
const mockAuditLogger = auditLogger as jest.Mocked<typeof auditLogger>;

describe('ExecutionService', () => {
  let executionService: ExecutionService;

  beforeEach(() => {
    executionService = new ExecutionService();
    jest.clearAllMocks();
  });

  describe('startExecution', () => {
    it('should start execution successfully', async () => {
      const userId = 'user123';
      const workflowId = 'workflow123';

      const mockWorkflow = {
        id: workflowId,
        name: 'Test Workflow',
        userId,
        isActive: true,
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            order: 1,
            isRequired: true
          },
          {
            id: 'step2',
            name: 'Step 2',
            order: 2,
            isRequired: false
          }
        ]
      };

      const mockExecution = {
        id: 'execution123',
        userId,
        workflowId,
        status: ExecutionStatus.IN_PROGRESS,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockExecutionRecords = [
        {
          id: 'record1',
          executionId: 'execution123',
          stepId: 'step1',
          status: StepStatus.PENDING,
          createdAt: new Date()
        },
        {
          id: 'record2',
          executionId: 'execution123',
          stepId: 'step2',
          status: StepStatus.PENDING,
          createdAt: new Date()
        }
      ];

      mockPrisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.execution.create.mockResolvedValue(mockExecution);
      mockPrisma.executionRecord.create
        .mockResolvedValueOnce(mockExecutionRecords[0])
        .mockResolvedValueOnce(mockExecutionRecords[1]);

      const result = await executionService.startExecution(userId, workflowId);

      expect(mockPrisma.workflow.findFirst).toHaveBeenCalledWith({
        where: {
          id: workflowId,
          userId,
          isActive: true
        },
        include: {
          steps: {
            orderBy: { order: 'asc' }
          }
        }
      });

      expect(mockPrisma.execution.create).toHaveBeenCalledWith({
        data: {
          userId,
          workflowId,
          status: ExecutionStatus.IN_PROGRESS
        }
      });

      expect(mockPrisma.executionRecord.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        ...mockExecution,
        executionRecords: mockExecutionRecords
      });
    });

    it('should throw error for non-existent workflow', async () => {
      const userId = 'user123';
      const workflowId = 'nonexistent';

      mockPrisma.workflow.findFirst.mockResolvedValue(null);

      await expect(executionService.startExecution(userId, workflowId))
        .rejects.toThrow('工作流不存在或已禁用');

      expect(mockPrisma.execution.create).not.toHaveBeenCalled();
    });

    it('should throw error for workflow without steps', async () => {
      const userId = 'user123';
      const workflowId = 'workflow123';

      const mockWorkflow = {
        id: workflowId,
        name: 'Empty Workflow',
        userId,
        isActive: true,
        steps: []
      };

      mockPrisma.workflow.findFirst.mockResolvedValue(mockWorkflow);

      await expect(executionService.startExecution(userId, workflowId))
        .rejects.toThrow('工作流没有定义步骤');
    });

    it('should throw error for inactive workflow', async () => {
      const userId = 'user123';
      const workflowId = 'workflow123';

      mockPrisma.workflow.findFirst.mockResolvedValue(null);

      await expect(executionService.startExecution(userId, workflowId))
        .rejects.toThrow('工作流不存在或已禁用');
    });
  });

  describe('getExecutionById', () => {
    it('should get execution by id successfully', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        workflowId: 'workflow123',
        status: ExecutionStatus.IN_PROGRESS,
        workflow: {
          id: 'workflow123',
          name: 'Test Workflow',
          steps: [
            { id: 'step1', name: 'Step 1', order: 1 }
          ]
        },
        executionRecords: [
          {
            id: 'record1',
            executionId,
            stepId: 'step1',
            status: StepStatus.PENDING,
            step: { id: 'step1', name: 'Step 1' },
            attachments: []
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.execution.findFirst.mockResolvedValue(mockExecution);

      const result = await executionService.getExecutionById(executionId, userId);

      expect(mockPrisma.execution.findFirst).toHaveBeenCalledWith({
        where: {
          id: executionId,
          userId
        },
        include: {
          workflow: {
            include: {
              steps: {
                orderBy: { order: 'asc' }
              }
            }
          },
          executionRecords: {
            include: {
              step: true,
              attachments: true
            },
            orderBy: {
              step: {
                order: 'asc'
              }
            }
          }
        }
      });

      expect(result).toEqual(mockExecution);
    });

    it('should return null for non-existent execution', async () => {
      const executionId = 'nonexistent';
      const userId = 'user123';

      mockPrisma.execution.findFirst.mockResolvedValue(null);

      const result = await executionService.getExecutionById(executionId, userId);

      expect(result).toBeNull();
    });
  });

  describe('getUserExecutions', () => {
    it('should get user executions successfully', async () => {
      const userId = 'user123';

      const mockExecutions = [
        {
          id: 'execution1',
          userId,
          workflowId: 'workflow1',
          status: ExecutionStatus.IN_PROGRESS,
          workflow: { id: 'workflow1', name: 'Workflow 1' },
          executionRecords: [],
          startedAt: new Date('2023-01-02'),
          createdAt: new Date('2023-01-02')
        },
        {
          id: 'execution2',
          userId,
          workflowId: 'workflow2',
          status: ExecutionStatus.COMPLETED,
          workflow: { id: 'workflow2', name: 'Workflow 2' },
          executionRecords: [],
          startedAt: new Date('2023-01-01'),
          createdAt: new Date('2023-01-01')
        }
      ];

      mockPrisma.execution.findMany.mockResolvedValue(mockExecutions);

      const result = await executionService.getUserExecutions(userId);

      expect(mockPrisma.execution.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          workflow: true,
          executionRecords: {
            include: {
              step: true
            }
          }
        },
        orderBy: { startedAt: 'desc' }
      });

      expect(result).toEqual(mockExecutions);
    });

    it('should filter by status when provided', async () => {
      const userId = 'user123';
      const status = ExecutionStatus.COMPLETED;

      mockPrisma.execution.findMany.mockResolvedValue([]);

      await executionService.getUserExecutions(userId, status);

      expect(mockPrisma.execution.findMany).toHaveBeenCalledWith({
        where: { userId, status },
        include: {
          workflow: true,
          executionRecords: {
            include: {
              step: true
            }
          }
        },
        orderBy: { startedAt: 'desc' }
      });
    });
  });

  describe('updateStepStatus', () => {
    it('should update step status successfully', async () => {
      const executionId = 'execution123';
      const stepId = 'step1';
      const userId = 'user123';
      const updateData = {
        status: StepStatus.COMPLETED,
        notes: 'Step completed successfully',
        data: { result: 'success' }
      };

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.IN_PROGRESS
      };

      const mockExecutionRecord = {
        id: 'record1',
        executionId,
        stepId,
        status: StepStatus.PENDING,
        completedAt: null,
        step: { id: stepId, name: 'Step 1' }
      };

      const mockUpdatedRecord = {
        ...mockExecutionRecord,
        ...updateData,
        completedAt: new Date(),
        step: { id: stepId, name: 'Step 1' },
        attachments: []
      };

      mockPrisma.execution.findFirst.mockResolvedValue(mockExecution);
      mockPrisma.executionRecord.findFirst.mockResolvedValue(mockExecutionRecord);
      mockPrisma.executionRecord.update.mockResolvedValue(mockUpdatedRecord);

      // Mock the private method call
      const checkAndUpdateSpy = jest.spyOn(executionService as any, 'checkAndUpdateExecutionStatus')
        .mockResolvedValue(undefined);

      const result = await executionService.updateStepStatus(executionId, stepId, userId, updateData);

      expect(mockPrisma.execution.findFirst).toHaveBeenCalledWith({
        where: { id: executionId, userId }
      });

      expect(mockPrisma.executionRecord.findFirst).toHaveBeenCalledWith({
        where: { executionId, stepId },
        include: { step: true }
      });

      expect(mockPrisma.executionRecord.update).toHaveBeenCalledWith({
        where: { id: mockExecutionRecord.id },
        data: {
          ...updateData,
          completedAt: expect.any(Date)
        },
        include: {
          step: true,
          attachments: true
        }
      });

      expect(checkAndUpdateSpy).toHaveBeenCalledWith(executionId);
      expect(result).toEqual(mockUpdatedRecord);

      checkAndUpdateSpy.mockRestore();
    });

    it('should throw error for unauthorized access', async () => {
      const executionId = 'execution123';
      const stepId = 'step1';
      const userId = 'user123';
      const updateData = { status: StepStatus.COMPLETED };

      mockPrisma.execution.findFirst.mockResolvedValue(null);

      await expect(executionService.updateStepStatus(executionId, stepId, userId, updateData))
        .rejects.toThrow('执行记录不存在或无权限访问');
    });

    it('should throw error for non-existent step record', async () => {
      const executionId = 'execution123';
      const stepId = 'step1';
      const userId = 'user123';
      const updateData = { status: StepStatus.COMPLETED };

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.IN_PROGRESS
      };

      mockPrisma.execution.findFirst.mockResolvedValue(mockExecution);
      mockPrisma.executionRecord.findFirst.mockResolvedValue(null);

      await expect(executionService.updateStepStatus(executionId, stepId, userId, updateData))
        .rejects.toThrow('步骤记录不存在');
    });
  });

  describe('pauseExecution', () => {
    it('should pause execution successfully', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.IN_PROGRESS,
        workflow: { id: 'workflow1' },
        executionRecords: []
      };

      const mockUpdatedExecution = {
        ...mockExecution,
        status: ExecutionStatus.PAUSED,
        updatedAt: new Date()
      };

      // Mock getExecutionById
      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(mockExecution);
      mockPrisma.execution.update.mockResolvedValue(mockUpdatedExecution);

      const result = await executionService.pauseExecution(executionId, userId);

      expect(mockPrisma.execution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: { status: ExecutionStatus.PAUSED }
      });

      expect(result).toEqual(mockUpdatedExecution);
    });

    it('should throw error for non-existent execution', async () => {
      const executionId = 'nonexistent';
      const userId = 'user123';

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(null);

      await expect(executionService.pauseExecution(executionId, userId))
        .rejects.toThrow('执行记录不存在或无权限访问');
    });

    it('should throw error for non-in-progress execution', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.COMPLETED,
        workflow: { id: 'workflow1' },
        executionRecords: []
      };

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(mockExecution);

      await expect(executionService.pauseExecution(executionId, userId))
        .rejects.toThrow('只能暂停进行中的执行');
    });
  });

  describe('resumeExecution', () => {
    it('should resume execution successfully', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.PAUSED,
        workflow: { id: 'workflow1' },
        executionRecords: []
      };

      const mockUpdatedExecution = {
        ...mockExecution,
        status: ExecutionStatus.IN_PROGRESS,
        updatedAt: new Date()
      };

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(mockExecution);
      mockPrisma.execution.update.mockResolvedValue(mockUpdatedExecution);

      const result = await executionService.resumeExecution(executionId, userId);

      expect(mockPrisma.execution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: { status: ExecutionStatus.IN_PROGRESS }
      });

      expect(result).toEqual(mockUpdatedExecution);
    });

    it('should throw error for non-paused execution', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.IN_PROGRESS,
        workflow: { id: 'workflow1' },
        executionRecords: []
      };

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(mockExecution);

      await expect(executionService.resumeExecution(executionId, userId))
        .rejects.toThrow('只能恢复已暂停的执行');
    });
  });

  describe('completeExecution', () => {
    it('should complete execution successfully', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.IN_PROGRESS,
        workflow: { id: 'workflow1' },
        executionRecords: [
          {
            id: 'record1',
            status: StepStatus.COMPLETED,
            step: { id: 'step1', isRequired: true }
          }
        ]
      };

      const mockUpdatedExecution = {
        ...mockExecution,
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(mockExecution);
      mockPrisma.execution.update.mockResolvedValue(mockUpdatedExecution);

      const result = await executionService.completeExecution(executionId, userId);

      expect(mockPrisma.execution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.COMPLETED,
          completedAt: expect.any(Date)
        }
      });

      expect(result).toEqual(mockUpdatedExecution);
    });

    it('should throw error for already completed execution', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.COMPLETED,
        workflow: { id: 'workflow1' },
        executionRecords: []
      };

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(mockExecution);

      await expect(executionService.completeExecution(executionId, userId))
        .rejects.toThrow('执行已经完成');
    });

    it('should throw error for incomplete required steps', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.IN_PROGRESS,
        workflow: { id: 'workflow1' },
        executionRecords: [
          {
            id: 'record1',
            status: StepStatus.PENDING,
            step: { id: 'step1', isRequired: true }
          },
          {
            id: 'record2',
            status: StepStatus.PENDING,
            step: { id: 'step2', isRequired: true }
          }
        ]
      };

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(mockExecution);

      await expect(executionService.completeExecution(executionId, userId))
        .rejects.toThrow('还有 2 个必需步骤未完成');
    });
  });

  describe('getExecutionStats', () => {
    it('should get execution statistics successfully', async () => {
      const userId = 'user123';

      const mockStatusStats = [
        { status: ExecutionStatus.COMPLETED, _count: { status: 10 } },
        { status: ExecutionStatus.IN_PROGRESS, _count: { status: 5 } },
        { status: ExecutionStatus.PAUSED, _count: { status: 2 } }
      ];

      mockPrisma.execution.count.mockResolvedValueOnce(17); // total
      mockPrisma.execution.groupBy.mockResolvedValue(mockStatusStats);
      mockPrisma.execution.count.mockResolvedValueOnce(10); // completed
      mockPrisma.execution.aggregate.mockResolvedValue({});

      const result = await executionService.getExecutionStats(userId);

      expect(result).toEqual({
        totalExecutions: 17,
        completedExecutions: 10,
        statusBreakdown: {
          [ExecutionStatus.COMPLETED]: 10,
          [ExecutionStatus.IN_PROGRESS]: 5,
          [ExecutionStatus.PAUSED]: 2
        },
        completionRate: (10 / 17) * 100
      });
    });

    it('should handle zero executions', async () => {
      const userId = 'user123';

      mockPrisma.execution.count.mockResolvedValueOnce(0); // total
      mockPrisma.execution.groupBy.mockResolvedValue([]);
      mockPrisma.execution.count.mockResolvedValueOnce(0); // completed
      mockPrisma.execution.aggregate.mockResolvedValue({});

      const result = await executionService.getExecutionStats(userId);

      expect(result.completionRate).toBe(0);
    });
  });

  describe('deleteExecution', () => {
    it('should delete execution successfully', async () => {
      const executionId = 'execution123';
      const userId = 'user123';

      const mockExecution = {
        id: executionId,
        userId,
        status: ExecutionStatus.COMPLETED,
        workflow: { id: 'workflow1' },
        executionRecords: [
          {
            id: 'record1',
            attachments: []
          }
        ]
      };

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(mockExecution);
      mockPrisma.execution.delete.mockResolvedValue(mockExecution);

      await executionService.deleteExecution(executionId, userId);

      expect(mockPrisma.execution.delete).toHaveBeenCalledWith({
        where: { id: executionId }
      });
    });

    it('should throw error for non-existent execution', async () => {
      const executionId = 'nonexistent';
      const userId = 'user123';

      jest.spyOn(executionService, 'getExecutionById').mockResolvedValue(null);

      await expect(executionService.deleteExecution(executionId, userId))
        .rejects.toThrow('执行记录不存在或无权限访问');
    });
  });
});