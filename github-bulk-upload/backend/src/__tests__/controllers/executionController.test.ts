import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { ExecutionController } from '../../controllers/executionController';
import ExecutionModel from '../../models/Execution';
import WorkflowModel from '../../models/Workflow';
import { authenticateToken } from '../../middleware/auth';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { ExecutionStatus, ExecutionPriority } from '../../services/execution';

// Mock the models
jest.mock('../../models/Execution');
jest.mock('../../models/Workflow');
const MockExecutionModel = ExecutionModel as jest.Mocked<typeof ExecutionModel>;
const MockWorkflowModel = WorkflowModel as jest.Mocked<typeof WorkflowModel>;

// Mock auth middleware
jest.mock('../../middleware/auth');
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

const app = express();
app.use(express.json());

// Mock auth middleware to add user to request
mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
  req.user = { userId: 'test-user-id', username: 'testuser' };
  next();
});

const executionController = new ExecutionController();
app.use('/executions', authenticateToken);
app.get('/executions', executionController.getExecutions.bind(executionController));
app.post('/executions', executionController.createExecution.bind(executionController));
app.get('/executions/:id', executionController.getExecutionById.bind(executionController));
app.post('/executions/:id/pause', executionController.pauseExecution.bind(executionController));
app.post('/executions/:id/resume', executionController.resumeExecution.bind(executionController));

describe('ExecutionController', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /executions', () => {
    it('should create a new execution', async () => {
      const executionData = {
        workflowId: 'workflow-id',
        title: 'Test Execution',
        description: 'Test Description',
        priority: ExecutionPriority.MEDIUM,
        tags: ['test', 'investment']
      };

      const mockExecution = {
        id: 'execution-id',
        ...executionData,
        userId: 'test-user-id',
        status: ExecutionStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      MockWorkflowModel.checkAccess.mockResolvedValue(true);
      MockExecutionModel.create.mockResolvedValue(mockExecution);

      const response = await request(app)
        .post('/executions')
        .send(executionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockExecution);
    });

    it('should return 403 for unauthorized workflow access', async () => {
      const executionData = {
        workflowId: 'workflow-id',
        title: 'Test Execution'
      };

      MockWorkflowModel.checkAccess.mockResolvedValue(false);

      const response = await request(app)
        .post('/executions')
        .send(executionData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('GET /executions', () => {
    it('should get executions with pagination', async () => {
      const mockExecutions = [
        {
          id: '1',
          title: 'Execution 1',
          status: ExecutionStatus.IN_PROGRESS,
          userId: 'test-user-id'
        },
        {
          id: '2',
          title: 'Execution 2',
          status: ExecutionStatus.COMPLETED,
          userId: 'test-user-id'
        }
      ];

      const mockResult = {
        data: mockExecutions,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      MockExecutionModel.findMany.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/executions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockExecutions);
    });
  });

  describe('POST /executions/:id/pause', () => {
    it('should pause execution', async () => {
      const mockExecution = {
        id: 'execution-id',
        userId: 'test-user-id',
        status: ExecutionStatus.PAUSED
      };

      MockExecutionModel.findById.mockResolvedValue({
        id: 'execution-id',
        userId: 'test-user-id',
        status: ExecutionStatus.IN_PROGRESS
      });
      MockExecutionModel.pause.mockResolvedValue(mockExecution);

      const response = await request(app)
        .post('/executions/execution-id/pause')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockExecution);
    });
  });
});