// 性能优化配置

export const PERFORMANCE_CONFIG = {
  // 虚拟滚动配置
  virtualScroll: {
    itemHeight: 60,
    overscan: 5,
    threshold: 100, // 超过100项时启用虚拟滚动
  },

  // 图片优化配置
  images: {
    lazyLoadThreshold: '50px',
    quality: {
      high: 90,
      medium: 75,
      low: 60,
    },
    formats: ['webp', 'jpg', 'png'],
    sizes: {
      thumbnail: 150,
      small: 300,
      medium: 600,
      large: 1200,
    },
  },

  // 缓存配置
  cache: {
    maxAge: {
      static: 31536000, // 1年
      api: 300, // 5分钟
      images: 86400, // 1天
    },
    maxSize: {
      memory: 50 * 1024 * 1024, // 50MB
      disk: 100 * 1024 * 1024, // 100MB
    },
  },

  // 预加载配置
  preload: {
    critical: [
      '/api/user/profile',
      '/api/workflows/recent',
    ],
    routes: {
      high: ['/dashboard', '/workflows'],
      medium: ['/executions', '/attachments'],
      low: ['/reviews', '/history'],
    },
    images: {
      eager: [], // 立即加载的图片
      lazy: [], // 懒加载的图片
    },
  },

  // 代码分割配置
  codeSplitting: {
    chunkSize: {
      min: 20000, // 20KB
      max: 244000, // 244KB
    },
    routes: true,
    vendors: true,
    commons: true,
  },

  // 性能预算
  budget: {
    loadTime: 3000, // 3秒
    firstContentfulPaint: 1500, // 1.5秒
    largestContentfulPaint: 2500, // 2.5秒
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 100, // 100ms
    memoryUsage: 50 * 1024 * 1024, // 50MB
    bundleSize: {
      initial: 200 * 1024, // 200KB
      total: 1024 * 1024, // 1MB
    },
  },

  // 网络优化配置
  network: {
    timeout: 10000, // 10秒
    retries: 3,
    retryDelay: 1000, // 1秒
    compression: true,
    keepAlive: true,
  },

  // 渲染优化配置
  rendering: {
    debounceDelay: 300, // 300ms
    throttleDelay: 100, // 100ms
    batchSize: 50, // 批处理大小
    frameRate: 60, // 目标帧率
  },
};

// 根据设备性能调整配置
export const getAdaptiveConfig = () => {
  const config = { ...PERFORMANCE_CONFIG };
  
  // 检测设备性能
  const isLowEndDevice = () => {
    // 检查内存
    const memory = (navigator as any).deviceMemory;
    if (memory && memory < 4) return true;
    
    // 检查CPU核心数
    const cores = navigator.hardwareConcurrency;
    if (cores && cores < 4) return true;
    
    // 检查网络连接
    const connection = (navigator as any).connection;
    if (connection && ['slow-2g', '2g'].includes(connection.effectiveType)) {
      return true;
    }
    
    return false;
  };

  if (isLowEndDevice()) {
    // 低端设备优化
    config.virtualScroll.threshold = 50;
    config.images.quality.high = 75;
    config.images.quality.medium = 60;
    config.images.quality.low = 45;
    config.preload.routes.high = ['/dashboard'];
    config.preload.routes.medium = [];
    config.rendering.batchSize = 25;
  }

  return config;
};

// 性能监控配置
export const MONITORING_CONFIG = {
  enabled: process.env.NODE_ENV === 'production',
  sampleRate: 0.1, // 10%采样率
  metrics: {
    webVitals: true,
    userTiming: true,
    resourceTiming: true,
    navigationTiming: true,
    memoryUsage: true,
  },
  thresholds: {
    fcp: 1500, // First Contentful Paint
    lcp: 2500, // Largest Contentful Paint
    fid: 100,  // First Input Delay
    cls: 0.1,  // Cumulative Layout Shift
    ttfb: 600, // Time to First Byte
  },
  reporting: {
    endpoint: '/api/performance',
    batchSize: 10,
    flushInterval: 30000, // 30秒
  },
};

// 获取当前性能状态
export const getPerformanceState = () => {
  const connection = (navigator as any).connection;
  const memory = (navigator as any).memory;
  
  return {
    // 网络状态
    network: {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      saveData: connection?.saveData || false,
    },
    
    // 内存状态
    memory: memory ? {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    } : null,
    
    // 设备信息
    device: {
      cores: navigator.hardwareConcurrency || 1,
      memory: (navigator as any).deviceMemory || 0,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    },
    
    // 页面状态
    page: {
      visibility: document.visibilityState,
      focused: document.hasFocus(),
      url: window.location.href,
      referrer: document.referrer,
    },
  };
};