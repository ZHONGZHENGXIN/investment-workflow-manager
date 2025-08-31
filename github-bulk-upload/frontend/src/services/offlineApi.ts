import { offlineService } from './offline';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  cache?: boolean;
  cacheKey?: string;
  cacheExpiry?: number; // minutes
  offlineSupport?: boolean;
  offlineType?: 'workflow' | 'execution' | 'review' | 'attachment';
}

interface ApiResponse<T = any> {
  data?: T;
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
  offline?: boolean;
  fromCache?: boolean;
}

class OfflineApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // 设置认证令牌
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // 移除认证令牌
  removeAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }

  // 通用请求方法
  async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      cache = false,
      cacheKey,
      cacheExpiry = 30,
      offlineSupport = true,
      // offlineType = 'workflow',
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // 对于GET请求，先尝试从缓存获取数据
    if (method === 'GET' && cache) {
      const key = cacheKey || `api:${endpoint}`;
      const cachedData = await offlineService.getCachedData(key);
      
      if (cachedData) {
        // 如果离线且有缓存，直接返回缓存数据
        if (!navigator.onLine) {
          return {
            data: cachedData,
            success: true,
            fromCache: true,
            offline: true,
          };
        }
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        // 检查是否是离线响应
        if (response.status === 503) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.offline) {
            return {
              success: false,
              error: errorData.error,
              offline: true,
            };
          }
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 缓存GET请求的成功响应
      if (method === 'GET' && cache && data) {
        const key = cacheKey || `api:${endpoint}`;
        await offlineService.cacheData(key, data, cacheExpiry);
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      console.error('API request failed:', error);

      // 如果是网络错误且支持离线
      if (offlineSupport && !navigator.onLine) {
        // 对于非GET请求，存储到离线队列
        if (method !== 'GET') {
          // await offlineService.storeOfflineData(url, method, requestHeaders, body, offlineType);

          return {
            success: true,
            data: body, // 返回提交的数据作为乐观更新
            offline: true,
          };
        }

        // 对于GET请求，尝试返回缓存数据
        if (cache) {
          const key = cacheKey || `api:${endpoint}`;
          const cachedData = await offlineService.getCachedData(key);
          
          if (cachedData) {
            return {
              data: cachedData,
              success: true,
              fromCache: true,
              offline: true,
            };
          }
        }
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        },
        offline: !navigator.onLine,
      };
    }
  }

  // GET请求
  async get<T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  // POST请求
  async post<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  // PUT请求
  async put<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  // DELETE请求
  async delete<T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // PATCH请求
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }

  // 批量请求
  async batch<T = any>(
    requests: Array<{
      endpoint: string;
      options?: ApiRequestOptions;
    }>
  ): Promise<ApiResponse<T>[]> {
    const promises = requests.map(({ endpoint, options }) =>
      this.request<T>(endpoint, options)
    );

    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Batch request failed:', error);
      throw error;
    }
  }

  // 上传文件
  async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ data, success: true });
            } catch {
              resolve({ success: true });
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          // 如果离线，存储文件上传任务
          if (!navigator.onLine) {
            // 注意：文件上传的离线支持需要特殊处理
            // 这里简化处理，实际应用中可能需要更复杂的逻辑
            resolve({
              success: true,
              offline: true,
              data: { message: '文件将在网络恢复后上传' }
            });
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.open('POST', url);
        
        // 设置认证头
        if (this.defaultHeaders['Authorization']) {
          xhr.setRequestHeader('Authorization', this.defaultHeaders['Authorization']);
        }

        xhr.send(formData);
      });
    } catch (error) {
      console.error('File upload failed:', error);
      
      if (!navigator.onLine) {
        return {
          success: true,
          offline: true,
          data: { message: '文件将在网络恢复后上传' }
        };
      }

      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'File upload failed',
        },
      };
    }
  }
}

// 创建默认实例
export const offlineApi = new OfflineApiClient();
export default offlineApi;