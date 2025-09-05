import { api } from './api';

export interface HistorySearchFilters {
  workflowId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
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

export interface ExecutionHistory {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  duration?: number;
  completionRate: number;
  workflow: {
    id: string;
    name: string;
    description?: string;
    category?: string;
  };
  executionRecords: Array<{
    id: string;
    status: string;
    notes?: string;
    reviewNotes?: string;
    step: {
      id: string;
      name: string;
      isRequired: boolean;
    };
  }>;
  _count: {
    executionRecords: number;
  };
}

export interface HistoryResponse {
  executions: ExecutionHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const historyService = {
  // 获取执行历史列表
  async getExecutionHistory(
    filters: HistorySearchFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<HistoryResponse> {
    const params = {
      ...filters,
      ...pagination
    };
    
    const response = await api.get('/history', { params });
    return (response as any).data;
  },

  // 高级搜索
  async advancedSearch(
    searchOptions: {
      query?: string;
      workflowIds?: string[];
      statuses?: string[];
      dateRange?: { start: string; end: string };
      durationRange?: { min: number; max: number };
      completionRateRange?: { min: number; max: number };
      hasAttachments?: boolean;
      hasReview?: boolean;
      tags?: string[];
    },
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<HistoryResponse> {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder
    };

    const response = await api.post('/history/search', searchOptions, { params });
    return (response as any).data;
  },

  // 获取历史统计
  async getHistoryStats(): Promise<HistoryStats> {
    const response = await api.get('/history');
    return (response as any).data.stats;
  },

  // 获取执行详情
  async getExecutionDetail(id: string): Promise<ExecutionHistory> {
    const response = await api.get(`/executions/${id}`);
    return (response as any).data;
  },

  // 删除执行记录
  async deleteExecution(id: string): Promise<void> {
    await api.delete(`/executions/${id}`);
  },

  // 批量删除执行记录
  async batchDeleteExecutions(executionIds: string[]): Promise<{ deletedCount: number }> {
    const response = await api.delete('/executions/batch', {
      data: { executionIds }
    });
    return (response as any).data;
  },

  // 获取聚合数据
  async getAggregatedData(
    groupBy: 'workflow' | 'status' | 'month' | 'week',
    filters: HistorySearchFilters = {}
  ): Promise<any> {
    const response = await api.get(`/history/aggregate/${groupBy}`, {
      params: filters
    });
    return (response as any).data.aggregatedData;
  },

  // 导出执行记录
  async exportExecutions(
    format: 'json' | 'csv' | 'excel',
    options: {
      includeSteps?: boolean;
      includeReviews?: boolean;
      includeAttachments?: boolean;
      filters?: HistorySearchFilters;
    } = {}
  ): Promise<Blob> {
    const params = {
      format,
      includeSteps: options.includeSteps || false,
      includeReviews: options.includeReviews || false,
      includeAttachments: options.includeAttachments || false,
      ...options.filters
    };

    const response = await api.get('/history/export', {
      params,
      responseType: 'blob'
    });

    return (response as any).data;
  },

  // 生成导出文件名
  generateExportFilename(format: string, filters?: HistorySearchFilters): string {
    const date = new Date().toISOString().slice(0, 10);
    let filename = `executions_export_${date}`;
    
    if (filters?.workflowId) {
      filename += '_workflow';
    }
    if (filters?.status) {
      filename += `_${filters.status.toLowerCase()}`;
    }
    if (filters?.startDate || filters?.endDate) {
      filename += '_filtered';
    }
    
    return `${filename}.${format}`;
  }
};