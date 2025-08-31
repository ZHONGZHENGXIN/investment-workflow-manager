import { apiService } from './api';

// 执行相关类型定义
export interface Execution {
  id: string;
  userId: string;
  workflowId: string;
  title: string;
  description?: string;
  status: ExecutionStatus;
  priority: ExecutionPriority;
  tags: string[];
  progress: number;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  workflow?: any;
  records?: ExecutionRecord[];
}

export interface ExecutionRecord {
  id: string;
  executionId: string;
  stepId: string;
  status: ExecutionRecordStatus;
  startedAt?: Date;
  completedAt?: Date;
  skippedAt?: Date;
  failedAt?: Date;
  notes?: string;
  result?: any;
  skipReason?: string;
  failureReason?: string;
  actualDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

export enum ExecutionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum ExecutionRecordStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED'
}

export interface CreateExecutionData {
  workflowId: string;
  title: string;
  description?: string;
  priority?: ExecutionPriority;
  tags?: string[];
  dueDate?: Date;
}

export interface ExecutionFilter {
  page?: number;
  limit?: number;
  search?: string;
  workflowId?: string;
  status?: ExecutionStatus;
  priority?: ExecutionPriority;
  tags?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExecutionStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  paused: number;
  cancelled: number;
  failed: number;
}

export class ExecutionService {
  // 创建执行记录
  async createExecution(data: CreateExecutionData): Promise<Execution> {
    const response = await apiService.post<{ success: boolean; data: Execution }>('/executions', data);
    return (response as any).data;
  }

  // 获取执行记录列表
  async getExecutions(filter?: ExecutionFilter): Promise<{ data: Execution[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await apiService.get<{ success: boolean; data: Execution[]; pagination: any }>(`/executions?${params}`);
    return { data: response.data, pagination: response.pagination };
  }

  // 获取执行详情
  async getExecutionById(id: string): Promise<Execution> {
    const response = await apiService.get<{ success: boolean; data: Execution }>(`/executions/${id}`);
    return (response as any).data;
  }

  // 更新执行记录
  async updateExecution(id: string, data: Partial<CreateExecutionData>): Promise<Execution> {
    const response = await apiService.put<{ success: boolean; data: Execution }>(`/executions/${id}`, data);
    return (response as any).data;
  }

  // 暂停执行
  async pauseExecution(id: string): Promise<Execution> {
    const response = await apiService.post<{ success: boolean; data: Execution }>(`/executions/${id}/pause`);
    return (response as any).data;
  }

  // 恢复执行
  async resumeExecution(id: string): Promise<Execution> {
    const response = await apiService.post<{ success: boolean; data: Execution }>(`/executions/${id}/resume`);
    return (response as any).data;
  }

  // 完成执行
  async completeExecution(id: string): Promise<Execution> {
    const response = await apiService.post<{ success: boolean; data: Execution }>(`/executions/${id}/complete`);
    return (response as any).data;
  }

  // 取消执行
  async cancelExecution(id: string): Promise<Execution> {
    const response = await apiService.post<{ success: boolean; data: Execution }>(`/executions/${id}/cancel`);
    return (response as any).data;
  }

  // 获取执行步骤记录
  async getExecutionRecords(id: string): Promise<ExecutionRecord[]> {
    const response = await apiService.get<{ success: boolean; data: ExecutionRecord[] }>(`/executions/${id}/records`);
    return (response as any).data;
  }

  // 获取下一个待执行步骤
  async getNextPendingStep(id: string): Promise<ExecutionRecord | null> {
    const response = await apiService.get<{ success: boolean; data: ExecutionRecord | null }>(`/executions/${id}/next-step`);
    return (response as any).data;
  }

  // 更新执行进度
  async updateProgress(id: string): Promise<{ progress: number }> {
    const response = await apiService.put<{ success: boolean; data: { progress: number } }>(`/executions/${id}/progress`);
    return (response as any).data;
  }

  // 开始执行步骤
  async startStep(executionId: string, recordId: string): Promise<ExecutionRecord> {
    const response = await apiService.post<{ success: boolean; data: ExecutionRecord }>(`/executions/${executionId}/records/${recordId}/start`);
    return (response as any).data;
  }

  // 完成执行步骤
  async completeStep(executionId: string, recordId: string, data: { notes?: string; result?: any }): Promise<ExecutionRecord> {
    const response = await apiService.post<{ success: boolean; data: ExecutionRecord }>(`/executions/${executionId}/records/${recordId}/complete`, data);
    return (response as any).data;
  }

  // 跳过执行步骤
  async skipStep(executionId: string, recordId: string, reason?: string): Promise<ExecutionRecord> {
    const response = await apiService.post<{ success: boolean; data: ExecutionRecord }>(`/executions/${executionId}/records/${recordId}/skip`, { reason });
    return (response as any).data;
  }

  // 标记步骤失败
  async failStep(executionId: string, recordId: string, reason?: string): Promise<ExecutionRecord> {
    const response = await apiService.post<{ success: boolean; data: ExecutionRecord }>(`/executions/${executionId}/records/${recordId}/fail`, { reason });
    return (response as any).data;
  }

  // 更新执行步骤记录
  async updateExecutionRecord(executionId: string, recordId: string, data: { notes?: string; result?: any; actualDuration?: number }): Promise<ExecutionRecord> {
    const response = await apiService.put<{ success: boolean; data: ExecutionRecord }>(`/executions/${executionId}/records/${recordId}`, data);
    return (response as any).data;
  }

  // 获取执行统计
  async getExecutionStats(workflowId?: string): Promise<ExecutionStats> {
    const params = workflowId ? `?workflowId=${workflowId}` : '';
    const response = await apiService.get<{ success: boolean; data: ExecutionStats }>(`/executions/stats${params}`);
    return (response as any).data;
  }

  // 获取最近的执行记录
  async getRecentExecutions(limit: number = 10): Promise<Execution[]> {
    const response = await apiService.get<{ success: boolean; data: Execution[] }>(`/executions/recent?limit=${limit}`);
    return (response as any).data;
  }

  // 获取进行中的执行记录
  async getInProgressExecutions(): Promise<Execution[]> {
    const response = await apiService.get<{ success: boolean; data: Execution[] }>('/executions/in-progress');
    return (response as any).data;
  }

  // 获取即将到期的执行记录
  async getUpcomingExecutions(days: number = 7): Promise<Execution[]> {
    const response = await apiService.get<{ success: boolean; data: Execution[] }>(`/executions/upcoming?days=${days}`);
    return (response as any).data;
  }

  // 删除执行记录
  async deleteExecution(id: string): Promise<void> {
    await apiService.delete(`/executions/${id}`);
  }

  // 格式化执行状态
  static getStatusText(status: ExecutionStatus): string {
    switch (status) {
      case ExecutionStatus.PENDING:
        return '待开始';
      case ExecutionStatus.IN_PROGRESS:
        return '进行中';
      case ExecutionStatus.COMPLETED:
        return '已完成';
      case ExecutionStatus.PAUSED:
        return '已暂停';
      case ExecutionStatus.CANCELLED:
        return '已取消';
      case ExecutionStatus.FAILED:
        return '已失败';
      default:
        return '未知';
    }
  }

  // 获取状态颜色
  static getStatusColor(status: ExecutionStatus): string {
    switch (status) {
      case ExecutionStatus.PENDING:
        return 'text-gray-600 bg-gray-100';
      case ExecutionStatus.IN_PROGRESS:
        return 'text-blue-600 bg-blue-100';
      case ExecutionStatus.COMPLETED:
        return 'text-green-600 bg-green-100';
      case ExecutionStatus.PAUSED:
        return 'text-yellow-600 bg-yellow-100';
      case ExecutionStatus.CANCELLED:
        return 'text-red-600 bg-red-100';
      case ExecutionStatus.FAILED:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  // 格式化优先级
  static getPriorityText(priority: ExecutionPriority): string {
    switch (priority) {
      case ExecutionPriority.LOW:
        return '低';
      case ExecutionPriority.MEDIUM:
        return '中';
      case ExecutionPriority.HIGH:
        return '高';
      case ExecutionPriority.URGENT:
        return '紧急';
      default:
        return '未知';
    }
  }

  // 获取优先级颜色
  static getPriorityColor(priority: ExecutionPriority): string {
    switch (priority) {
      case ExecutionPriority.LOW:
        return 'text-gray-600 bg-gray-100';
      case ExecutionPriority.MEDIUM:
        return 'text-blue-600 bg-blue-100';
      case ExecutionPriority.HIGH:
        return 'text-orange-600 bg-orange-100';
      case ExecutionPriority.URGENT:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  // 格式化步骤状态
  static getStepStatusText(status: ExecutionRecordStatus): string {
    switch (status) {
      case ExecutionRecordStatus.PENDING:
        return '待处理';
      case ExecutionRecordStatus.IN_PROGRESS:
        return '进行中';
      case ExecutionRecordStatus.COMPLETED:
        return '已完成';
      case ExecutionRecordStatus.SKIPPED:
        return '已跳过';
      case ExecutionRecordStatus.FAILED:
        return '已失败';
      default:
        return '未知';
    }
  }

  // 获取步骤状态颜色
  static getStepStatusColor(status: ExecutionRecordStatus): string {
    switch (status) {
      case ExecutionRecordStatus.PENDING:
        return 'text-gray-600 bg-gray-100';
      case ExecutionRecordStatus.IN_PROGRESS:
        return 'text-blue-600 bg-blue-100';
      case ExecutionRecordStatus.COMPLETED:
        return 'text-green-600 bg-green-100';
      case ExecutionRecordStatus.SKIPPED:
        return 'text-orange-600 bg-orange-100';
      case ExecutionRecordStatus.FAILED:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  // 计算执行进度
  static calculateProgress(executionRecords: ExecutionRecord[]): number {
    if (!executionRecords || executionRecords.length === 0) return 0;
    
    const completedSteps = executionRecords.filter(record => 
      record.status === 'COMPLETED' || record.status === 'SKIPPED'
    ).length;
    
    return Math.round((completedSteps / executionRecords.length) * 100);
  }

  // 格式化持续时间
  static formatDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffInMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} 分钟`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours} 小时 ${minutes} 分钟`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      const hours = Math.floor((diffInMinutes % (24 * 60)) / 60);
      return `${days} 天 ${hours} 小时`;
    }
  }
}

export const executionService = new ExecutionService();