import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { User } from '../models/User';

const prisma = new PrismaClient();

// 测试用户数据
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    name: '管理员',
    role: 'admin' as const
  },
  manager: {
    email: 'manager@test.com',
    password: 'Manager123!',
    name: '经理',
    role: 'manager' as const
  },
  user: {
    email: 'user@test.com',
    password: 'User123!',
    name: '普通用户',
    role: 'user' as const
  }
};

// 创建测试用户
export const createTestUser = async (userData = testUsers.user) => {
  const hashedPassword = await bcrypt.hash(userData.password, 4);
  
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role,
      isActive: true,
      emailVerified: true
    }
  });

  return user;
};

// 创建多个测试用户
export const createTestUsers = async () => {
  const users = {};
  
  for (const [key, userData] of Object.entries(testUsers)) {
    users[key] = await createTestUser(userData);
  }
  
  return users;
};

// 生成测试JWT令牌
export const generateTestToken = (userId: string, role: string = 'user') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
};

// 生成授权头
export const getAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`
});

// 创建测试工作流
export const createTestWorkflow = async (userId: string, data?: Partial<any>) => {
  return await prisma.workflow.create({
    data: {
      name: data?.name || '测试工作流',
      description: data?.description || '这是一个测试工作流',
      userId,
      status: data?.status || 'draft',
      steps: data?.steps || [
        {
          id: '1',
          name: '步骤1',
          description: '第一个步骤',
          type: 'manual',
          required: true,
          order: 1
        },
        {
          id: '2',
          name: '步骤2',
          description: '第二个步骤',
          type: 'manual',
          required: false,
          order: 2
        }
      ],
      ...data
    }
  });
};

// 创建测试执行记录
export const createTestExecution = async (workflowId: string, userId: string, data?: Partial<any>) => {
  return await prisma.execution.create({
    data: {
      workflowId,
      userId,
      status: data?.status || 'pending',
      startedAt: data?.startedAt || new Date(),
      steps: data?.steps || [],
      metadata: data?.metadata || {},
      ...data
    }
  });
};

// 创建测试附件
export const createTestAttachment = async (userId: string, data?: Partial<any>) => {
  return await prisma.attachment.create({
    data: {
      filename: data?.filename || 'test-file.txt',
      originalName: data?.originalName || 'test-file.txt',
      mimeType: data?.mimeType || 'text/plain',
      size: data?.size || 1024,
      path: data?.path || '/test/path/test-file.txt',
      userId,
      ...data
    }
  });
};

// 创建测试复盘记录
export const createTestReview = async (executionId: string, userId: string, data?: Partial<any>) => {
  return await prisma.review.create({
    data: {
      executionId,
      userId,
      content: data?.content || '这是一个测试复盘',
      rating: data?.rating || 4,
      tags: data?.tags || ['测试', '复盘'],
      improvements: data?.improvements || ['改进建议1', '改进建议2'],
      ...data
    }
  });
};

// 模拟Express请求对象
export const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  url: '/',
  path: '/',
  ip: '127.0.0.1',
  get: jest.fn(),
  ...overrides
});

// 模拟Express响应对象
export const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  };
  return res;
};

// 模拟Next函数
export const mockNext = jest.fn();

// 清理测试数据
export const cleanupTestData = async () => {
  // 按依赖关系顺序删除
  await prisma.review.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.execution.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.user.deleteMany();
};

// 等待异步操作
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 断言助手
export const expectValidationError = (error: any, field: string) => {
  expect(error).toBeDefined();
  expect(error.details).toBeDefined();
  expect(error.details.some((detail: any) => detail.path.includes(field))).toBe(true);
};

// 数据库事务测试助手
export const withTransaction = async (callback: (tx: any) => Promise<void>) => {
  return await prisma.$transaction(async (tx) => {
    await callback(tx);
    // 事务会自动回滚，因为这是测试环境
    throw new Error('Test transaction rollback');
  }).catch((error) => {
    if (error.message !== 'Test transaction rollback') {
      throw error;
    }
  });
};

// API测试助手
export const apiTest = {
  // 测试成功响应
  expectSuccess: (response: any, expectedData?: any) => {
    expect(response.status).toBeLessThan(400);
    if (expectedData) {
      expect(response.body).toMatchObject(expectedData);
    }
  },

  // 测试错误响应
  expectError: (response: any, expectedStatus: number, expectedMessage?: string) => {
    expect(response.status).toBe(expectedStatus);
    if (expectedMessage) {
      expect(response.body.error).toContain(expectedMessage);
    }
  },

  // 测试认证错误
  expectAuthError: (response: any) => {
    expect([401, 403]).toContain(response.status);
  },

  // 测试验证错误
  expectValidationError: (response: any) => {
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  }
};

// 性能测试助手
export const performanceTest = {
  // 测试响应时间
  expectResponseTime: async (fn: () => Promise<any>, maxTime: number) => {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(maxTime);
  },

  // 测试并发性能
  expectConcurrency: async (fn: () => Promise<any>, concurrency: number, maxTime: number) => {
    const start = Date.now();
    const promises = Array(concurrency).fill(null).map(() => fn());
    await Promise.all(promises);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(maxTime);
  }
};

export { prisma };