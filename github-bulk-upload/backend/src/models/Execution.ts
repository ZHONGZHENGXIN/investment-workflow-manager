import { Execution, ExecutionRecord, ExecutionStatus, StepStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { 
  CreateExecutionInput, 
  UpdateExecutionInput,
  CreateExecutionRecordInput,
  UpdateExecutionRecordInput,
  ExecutionWithRelations,
  ExecutionRecordWithRelations,
  ExecutionFilter,
  PaginationParams,
  PaginatedResult,
  ExecutionStats
} from '../types/models';
import { DatabaseUtils } from '../utils/database';

export class ExecutionModel {
  // 创建执行记录
  static async create(userId: string, data: CreateExecutionInput): Promise<ExecutionWithRelations> {
    // 获取工作流和步骤信息
    const workflow = await prisma.workflow.findUnique({
      where: { id: data.workflowId },
      include: { steps: { orderBy: { order: 'asc' } } }
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // 创建执行记录
    const execution = await prisma.execution.create({
      data: {
        ...data,
        userId,
        title: data.title || `执行 ${workflow.name}`,
      },
      include: {
        workflow: {
          include: { steps: { orderBy: { order: 'asc' } } }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    // 为每个工作流步骤创建执行记录
    if (workflow.steps.length > 0) {
      await prisma.executionRecord.createMany({
        data: workflow.steps.map(step => ({
          executionId: execution.id,
          stepId: step.id,
          status: 'PENDING' as StepStatus,
        }))
      });
    }

    return this.findById(execution.id) as Promise<ExecutionWithRelations>;
  }

  // 根据ID查找执行记录
  static async findById(id: string, includeRelations = true): Promise<ExecutionWithRelations | null> {
    const include = includeRelations ? {
      workflow: {
        include: {
          steps: { orderBy: { order: 'asc' } }
        }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      executionRecords: {
        include: {
          step: true,
          attachments: true,
        },
        orderBy: { step: { order: 'asc' } }
      },
      reviews: true,
      _count: {
        select: {
          executionRecords: true,
          reviews: true,
        }
      }
    } : undefined;

    return prisma.execution.findUnique({
      where: { id },
      include,
    });
  }

  // 更新执行记录
  static async update(id: string, data: UpdateExecutionInput): Promise<ExecutionWithRelations> {
    const execution = await prisma.execution.update({
      where: { id },
      data,
      include: {
        workflow: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            executionRecords: true,
            reviews: true,
          }
        }
      }
    });

    // 如果状态变为完成，更新完成时间
    if (data.status === 'COMPLETED' && !execution.completedAt) {
      await prisma.execution.update({
        where: { id },
        data: { completedAt: new Date() }
      });
    }

    return execution;
  }

  // 删除执行记录
  static async delete(id: string): Promise<Execution> {
    return prisma.execution.delete({
      where: { id },
    });
  }

  // 暂停执行
  static async pause(id: string): Promise<ExecutionWithRelations> {
    return this.update(id, {
      status: 'PAUSED',
    });
  }

  // 恢复执行
  static async resume(id: string): Promise<ExecutionWithRelations> {
    return this.update(id, {
      status: 'IN_PROGRESS',
    });
  }

  // 完成执行
  static async complete(id: string): Promise<ExecutionWithRelations> {
    return this.update(id, {
      status: 'COMPLETED',
    });
  }

  // 取消执行
  static async cancel(id: string): Promise<ExecutionWithRelations> {
    return this.update(id, {
      status: 'CANCELLED',
    });
  }

  // 计算并更新执行进度
  static async updateProgress(id: string): Promise<number> {
    const progress = await DatabaseUtils.executeRawQuery(
      'SELECT calculate_execution_progress($1) as progress',
      [id]
    );

    return progress[0]?.progress || 0;
  }

  // 获取执行记录列表（分页）
  static async findMany(
    filter: ExecutionFilter = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<ExecutionWithRelations>> {
    const { search, tags, dateRange, ...otherFilters } = filter;
    
    let where: Prisma.ExecutionWhereInput = { ...otherFilters };

    // 添加搜索条件
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { workflow: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // 添加标签过滤
    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags,
      };
    }

    // 添加日期范围过滤
    if (dateRange) {
      where.createdAt = {};
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start;
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end;
      }
    }

    return DatabaseUtils.getPaginatedData(prisma.execution, {
      ...pagination,
      where,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            category: true,
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            executionRecords: true,
            reviews: true,
          }
        }
      }
    });
  }

  // 获取用户的执行记录
  static async findByUserId(
    userId: string,
    filter: Omit<ExecutionFilter, 'userId'> = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<ExecutionWithRelations>> {
    return this.findMany({ ...filter, userId }, pagination);
  }

  // 获取工作流的执行记录
  static async findByWorkflowId(
    workflowId: string,
    filter: Omit<ExecutionFilter, 'workflowId'> = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<ExecutionWithRelations>> {
    return this.findMany({ ...filter, workflowId }, pagination);
  }

  // 获取执行统计
  static async getStats(userId?: string, workflowId?: string): Promise<ExecutionStats> {
    const where: Prisma.ExecutionWhereInput = {};
    if (userId) where.userId = userId;
    if (workflowId) where.workflowId = workflowId;

    const [
      totalExecutions,
      completedExecutions,
      avgTime,
      totalTime,
    ] = await Promise.all([
      prisma.execution.count({ where }),
      prisma.execution.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.execution.aggregate({
        where: { ...where, actualTime: { not: null } },
        _avg: { actualTime: true },
      }),
      prisma.execution.aggregate({
        where: { ...where, actualTime: { not: null } },
        _sum: { actualTime: true },
      }),
    ]);

    const completionRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0;

    // 获取步骤统计
    const stepStats = await prisma.executionRecord.groupBy({
      by: ['stepId'],
      where: {
        execution: where,
      },
      _count: {
        stepId: true,
      },
      _avg: {
        actualTime: true,
      },
    });

    const stepStatsWithNames = await Promise.all(
      stepStats.map(async (stat) => {
        const step = await prisma.workflowStep.findUnique({
          where: { id: stat.stepId },
          select: { name: true },
        });

        const completedCount = await prisma.executionRecord.count({
          where: {
            stepId: stat.stepId,
            status: 'COMPLETED',
            execution: where,
          },
        });

        return {
          stepId: stat.stepId,
          stepName: step?.name || 'Unknown Step',
          completionRate: stat._count.stepId > 0 ? (completedCount / stat._count.stepId) * 100 : 0,
          averageTime: stat._avg.actualTime || 0,
        };
      })
    );

    return {
      totalTime: totalTime._sum.actualTime || 0,
      averageTime: avgTime._avg.actualTime || 0,
      completionRate,
      stepStats: stepStatsWithNames,
    };
  }

  // 获取最近的执行记录
  static async getRecent(userId?: string, limit = 10): Promise<ExecutionWithRelations[]> {
    const where = userId ? { userId } : {};

    return prisma.execution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            category: true,
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            executionRecords: true,
            reviews: true,
          }
        }
      }
    });
  }

  // 获取进行中的执行记录
  static async getInProgress(userId?: string): Promise<ExecutionWithRelations[]> {
    const where: Prisma.ExecutionWhereInput = {
      status: 'IN_PROGRESS',
    };
    
    if (userId) where.userId = userId;

    return prisma.execution.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            category: true,
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            executionRecords: true,
            reviews: true,
          }
        }
      }
    });
  }

  // 获取即将到期的执行记录
  static async getUpcoming(userId?: string, days = 7): Promise<ExecutionWithRelations[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const where: Prisma.ExecutionWhereInput = {
      dueDate: {
        lte: endDate,
        gte: new Date(),
      },
      status: {
        in: ['IN_PROGRESS', 'PAUSED'],
      },
    };
    
    if (userId) where.userId = userId;

    return prisma.execution.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            category: true,
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            executionRecords: true,
            reviews: true,
          }
        }
      }
    });
  }
}

// 执行步骤记录模型
export class ExecutionRecordModel {
  // 创建执行步骤记录
  static async create(data: CreateExecutionRecordInput): Promise<ExecutionRecordWithRelations> {
    return prisma.executionRecord.create({
      data,
      include: {
        execution: true,
        step: true,
        attachments: true,
      },
    });
  }

  // 更新执行步骤记录
  static async update(id: string, data: UpdateExecutionRecordInput): Promise<ExecutionRecordWithRelations> {
    const record = await prisma.executionRecord.update({
      where: { id },
      data,
      include: {
        execution: true,
        step: true,
        attachments: true,
      },
    });

    // 更新执行记录的进度
    await ExecutionModel.updateProgress(record.executionId);

    return record;
  }

  // 开始步骤
  static async start(id: string): Promise<ExecutionRecordWithRelations> {
    return this.update(id, {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    });
  }

  // 完成步骤
  static async complete(id: string, data?: { notes?: string; result?: any }): Promise<ExecutionRecordWithRelations> {
    const startTime = await prisma.executionRecord.findUnique({
      where: { id },
      select: { startedAt: true },
    });

    const completedAt = new Date();
    const actualTime = startTime?.startedAt 
      ? Math.round((completedAt.getTime() - startTime.startedAt.getTime()) / (1000 * 60)) // 分钟
      : undefined;

    return this.update(id, {
      status: 'COMPLETED',
      completedAt,
      actualTime,
      ...data,
    });
  }

  // 跳过步骤
  static async skip(id: string, reason?: string): Promise<ExecutionRecordWithRelations> {
    return this.update(id, {
      status: 'SKIPPED',
      notes: reason,
      completedAt: new Date(),
    });
  }

  // 标记步骤失败
  static async fail(id: string, reason?: string): Promise<ExecutionRecordWithRelations> {
    return this.update(id, {
      status: 'FAILED',
      notes: reason,
      completedAt: new Date(),
    });
  }

  // 根据执行ID获取所有步骤记录
  static async findByExecutionId(executionId: string): Promise<ExecutionRecordWithRelations[]> {
    return prisma.executionRecord.findMany({
      where: { executionId },
      include: {
        step: true,
        attachments: true,
      },
      orderBy: {
        step: { order: 'asc' }
      }
    });
  }

  // 获取下一个待执行的步骤
  static async getNextPending(executionId: string): Promise<ExecutionRecordWithRelations | null> {
    return prisma.executionRecord.findFirst({
      where: {
        executionId,
        status: 'PENDING',
      },
      include: {
        step: true,
        attachments: true,
      },
      orderBy: {
        step: { order: 'asc' }
      }
    });
  }

  // 检查步骤依赖是否满足
  static async checkDependencies(id: string): Promise<boolean> {
    const record = await prisma.executionRecord.findUnique({
      where: { id },
      include: {
        step: true,
        execution: {
          include: {
            executionRecords: {
              include: { step: true }
            }
          }
        }
      }
    });

    if (!record || !record.step.dependencies || record.step.dependencies.length === 0) {
      return true;
    }

    // 检查所有依赖步骤是否已完成
    const dependencySteps = record.execution.executionRecords.filter(er =>
      record.step.dependencies!.includes(er.step.id)
    );

    return dependencySteps.every(step => step.status === 'COMPLETED');
  }
}

export default ExecutionModel;