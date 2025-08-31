import { useCallback } from 'react';

interface PreloadOptions {
  priority?: 'high' | 'low';
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch';
  crossOrigin?: 'anonymous' | 'use-credentials';
  type?: string;
}

export const usePreload = () => {
  // 预加载资源
  const preloadResource = useCallback((href: string, options: PreloadOptions = {}) => {
    const { priority = 'low', as = 'fetch', crossOrigin, type } = options;

    // 检查是否已经预加载过
    const existingLink = document.querySelector(`link[href="${href}"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (priority === 'high') {
      link.setAttribute('importance', 'high');
    }
    
    if (crossOrigin) {
      link.crossOrigin = crossOrigin;
    }
    
    if (type) {
      link.type = type;
    }

    document.head.appendChild(link);
  }, []);

  // 预连接到域名
  const preconnect = useCallback((href: string, crossOrigin?: boolean) => {
    const existingLink = document.querySelector(`link[href="${href}"][rel="preconnect"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    
    if (crossOrigin) {
      link.crossOrigin = 'anonymous';
    }

    document.head.appendChild(link);
  }, []);

  // DNS预解析
  const dnsPrefetch = useCallback((href: string) => {
    const existingLink = document.querySelector(`link[href="${href}"][rel="dns-prefetch"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = href;

    document.head.appendChild(link);
  }, []);

  // 预加载图片
  const preloadImage = useCallback((src: string, priority: 'high' | 'low' = 'low') => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      // 设置优先级
      if (priority === 'high') {
        img.loading = 'eager';
      } else {
        img.loading = 'lazy';
      }
      
      img.src = src;
    });
  }, []);

  // 预加载多个图片
  const preloadImages = useCallback(async (sources: string[], priority: 'high' | 'low' = 'low') => {
    const promises = sources.map(src => preloadImage(src, priority));
    return Promise.allSettled(promises);
  }, [preloadImage]);

  // 预加载字体
  const preloadFont = useCallback((href: string, type: string = 'font/woff2') => {
    preloadResource(href, {
      as: 'font',
      type,
      crossOrigin: 'anonymous',
      priority: 'high',
    });
  }, [preloadResource]);

  // 预加载CSS
  const preloadCSS = useCallback((href: string) => {
    preloadResource(href, {
      as: 'style',
      priority: 'high',
    });
  }, [preloadResource]);

  // 预加载JavaScript
  const preloadScript = useCallback((href: string, priority: 'high' | 'low' = 'low') => {
    preloadResource(href, {
      as: 'script',
      priority,
    });
  }, [preloadResource]);

  // 预加载API数据
  const preloadData = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Failed to preload data:', error);
      throw error;
    }
  }, []);

  // 智能预加载（根据用户行为预测）
  const smartPreload = useCallback((routes: string[]) => {
    // 基于用户当前路径预测下一个可能访问的路由
    const currentPath = window.location.pathname;
    
    const predictions = {
      '/dashboard': ['/workflows', '/executions'],
      '/workflows': ['/executions', '/dashboard'],
      '/executions': ['/workflows', '/reviews'],
      '/reviews': ['/history', '/executions'],
      '/history': ['/reviews', '/dashboard'],
    };

    const predictedRoutes = predictions[currentPath as keyof typeof predictions] || [];
    
    predictedRoutes.forEach(route => {
      if (routes.includes(route)) {
        // 预加载路由对应的组件
        import(`../pages${route === '/dashboard' ? '/Dashboard' : route.charAt(1).toUpperCase() + route.slice(2)}`);
      }
    });
  }, []);

  // 基于网络状况的预加载策略
  const adaptivePreload = useCallback((resources: Array<{ url: string; priority: 'high' | 'low' }>) => {
    // 检查网络连接状况
    const connection = (navigator as any).connection;
    const isSlowConnection = connection && ['slow-2g', '2g'].includes(connection.effectiveType);
    const isSaveData = connection && connection.saveData;

    if (isSlowConnection || isSaveData) {
      // 慢网络或省流量模式，只预加载高优先级资源
      resources
        .filter(resource => resource.priority === 'high')
        .forEach(resource => preloadResource(resource.url));
    } else {
      // 快网络，预加载所有资源
      resources.forEach(resource => preloadResource(resource.url, { priority: resource.priority }));
    }
  }, [preloadResource]);

  return {
    preloadResource,
    preconnect,
    dnsPrefetch,
    preloadImage,
    preloadImages,
    preloadFont,
    preloadCSS,
    preloadScript,
    preloadData,
    smartPreload,
    adaptivePreload,
  };
};

// 预加载管理器
export class PreloadManager {
  private static instance: PreloadManager;
  private preloadedResources = new Set<string>();
  private preloadQueue: Array<{ url: string; options: PreloadOptions }> = [];
  private isProcessing = false;

  static getInstance(): PreloadManager {
    if (!PreloadManager.instance) {
      PreloadManager.instance = new PreloadManager();
    }
    return PreloadManager.instance;
  }

  // 添加到预加载队列
  addToQueue(url: string, options: PreloadOptions = {}) {
    if (this.preloadedResources.has(url)) return;
    
    this.preloadQueue.push({ url, options });
    this.processQueue();
  }

  // 处理预加载队列
  private async processQueue() {
    if (this.isProcessing || this.preloadQueue.length === 0) return;
    
    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const { url, options } = this.preloadQueue.shift()!;
      
      try {
        await this.preloadSingle(url, options);
        this.preloadedResources.add(url);
      } catch (error) {
        console.error(`Failed to preload ${url}:`, error);
      }

      // 避免阻塞主线程
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  // 预加载单个资源
  private preloadSingle(url: string, options: PreloadOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = options.as || 'fetch';
      
      if (options.crossOrigin) {
        link.crossOrigin = options.crossOrigin;
      }
      
      if (options.type) {
        link.type = options.type;
      }

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload ${url}`));

      document.head.appendChild(link);
    });
  }

  // 清理预加载的资源
  cleanup() {
    const preloadLinks = document.querySelectorAll('link[rel="preload"]');
    preloadLinks.forEach(link => link.remove());
    this.preloadedResources.clear();
  }

  // 获取预加载统计
  getStats() {
    return {
      preloadedCount: this.preloadedResources.size,
      queueLength: this.preloadQueue.length,
      isProcessing: this.isProcessing,
    };
  }
}