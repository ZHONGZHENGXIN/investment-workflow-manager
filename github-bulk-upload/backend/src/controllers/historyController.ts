import { Request, Response } from 'express';
import { HistoryService, HistorySearchFilters, PaginationOptions } from '../services/historyService';
import prisma from '../config/database';

const historyService = new HistoryService();

export class HistoryController {
  // 获取执行历史列表
  async getExecutionHistory(req: Request, res: Response): Promise<void> {
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

      const {
        page = 1,
        limit = 20,
        sortBy = 'startedAt',
        sortOrder = 'desc',
        workflowId,
        status,
        startDate,
        endDate,
        hasReview,
        searchTerm
      } = req.query;

      const filters: HistorySearchFilters = {};
      if (workflowId) filters.workflowId = workflowId as string;
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (hasReview !== undefined) filters.hasReview = hasReview === 'true';
      if (searchTerm) filters.searchTerm = searchTerm as string;

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await historyService.getExecutionHistory(
        req.user.userId,
        filters,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result,
        message: '获取执行历史成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取执行历史失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'HISTORY_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 高级搜索
  async advancedSearch(req: Request, res: Response): Promise<void> {
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

      const {
        page = 1,
        limit = 20,
        sortBy = 'startedAt',
        sortOrder = 'desc'
      } = req.query;

      const searchOptions = req.body;

      const pagination: PaginationOptions = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await historyService.advancedSearch(
        req.user.userId,
        searchOptions,
        pagination
      );

      res.status(200).json({
        success: true,
        data: result,
        message: '高级搜索成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '高级搜索失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取历史统计
  async getHistoryStats(req: Request, res: Response): Promise<void> {
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

      const stats = await historyService.getHistoryStats(req.user.userId);

      res.status(200).json({
        success: true,
        data: { stats },
        message: '获取历史统计成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取历史统计失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 获取执行详情
  async getExecutionDetail(req: Request, res: Response): Promise<void> {
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

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '执行记录ID是必填项'
          }
        });
        return;
      }

      const execution = await historyService.getExecutionDetail(req.user.userId, id);

      res.status(200).json({
        success: true,
        data: { execution },
        message: '获取执行详情成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取执行详情失败';
      
      if (errorMessage === '执行记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: errorMessage
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'DETAIL_ERROR',
            message: errorMessage
          }
        });
      }
    }
  }

  // 获取聚合数据
  async getAggregatedData(req: Request, res: Response): Promise<void> {
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

      const { groupBy } = req.params;
      const {
        workflowId,
        status,
        startDate,
        endDate,
        hasReview,
        searchTerm
      } = req.query;

      if (!['workflow', 'status', 'month', 'week'].includes(groupBy)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '不支持的分组类型'
          }
        });
        return;
      }

      const filters: HistorySearchFilters = {};
      if (workflowId) filters.workflowId = workflowId as string;
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (hasReview !== undefined) filters.hasReview = hasReview === 'true';
      if (searchTerm) filters.searchTerm = searchTerm as string;

      const data = await historyService.getAggregatedData(
        req.user.userId,
        groupBy as 'workflow' | 'status' | 'month' | 'week',
        filters
      );

      res.status(200).json({
        success: true,
        data: { aggregatedData: data },
        message: '获取聚合数据成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取聚合数据失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'AGGREGATION_ERROR',
          message: errorMessage
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

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '执行记录ID是必填项'
          }
        });
        return;
      }

      // 检查执行记录是否存在且属于当前用户
      const execution = await historyService.getExecutionDetail(req.user.userId, id);
      
      if (!execution) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '执行记录不存在'
          }
        });
        return;
      }

      // 删除执行记录（级联删除相关的执行步骤记录）
      await prisma.execution.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: '删除执行记录成功'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除执行记录失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 导出执行记录
  async exportExecutions(req: Request, res: Response): Promise<void> {
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

      const {
        format = 'json',
        includeSteps = false,
        includeReviews = false,
        includeAttachments = false,
        workflowId,
        status,
        startDate,
        endDate,
        hasReview,
        searchTerm
      } = req.query;

      if (!['json', 'csv', 'excel'].includes(format as string)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '不支持的导出格式'
          }
        });
        return;
      }

      const filters: HistorySearchFilters = {};
      if (workflowId) filters.workflowId = workflowId as string;
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (hasReview !== undefined) filters.hasReview = hasReview === 'true';
      if (searchTerm) filters.searchTerm = searchTerm as string;

      const options = {
        includeSteps: includeSteps === 'true',
        includeReviews: includeReviews === 'true',
        includeAttachments: includeAttachments === 'true'
      };

      const exportResult = await historyService.exportExecutionData(
        req.user.userId,
        format as 'json' | 'csv' | 'excel',
        filters,
        options
      );

      if (format === 'csv') {
        const csvData = historyService.generateCSV(exportResult.data);
        const filename = `executions_export_${new Date().toISOString().slice(0, 10)}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csvData); // 添加BOM以支持中文
      } else if (format === 'json') {
        const filename = `executions_export_${new Date().toISOString().slice(0, 10)}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(exportResult);
      } else {
        // Excel格式暂时返回JSON，后续可以集成Excel库
        res.status(400).json({
          success: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: 'Excel导出功能暂未实现'
          }
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出数据失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: errorMessage
        }
      });
    }
  }

  // 批量删除执行记录
  async batchDeleteExecutions(req: Request, res: Response): Promise<void> {
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

      const { executionIds } = req.body;

      if (!executionIds || !Array.isArray(executionIds) || executionIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '执行记录ID列表是必填项'
          }
        });
        return;
      }

      // 验证所有执行记录都属于当前用户
      const executions = await prisma.execution.findMany({
        where: {
          id: { in: executionIds },
          userId: req.user.userId
        },
        select: { id: true }
      });

      if (executions.length !== executionIds.length) {
        res.status(403).json({
          success: false,
          error: {
            code: 'PERMISSION_ERROR',
            message: '部分执行记录不存在或无权限删除'
          }
        });
        return;
      }

      // 批量删除
      const result = await prisma.execution.deleteMany({
        where: {
          id: { in: executionIds },
          userId: req.user.userId
        }
      });

      res.status(200).json({
        success: true,
        data: { deletedCount: result.count },
        message: `成功删除 ${result.count} 条执行记录`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除执行记录失败';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_DELETE_ERROR',
          message: errorMessage
        }
      });
    }
  }
}