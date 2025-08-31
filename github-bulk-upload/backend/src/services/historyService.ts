import prisma from '../config/database';

export interface HistorySearchFilters {
  workflowId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  hasReview?: boolean;
  searchTerm?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface HistoryStats {
  totalExecutions: number;
  completedExecutions: number;
  averageExecutionTime: number;
  totalWorkflows: number;
  mostUsedWorkflow: {
    id: string;
    name: string;
    count: number;
  } | null;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
  statusDistribution: Record<string, number>;
}

export class HistoryService {
  // 分页查询历史记录
  async getExecutionHistory(
    userId: string,
    filters: HistorySearchFilters,
    pagination: PaginationOptions
  ) {
    const { page, limit, sortBy = 'startedAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      userId
    };

    if (filters.workflowId) {
      where.workflowId = filters.workflowId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.startedAt = {};
      if (filters.startDate) {
        where.startedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.startedAt.lte = filters.endDate;
      }
    }

    if (filters.hasReview !== undefined) {
      if (filters.hasReview) {
        where.reviewNotes = { not: null };
      } else {
        where.reviewNotes = null;
      }
    }

    if (filters.searchTerm) {
      where.OR = [
        { workflow: { name: { contains: filters.searchTerm, mode: 'insensitive' } } },
        { workflow: { description: { contains: filters.searchTerm, mode: 'insensitive' } } },
        { reviewNotes: { contains: filters.searchTerm, mode: 'insensitive' } },
        { executionRecords: { 
          some: { 
            OR: [
              { notes: { contains: filters.searchTerm, mode: 'insensitive' } },
              { reviewNotes: { contains: filters.searchTerm, mode: 'insensitive' } }
            ]
          }
        }}
      ];
    }

    // 执行查询
    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true
            }
          },
          executionRecords: {
            include: {
              step: {
                select: {
                  id: true,
                  name: true,
                  isRequired: true
                }
              }
            }
          },
          _count: {
            select: {
              executionRecords: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.execution.count({ where })
    ]);

    return {
      executions: executions.map(execution => ({
        ...execution,
        duration: execution.completedAt && execution.startedAt
          ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
          : null,
        completionRate: execution.executionRecords.length > 0
          ? (execution.executionRecords.filter(r => r.status === 'COMPLETED').length / execution.executionRecords.length) * 100
          : 0
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  // 高级搜索
  async advancedSearch(
    userId: string,
    searchOptions: {
      query?: string;
      workflowIds?: string[];
      statuses?: string[];
      dateRange?: { start: Date; end: Date };
      durationRange?: { min: number; max: number };
      completionRateRange?: { min: number; max: number };
      hasAttachments?: boolean;
      hasReview?: boolean;
      tags?: string[];
    },
    pagination: PaginationOptions
  ) {
    const { page, limit, sortBy = 'startedAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    // 文本搜索
    if (searchOptions.query) {
      where.OR = [
        { workflow: { name: { contains: searchOptions.query, mode: 'insensitive' } } },
        { workflow: { description: { contains: searchOptions.query, mode: 'insensitive' } } },
        { reviewNotes: { contains: searchOptions.query, mode: 'insensitive' } }
      ];
    }

    // 工作流筛选
    if (searchOptions.workflowIds && searchOptions.workflowIds.length > 0) {
      where.workflowId = { in: searchOptions.workflowIds };
    }

    // 状态筛选
    if (searchOptions.statuses && searchOptions.statuses.length > 0) {
      where.status = { in: searchOptions.statuses };
    }

    // 日期范围
    if (searchOptions.dateRange) {
      where.startedAt = {
        gte: searchOptions.dateRange.start,
        lte: searchOptions.dateRange.end
      };
    }

    // 复盘筛选
    if (searchOptions.hasReview !== undefined) {
      if (searchOptions.hasReview) {
        where.reviewNotes = { not: null };
      } else {
        where.reviewNotes = null;
      }
    }

    const executions = await prisma.execution.findMany({
      where,
      include: {
        workflow: true,
        executionRecords: {
          include: {
            step: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit
    });

    // 后处理筛选（对于需要计算的条件）
    let filteredExecutions = executions;

    if (searchOptions.durationRange) {
      filteredExecutions = filteredExecutions.filter(exec => {
        if (!exec.completedAt || !exec.startedAt) return false;
        const duration = new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime();
        return duration >= searchOptions.durationRange!.min && duration <= searchOptions.durationRange!.max;
      });
    }

    if (searchOptions.completionRateRange) {
      filteredExecutions = filteredExecutions.filter(exec => {
        const total = exec.executionRecords.length;
        const completed = exec.executionRecords.filter(r => r.status === 'COMPLETED').length;
        const rate = total > 0 ? (completed / total) * 100 : 0;
        return rate >= searchOptions.completionRateRange!.min && rate <= searchOptions.completionRateRange!.max;
      });
    }

    const total = await prisma.execution.count({ where });

    return {
      executions: filteredExecutions.map(execution => ({
        ...execution,
        duration: execution.completedAt && execution.startedAt
          ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
          : null,
        completionRate: execution.executionRecords.length > 0
          ? (execution.executionRecords.filter(r => r.status === 'COMPLETED').length / execution.executionRecords.length) * 100
          : 0
      })),
      pagination: {
        page,
        limit,
        total: filteredExecutions.length,
        pages: Math.ceil(filteredExecutions.length / limit),
        hasNext: page * limit < filteredExecutions.length,
        hasPrev: page > 1
      }
    };
  }

  // 获取历史统计信息
  async getHistoryStats(userId: string): Promise<HistoryStats> {
    // 基础统计
    const [totalExecutions, completedExecutions, workflows] = await Promise.all([
      prisma.execution.count({ where: { userId } }),
      prisma.execution.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.workflow.count({ where: { userId } })
    ]);

    // 平均执行时间
    const completedExecutionsWithTime = await prisma.execution.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      select: {
        startedAt: true,
        completedAt: true
      }
    });

    const totalDuration = completedExecutionsWithTime.reduce((sum, exec) => {
      if (exec.completedAt && exec.startedAt) {
        return sum + (new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime());
      }
      return sum;
    }, 0);

    const averageExecutionTime = completedExecutionsWithTime.length > 0
      ? Math.round(totalDuration / completedExecutionsWithTime.length)
      : 0;

    // 最常用的工作流
    const workflowUsage = await prisma.execution.groupBy({
      by: ['workflowId'],
      where: { userId },
      _count: { workflowId: true },
      orderBy: { _count: { workflowId: 'desc' } },
      take: 1
    });

    let mostUsedWorkflow = null;
    if (workflowUsage.length > 0) {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowUsage[0].workflowId },
        select: { id: true, name: true }
      });
      if (workflow) {
        mostUsedWorkflow = {
          ...workflow,
          count: workflowUsage[0]._count.workflowId
        };
      }
    }

    // 最近活动（过去30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentExecutions = await prisma.execution.findMany({
      where: {
        userId,
        startedAt: { gte: thirtyDaysAgo }
      },
      select: { startedAt: true }
    });

    // 按日期分组
    const activityByDate: Record<string, number> = {};
    recentExecutions.forEach(exec => {
      const date = new Date(exec.startedAt).toISOString().split('T')[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    const recentActivity = Object.entries(activityByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 状态分布
    const statusDistribution = await prisma.execution.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true }
    });

    const statusDistributionMap: Record<string, number> = {};
    statusDistribution.forEach(item => {
      statusDistributionMap[item.status] = item._count.status;
    });

    return {
      totalExecutions,
      completedExecutions,
      averageExecutionTime,
      totalWorkflows: workflows,
      mostUsedWorkflow,
      recentActivity,
      statusDistribution: statusDistributionMap
    };
  }

  // 获取执行详情
  async getExecutionDetail(userId: string, executionId: string) {
    const execution = await prisma.execution.findFirst({
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
            step: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!execution) {
      throw new Error('执行记录不存在');
    }

    return {
      ...execution,
      duration: execution.completedAt && execution.startedAt
        ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
        : null,
      completionRate: execution.executionRecords.length > 0
        ? (execution.executionRecords.filter(r => r.status === 'COMPLETED').length / execution.executionRecords.length) * 100
        : 0
    };
  }

  // 导出执行记录数据
  async exportExecutionData(
    userId: string,
    format: 'json' | 'csv' | 'excel',
    filters?: HistorySearchFilters,
    options?: {
      includeSteps?: boolean;
      includeReviews?: boolean;
      includeAttachments?: boolean;
    }
  ) {
    const where: any = { userId };

    // 应用筛选条件
    if (filters?.workflowId) {
      where.workflowId = filters.workflowId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
      where.startedAt = {};
      if (filters.startDate) where.startedAt.gte = filters.startDate;
      if (filters.endDate) where.startedAt.lte = filters.endDate;
    }
    if (filters?.hasReview !== undefined) {
      if (filters.hasReview) {
        where.reviewNotes = { not: null };
      } else {
        where.reviewNotes = null;
      }
    }
    if (filters?.searchTerm) {
      where.OR = [
        { workflow: { name: { contains: filters.searchTerm, mode: 'insensitive' } } },
        { workflow: { description: { contains: filters.searchTerm, mode: 'insensitive' } } },
        { reviewNotes: { contains: filters.searchTerm, mode: 'insensitive' } }
      ];
    }

    const executions = await prisma.execution.findMany({
      where,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true
          }
        },
        executionRecords: options?.includeSteps ? {
          include: {
            step: {
              select: {
                id: true,
                name: true,
                description: true,
                isRequired: true
              }
            }
          }
        } : false
      },
      orderBy: { startedAt: 'desc' }
    });

    // 转换数据格式
    const exportData = executions.map(execution => {
      const baseData = {
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflow?.name,
        workflowDescription: execution.workflow?.description,
        workflowCategory: execution.workflow?.category,
        status: execution.status,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString(),
        duration: execution.completedAt && execution.startedAt
          ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
          : null,
        completionRate: execution.executionRecords
          ? (execution.executionRecords.filter(r => r.status === 'COMPLETED').length / execution.executionRecords.length) * 100
          : 0,
        reviewNotes: options?.includeReviews ? execution.reviewNotes : undefined,
        reviewedAt: options?.includeReviews ? execution.reviewedAt?.toISOString() : undefined
      };

      if (options?.includeSteps && execution.executionRecords) {
        return {
          ...baseData,
          steps: execution.executionRecords.map(record => ({
            stepId: record.stepId,
            stepName: record.step?.name,
            stepDescription: record.step?.description,
            stepRequired: record.step?.isRequired,
            stepStatus: record.status,
            stepNotes: record.notes,
            stepReviewNotes: options.includeReviews ? record.reviewNotes : undefined,
            stepStartedAt: record.startedAt?.toISOString(),
            stepCompletedAt: record.completedAt?.toISOString()
          }))
        };
      }

      return baseData;
    });

    return {
      data: exportData,
      format,
      exportedAt: new Date().toISOString(),
      totalRecords: exportData.length,
      filters: filters || {}
    };
  }

  // 生成CSV格式数据
  generateCSV(data: any[]): string {
    if (data.length === 0) return '';

    // 获取所有可能的字段
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'steps') {
          allKeys.add(key);
        }
      });
      // 如果包含步骤数据，展开步骤字段
      if (item.steps && Array.isArray(item.steps)) {
        item.steps.forEach((step: any) => {
          Object.keys(step).forEach(stepKey => {
            allKeys.add(stepKey);
          });
        });
      }
    });

    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      if (item.steps && Array.isArray(item.steps)) {
        // 如果有步骤数据，为每个步骤创建一行
        item.steps.forEach((step: any) => {
          const row = headers.map(header => {
            let value = item[header] !== undefined ? item[header] : step[header];
            if (value === undefined || value === null) value = '';
            // 处理包含逗号或引号的值
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csvRows.push(row.join(','));
        });
      } else {
        // 没有步骤数据，直接创建一行
        const row = headers.map(header => {
          let value = item[header];
          if (value === undefined || value === null) value = '';
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(row.join(','));
      }
    });

    return csvRows.join('\n');
  }

  // 获取聚合查询结果
  async getAggregatedData(
    userId: string,
    groupBy: 'workflow' | 'status' | 'month' | 'week',
    filters?: HistorySearchFilters
  ) {
    const where: any = { userId };

    // 应用筛选条件
    if (filters?.workflowId) {
      where.workflowId = filters.workflowId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
      where.startedAt = {};
      if (filters.startDate) where.startedAt.gte = filters.startDate;
      if (filters.endDate) where.startedAt.lte = filters.endDate;
    }

    switch (groupBy) {
      case 'workflow':
        const workflowStats = await prisma.execution.groupBy({
          by: ['workflowId'],
          where,
          _count: { workflowId: true },
          _avg: {
            // 这里需要计算平均执行时间，但Prisma不直接支持，需要后处理
          }
        });

        // 获取工作流名称
        const workflowIds = workflowStats.map(stat => stat.workflowId);
        const workflows = await prisma.workflow.findMany({
          where: { id: { in: workflowIds } },
          select: { id: true, name: true }
        });

        return workflowStats.map(stat => {
          const workflow = workflows.find(w => w.id === stat.workflowId);
          return {
            id: stat.workflowId,
            name: workflow?.name || '未知工作流',
            count: stat._count.workflowId
          };
        });

      case 'status':
        return await prisma.execution.groupBy({
          by: ['status'],
          where,
          _count: { status: true }
        });

      case 'month':
        // 这里需要使用原生SQL或者后处理来按月分组
        const executions = await prisma.execution.findMany({
          where,
          select: { startedAt: true, status: true }
        });

        const monthlyData: Record<string, { count: number; completed: number }> = {};
        executions.forEach(exec => {
          const month = new Date(exec.startedAt).toISOString().slice(0, 7); // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = { count: 0, completed: 0 };
          }
          monthlyData[month].count++;
          if (exec.status === 'COMPLETED') {
            monthlyData[month].completed++;
          }
        });

        return Object.entries(monthlyData).map(([month, data]) => ({
          period: month,
          count: data.count,
          completed: data.completed,
          completionRate: data.count > 0 ? (data.completed / data.count) * 100 : 0
        }));

      default:
        throw new Error('不支持的分组类型');
    }
  }
}