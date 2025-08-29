import { Request, Response } from 'express';
import { ExecutionService } from '../services/executionService';
import { StepStatus } from '../types/execution';

const executionService = new ExecutionService();

export class ExecutionController {
  // 开始新的流程执行
  async startExecution(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { workflowId } = req.body;

      if (!workflowId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '工作流ID是必填项'
          }
        });
        return;
      }

      const execution = await executionService.startExecution(req.user.userId, workflowId);

      res.status(201).json({
        success: true,
        data: { execution },
        message: '流程执行开始成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '开始执行失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('禁用') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'EXECUTION_START_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取执行详情
  async getExecutionById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { id } = req.params;
      const execution = await executionService.getExecutionById(id, req.user.userId);

      if (!execution) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: '执行记录不存在'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { execution },
        message: '获取执行详情成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取执行详情失败'
        }
      });
    }
  }

  // 获取用户的执行列表
  async getUserExecutions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { status } = req.query;
      const executions = await executionService.getUserExecutions(
        req.user.userId,
        status as any
      );

      res.status(200).json({
        success: true,
        data: { executions },
        message: '获取执行列表成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取执行列表失败'
        }
      });
    }
  }

  // 更新步骤状态
  async updateStepStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { executionId, stepId } = req.params;
      const { status, notes, data } = req.body;

      // 验证状态值
      if (status && !Object.values(StepStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的步骤状态'
          }
        });
        return;
      }

      const executionRecord = await executionService.updateStepStatus(
        executionId,
        stepId,
        req.user.userId,
        { status, notes, data }
      );

      res.status(200).json({
        success: true,
        data: { executionRecord },
        message: '步骤状态更新成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新步骤状态失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'STEP_UPDATE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 暂停执行
  async pauseExecution(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { id } = req.params;
      const execution = await executionService.pauseExecution(id, req.user.userId);

      res.status(200).json({
        success: true,
        data: { execution },
        message: '执行已暂停'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '暂停执行失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'EXECUTION_PAUSE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 恢复执行
  async resumeExecution(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { id } = req.params;
      const execution = await executionService.resumeExecution(id, req.user.userId);

      res.status(200).json({
        success: true,
        data: { execution },
        message: '执行已恢复'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '恢复执行失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'EXECUTION_RESUME_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 完成执行
  async completeExecution(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { id } = req.params;
      const execution = await executionService.completeExecution(id, req.user.userId);

      res.status(200).json({
        success: true,
        data: { execution },
        message: '执行已完成'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '完成执行失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'EXECUTION_COMPLETE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 添加复盘内容
  async addReview(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { id } = req.params;
      const { reviewNotes } = req.body;

      if (!reviewNotes || reviewNotes.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '复盘内容不能为空'
          }
        });
        return;
      }

      const execution = await executionService.addReview(id, req.user.userId, reviewNotes);

      res.status(200).json({
        success: true,
        data: { execution },
        message: '复盘内容添加成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加复盘内容失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'REVIEW_ADD_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 添加步骤复盘
  async addStepReview(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { executionId, stepId } = req.params;
      const { reviewNotes } = req.body;

      if (!reviewNotes || reviewNotes.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '复盘内容不能为空'
          }
        });
        return;
      }

      const executionRecord = await executionService.addStepReview(
        executionId,
        stepId,
        req.user.userId,
        reviewNotes
      );

      res.status(200).json({
        success: true,
        data: { executionRecord },
        message: '步骤复盘添加成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加步骤复盘失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'STEP_REVIEW_ADD_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取执行统计
  async getExecutionStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const stats = await executionService.getExecutionStats(req.user.userId);

      res.status(200).json({
        success: true,
        data: { stats },
        message: '获取执行统计成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: '获取执行统计失败'
        }
      });
    }
  }

  // 删除执行记录
  async deleteExecution(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: '用户未认证'
          }
        });
        return;
      }

      const { id } = req.params;
      await executionService.deleteExecution(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: '执行记录删除成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除执行记录失败';
      const statusCode = errorMessage.includes('不存在') || errorMessage.includes('无权限') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'EXECUTION_DELETE_ERROR',
          message: errorMessage
        }
      });
    }
  }
}