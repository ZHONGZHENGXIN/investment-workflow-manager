import { apiService } from './api';

export interface Business {
  id: string;
  name: string;
  symbol: string;
  sector: string;
  marketCap: number;
  status: 'active' | 'inactive';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessData {
  name: string;
  symbol: string;
  sector: string;
  marketCap?: number;
  description?: string;
}

export interface UpdateBusinessData {
  name?: string;
  symbol?: string;
  sector?: string;
  marketCap?: number;
  status?: 'active' | 'inactive';
  description?: string;
}

export class BusinessService {
  // 获取所有业务
  async getBusinesses(): Promise<{ success: boolean; data: Business[] }> {
    return apiService.get<{ success: boolean; data: Business[] }>('/businesses');
  }

  // 根据ID获取业务
  async getBusinessById(id: string): Promise<{ success: boolean; data: Business }> {
    return apiService.get<{ success: boolean; data: Business }>(`/businesses/${id}`);
  }

  // 创建新业务
  async createBusiness(businessData: CreateBusinessData): Promise<{ success: boolean; data: Business }> {
    return apiService.post<{ success: boolean; data: Business }>('/businesses', businessData);
  }

  // 更新业务信息
  async updateBusiness(id: string, updateData: UpdateBusinessData): Promise<{ success: boolean; data: Business }> {
    return apiService.put<{ success: boolean; data: Business }>(`/businesses/${id}`, updateData);
  }

  // 删除业务
  async deleteBusiness(id: string): Promise<{ success: boolean; message: string }> {
    return apiService.delete<{ success: boolean; message: string }>(`/businesses/${id}`);
  }
}

export const businessService = new BusinessService();