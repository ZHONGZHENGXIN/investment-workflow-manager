import { useState, useEffect, useCallback } from 'react';
import { offlineService } from '../services/offline';

interface UseOfflineOptions {
  enableAutoSync?: boolean;
  syncInterval?: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  cacheCount: number;
  syncInProgress: boolean;
  lastSyncTime?: Date;
}

export const useOffline = (options: UseOfflineOptions = {}) => {
  const { enableAutoSync = true, syncInterval = 30000 } = options;
  
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    cacheCount: 0,
    syncInProgress: false,
  });

  // 更新离线统计信息
  const updateStats = useCallback(async () => {
    try {
      const stats = await offlineService.getOfflineStats();
      setState(prev => ({
        ...prev,
        pendingCount: stats.pendingCount,
        cacheCount: stats.cacheCount,
      }));
    } catch (error) {
      console.error('Failed to update offline stats:', error);
    }
  }, []);

  // 手动同步
  const syncData = useCallback(async () => {
    if (!state.isOnline || state.syncInProgress) {
      return false;
    }

    setState(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      await offlineService.syncPendingData();
      setState(prev => ({ 
        ...prev, 
        syncInProgress: false,
        lastSyncTime: new Date()
      }));
      await updateStats();
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      setState(prev => ({ ...prev, syncInProgress: false }));
      return false;
    }
  }, [state.isOnline, state.syncInProgress, updateStats]);

  // 存储离线数据
  const storeOfflineData = useCallback(async (
    _url: string,
    _method: string,
    _headers: Record<string, string>,
    _body?: any,
    _type: 'workflow' | 'execution' | 'review' | 'attachment' = 'workflow'
  ) => {
    try {
      // await offlineService.storeOfflineData(url, method, headers, body, type);
      await updateStats();
      return true;
    } catch (error) {
      console.error('Failed to store offline data:', error);
      return false;
    }
  }, [updateStats]);

  // 缓存数据
  const cacheData = useCallback(async (
    key: string,
    data: any,
    expiryMinutes?: number
  ) => {
    try {
      await offlineService.cacheData(key, data, expiryMinutes);
      await updateStats();
      return true;
    } catch (error) {
      console.error('Failed to cache data:', error);
      return false;
    }
  }, [updateStats]);

  // 获取缓存数据
  const getCachedData = useCallback(async (key: string) => {
    try {
      return await offlineService.getCachedData(key);
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }, []);

  // 清理过期缓存
  const cleanExpiredCache = useCallback(async () => {
    try {
      await offlineService.cleanExpiredCache();
      await updateStats();
      return true;
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
      return false;
    }
  }, [updateStats]);

  useEffect(() => {
    // 监听网络状态变化
    const handleNetworkChange = (isOnline: boolean) => {
      setState(prev => ({ ...prev, isOnline }));
      
      if (isOnline && enableAutoSync) {
        // 网络恢复时自动同步
        setTimeout(() => {
          syncData();
        }, 1000);
      }
    };

    offlineService.addNetworkListener(handleNetworkChange);

    // 监听同步完成事件
    const handleSyncComplete = () => {
      setState(prev => ({ 
        ...prev, 
        syncInProgress: false,
        lastSyncTime: new Date()
      }));
      updateStats();
    };

    window.addEventListener('offline-sync-complete', handleSyncComplete);

    // 初始化统计信息
    updateStats();

    // 设置定期更新统计信息
    let statsInterval: NodeJS.Timeout;
    if (enableAutoSync) {
      statsInterval = setInterval(updateStats, syncInterval);
    }

    return () => {
      offlineService.removeNetworkListener(handleNetworkChange);
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
      if (statsInterval) {
        clearInterval(statsInterval);
      }
    };
  }, [enableAutoSync, syncInterval, updateStats, syncData]);

  return {
    ...state,
    syncData,
    storeOfflineData,
    cacheData,
    getCachedData,
    cleanExpiredCache,
    updateStats,
  };
};

export default useOffline;