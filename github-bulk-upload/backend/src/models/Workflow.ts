import { Workflow, WorkflowStep, WorkflowStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { 
  CreateWorkflowInput, 
  UpdateWorkflowInput,
  CreateWorkflowStepInput,
  UpdateWorkflowStepInput,
  WorkflowWithRelations, 
  WorkflowFilter,
  PaginationParams,
  PaginatedResult 
} from '../types/models';
import { DatabaseUtils } from '../utils/database';

export class WorkflowModel {
  // 创建工作流
  static async create(userId: string, data: CreateWorkflowInput): Promise<WorkflowWithRelations> {
    const { steps, ...workflowData } = data;

    return prisma.workflow.create({
      data: {
        ...workflowData,
        userId,
        steps: steps ? {
          create: steps.map((step, index) => ({
            ...step,
            order: step.order || index + 1,
          }))
        } : undefined,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          }
        }
      }
    });
  }

  // 根据ID查找工作流
  static async findById(id: string, includeRelations = true): Promise<WorkflowWithRelations | null> {
    const include = includeRelations ? {
      steps: {
        orderBy: { order: 'asc' as const }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      executions: {
        orderBy: { createdAt: 'desc' as const },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          completedAt: true,
        }
      },
      _count: {
        select: {
          steps: true,
          executions: true,
        }
      }
    } : undefined;

    return prisma.workflow.findUnique({
      where: { id },
      include,
    });
  }

  // 更新工作流
  static async update(id: string, data: UpdateWorkflowInput): Promise<WorkflowWithRelations> {
    return prisma.workflow.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 }, // 自动增加版本号
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          }
        }
      }
    });
  }

  // 删除工作流
  static async delete(id: string): Promise<Workflow> {
    return prisma.workflow.delete({
      where: { id },
    });
  }

  // 软删除工作流（设置为非活跃）
  static async softDelete(id: string): Promise<Workflow> {
    return prisma.workflow.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // 恢复工作流
  static async restore(id: string): Promise<Workflow> {
    return prisma.workflow.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // 复制工作流
  static async duplicate(id: string, userId: string, newName?: string): Promise<WorkflowWithRelations> {
    const original = await this.findById(id, true);
    if (!original) {
      throw new Error('Workflow not found');
    }

    const { id: _, createdAt, updatedAt, version, executions, _count, user, ...workflowData } = original;
    const { steps, ...restData } = workflowData;

    return prisma.workflow.create({
      data: {
        ...restData,
        name: newName || `${original.name} (副本)`,
        userId,
        version: 1,
        steps: {
          create: steps?.map(({ id, workflowId, createdAt, updatedAt, ...stepData }) => stepData) || []
        }
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          }
        }
      }
    });
  }

  // 获取工作流列表（分页）
  static async findMany(
    filter: WorkflowFilter = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<WorkflowWithRelations>> {
    const { search, tags, ...otherFilters } = filter;
    
    let where: Prisma.WorkflowWhereInput = { ...otherFilters };

    // 添加搜索条件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 添加标签过滤
    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags,
      };
    }

    return DatabaseUtils.getPaginatedData(prisma.workflow, {
      ...pagination,
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          }
        }
      }
    });
  }

  // 获取用户的工作流
  static async findByUserId(
    userId: string,
    filter: Omit<WorkflowFilter, 'userId'> = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<WorkflowWithRelations>> {
    return this.findMany({ ...filter, userId }, pagination);
  }

  // 获取工作流模板
  static async findTemplates(
    filter: Omit<WorkflowFilter, 'isTemplate'> = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<WorkflowWithRelations>> {
    return this.findMany({ ...filter, isTemplate: true }, pagination);
  }

  // 全文搜索工作流
  static async search(query: string, userId?: string, limit = 10): Promise<WorkflowWithRelations[]> {
    const where: Prisma.WorkflowWhereInput = {
      search_vector: {
        search: query,
      },
      isActive: true,
    };

    if (userId) {
      where.userId = userId;
    }

    return prisma.workflow.findMany({
      where,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc',
      }
    });
  }

  // 获取工作流统计
  static async getStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [
      total,
      active,
      templates,
      byStatus,
      byCategory,
    ] = await Promise.all([
      prisma.workflow.count({ where }),
      prisma.workflow.count({ where: { ...where, isActive: true } }),
      prisma.workflow.count({ where: { ...where, isTemplate: true } }),
      prisma.workflow.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      prisma.workflow.groupBy({
        by: ['category'],
        where: { ...where, category: { not: null } },
        _count: { category: true },
      }),
    ]);

    return {
      total,
      active,
      templates,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<WorkflowStatus, number>),
      byCategory: byCategory.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = item._count.category;
        }
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // 获取最受欢迎的工作流（基于执行次数）
  static async getMostPopular(limit = 10): Promise<WorkflowWithRelations[]> {
    return prisma.workflow.findMany({
      where: { isActive: true },
      orderBy: {
        executions: {
          _count: 'desc',
        }
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          }
        }
      }
    });
  }

  // 获取最近更新的工作流
  static async getRecentlyUpdated(userId?: string, limit = 10): Promise<WorkflowWithRelations[]> {
    const where = userId ? { userId, isActive: true } : { isActive: true };

    return prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          }
        }
      }
    });
  }

  // 获取所有分类
  static async getCategories(): Promise<string[]> {
    const categories = await prisma.workflow.findMany({
      where: {
        category: { not: null },
        isActive: true,
      },
      select: { category: true },
      distinct: ['category'],
    });

    return categories
      .map(item => item.category)
      .filter(Boolean) as string[];
  }

  // 获取所有标签
  static async getTags(): Promise<Array<{ tag: string; count: number }>> {
    const workflows = await prisma.workflow.findMany({
      where: { isActive: true },
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    
    workflows.forEach(workflow => {
      workflow.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  // 批量更新工作流状态
  static async batchUpdateStatus(ids: string[], status: WorkflowStatus): Promise<{ count: number }> {
    return prisma.workflow.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  }

  // 检查用户是否有权限访问工作流
  static async checkAccess(workflowId: string, userId: string): Promise<boolean> {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        OR: [
          { userId }, // 用户是所有者
          { isTemplate: true, isActive: true }, // 或者是公开模板
        ]
      }
    });

    return !!workflow;
  }
}

// 工作流步骤模型
export class WorkflowStepModel {
  // 创建步骤
  static async create(workflowId: string, data: CreateWorkflowStepInput): Promise<WorkflowStep> {
    return prisma.workflowStep.create({
      data: {
        ...data,
        workflowId,
      },
    });
  }

  // 批量创建步骤
  static async createMany(workflowId: string, steps: CreateWorkflowStepInput[]): Promise<{ count: number }> {
    return prisma.workflowStep.createMany({
      data: steps.map(step => ({
        ...step,
        workflowId,
      })),
    });
  }

  // 更新步骤
  static async update(id: string, data: UpdateWorkflowStepInput): Promise<WorkflowStep> {
    return prisma.workflowStep.update({
      where: { id },
      data,
    });
  }

  // 删除步骤
  static async delete(id: string): Promise<WorkflowStep> {
    return prisma.workflowStep.delete({
      where: { id },
    });
  }

  // 获取工作流的所有步骤
  static async findByWorkflowId(workflowId: string): Promise<WorkflowStep[]> {
    return prisma.workflowStep.findMany({
      where: { workflowId },
      orderBy: { order: 'asc' },
    });
  }

  // 重新排序步骤
  static async reorder(workflowId: string, stepOrders: Array<{ id: string; order: number }>): Promise<void> {
    await prisma.$transaction(
      stepOrders.map(({ id, order }) =>
        prisma.workflowStep.update({
          where: { id },
          data: { order },
        })
      )
    );
  }

  // 复制步骤到另一个工作流
  static async copyToWorkflow(stepId: string, targetWorkflowId: string): Promise<WorkflowStep> {
    const originalStep = await prisma.workflowStep.findUnique({
      where: { id: stepId },
    });

    if (!originalStep) {
      throw new Error('Step not found');
    }

    const { id, workflowId, createdAt, updatedAt, ...stepData } = originalStep;

    // 获取目标工作流的最大order值
    const maxOrder = await prisma.workflowStep.aggregate({
      where: { workflowId: targetWorkflowId },
      _max: { order: true },
    });

    return prisma.workflowStep.create({
      data: {
        ...stepData,
        workflowId: targetWorkflowId,
        order: (maxOrder._max.order || 0) + 1,
      },
    });
  }
}

export default WorkflowModel;