import { PrismaClient, Prisma } from '@prisma/client';
import prisma, { testDatabaseConnection, isDatabaseReady } from '../config/database';

// 数据库连接函数 - 增强错误处理
export async function connectDatabase(): Promise<void> {
  try {
    if (!prisma || !prisma.$connect) {
      console.warn('⚠️ Prisma client not available, skipping database connection');
      return;
    }
    
    const connected = await testDatabaseConnection();
    if (!connected) {
      console.warn('⚠️ 数据库连接失败，应用将在降级模式下运行');
      return;
    }
    
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    console.warn('⚠️ 应用将在无数据库模式下运行');
    // 不抛出错误，让应用继续运行
  }
}

// 断开数据库连接
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ 数据库连接已断开');
  } catch (error) {
    console.error('❌ 数据库断开连接失败:', error);
    throw error;
  }
}

// 数据库操作工具类 - 增强错误处理
export class DatabaseUtils {
  // 检查数据库是否可用
  static checkDatabaseAvailable(): boolean {
    return isDatabaseReady();
  }

  // 安全执行数据库操作
  static async safeExecute<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string = 'database operation'
  ): Promise<T> {
    try {
      if (!this.checkDatabaseAvailable()) {
        console.warn(`Database not available for ${operationName}, returning fallback`);
        return fallback;
      }
      return await operation();
    } catch (error) {
      console.error(`Failed ${operationName}:`, error);
      return fallback;
    }
  }

  // 批量插入数据
  static async batchInsert<T>(
    model: any,
    data: T[],
    batchSize: number = 100
  ): Promise<void> {
    return this.safeExecute(async () => {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await model.createMany({
          data: batch,
          skipDuplicates: true,
        });
      }
    }, undefined, 'batch insert');
  }

  // 批量更新数据
  static async batchUpdate<T>(
    model: any,
    updates: Array<{ where: any; data: T }>,
    batchSize: number = 50
  ): Promise<void> {
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const promises = batch.map(({ where, data }) =>
        model.update({ where, data })
      );
      await Promise.all(promises);
    }
  }

  // 软删除（标记为删除而不是物理删除）
  static async softDelete(
    model: any,
    where: any,
    deletedField: string = 'deletedAt'
  ): Promise<any> {
    return model.update({
      where,
      data: {
        [deletedField]: new Date(),
      },
    });
  }

  // 恢复软删除的记录
  static async restore(
    model: any,
    where: any,
    deletedField: string = 'deletedAt'
  ): Promise<any> {
    return model.update({
      where,
      data: {
        [deletedField]: null,
      },
    });
  }

  // 获取分页数据
  static async getPaginatedData<T>(
    model: any,
    options: {
      page?: number;
      limit?: number;
      where?: any;
      orderBy?: any;
      include?: any;
      select?: any;
    } = {}
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page = 1,
      limit = 10,
      where = {},
      orderBy = { createdAt: 'desc' },
      include,
      select,
    } = options;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include,
        select,
      }),
      model.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // 全文搜索
  static async fullTextSearch(
    model: any,
    searchTerm: string,
    searchField: string = 'search_vector',
    options: {
      page?: number;
      limit?: number;
      where?: any;
      orderBy?: any;
      include?: any;
    } = {}
  ): Promise<any> {
    const {
      page = 1,
      limit = 10,
      where = {},
      orderBy = { createdAt: 'desc' },
      include,
    } = options;

    const skip = (page - 1) * limit;

    // 构建全文搜索查询
    const searchWhere = {
      ...where,
      [searchField]: {
        search: searchTerm,
      },
    };

    const [data, total] = await Promise.all([
      model.findMany({
        where: searchWhere,
        skip,
        take: limit,
        orderBy,
        include,
      }),
      model.count({ where: searchWhere }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // 聚合查询
  static async getAggregatedData(
    model: any,
    aggregations: {
      _count?: any;
      _sum?: any;
      _avg?: any;
      _min?: any;
      _max?: any;
    },
    where: any = {}
  ): Promise<any> {
    return model.aggregate({
      where,
      ...aggregations,
    });
  }

  // 分组查询
  static async getGroupedData(
    model: any,
    groupBy: string[],
    aggregations: any = {},
    where: any = {}
  ): Promise<any> {
    return model.groupBy({
      by: groupBy,
      where,
      ...aggregations,
    });
  }

  // 执行原始SQL查询
  static async executeRawQuery(query: string, params: any[] = []): Promise<any> {
    return prisma.$queryRawUnsafe(query, ...params);
  }

  // 执行原始SQL命令
  static async executeRawCommand(command: string, params: any[] = []): Promise<any> {
    return prisma.$executeRawUnsafe(command, ...params);
  }

  // 数据库事务
  static async transaction<T>(
    callback: (prisma: any) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(callback as any) as Promise<T>;
  }

  // 检查记录是否存在
  static async exists(model: any, where: any): Promise<boolean> {
    const count = await model.count({ where });
    return count > 0;
  }

  // 获取或创建记录
  static async findOrCreate<T>(
    model: any,
    where: any,
    create: T
  ): Promise<{ data: any; created: boolean }> {
    const existing = await model.findFirst({ where });
    
    if (existing) {
      return { data: existing, created: false };
    }

    const newRecord = await model.create({ data: create });
    return { data: newRecord, created: true };
  }

  // 更新或创建记录
  static async upsert<T>(
    model: any,
    where: any,
    update: T,
    create: T
  ): Promise<any> {
    return model.upsert({
      where,
      update,
      create,
    });
  }

  // 批量删除
  static async batchDelete(
    model: any,
    where: any
  ): Promise<{ count: number }> {
    return model.deleteMany({ where });
  }

  // 获取随机记录
  static async getRandomRecords<T>(
    model: any,
    count: number = 1,
    where: any = {}
  ): Promise<T[]> {
    const totalCount = await model.count({ where });
    
    if (totalCount === 0) {
      return [];
    }

    const randomSkip = Math.floor(Math.random() * Math.max(0, totalCount - count));
    
    return model.findMany({
      where,
      skip: randomSkip,
      take: count,
    });
  }

  // 数据导出
  static async exportData(
    model: any,
    format: 'json' | 'csv' = 'json',
    where: any = {},
    select?: any
  ): Promise<any> {
    const data = await model.findMany({
      where,
      select,
    });

    if (format === 'json') {
      return data;
    }

    if (format === 'csv') {
      if (data.length === 0) {
        return '';
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row: any) =>
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value}"` : value;
          }).join(',')
        ),
      ];

      return csvRows.join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  // 数据备份
  static async backupTable(tableName: string): Promise<any> {
    const backupTableName = `${tableName}_backup_${Date.now()}`;
    
    await prisma.$executeRawUnsafe(
      `CREATE TABLE "${backupTableName}" AS SELECT * FROM "${tableName}"`
    );

    return { backupTableName };
  }

  // 数据统计
  static async getTableStats(tableName: string): Promise<any> {
    const stats = await prisma.$queryRawUnsafe(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE tablename = $1
    `, tableName);

    const rowCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "${tableName}"
    `) as any[];

    return {
      tableName,
      rowCount: rowCount[0]?.count || 0,
      columnStats: stats,
    };
  }

  // 性能分析
  static async analyzeQuery(query: string): Promise<any> {
    return prisma.$queryRawUnsafe(`EXPLAIN ANALYZE ${query}`);
  }

  // 数据库维护
  static async vacuum(tableName?: string): Promise<void> {
    if (tableName) {
      await prisma.$executeRawUnsafe(`VACUUM ANALYZE "${tableName}"`);
    } else {
      await prisma.$executeRawUnsafe('VACUUM ANALYZE');
    }
  }

  // 重建索引
  static async reindex(indexName?: string): Promise<void> {
    if (indexName) {
      await prisma.$executeRawUnsafe(`REINDEX INDEX "${indexName}"`);
    } else {
      await prisma.$executeRawUnsafe('REINDEX DATABASE');
    }
  }
}

export default DatabaseUtils;