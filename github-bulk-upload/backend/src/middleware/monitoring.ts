import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';
import { metricsCollector } from '../utils/metrics';

// 性能监控中间件
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  // 记录请求开始
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId as string;

  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });

  // 监听响应完成
  res.on('finish', () => {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // 记录性能指标
    metricsCollector.recordHttpRequest({
      method: req.method,
      route: req.route?.path || req.path,
      statusCode: res.statusCode,
      duration,
      memoryDelta,
      requestId
    });

    // 记录请求完成
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
      userId: req.user?.id
    });

    // 慢请求告警
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        userId: req.user?.id
      });
    }

    // 错误状态码告警
    if (res.statusCode >= 400) {
      logger.error('HTTP error response', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        userId: req.user?.id
      });
    }
  });

  next();
};

// 错误监控中间件
export const errorMonitoring = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.requestId || 'unknown';

  // 记录错误详情
  logger.error('Unhandled error', {
    requestId,
    method: req.method,
    url: req.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // 记录错误指标
  metricsCollector.recordError({
    type: error.name,
    message: error.message,
    route: req.route?.path || req.path,
    method: req.method,
    requestId
  });

  // 发送错误响应
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  next(error);
};

// 健康检查中间件
export const healthCheck = (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  // 检查数据库连接
  // 这里可以添加数据库健康检查逻辑

  res.json(healthData);
};

// 指标端点中间件
export const metricsEndpoint = (req: Request, res: Response) => {
  const metrics = metricsCollector.getMetrics();
  
  // 返回Prometheus格式的指标
  let prometheusMetrics = '';
  
  // HTTP请求指标
  prometheusMetrics += '# HELP http_requests_total Total number of HTTP requests\n';
  prometheusMetrics += '# TYPE http_requests_total counter\n';
  Object.entries(metrics.httpRequests).forEach(([key, value]) => {
    const [method, route, status] = key.split(':');
    prometheusMetrics += `http_requests_total{method="${method}",route="${route}",status="${status}"} ${value}\n`;
  });

  // HTTP请求持续时间
  prometheusMetrics += '# HELP http_request_duration_seconds HTTP request duration in seconds\n';
  prometheusMetrics += '# TYPE http_request_duration_seconds histogram\n';
  Object.entries(metrics.httpDurations).forEach(([key, durations]) => {
    const [method, route] = key.split(':');
    const sorted = durations.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    
    prometheusMetrics += `http_request_duration_seconds{method="${method}",route="${route}",quantile="0.5"} ${(p50 / 1000).toFixed(3)}\n`;
    prometheusMetrics += `http_request_duration_seconds{method="${method}",route="${route}",quantile="0.95"} ${(p95 / 1000).toFixed(3)}\n`;
    prometheusMetrics += `http_request_duration_seconds{method="${method}",route="${route}",quantile="0.99"} ${(p99 / 1000).toFixed(3)}\n`;
  });

  // 错误指标
  prometheusMetrics += '# HELP application_errors_total Total number of application errors\n';
  prometheusMetrics += '# TYPE application_errors_total counter\n';
  Object.entries(metrics.errors).forEach(([type, count]) => {
    prometheusMetrics += `application_errors_total{type="${type}"} ${count}\n`;
  });

  // 系统指标
  const memUsage = process.memoryUsage();
  prometheusMetrics += '# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes\n';
  prometheusMetrics += '# TYPE nodejs_memory_usage_bytes gauge\n';
  prometheusMetrics += `nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}\n`;
  prometheusMetrics += `nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}\n`;
  prometheusMetrics += `nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}\n`;
  prometheusMetrics += `nodejs_memory_usage_bytes{type="external"} ${memUsage.external}\n`;

  prometheusMetrics += '# HELP nodejs_uptime_seconds Node.js uptime in seconds\n';
  prometheusMetrics += '# TYPE nodejs_uptime_seconds gauge\n';
  prometheusMetrics += `nodejs_uptime_seconds ${process.uptime()}\n`;

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
};

// 用户行为跟踪中间件
export const userBehaviorTracking = (req: Request, res: Response, next: NextFunction) => {
  // 只跟踪已认证用户的行为
  if (req.user) {
    const behaviorData = {
      userId: req.user.id,
      action: `${req.method} ${req.path}`,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      sessionId: req.sessionID
    };

    // 异步记录用户行为
    setImmediate(() => {
      metricsCollector.recordUserBehavior(behaviorData);
    });
  }

  next();
};

// 业务指标跟踪
export const businessMetricsTracking = {
  // 用户注册
  recordUserRegistration: (userId: string) => {
    metricsCollector.recordBusinessMetric('user_registration', 1, { userId });
    logger.info('User registered', { userId, event: 'user_registration' });
  },

  // 工作流创建
  recordWorkflowCreation: (userId: string, workflowId: string) => {
    metricsCollector.recordBusinessMetric('workflow_creation', 1, { userId, workflowId });
    logger.info('Workflow created', { userId, workflowId, event: 'workflow_creation' });
  },

  // 工作流执行
  recordWorkflowExecution: (userId: string, workflowId: string, status: string) => {
    metricsCollector.recordBusinessMetric('workflow_execution', 1, { userId, workflowId, status });
    logger.info('Workflow executed', { userId, workflowId, status, event: 'workflow_execution' });
  },

  // 文件上传
  recordFileUpload: (userId: string, fileSize: number, fileType: string) => {
    metricsCollector.recordBusinessMetric('file_upload', 1, { userId, fileSize, fileType });
    logger.info('File uploaded', { userId, fileSize, fileType, event: 'file_upload' });
  },

  // 复盘创建
  recordReviewCreation: (userId: string, executionId: string) => {
    metricsCollector.recordBusinessMetric('review_creation', 1, { userId, executionId });
    logger.info('Review created', { userId, executionId, event: 'review_creation' });
  }
};

// 系统资源监控
export const systemResourceMonitoring = () => {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // 记录系统资源指标
    metricsCollector.recordSystemMetric('memory_usage', memUsage.heapUsed);
    metricsCollector.recordSystemMetric('memory_total', memUsage.heapTotal);
    metricsCollector.recordSystemMetric('cpu_user', cpuUsage.user);
    metricsCollector.recordSystemMetric('cpu_system', cpuUsage.system);
    metricsCollector.recordSystemMetric('uptime', process.uptime());

    // 内存使用率告警
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      logger.warn('High memory usage detected', {
        memoryUsagePercent: `${memoryUsagePercent.toFixed(2)}%`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }, 30000); // 每30秒检查一次
};