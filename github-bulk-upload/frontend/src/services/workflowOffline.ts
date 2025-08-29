import { offlineApi } from './offlineApi';

export interface Workflow {
  id?: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowStep {
  id?: string;
  name: string;
  description: string;
  type: 'action' | 'decision' | 'input';
  required: boolean;
  order: number;
}

class WorkflowOfflineService {
  private readonly baseEndpoint = '/workflows';

  // 获取所有工作流
  async getWorkflows() {
    return offlineApi.get<Workflow[]>(this.baseEndpoint, {
      cache: true,
      cacheKey: 'workflows:list',
      cacheExpiry: 15, // 15分钟缓存
    });
  }

  // 获取单个工作流
  async getWorkflow(id: string) {
    return offlineApi.get<Workflow>(`${this.baseEndpoint}/${id}`, {
      cache: true,
      cacheKey: `workflow:${id}`,
      cacheExpiry: 30, // 30分钟缓存
    });
  }

  // 创建工作流
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>) {
    return offlineApi.post<Workflow>(this.baseEndpoint, workflow, {
      offlineSupport: true,
      offlineType: 'workflow',
    });
  }

  // 更新工作流
  async updateWorkflow(id: string, workflow: Partial<Workflow>) {
    const response = await offlineApi.put<Workflow>(`${this.baseEndpoint}/${id}`, workflow, {
      offlineSupport: true,
      offlineType: 'workflow',
    });

    // 如果成功，更新缓存
    if (response.success && response.data) {
      await offlineApi.request(`${this.baseEndpoint}/${id}`, {
        method: 'GET',
        cache: true,
        cacheKey: `workflow:${id}`,
      });
    }

    return response;
  }

  // 删除工作流
  async deleteWorkflow(id: string) {
    return offlineApi.delete(`${this.baseEndpoint}/${id}`, {
      offlineSupport: true,
      offlineType: 'workflow',
    });
  }

  // 复制工作流
  async duplicateWorkflow(id: string, newName: string) {
    return offlineApi.post<Workflow>(`${this.baseEndpoint}/${id}/duplicate`, 
      { name: newName }, 
      {
        offlineSupport: true,
        offlineType: 'workflow',
      }
    );
  }

  // 导出工作流
  async exportWorkflow(id: string) {
    return offlineApi.get<Blob>(`${this.baseEndpoint}/${id}/export`, {
      cache: false,
    });
  }

  // 导入工作流
  async importWorkflow(file: File) {
    return offlineApi.uploadFile(`${this.baseEndpoint}/import`, file);
  }

  // 搜索工作流
  async searchWorkflows(query: string, filters?: {
    tags?: string[];
    dateRange?: { start: string; end: string };
  }) {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters?.tags) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    
    if (filters?.dateRange) {
      params.append('startDate', filters.dateRange.start);
      params.append('endDate', filters.dateRange.end);
    }

    return offlineApi.get<Workflow[]>(`${this.baseEndpoint}/search?${params.toString()}`, {
      cache: true,
      cacheKey: `workflows:search:${query}:${JSON.stringify(filters)}`,
      cacheExpiry: 10, // 10分钟缓存
    });
  }

  // 获取工作流统计
  async getWorkflowStats() {
    return offlineApi.get<{
      total: number;
      active: number;
      completed: number;
      draft: number;
    }>(`${this.baseEndpoint}/stats`, {
      cache: true,
      cacheKey: 'workflows:stats',
      cacheExpiry: 5, // 5分钟缓存
    });
  }

  // 批量操作
  async batchUpdateWorkflows(updates: Array<{ id: string; data: Partial<Workflow> }>) {
    const requests = updates.map(({ id, data }) => ({
      endpoint: `${this.baseEndpoint}/${id}`,
      options: {
        method: 'PUT' as const,
        body: data,
        offlineSupport: true,
        offlineType: 'workflow' as const,
      },
    }));

    return offlineApi.batch(requests);
  }

  // 批量删除
  async batchDeleteWorkflows(ids: string[]) {
    const requests = ids.map(id => ({
      endpoint: `${this.baseEndpoint}/${id}`,
      options: {
        method: 'DELETE' as const,
        offlineSupport: true,
        offlineType: 'workflow' as const,
      },
    }));

    return offlineApi.batch(requests);
  }
}

export const workflowOfflineService = new WorkflowOfflineService();
export default workflowOfflineService;