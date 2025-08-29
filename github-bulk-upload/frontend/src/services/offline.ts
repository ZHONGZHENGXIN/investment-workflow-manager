import { openDB, DBSchema, IDBPDatabase } from 'idb';

// 离线数据库结构
interface OfflineDB extends DBSchema {
  pending: {
    key: number;
    value: {
      id?: number;
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
      timestamp: number;
      retryCount: number;
      maxRetries: number;
      type: 'workflow' | 'execution' | 'review' | 'attachment';
      data: any;
    };
  };
  cache: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
      expiry?: number;
    };
  };
}

class OfflineService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private listeners: Array<(isOnline: boolean) => void> = [];

  constructor() {
    this.initDB();
    this.setupNetworkListeners();
    this.setupServiceWorkerSync();
  }

  // 初始化数据库
  private async initDB() {
    try {
      this.db = await openDB<OfflineDB>('OfflineData', 1, {
        upgrade(db) {
          // 待同步数据存储
          if (!db.objectStoreNames.contains('pending')) {
            const pendingStore = db.createObjectStore('pending', {
              keyPath: 'id',
              autoIncrement: true,
            });
            pendingStore.createIndex('timestamp', 'timestamp');
            pendingStore.createIndex('type', 'type');
          }

          // 缓存数据存储
          if (!db.objectStoreNames.contains('cache')) {
            const cacheStore = db.createObjectStore('cache', {
              keyPath: 'key',
            });
            cacheStore.createIndex('timestamp', 'timestamp');
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
    }
  }

  // 设置网络状态监听
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  // 设置Service Worker同步
  private setupServiceWorkerSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // 监听来自Service Worker的消息
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_COMPLETE') {
            this.handleSyncComplete(event.data.results);
          }
        });
      });
    }
  }

  // 添加网络状态监听器
  addNetworkListener(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    // 立即调用一次以获取当前状态
    callback(this.isOnline);
  }

  // 移除网络状态监听器
  removeNetworkListener(callback: (isOnline: boolean) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // 通知监听器
  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  // 获取网络状态
  getNetworkStatus() {
    return this.isOnline;
  }

  // 存储离线数据
  async storeOfflineData(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: any,
    type: 'workflow' | 'execution' | 'review' | 'attachment' = 'workflow',
    maxRetries = 3
  ) {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      throw new Error('Offline database not available');
    }

    const data = {
      url,
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      type,
      data: body,
    };

    try {
      await this.db.add('pending', data);
      console.log('Data stored for offline sync:', { url, method, type });
    } catch (error) {
      console.error('Failed to store offline data:', error);
      throw error;
    }
  }

  // 获取待同步数据
  async getPendingData() {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      return [];
    }

    try {
      return await this.db.getAll('pending');
    } catch (error) {
      console.error('Failed to get pending data:', error);
      return [];
    }
  }

  // 同步待处理数据
  async syncPendingData() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingData = await this.getPendingData();
      
      if (pendingData.length === 0) {
        this.syncInProgress = false;
        return;
      }

      console.log(`Starting sync of ${pendingData.length} pending items`);

      const results = [];
      for (const item of pendingData) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body,
          });

          if (response.ok) {
            // 同步成功，删除记录
            await this.removePendingData(item.id!);
            results.push({ id: item.id, success: true });
            console.log('Synced successfully:', item.url);
          } else {
            // 同步失败，增加重试次数
            await this.incrementRetryCount(item.id!);
            results.push({ id: item.id, success: false, error: response.statusText });
          }
        } catch (error) {
          // 网络错误，增加重试次数
          await this.incrementRetryCount(item.id!);
          results.push({ id: item.id, success: false, error: error.message });
          console.error('Sync failed for:', item.url, error);
        }
      }

      // 通知同步完成
      this.notifySyncComplete(results);
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // 删除已同步数据
  private async removePendingData(id: number) {
    if (!this.db) return;

    try {
      await this.db.delete('pending', id);
    } catch (error) {
      console.error('Failed to remove pending data:', error);
    }
  }

  // 增加重试次数
  private async incrementRetryCount(id: number) {
    if (!this.db) return;

    try {
      const item = await this.db.get('pending', id);
      if (item) {
        item.retryCount++;
        
        // 如果超过最大重试次数，删除记录
        if (item.retryCount >= item.maxRetries) {
          await this.db.delete('pending', id);
          console.log('Max retries reached, removing item:', id);
        } else {
          await this.db.put('pending', item);
        }
      }
    } catch (error) {
      console.error('Failed to increment retry count:', error);
    }
  }

  // 缓存数据
  async cacheData(key: string, data: any, expiryMinutes?: number) {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      throw new Error('Offline database not available');
    }

    const cacheItem = {
      key,
      data,
      timestamp: Date.now(),
      expiry: expiryMinutes ? Date.now() + (expiryMinutes * 60 * 1000) : undefined,
    };

    try {
      await this.db.put('cache', cacheItem);
    } catch (error) {
      console.error('Failed to cache data:', error);
      throw error;
    }
  }

  // 获取缓存数据
  async getCachedData(key: string) {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      return null;
    }

    try {
      const item = await this.db.get('cache', key);
      
      if (!item) {
        return null;
      }

      // 检查是否过期
      if (item.expiry && Date.now() > item.expiry) {
        await this.db.delete('cache', key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  // 清理过期缓存
  async cleanExpiredCache() {
    if (!this.db) return;

    try {
      const allItems = await this.db.getAll('cache');
      const now = Date.now();
      
      for (const item of allItems) {
        if (item.expiry && now > item.expiry) {
          await this.db.delete('cache', item.key);
        }
      }
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
    }
  }

  // 获取离线统计信息
  async getOfflineStats() {
    if (!this.db) {
      await this.initDB();
    }

    if (!this.db) {
      return { pendingCount: 0, cacheCount: 0 };
    }

    try {
      const [pendingCount, cacheCount] = await Promise.all([
        this.db.count('pending'),
        this.db.count('cache'),
      ]);

      return { pendingCount, cacheCount };
    } catch (error) {
      console.error('Failed to get offline stats:', error);
      return { pendingCount: 0, cacheCount: 0 };
    }
  }

  // 处理同步完成
  private handleSyncComplete(results: any[]) {
    console.log('Background sync completed:', results);
    // 可以在这里触发UI更新或通知
  }

  // 通知同步完成
  private notifySyncComplete(results: any[]) {
    // 发送自定义事件
    window.dispatchEvent(new CustomEvent('offline-sync-complete', {
      detail: { results }
    }));
  }

  // 注册后台同步
  async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-offline-data');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Failed to register background sync:', error);
      }
    }
  }
}

// 创建单例实例
export const offlineService = new OfflineService();
export default offlineService;