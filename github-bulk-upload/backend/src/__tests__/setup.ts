import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

// 全局测试配置
const prisma = new PrismaClient();

// 测试数据库设置
beforeAll(async () => {
  // 确保测试数据库存在
  try {
    await prisma.$connect();
    
    // 运行数据库迁移
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
    });
    
    console.log('✅ 测试数据库连接成功');
  } catch (error) {
    console.error('❌ 测试数据库连接失败:', error);
    throw error;
  }
});

// 每个测试前清理数据
beforeEach(async () => {
  // 清理所有表数据，但保留表结构
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      } catch (error) {
        console.log(`Warning: Could not truncate ${tablename}`, error);
      }
    }
  }
});

// 测试结束后断开连接
afterAll(async () => {
  await prisma.$disconnect();
});

// 全局测试工具
declare global {
  var testPrisma: PrismaClient;
}

(global as any).testPrisma = prisma;

// 测试超时设置
jest.setTimeout(30000);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.BCRYPT_ROUNDS = '4'; // 降低加密轮数以提高测试速度

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

export { prisma };