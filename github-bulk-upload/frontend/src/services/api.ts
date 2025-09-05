import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://investment-workflow-manager.zeabur.app/api' : 'http://localhost:3000/api');

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加认证令牌
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理错误
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // 令牌过期或无效，清除本地存储并重定向到登录页
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // GET请求
  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.api.get<T>(url, config);
    return (response as any).data;
  }

  // POST请求
  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.post<T>(url, data, config);
    return (response as any).data;
  }

  // PUT请求
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(url, data);
    return (response as any).data;
  }

  // DELETE请求
  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.api.delete<T>(url, config);
    return (response as any).data;
  }
}

export const apiService = new ApiService();
export const api = apiService; // 兼容性导出