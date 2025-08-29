import { apiService } from './api';
import { Workflow, CreateWorkflowData, UpdateWorkflowData, WorkflowStats } from '../types/workflow';

export class WorkflowService {
  // 获取用户的所有工作流
  async getUserWorkflows(): Promise<{ success: boolean; data: { workflows: Workflow[] } }> {
    return apiService.get<{ success: boolean; data: { workflows: Workflow[] } }>('/workflows');
  }

  // 创建新工作流
  async createWorkflow(workflowData: CreateWorkflowData): Promise<{ success: boolean; data: { workflow: Workflow } }> {
    return apiService.post<{ success: boolean; data: { workflow: Workflow } }>('/workflows', workflowData);
  }

  // 根据ID获取工作流
  async getWorkflowById(id: string): Promise<{ success: boolean; data: { workflow: Workflow } }> {
    return apiService.get<{ success: boolean; data: { workflow: Workflow } }>(`/workflows/${id}`);
  }

  // 更新工作流
  async updateWorkflow(id: string, updateData: UpdateWorkflowData): Promise<{ success: boolean; data: { workflow: Workflow } }> {
    return apiService.put<{ success: boolean; data: { workflow: Workflow } }>(`/workflows/${id}`, updateData);
  }

  // 删除工作流
  async deleteWorkflow(id: string): Promise<{ success: boolean; message: string }> {
    return apiService.delete<{ success: boolean; message: string }>(`/workflows/${id}`);
  }

  // 复制工作流
  async duplicateWorkflow(id: string, name?: string): Promise<{ success: boolean; data: { workflow: Workflow } }> {
    return apiService.post<{ success: boolean; data: { workflow: Workflow } }>(`/workflows/${id}/duplicate`, { name });
  }

  // 获取工作流统计信息
  async getWorkflowStats(id: string): Promise<{ success: boolean; data: { stats: WorkflowStats } }> {
    return apiService.get<{ success: boolean; data: { stats: WorkflowStats } }>(`/workflows/${id}/stats`);
  }
}

export const workflowService = new WorkflowService();