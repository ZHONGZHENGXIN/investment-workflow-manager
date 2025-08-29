import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { WorkflowController } from '../../controllers/workflowController';
import WorkflowModel from '../../models/Workflow';
import { authenticateToken } from '../../middleware/auth';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';

// Mock the workflow model
jest.mock('../../models/Workflow');
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

const workflowController = new WorkflowController();
app.use('/workflows', authenticateToken);
app.get('/workflows', workflowController.getWorkflows.bind(workflowController));
app.post('/workflows', workflowController.createWorkflow.bind(workflowController));
app.get('/workflows/:id', workflowController.getWorkflowById.bind(workflowController));
app.put('/workflows/:id', workflowController.updateWorkflow.bind(workflowController));
app.delete('/workflows/:id', workflowController.deleteWorkflow.bind(workflowController));

describe('WorkflowController', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /workflows', () => {
    it('should get workflows with pagination', async () => {
      const mockWorkflows = [
        {
          id: '1',
          title: 'Test Workflow 1',
          description: 'Test Description 1',
          userId: 'test-user-id',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Test Workflow 2',
          description: 'Test Description 2',
          userId: 'test-user-id',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockResult = {
        data: mockWorkflows,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      MockWorkflowModel.findMany.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/workflows')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockWorkflows);
      expect(response.body.pagination).toEqual(mockResult.pagination);
    });
  });

  describe('POST /workflows', () => {
    it('should create a new workflow', async () => {
      const workflowData = {
        title: 'New Workflow',
        description: 'New Description',
        category: 'investment',
        steps: [
          {
            id: 'step1',
            title: 'Step 1',
            description: 'First step',
            type: 'MANUAL',
            order: 1,
            isRequired: true,
            estimatedDuration: 30,
            dependencies: []
          }
        ]
      };

      const mockWorkflow = {
        id: 'new-workflow-id',
        ...workflowData,
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      MockWorkflowModel.create.mockResolvedValue(mockWorkflow);

      const response = await request(app)
        .post('/workflows')
        .send(workflowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockWorkflow);
    });
  });

  describe('GET /workflows/:id', () => {
    it('should get workflow by id', async () => {
      const mockWorkflow = {
        id: 'workflow-id',
        title: 'Test Workflow',
        description: 'Test Description',
        userId: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      MockWorkflowModel.findById.mockResolvedValue(mockWorkflow);
      MockWorkflowModel.checkAccess.mockResolvedValue(true);

      const response = await request(app)
        .get('/workflows/workflow-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockWorkflow);
    });

    it('should return 404 for non-existent workflow', async () => {
      MockWorkflowModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/workflows/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });
  });
});