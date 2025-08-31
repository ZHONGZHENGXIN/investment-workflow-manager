import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
// 简化版logger已移除，使用标准logger

// 日志级别
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// 日志颜色
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(logColors);

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// 创建日志目录
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// 文件传输配置
const fileTransports = [
  // 所有日志
  new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat
  }),
  
  // 错误日志
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: logFormat
  }),
  
  // HTTP请求日志
  new DailyRotateFile({
    filename: path.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
    level: 'http',
    format: logFormat
  }),
  
  // 业务日志
  new DailyRotateFile({
    filename: path.join(logDir, 'business-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
  })
];

// 创建logger实例，添加容错处理
let logger: winston.Logger;
let useSimpleLogger = false;

try {
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels: logLevels,
    format: logFormat,
    transports: fileTransports,
    exitOnError: false
  });

  // 开发环境添加控制台输出
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: consoleFormat
    }));
  }

  // 生产环境错误处理
  if (process.env.NODE_ENV === 'production') {
    // 可以添加外部日志服务，如Sentry、LogRocket等
    logger.add(new winston.transports.Console({
      level: 'error',
      format: consoleFormat
    }));
  }

  // 测试logger是否正常工作
  logger.info('Logger initialized successfully');
} catch (error) {
  console.warn('Failed to initialize winston logger, falling back to simple logger:', error);
  useSimpleLogger = true;
  logger = simpleLogger as any;
}

// 创建安全的日志记录函数
const safeLog = (level: string, message: string, meta?: any) => {
  try {
    if (useSimpleLogger) {
      (simpleLogger as any)[level](message, meta);
    } else {
      (logger as any)[level](message, meta);
    }
  } catch (error) {
    console.error(`Logging failed for level ${level}:`, error);
    console.log(`Original message: ${message}`, meta);
  }
};

// 重新包装logger方法以提供容错性
const safeLogger = {
  error: (message: string, meta?: any) => safeLog('error', message, meta),
  warn: (message: string, meta?: any) => safeLog('warn', message, meta),
  info: (message: string, meta?: any) => safeLog('info', message, meta),
  http: (message: string, meta?: any) => safeLog('http', message, meta),
  debug: (message: string, meta?: any) => safeLog('debug', message, meta)
};

// 业务日志记录器
export const businessLogger = {
  // 用户操作日志
  userAction: (userId: string, action: string, details: any = {}) => {
    try {
      if (useSimpleLogger) {
        simpleBusinessLogger.userAction(userId, action, details);
      } else {
        logger.info('User action', {
          category: 'user_action',
          userId,
          action,
          details,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  },

  // 工作流操作日志
  workflowAction: (userId: string, workflowId: string, action: string, details: any = {}) => {
    logger.info('Workflow action', {
      category: 'workflow_action',
      userId,
      workflowId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // 执行操作日志
  executionAction: (userId: string, executionId: string, action: string, details: any = {}) => {
    logger.info('Execution action', {
      category: 'execution_action',
      userId,
      executionId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // 文件操作日志
  fileAction: (userId: string, fileId: string, action: string, details: any = {}) => {
    logger.info('File action', {
      category: 'file_action',
      userId,
      fileId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // 安全事件日志
  securityEvent: (userId: string | null, event: string, details: any = {}) => {
    logger.warn('Security event', {
      category: 'security_event',
      userId,
      event,
      details,
      timestamp: new Date().toISOString()
    });
  },

  // 系统事件日志
  systemEvent: (event: string, details: any = {}) => {
    logger.info('System event', {
      category: 'system_event',
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

// 性能日志记录器
export const performanceLogger = {
  // 数据库查询性能
  dbQuery: (query: string, duration: number, rowCount?: number) => {
    logger.debug('Database query', {
      category: 'db_performance',
      query: query.substring(0, 200), // 截断长查询
      duration: `${duration}ms`,
      rowCount,
      timestamp: new Date().toISOString()
    });

    // 慢查询告警
    if (duration > 1000) {
      logger.warn('Slow database query', {
        category: 'slow_query',
        query: query.substring(0, 200),
        duration: `${duration}ms`,
        rowCount,
        timestamp: new Date().toISOString()
      });
    }
  },

  // API响应性能
  apiResponse: (method: string, path: string, duration: number, statusCode: number) => {
    logger.http('API response', {
      category: 'api_performance',
      method,
      path,
      duration: `${duration}ms`,
      statusCode,
      timestamp: new Date().toISOString()
    });
  },

  // 文件操作性能
  fileOperation: (operation: string, fileName: string, fileSize: number, duration: number) => {
    logger.debug('File operation', {
      category: 'file_performance',
      operation,
      fileName,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  }
};

// 错误日志记录器
export const errorLogger = {
  // 应用错误
  applicationError: (error: Error, context: any = {}) => {
    logger.error('Application error', {
      category: 'application_error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    });
  },

  // 数据库错误
  databaseError: (error: Error, query?: string) => {
    logger.error('Database error', {
      category: 'database_error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      query: query?.substring(0, 200),
      timestamp: new Date().toISOString()
    });
  },

  // 外部服务错误
  externalServiceError: (service: string, error: Error, context: any = {}) => {
    logger.error('External service error', {
      category: 'external_service_error',
      service,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    });
  },

  // 验证错误
  validationError: (field: string, value: any, rule: string, context: any = {}) => {
    logger.warn('Validation error', {
      category: 'validation_error',
      field,
      value,
      rule,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// 审计日志记录器
export const auditLogger = {
  // 数据变更审计
  dataChange: (userId: string, table: string, operation: string, recordId: string, oldData?: any, newData?: any) => {
    logger.info('Data change audit', {
      category: 'data_audit',
      userId,
      table,
      operation,
      recordId,
      oldData,
      newData,
      timestamp: new Date().toISOString()
    });
  },

  // 权限变更审计
  permissionChange: (adminUserId: string, targetUserId: string, operation: string, permissions: any) => {
    logger.info('Permission change audit', {
      category: 'permission_audit',
      adminUserId,
      targetUserId,
      operation,
      permissions,
      timestamp: new Date().toISOString()
    });
  },

  // 登录审计
  loginAudit: (userId: string, success: boolean, ip: string, userAgent?: string, reason?: string) => {
    logger.info('Login audit', {
      category: 'login_audit',
      userId,
      success,
      ip,
      userAgent,
      reason,
      timestamp: new Date().toISOString()
    });
  }
};

// 导出安全的logger
export { safeLogger as logger };

// 日志统计
export const logStats = {
  getLogCounts: () => {
    // 这里可以实现日志统计逻辑
    // 例如读取日志文件并统计各级别日志数量
    return {
      error: 0,
      warn: 0,
      info: 0,
      http: 0,
      debug: 0
    };
  },

  getRecentErrors: (hours = 24) => {
    // 这里可以实现获取最近错误日志的逻辑
    return [];
  }
};