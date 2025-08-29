import { Request, Response, NextFunction } from 'express';
import { checkWorkflowAccess, checkExecutionAccess, requireRole } from '../../middleware/permissions';
import WorkflowModel from '../../models/Workflow';
import ExecutionModel from '../../models/Execution';

// Mock the models
jest.mock('../../models/Workflow');
jest.mock('../../models/Execution');

const mockWorkflowModel = WorkflowModel as jest.Mocked<typeof WorkflowModel>;
const mockExecutionModel = ExecutionModel as jest.Mocked<typeof ExecutionModel>;

describe('Permissions Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: 'user123',
        email: 'test@example.com',
        role: 'USER'
      },
      params: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('checkWorkflowAccess', () => {
    it('应该允许访问用户拥有的工作流', async () => {
      mockRequest.params = { workflowId: 'workflow123' };
      mockWorkflowModel.checkAccess.mockResolvedValue(true);

      await checkWorkflowAccess(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockWorkflowModel.checkAccess).toHaveBeenCalledWith('workflow123', 'user123');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该拒绝访问用户不拥有的工作流', async () => {
      mockRequest.params = { workflowId: 'workflow123' };
      mockWorkflowModel.checkAccess.mockResolvedValue(false);

      await checkWorkflowAccess(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockWorkflowModel.checkAccess).toHaveBeenCalledWith('workflow123', 'user123');
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '无权限访问该工作流'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理未认证用户', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { workflowId: 'workflow123' };

      await checkWorkflowAccess(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '用户未认证'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理缺少工作流ID的情况', async () => {
      mockRequest.params = {};

      await checkWorkflowAccess(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少工作流ID'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      mockRequest.params = { workflowId: 'workflow123' };
      mockWorkflowModel.checkAccess.mockRejectedValue(new Error('Database error'));

      await checkWorkflowAccess(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '检查权限时发生错误'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('checkExecutionAccess', () => {
    it('应该允许访问用户拥有的执行记录', async () => {
      mockRequest.params = { executionId: 'execution123' };
      const mockExecution = {
        id: 'execution123',
        userId: 'user123',
        workflowId: 'workflow123'
      };
      mockExecutionModel.findById.mockResolvedValue(mockExecution as any);

      await checkExecutionAccess(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockExecutionModel.findById).toHaveBeenCalledWith('execution123', false);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该拒绝访问其他用户的执行记录', async () => {
      mockRequest.params = { executionId: 'execution123' };
      const mockExecution = {
        id: 'execution123',
        userId: 'otheruser',
        workflowId: 'workflow123'
      };
      mockExecutionModel.findById.mockResolvedValue(mockExecution as any);

      await checkExecutionAccess(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: '无权限访问该执行记录'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理不存在的执行记录', async () => {
      mockRequest.params = { executionId: 'execution123' };
      mockExecutionModel.findById.mockResolvedValue(null);

      await checkExecutionAccess(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND_ERROR',
          message: '执行记录不存在'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('应该允许具有正确角色的用户访问', () => {
      mockRequest.user = {
        userId: 'user123',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      const middleware = requireRole('ADMIN');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该拒绝角色不足的用户访问', () => {
      mockRequest.user = {
        userId: 'user123',
        email: 'user@example.com',
        role: 'USER'
      };

      const middleware = requireRole('ADMIN');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '权限不足'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该处理未认证用户', () => {
      mockRequest.user = undefined;

      const middleware = requireRole('USER');
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '用户未认证'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该支持多个角色', () => {
      mockRequest.user = {
        userId: 'user123',
        email: 'moderator@example.com',
        role: 'MODERATOR'
      };

      const middleware = requireRole(['ADMIN', 'MODERATOR']);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('应该拒绝不在允许角色列表中的用户', () => {
      mockRequest.user = {
        userId: 'user123',
        email: 'user@example.com',
        role: 'USER'
      };

      const middleware = requireRole(['ADMIN', 'MODERATOR']);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '权限不足'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});