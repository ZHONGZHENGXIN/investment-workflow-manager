// 离线服务 - 简化版本用于部署
class OfflineService {
  private networkListeners: Array<(isOnline: boolean) => void> = [];

  addNetworkListener(callback: (isOnline: boolean) => void) {
    this.networkListeners.push(callback);
  }

  removeNetworkListener(callback: (isOnline: boolean) => void) {
    const index = this.networkListeners.indexOf(callback);
    if (index > -1) {
      this.networkListeners.splice(index, 1);
    }
  }

  async getCachedData(key: string): Promise<any> {
    try {
      const cached = localStorage.getItem(`offline_cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  async cacheData(key: string, data: any, expiry: number = 30): Promise<void> {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        expiry: expiry * 60 * 1000 // 转换为毫秒
      };
      localStorage.setItem(`offline_cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  async cleanExpiredCache(): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      
      keys.forEach(key => {
        if (key.startsWith('offline_cache_')) {
          try {
            const cached = JSON.parse(localStorage.getItem(key) || '{}');
            if (cached.timestamp && cached.expiry) {
              if (now - cached.timestamp > cached.expiry) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to clean cache:', error);
    }
  }

  async syncPendingData(): Promise<void> {
    // 简化版本 - 实际项目中这里会同步待处理的数据
    console.log('Syncing pending data...');
    return Promise.resolve();
  }

  async getOfflineStats(): Promise<{ pendingCount: number; cacheCount: number }> {
    try {
      const keys = Object.keys(localStorage);
      const cacheCount = keys.filter(key => key.startsWith('offline_cache_')).length;
      return {
        pendingCount: 0, // 简化版本
        cacheCount
      };
    } catch {
      return { pendingCount: 0, cacheCount: 0 };
    }
  }
}

export const offlineService = new OfflineService();