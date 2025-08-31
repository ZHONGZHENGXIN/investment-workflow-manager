import { useState, useEffect, useRef, useCallback } from 'react';
import { useOfflineContext } from '../contexts/OfflineContext';

interface QueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  retry?: number;
  retryDelay?: number;
  select?: (data: any) => T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  placeholderData?: T;
  keepPreviousData?: boolean;
}

interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
  remove: () => void;
}

// 全局查询缓存
const queryCache = new Map<string, {
  data: any;
  timestamp: number;
  staleTime: number;
  cacheTime: number;
}>();

// 清理过期缓存
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > value.cacheTime) {
      queryCache.delete(key);
    }
  }
};

// 定期清理缓存
setInterval(cleanupCache, 60000); // 每分钟清理一次

export function useOptimizedQuery<T = any>(
  queryKey: string | string[],
  queryFn: () => Promise<T>,
  options: QueryOptions<T> = {}
): QueryResult<T> {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5分钟
    cacheTime = 10 * 60 * 1000, // 10分钟
    refetchOnWindowFocus = true,
    refetchOnReconnect = true,
    retry = 3,
    retryDelay = 1000,
    select,
    onSuccess,
    onError,
    placeholderData,
    keepPreviousData = false,
  } = options;

  const { isOnline } = useOfflineContext();
  const [data, setData] = useState<T | undefined>(placeholderData);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;

  // 从缓存获取数据
  const getCachedData = useCallback(() => {
    const cached = queryCache.get(cacheKey);
    if (cached) {
      const now = Date.now();
      const isStale = now - cached.timestamp > cached.staleTime;
      return { data: cached.data, isStale };
    }
    return null;
  }, [cacheKey]);

  // 设置缓存数据
  const setCachedData = useCallback((newData: T) => {
    queryCache.set(cacheKey, {
      data: newData,
      timestamp: Date.now(),
      staleTime,
      cacheTime,
    });
  }, [cacheKey, staleTime, cacheTime]);

  // 执行查询
  const executeQuery = useCallback(async (isRefetch = false) => {
    if (!enabled || (!isOnline && !getCachedData())) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    if (!isRefetch) {
      setIsLoading(true);
    }
    setIsFetching(true);
    setIsError(false);
    setError(null);

    try {
      const result = await queryFn();
      const processedData = select ? select(result) : result;
      
      if (!keepPreviousData || !data) {
        setData(processedData);
      }
      
      setCachedData(processedData);
      setIsStale(false);
      retryCountRef.current = 0;
      
      onSuccess?.(processedData);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Query failed');
      
      if (errorObj.name === 'AbortError') return;
      
      // 重试逻辑
      if (retryCountRef.current < retry) {
        retryCountRef.current++;
        const delay = retryDelay * Math.pow(2, retryCountRef.current - 1); // 指数退避
        
        timeoutRef.current = setTimeout(() => {
          executeQuery(isRefetch);
        }, delay);
        return;
      }
      
      setIsError(true);
      setError(errorObj);
      onError?.(errorObj);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [enabled, isOnline, queryFn, select, data, keepPreviousData, setCachedData, onSuccess, retry, retryDelay, onError, getCachedData]);

  // 手动重新获取
  const refetch = useCallback(async () => {
    await executeQuery(true);
  }, [executeQuery]);

  // 移除查询
  const remove = useCallback(() => {
    queryCache.delete(cacheKey);
    setData(undefined);
    setIsError(false);
    setError(null);
    setIsStale(false);
  }, [cacheKey]);

  // 初始化和缓存检查
  useEffect(() => {
    if (!enabled) return;

    const cached = getCachedData();
    if (cached) {
      setData(cached.data);
      setIsStale(cached.isStale);
      
      // 如果数据过期，重新获取
      if (cached.isStale) {
        executeQuery();
      }
    } else {
      executeQuery();
    }
  }, [enabled, cacheKey, getCachedData, executeQuery]);

  // 窗口焦点重新获取
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      const cached = getCachedData();
      if (!cached || cached.isStale) {
        executeQuery(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, getCachedData, executeQuery]);

  // 网络重连重新获取
  useEffect(() => {
    if (!refetchOnReconnect || !enabled) return;

    if (isOnline) {
      const cached = getCachedData();
      if (!cached || cached.isStale) {
        executeQuery(true);
      }
    }
  }, [isOnline, refetchOnReconnect, enabled, getCachedData, executeQuery]);

  // 清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    isError,
    error,
    isStale,
    isFetching,
    refetch,
    remove,
  };
}

// 批量查询Hook
export function useOptimizedQueries<T = any>(
  queries: Array<{
    queryKey: string | string[];
    queryFn: () => Promise<T>;
    options?: QueryOptions<T>;
  }>
): QueryResult<T>[] {
  const results = queries.map(({ queryKey, queryFn, options }) =>
    useOptimizedQuery(queryKey, queryFn, options)
  );

  return results;
}

// 无限查询Hook（用于分页数据）
export function useInfiniteQuery<T = any>(
  queryKey: string | string[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<{
    data: T[];
    nextPage?: number;
    hasNextPage: boolean;
  }>,
  options: QueryOptions<T> & {
    getNextPageParam?: (lastPage: any, allPages: any[]) => number | undefined;
  } = {}
) {
  const [pages, setPages] = useState<T[][]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const { getNextPageParam } = options;

  const baseQuery = useOptimizedQuery(
    Array.isArray(queryKey) ? [...queryKey.map(String), 'page', '0'] : [String(queryKey), 'page', '0'],
    () => queryFn({ pageParam: 0 }),
    {
      ...options,
      onSuccess: (data: any) => {
        setPages([data.data]);
        setHasNextPage(data.hasNextPage);
        options.onSuccess?.(data);
      },
    }
  );

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    setIsFetchingNextPage(true);
    try {
      const nextPageParam = getNextPageParam 
        ? getNextPageParam(pages[pages.length - 1], pages)
        : pages.length;

      if (nextPageParam === undefined) {
        setHasNextPage(false);
        return;
      }

      const result = await queryFn({ pageParam: nextPageParam });
      setPages(prev => [...prev, result.data]);
      setHasNextPage(result.hasNextPage);
    } catch (error) {
      console.error('Failed to fetch next page:', error);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [hasNextPage, isFetchingNextPage, pages, queryFn, getNextPageParam]);

  return {
    ...baseQuery,
    data: pages.flat(),
    pages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}

// 查询缓存管理
export const queryClient = {
  // 获取缓存数据
  getQueryData: (queryKey: string | string[]) => {
    const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
    const cached = queryCache.get(key);
    return cached?.data;
  },

  // 设置缓存数据
  setQueryData: (queryKey: string | string[], data: any) => {
    const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
    queryCache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    });
  },

  // 使查询无效
  invalidateQueries: (queryKey: string | string[]) => {
    const key = Array.isArray(queryKey) ? queryKey.join(':') : queryKey;
    queryCache.delete(key);
  },

  // 清除所有缓存
  clear: () => {
    queryCache.clear();
  },

  // 获取缓存统计
  getStats: () => ({
    size: queryCache.size,
    keys: Array.from(queryCache.keys()),
  }),
};