import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { 
  setOnlineStatus, 
  syncOfflineData, 
  updateOfflineStats,
  addSyncError 
} from '../store/offlineSlice';
import { offlineService } from '../services/offline';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  cacheCount: number;
  syncInProgress: boolean;
  lastSyncTime?: string;
  syncErrors: Array<{
    id: string;
    message: string;
    timestamp: string;
  }>;
  manualSync: () => Promise<void>;
  clearCache: () => Promise<void>;
  getOfflineCapabilities: () => OfflineCapabilities;
}

interface OfflineCapabilities {
  serviceWorkerSupported: boolean;
  indexedDBSupported: boolean;
  backgroundSyncSupported: boolean;
  cacheAPISupported: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const offlineState = useSelector((state: RootState) => state.offline);
  const [capabilities, setCapabilities] = useState<OfflineCapabilities>({
    serviceWorkerSupported: false,
    indexedDBSupported: false,
    backgroundSyncSupported: false,
    cacheAPISupported: false,
  });

  // 检测离线功能支持
  useEffect(() => {
    const checkCapabilities = () => {
      setCapabilities({
        serviceWorkerSupported: 'serviceWorker' in navigator,
        indexedDBSupported: 'indexedDB' in window,
        backgroundSyncSupported: 
          'serviceWorker' in navigator && 
          'sync' in window.ServiceWorkerRegistration.prototype,
        cacheAPISupported: 'caches' in window,
      });
    };

    checkCapabilities();
  }, []);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      dispatch(setOnlineStatus(true));
      // 网络恢复时自动同步
      dispatch(syncOfflineData());
    };

    const handleOffline = () => {
      dispatch(setOnlineStatus(false));
    };

    // 监听网络状态变化
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 设置初始状态
    dispatch(setOnlineStatus(navigator.onLine));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  // 监听离线服务的网络状态变化
  useEffect(() => {
    const handleNetworkChange = (isOnline: boolean) => {
      dispatch(setOnlineStatus(isOnline));
    };

    // 检查 offlineService 是否存在
    if (typeof offlineService?.addNetworkListener === 'function') {
      offlineService.addNetworkListener(handleNetworkChange);

      return () => {
        if (typeof offlineService?.removeNetworkListener === 'function') {
          offlineService.removeNetworkListener(handleNetworkChange);
        }
      };
    }
  }, [dispatch]);

  // 监听同步完成事件
  useEffect(() => {
    const handleSyncComplete = (event: CustomEvent) => {
      const { results } = event.detail;
      
      // 检查是否有同步错误
      const errors = results.filter((result: any) => !result.success);
      if (errors.length > 0) {
        errors.forEach((error: any) => {
          dispatch(addSyncError({ message: error.error || 'Sync failed' }));
        });
      }

      // 更新统计信息
      dispatch(updateOfflineStats());
    };

    window.addEventListener('offline-sync-complete', handleSyncComplete as EventListener);

    return () => {
      window.removeEventListener('offline-sync-complete', handleSyncComplete as EventListener);
    };
  }, [dispatch]);

  // 定期更新统计信息
  useEffect(() => {
    const updateStats = () => {
      dispatch(updateOfflineStats());
    };

    // 立即更新一次
    updateStats();

    // 每30秒更新一次
    const interval = setInterval(updateStats, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // 手动同步
  const manualSync = async () => {
    try {
      await dispatch(syncOfflineData()).unwrap();
    } catch (error) {
      console.error('Manual sync failed:', error);
      dispatch(addSyncError({ 
        message: error instanceof Error ? error.message : 'Manual sync failed' 
      }));
    }
  };

  // 清理缓存
  const clearCache = async () => {
    try {
      if (typeof offlineService?.cleanExpiredCache === 'function') {
        await offlineService.cleanExpiredCache();
      }
      dispatch(updateOfflineStats());
    } catch (error) {
      console.error('Failed to clear cache:', error);
      dispatch(addSyncError({ 
        message: error instanceof Error ? error.message : 'Failed to clear cache' 
      }));
    }
  };

  // 获取离线功能支持情况
  const getOfflineCapabilities = () => capabilities;

  const contextValue: OfflineContextType = {
    isOnline: offlineState.isOnline,
    pendingCount: offlineState.pendingCount,
    cacheCount: offlineState.cacheCount,
    syncInProgress: offlineState.syncInProgress,
    lastSyncTime: offlineState.lastSyncTime,
    syncErrors: offlineState.syncErrors,
    manualSync,
    clearCache,
    getOfflineCapabilities,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};

// Hook for using offline context
export const useOfflineContext = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
};

// Hook for checking if a feature is available offline
export const useOfflineFeature = (feature: keyof OfflineCapabilities): boolean => {
  const { getOfflineCapabilities } = useOfflineContext();
  return getOfflineCapabilities()[feature];
};

// Hook for offline-aware data fetching
export const useOfflineData = <T,>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    cacheExpiry?: number;
    refetchOnReconnect?: boolean;
  } = {}
) => {
  const { isOnline } = useOfflineContext();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const { cacheExpiry = 30, refetchOnReconnect = true } = options;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 尝试从缓存获取数据
        let cachedData = null;
        if (typeof offlineService?.getCachedData === 'function') {
          cachedData = await offlineService.getCachedData(key);
        }
        
        if (cachedData && !isOnline) {
          // 离线时使用缓存数据
          setData(cachedData);
          setFromCache(true);
          setLoading(false);
          return;
        }

        if (isOnline) {
          // 在线时获取新数据
          const freshData = await fetcher();
          setData(freshData);
          setFromCache(false);
          
          // 缓存新数据
          if (typeof offlineService?.cacheData === 'function') {
            await offlineService.cacheData(key, freshData, cacheExpiry);
          }
        } else if (cachedData) {
          // 离线但有缓存数据
          setData(cachedData);
          setFromCache(true);
        } else {
          // 离线且无缓存数据
          throw new Error('No cached data available offline');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, isOnline, fetcher, cacheExpiry]);

  // 网络恢复时重新获取数据
  useEffect(() => {
    if (isOnline && refetchOnReconnect && fromCache) {
      const refetch = async () => {
        try {
          const freshData = await fetcher();
          setData(freshData);
          setFromCache(false);
          if (typeof offlineService?.cacheData === 'function') {
            await offlineService.cacheData(key, freshData, cacheExpiry);
          }
        } catch (err) {
          console.error('Failed to refetch data on reconnect:', err);
        }
      };

      refetch();
    }
  }, [isOnline, refetchOnReconnect, fromCache, key, fetcher, cacheExpiry]);

  return { data, loading, error, fromCache };
};

export default OfflineContext;