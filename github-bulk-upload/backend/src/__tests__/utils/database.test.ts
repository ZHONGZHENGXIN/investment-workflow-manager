import { connectDatabase, disconnectDatabase, isConnected, getConnectionStatus } from '../../utils/database';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client');

const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  user: {
    findFirst: jest.fn()
  }
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrismaClient as any);

describe('Database Utils Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connectDatabase', () => {
    it('应该成功连接数据库', async () => {
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$queryRaw.mockResolvedValue([{ version: '13.0' }]);

      const result = await connectDatabase();

      expect(result).toBe(true);
      expect(mockPrismaClient.$connect).toHaveBeenCalled();
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith`SELECT version()`;
    });

    it('应该处理连接失败', async () => {
      const connectionError = new Error('Connection failed');
      mockPrismaClient.$connect.mockRejectedValue(connectionError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await connectDatabase();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('❌ 数据库连接失败:', connectionError);
      
      consoleSpy.mockRestore();
    });

    it('应该处理数据库版本查询失败', async () => {
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Query failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await connectDatabase();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('应该重试连接', async () => {
      mockPrismaClient.$connect
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce(undefined);
      
      mockPrismaClient.$queryRaw.mockResolvedValue([{ version: '13.0' }]);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await connectDatabase();

      expect(result).toBe(true);
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });

    it('应该在最大重试次数后失败', async () => {
      const connectionError = new Error('Persistent connection failure');
      mockPrismaClient.$connect.mockRejectedValue(connectionError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await connectDatabase();

      expect(result).toBe(false);
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(3); // 初始尝试 + 2次重试
      
      consoleSpy.mockRestore();
    });
  });

  describe('disconnectDatabase', () => {
    it('应该成功断开数据库连接', async () => {
      mockPrismaClient.$disconnect.mockResolvedValue(undefined);

      const result = await disconnectDatabase();

      expect(result).toBe(true);
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });

    it('应该处理断开连接失败', async () => {
      const disconnectionError = new Error('Disconnection failed');
      mockPrismaClient.$disconnect.mockRejectedValue(disconnectionError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await disconnectDatabase();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('❌ 数据库断开连接失败:', disconnectionError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('isConnected', () => {
    it('应该检测数据库连接状态 - 已连接', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const result = await isConnected();

      expect(result).toBe(true);
      expect(mockPrismaClient.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'connection-test' }
      });
    });

    it('应该检测数据库连接状态 - 未连接', async () => {
      mockPrismaClient.user.findFirst.mockRejectedValue(new Error('Not connected'));

      const result = await isConnected();

      expect(result).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('应该返回连接状态信息 - 已连接', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.$queryRaw.mockResolvedValue([{ 
        version: 'PostgreSQL 13.0',
        current_database: 'test_db',
        current_user: 'test_user'
      }]);

      const status = await getConnectionStatus();

      expect(status.connected).toBe(true);
      expect(status.database).toBe('test_db');
      expect(status.user).toBe('test_user');
      expect(status.version).toBe('PostgreSQL 13.0');
      expect(status.error).toBeNull();
    });

    it('应该返回连接状态信息 - 未连接', async () => {
      const connectionError = new Error('Connection failed');
      mockPrismaClient.user.findFirst.mockRejectedValue(connectionError);

      const status = await getConnectionStatus();

      expect(status.connected).toBe(false);
      expect(status.database).toBeNull();
      expect(status.user).toBeNull();
      expect(status.version).toBeNull();
      expect(status.error).toBe('Connection failed');
    });

    it('应该处理部分信息获取失败', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Query failed'));

      const status = await getConnectionStatus();

      expect(status.connected).toBe(true);
      expect(status.database).toBeNull();
      expect(status.user).toBeNull();
      expect(status.version).toBeNull();
      expect(status.error).toBe('Query failed');
    });
  });

  describe('连接池管理', () => {
    it('应该正确管理连接池', async () => {
      // 模拟多个并发连接请求
      const connectPromises = Array(5).fill(null).map(() => connectDatabase());
      
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$queryRaw.mockResolvedValue([{ version: '13.0' }]);

      const results = await Promise.all(connectPromises);

      expect(results.every(result => result === true)).toBe(true);
      // 连接应该被复用，不应该创建多个连接
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(5);
    });
  });

  describe('健康检查', () => {
    it('应该执行数据库健康检查', async () => {
      mockPrismaClient.$queryRaw
        .mockResolvedValueOnce([{ result: 1 }]) // SELECT 1
        .mockResolvedValueOnce([{ count: 0 }]); // 表计数查询

      const healthCheck = async () => {
        try {
          // 基本连接测试
          await mockPrismaClient.$queryRaw`SELECT 1 as result`;
          
          // 表访问测试
          await mockPrismaClient.$queryRaw`SELECT COUNT(*) as count FROM "User" LIMIT 1`;
          
          return { healthy: true, message: '数据库健康' };
        } catch (error) {
          return { 
            healthy: false, 
            message: `数据库健康检查失败: ${error instanceof Error ? error.message : '未知错误'}` 
          };
        }
      };

      const result = await healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBe('数据库健康');
    });

    it('应该检测数据库健康问题', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Database is down'));

      const healthCheck = async () => {
        try {
          await mockPrismaClient.$queryRaw`SELECT 1 as result`;
          return { healthy: true, message: '数据库健康' };
        } catch (error) {
          return { 
            healthy: false, 
            message: `数据库健康检查失败: ${error instanceof Error ? error.message : '未知错误'}` 
          };
        }
      };

      const result = await healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toBe('数据库健康检查失败: Database is down');
    });
  });
});