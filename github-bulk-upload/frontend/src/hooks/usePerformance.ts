import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  connectionType?: string;
  isSlowConnection: boolean;
}

interface UsePerformanceOptions {
  trackMemory?: boolean;
  trackConnection?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const usePerformance = (options: UsePerformanceOptions = {}) => {
  const { trackMemory = false, trackConnection = true, onMetricsUpdate } = options;
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    isSlowConnection: false,
  });
  const renderStartTime = useRef<number>(Date.now());

  useEffect(() => {
    const updateMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const renderTime = Date.now() - renderStartTime.current;
      
      let memoryUsage: number | undefined;
      if (trackMemory && 'memory' in performance) {
        const memory = (performance as any).memory;
        memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      let connectionType: string | undefined;
      let isSlowConnection = false;
      if (trackConnection && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        connectionType = connection.effectiveType;
        isSlowConnection = ['slow-2g', '2g'].includes(connection.effectiveType);
      }

      const newMetrics: PerformanceMetrics = {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        renderTime,
        memoryUsage,
        connectionType,
        isSlowConnection,
      };

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    };

    // 等待页面完全加载后再计算指标
    if (document.readyState === 'complete') {
      updateMetrics();
    } else {
      window.addEventListener('load', updateMetrics);
    }

    return () => {
      window.removeEventListener('load', updateMetrics);
    };
  }, [trackMemory, trackConnection, onMetricsUpdate]);

  return metrics;
};

// 性能监控工具函数
export const measurePerformance = {
  // 测量函数执行时间
  measureFunction: <T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      console.log(`${name || fn.name} took ${end - start} milliseconds`);
      
      return result;
    }) as T;
  },

  // 测量异步函数执行时间
  measureAsyncFunction: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name?: string
  ): T => {
    return (async (...args: Parameters<T>) => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      
      console.log(`${name || fn.name} took ${end - start} milliseconds`);
      
      return result;
    }) as T;
  },

  // 标记性能时间点
  mark: (name: string) => {
    if ('mark' in performance) {
      performance.mark(name);
    }
  },

  // 测量两个标记之间的时间
  measure: (name: string, startMark: string, endMark?: string) => {
    if ('measure' in performance) {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      console.log(`${name}: ${measure.duration} milliseconds`);
      return measure.duration;
    }
    return 0;
  },

  // 获取页面加载性能指标
  getPageMetrics: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (!navigation) return null;

    return {
      // DNS查询时间
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      // TCP连接时间
      tcpConnect: navigation.connectEnd - navigation.connectStart,
      // 请求响应时间
      request: navigation.responseEnd - navigation.requestStart,
      // DOM解析时间
      domParse: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      // 页面完全加载时间
      pageLoad: navigation.loadEventEnd - navigation.loadEventStart,
      // 首次内容绘制时间
      firstContentfulPaint: getFirstContentfulPaint(),
      // 最大内容绘制时间
      largestContentfulPaint: getLargestContentfulPaint(),
    };
  },

  // 获取资源加载性能
  getResourceMetrics: () => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    return resources.map(resource => ({
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize,
      type: getResourceType(resource.name),
    }));
  },
};

// 获取首次内容绘制时间
const getFirstContentfulPaint = (): number => {
  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  return fcpEntry ? fcpEntry.startTime : 0;
};

// 获取最大内容绘制时间
const getLargestContentfulPaint = (): number => {
  return new Promise((resolve) => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
        observer.disconnect();
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // 超时处理
      setTimeout(() => {
        observer.disconnect();
        resolve(0);
      }, 5000);
    } else {
      resolve(0);
    }
  }) as any;
};

// 获取资源类型
const getResourceType = (url: string): string => {
  if (url.match(/\.(js|jsx|ts|tsx)$/)) return 'script';
  if (url.match(/\.(css|scss|sass)$/)) return 'stylesheet';
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
  if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
  if (url.includes('/api/')) return 'api';
  return 'other';
};

// 性能预算检查
export const checkPerformanceBudget = (metrics: PerformanceMetrics) => {
  const budget = {
    loadTime: 3000, // 3秒
    renderTime: 1000, // 1秒
    memoryUsage: 50, // 50MB
  };

  const violations = [];

  if (metrics.loadTime > budget.loadTime) {
    violations.push(`Load time exceeded budget: ${metrics.loadTime}ms > ${budget.loadTime}ms`);
  }

  if (metrics.renderTime > budget.renderTime) {
    violations.push(`Render time exceeded budget: ${metrics.renderTime}ms > ${budget.renderTime}ms`);
  }

  if (metrics.memoryUsage && metrics.memoryUsage > budget.memoryUsage) {
    violations.push(`Memory usage exceeded budget: ${metrics.memoryUsage}MB > ${budget.memoryUsage}MB`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
};