import { PrismaClient } from '@prisma/client';

// 创建Prisma客户端实例，添加错误处理
let prisma: PrismaClient;
let isDatabaseConnected = false;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty',
  });
} catch (error) {
  console.error('Failed to initialize Prisma client:', error);
  // 创建一个模拟的prisma客户端，防止应用崩溃
  prisma = {} as PrismaClient;
}

// 数据库连接配置
export const databaseConfig = {
  // 连接池配置
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  
  // 查询超时配置
  queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '10000'), // 10秒
  
  // 事务超时配置
  transactionTimeout: parseInt(process.env.DB_TRANSACTION_TIMEOUT || '5000'), // 5秒
  
  // 重试配置
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000'), // 1秒
};

// 数据库连接测试
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    if (!prisma || !prisma.$connect) {
      console.warn('⚠️ Prisma client not properly initialized');
      return false;
    }
    await prisma.$connect();
    isDatabaseConnected = true;
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    isDatabaseConnected = false;
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
};

// 检查数据库是否已连接
export const isDatabaseReady = (): boolean => {
  return isDatabaseConnected;
};

// 数据库健康检查
export const checkDatabaseHealth = async () => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};

// 优雅关闭数据库连接
export const closeDatabaseConnection = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接时出错:', error);
  }
};

// 数据库事务辅助函数
export const withTransaction = async <T>(
  callback: (prisma: any) => Promise<T>
): Promise<T> => {
  return await prisma.$transaction(callback as any, {
    timeout: databaseConfig.transactionTimeout,
  }) as Promise<T>;
};

// 数据库重试辅助函数
export const withRetry = async <T>(
  operation: () => Promise<T>,
  attempts: number = databaseConfig.retryAttempts
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (attempts > 1) {
      console.warn(`数据库操作失败，剩余重试次数: ${attempts - 1}`, error);
      await new Promise(resolve => setTimeout(resolve, databaseConfig.retryDelay));
      return withRetry(operation, attempts - 1);
    }
    throw error;
  }
};

// 分页辅助函数
export const paginate = (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
};

// 搜索辅助函数
export const createSearchFilter = (searchTerm: string, fields: string[]) => {
  if (!searchTerm) return {};
  
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    })),
  };
};

// 日期范围过滤器
export const createDateRangeFilter = (
  field: string,
  startDate?: string,
  endDate?: string
) => {
  const filter: any = {};
  
  if (startDate || endDate) {
    filter[field] = {};
    if (startDate) {
      filter[field].gte = new Date(startDate);
    }
    if (endDate) {
      filter[field].lte = new Date(endDate);
    }
  }
  
  return filter;
};

// 排序辅助函数
export const createSortOrder = (
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
) => {
  return {
    [sortBy]: sortOrder,
  };
};

// 数据库统计辅助函数
export const getDatabaseStats = async () => {
  try {
    const [
      userCount,
      workflowCount,
      executionCount,
      reviewCount,
      attachmentCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workflow.count(),
      prisma.execution.count(),
      prisma.review.count(),
      prisma.attachment.count(),
    ]);

    return {
      users: userCount,
      workflows: workflowCount,
      executions: executionCount,
      reviews: reviewCount,
      attachments: attachmentCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('获取数据库统计信息失败:', error);
    throw error;
  }
};

// 数据库清理辅助函数
export const cleanupOldData = async (daysToKeep: number = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  try {
    // 清理旧的系统日志
    const deletedLogs = await prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`清理了 ${deletedLogs.count} 条旧的系统日志`);
    
    return {
      deletedLogs: deletedLogs.count,
      cutoffDate: cutoffDate.toISOString(),
    };
  } catch (error) {
    console.error('清理旧数据失败:', error);
    throw error;
  }
};

export default prisma;

// 数据库模型兼容层 - 为缺失的模型提供备用实现
export const createCompatibilityLayer = () => {
  const mockModel = {
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    create: async (data: any) => ({ id: 'mock-id', ...data }),
    update: async (params: any) => ({ id: params.where.id, ...params.data }),
    delete: async (params: any) => ({ id: params.where.id }),
    count: async () => 0,
    deleteMany: async () => ({ count: 0 }),
    updateMany: async () => ({ count: 0 }),
  };

  // 如果prisma模型不存在，提供模拟实现
  const safeModels = {
    user: prisma?.user || mockModel,
    workflow: prisma?.workflow || mockModel,
    execution: prisma?.execution || mockModel,
    review: prisma?.review || mockModel,
    attachment: prisma?.attachment || mockModel,
    systemLog: prisma?.systemLog || mockModel,
  };

  return safeModels;
};

// 安全的数据库操作包装器
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string = 'database operation'
): Promise<T> => {
  try {
    if (!isDatabaseConnected) {
      console.warn(`Database not connected, returning fallback for ${operationName}`);
      return fallbackValue;
    }
    return await operation();
  } catch (error) {
    console.error(`Failed ${operationName}:`, error);
    return fallbackValue;
  }
};

// 创建兼容层实例
export const models = createCompatibilityLayer();