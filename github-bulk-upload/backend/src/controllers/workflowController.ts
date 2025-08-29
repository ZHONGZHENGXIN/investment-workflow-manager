import { Request, Response } from 'express';
import WorkflowModel, { WorkflowStepModel } from '../models/Workflow';
import { 
  CreateWorkflowInput, 
  UpdateWorkflowInput,
  CreateWorkflowStepInput,
  UpdateWorkflowStepInput,
  WorkflowFilter,
  PaginationParams,
  ApiResponse 
} from '../types/models';
import { validateWorkflow, validateWorkflowStep } from '../utils/validation';

export class WorkflowController {
  // 创建工作流
  async createWorkflow(req: Request, res: Response): Promise<void> {
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

      // 验证请求数据
      const validationResult = validateWorkflow(req.body);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: validationResult.errors
          }
        });
        return;
      }

      // 创建工作流
      const workflow = await WorkflowModel.create(req.user.userId, validationResult.data);

      res.status(201).json({
        success: true,
        data: workflow,
        message: '工作流创建成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建工作流失败';
      
      res.status(400).json({
        success: false,
        error: {
          code: 'WORKFLOW_CREATION_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取工作流列表（支持分页和过滤）
  async getWorkflows(req: Request, res: Response): Promise<void> {
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

      // 解析查询参数
      const {
        page = 1,
        limit = 10,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        search,
        category,
        status,
        isTemplate,
        tags
      } = req.query;

      const filter: WorkflowFilter = {
        userId: req.user.userId,
        search: search as string,
        category: category as string,
        status: status as any,
        isTemplate: isTemplate === 'true',
        tags: tags ? (tags as string).split(',') : undefined,
      };

      const pagination: PaginationParams = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await WorkflowModel.findMany(filter, pagination);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: '获取工作流列表成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取工作流列表失败'
        }
      });
    }
  }

  // 根据ID获取工作流
  async getWorkflowById(req: Request, res: Response): Promise<void> {
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
      
      // 检查访问权限
      const hasAccess = await WorkflowModel.checkAccess(id, req.user.userId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限访问该工作流'
          }
        });
        return;
      }

      const workflow = await WorkflowModel.findById(id);

      if (!workflow) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: '工作流不存在'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: workflow,
        message: '获取工作流详情成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取工作流详情失败'
        }
      });
    }
  }

  // 更新工作流
  async updateWorkflow(req: Request, res: Response): Promise<void> {
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

      // 检查工作流是否存在且用户有权限
      const existingWorkflow = await WorkflowModel.findById(id, false);
      if (!existingWorkflow) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: '工作流不存在'
          }
        });
        return;
      }

      if (existingWorkflow.userId !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限修改该工作流'
          }
        });
        return;
      }

      // 验证更新数据
      const validationResult = validateWorkflow(req.body, true);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: validationResult.errors
          }
        });
        return;
      }

      const workflow = await WorkflowModel.update(id, validationResult.data);

      res.status(200).json({
        success: true,
        data: workflow,
        message: '工作流更新成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新工作流失败';
      
      res.status(400).json({
        success: false,
        error: {
          code: 'WORKFLOW_UPDATE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 删除工作流
  async deleteWorkflow(req: Request, res: Response): Promise<void> {
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

      // 检查工作流是否存在且用户有权限
      const existingWorkflow = await WorkflowModel.findById(id, false);
      if (!existingWorkflow) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND_ERROR',
            message: '工作流不存在'
          }
        });
        return;
      }

      if (existingWorkflow.userId !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限删除该工作流'
          }
        });
        return;
      }

      // 检查是否有正在进行的执行
      // 这里可以添加检查逻辑，防止删除正在使用的工作流

      await WorkflowModel.delete(id);

      res.status(200).json({
        success: true,
        message: '工作流删除成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除工作流失败';
      
      res.status(400).json({
        success: false,
        error: {
          code: 'WORKFLOW_DELETE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 复制工作流
  async duplicateWorkflow(req: Request, res: Response): Promise<void> {
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
      const { name } = req.body;

      // 检查访问权限
      const hasAccess = await WorkflowModel.checkAccess(id, req.user.userId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限访问该工作流'
          }
        });
        return;
      }

      const workflow = await WorkflowModel.duplicate(id, req.user.userId, name);

      res.status(201).json({
        success: true,
        data: workflow,
        message: '工作流复制成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '复制工作流失败';
      const statusCode = errorMessage.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'WORKFLOW_DUPLICATE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取工作流统计信息
  async getWorkflowStats(req: Request, res: Response): Promise<void> {
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

      const stats = await WorkflowModel.getStats(req.user.userId);

      res.status(200).json({
        success: true,
        data: stats,
        message: '获取工作流统计成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取工作流统计失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'WORKFLOW_STATS_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 搜索工作流
  async searchWorkflows(req: Request, res: Response): Promise<void> {
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

      const { q: query, limit = 10 } = req.query;

      if (!query) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '搜索关键词不能为空'
          }
        });
        return;
      }

      const workflows = await WorkflowModel.search(
        query as string, 
        req.user.userId, 
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: workflows,
        message: '搜索工作流成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: '搜索工作流失败'
        }
      });
    }
  }

  // 获取工作流模板
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        category,
        search
      } = req.query;

      const filter: Omit<WorkflowFilter, 'isTemplate'> = {
        category: category as string,
        search: search as string,
        status: 'ACTIVE',
        isActive: true,
      };

      const pagination: PaginationParams = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await WorkflowModel.findTemplates(filter, pagination);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: '获取工作流模板成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取工作流模板失败'
        }
      });
    }
  }

  // 获取分类列表
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await WorkflowModel.getCategories();

      res.status(200).json({
        success: true,
        data: categories,
        message: '获取分类列表成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取分类列表失败'
        }
      });
    }
  }

  // 获取标签列表
  async getTags(req: Request, res: Response): Promise<void> {
    try {
      const tags = await WorkflowModel.getTags();

      res.status(200).json({
        success: true,
        data: tags,
        message: '获取标签列表成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取标签列表失败'
        }
      });
    }
  }

  // 工作流步骤管理
  
  // 获取工作流步骤
  async getWorkflowSteps(req: Request, res: Response): Promise<void> {
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

      const { workflowId } = req.params;

      // 检查访问权限
      const hasAccess = await WorkflowModel.checkAccess(workflowId, req.user.userId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限访问该工作流'
          }
        });
        return;
      }

      const steps = await WorkflowStepModel.findByWorkflowId(workflowId);

      res.status(200).json({
        success: true,
        data: steps,
        message: '获取工作流步骤成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取工作流步骤失败'
        }
      });
    }
  }

  // 创建工作流步骤
  async createWorkflowStep(req: Request, res: Response): Promise<void> {
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

      const { workflowId } = req.params;

      // 检查工作流权限
      const workflow = await WorkflowModel.findById(workflowId, false);
      if (!workflow || workflow.userId !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限修改该工作流'
          }
        });
        return;
      }

      // 验证步骤数据
      const validationResult = validateWorkflowStep(req.body);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: validationResult.errors
          }
        });
        return;
      }

      const step = await WorkflowStepModel.create(workflowId, validationResult.data);

      res.status(201).json({
        success: true,
        data: step,
        message: '创建工作流步骤成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建工作流步骤失败';
      
      res.status(400).json({
        success: false,
        error: {
          code: 'STEP_CREATION_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 更新工作流步骤
  async updateWorkflowStep(req: Request, res: Response): Promise<void> {
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

      const { workflowId, stepId } = req.params;

      // 检查工作流权限
      const workflow = await WorkflowModel.findById(workflowId, false);
      if (!workflow || workflow.userId !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限修改该工作流'
          }
        });
        return;
      }

      // 验证步骤数据
      const validationResult = validateWorkflowStep(req.body, true);
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: validationResult.errors
          }
        });
        return;
      }

      const step = await WorkflowStepModel.update(stepId, validationResult.data);

      res.status(200).json({
        success: true,
        data: step,
        message: '更新工作流步骤成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新工作流步骤失败';
      
      res.status(400).json({
        success: false,
        error: {
          code: 'STEP_UPDATE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 删除工作流步骤
  async deleteWorkflowStep(req: Request, res: Response): Promise<void> {
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

      const { workflowId, stepId } = req.params;

      // 检查工作流权限
      const workflow = await WorkflowModel.findById(workflowId, false);
      if (!workflow || workflow.userId !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限修改该工作流'
          }
        });
        return;
      }

      await WorkflowStepModel.delete(stepId);

      res.status(200).json({
        success: true,
        message: '删除工作流步骤成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除工作流步骤失败';
      
      res.status(400).json({
        success: false,
        error: {
          code: 'STEP_DELETE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 重新排序工作流步骤
  async reorderWorkflowSteps(req: Request, res: Response): Promise<void> {
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

      const { workflowId } = req.params;
      const { stepOrders } = req.body;

      // 检查工作流权限
      const workflow = await WorkflowModel.findById(workflowId, false);
      if (!workflow || workflow.userId !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权限修改该工作流'
          }
        });
        return;
      }

      if (!Array.isArray(stepOrders)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'stepOrders必须是数组'
          }
        });
        return;
      }

      await WorkflowStepModel.reorder(workflowId, stepOrders);

      res.status(200).json({
        success: true,
        message: '重新排序工作流步骤成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重新排序工作流步骤失败';
      
      res.status(400).json({
        success: false,
        error: {
          code: 'STEP_REORDER_ERROR',
          message: errorMessage
        }
      });
    }
  }
}