import { apiService } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'analyst';
  createdAt: string;
  lastLogin?: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  role: 'admin' | 'user' | 'analyst';
  password: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: 'admin' | 'user' | 'analyst';
}

export class UserService {
  // 获取所有用户
  async getUsers(): Promise<{ success: boolean; data: User[] }> {
    return apiService.get<{ success: boolean; data: User[] }>('/users');
  }

  // 根据ID获取用户
  async getUserById(id: string): Promise<{ success: boolean; data: User }> {
    return apiService.get<{ success: boolean; data: User }>(`/users/${id}`);
  }

  // 创建新用户
  async createUser(userData: CreateUserData): Promise<{ success: boolean; data: User }> {
    return apiService.post<{ success: boolean; data: User }>('/users', userData);
  }

  // 更新用户信息
  async updateUser(id: string, updateData: UpdateUserData): Promise<{ success: boolean; data: User }> {
    return apiService.put<{ success: boolean; data: User }>(`/users/${id}`, updateData);
  }

  // 删除用户
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return apiService.delete<{ success: boolean; message: string }>(`/users/${id}`);
  }
}

export const userService = new UserService();