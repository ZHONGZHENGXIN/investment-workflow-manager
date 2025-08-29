import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

export class DatabaseTestHelper {
  // 重置测试数据库
  static async resetDatabase(): Promise<void> {
    try {
      // 删除所有数据（按依赖关系顺序）
      await prisma.systemLog.deleteMany();
      await prisma.attachment.deleteMany();
      await prisma.review.deleteMany();
      await prisma.executionRecord.deleteMany();
      await prisma.execution.deleteMany();
      await prisma.workflowStep.deleteMany();
      await prisma.workflow.deleteMany();
      await prisma.userSettings.deleteMany();
      await prisma.user.deleteMany();
      
      console.log('Test database reset completed');
    } catch (error) {
      console.error('Failed to reset test database:', error);
      throw error;
    }
  }

  // 创建测试用户
  static async createTestUser(overrides: any = {}) {
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      password: '$2a$10$test.hash.password', // 预哈希的测试密码
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      isActive: true,
      ...overrides,
    };

    return prisma.user.create({
      data: {
        ...defaultUser,
        userSettings: {
          create: {
            theme: 'light',
            language: 'zh-CN',
            timezone: 'Asia/Shanghai',
          }
        }
      },
      include: {
        userSettings: true,
      }
    });
  }

  // 创建测试工作流
  static async createTestWorkflow(userId: string, overrides: any = {}) {
    const defaultWorkflow = {
      name: `Test Workflow ${Date.now()}`,
      description: 'A test workflow',
      category: 'Test',
      tags: ['test'],
      status: 'ACTIVE',
      isActive: true,
      isTemplate: false,
      version: 1,
      ...overrides,
    };

    return prisma.workflow.create({
      data: {
        ...defaultWorkflow,
        userId,
      },
      include: {
        steps: true,
        user: true,
      }
    });
  }

  // 创建测试工作流步骤
  static async createTestWorkflowStep(workflowId: string, overrides: any = {}) {
    const defaultStep = {
      name: `Test Step ${Date.now()}`,
      description: 'A test step',
      order: 1,
      isRequired: true,
      stepType: 'CHECKLIST',
      ...overrides,
    };

    return prisma.workflowStep.create({
      data: {
        ...defaultStep,
        workflowId,
      },
    });
  }

  // 创建测试执行记录
  static async createTestExecution(userId: string, workflowId: string, overrides: any = {}) {
    const defaultExecution = {
      title: `Test Execution ${Date.now()}`,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      progress: 0,
      tags: ['test'],
      ...overrides,
    };

    return prisma.execution.create({
      data: {
        ...defaultExecution,
        userId,
        workflowId,
      },
      include: {
        workflow: true,
        user: true,
        executionRecords: true,
      }
    });
  }

  // 创建测试执行步骤记录
  static async createTestExecutionRecord(executionId: string, stepId: string, overrides: any = {}) {
    const defaultRecord = {
      status: 'PENDING',
      notes: 'Test notes',
      ...overrides,
    };

    return prisma.executionRecord.create({
      data: {
        ...defaultRecord,
        executionId,
        stepId,
      },
      include: {
        execution: true,
        step: true,
        attachments: true,
      }
    });
  }

  // 创建测试复盘
  static async createTestReview(userId: string, executionId: string, overrides: any = {}) {
    const defaultReview = {
      title: `Test Review ${Date.now()}`,
      content: 'Test review content',
      rating: 4,
      lessons: 'Test lessons learned',
      improvements: 'Test improvements',
      tags: ['test'],
      isPublic: false,
      ...overrides,
    };

    return prisma.review.create({
      data: {
        ...defaultReview,
        userId,
        executionId,
      },
      include: {
        user: true,
        execution: true,
        attachments: true,
      }
    });
  }

  // 创建测试附件
  static async createTestAttachment(overrides: any = {}) {
    const defaultAttachment = {
      fileName: `test-file-${Date.now()}.txt`,
      originalName: 'test-file.txt',
      fileType: 'TEXT',
      fileSize: 1024,
      filePath: '/test/path/file.txt',
      mimeType: 'text/plain',
      description: 'Test attachment',
      tags: ['test'],
      ...overrides,
    };

    return prisma.attachment.create({
      data: defaultAttachment,
    });
  }

  // 等待数据库操作完成
  static async waitForDatabase(timeout = 5000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    throw new Error('Database connection timeout');
  }

  // 检查数据库连接
  static async checkConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  // 获取表行数
  static async getTableCounts() {
    const [
      userCount,
      workflowCount,
      stepCount,
      executionCount,
      recordCount,
      reviewCount,
      attachmentCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workflow.count(),
      prisma.workflowStep.count(),
      prisma.execution.count(),
      prisma.executionRecord.count(),
      prisma.review.count(),
      prisma.attachment.count(),
    ]);

    return {
      users: userCount,
      workflows: workflowCount,
      steps: stepCount,
      executions: executionCount,
      records: recordCount,
      reviews: reviewCount,
      attachments: attachmentCount,
    };
  }

  // 创建完整的测试数据集
  static async createTestDataSet() {
    const user = await this.createTestUser();
    
    const workflow = await this.createTestWorkflow(user.id, {
      name: 'Complete Test Workflow',
    });

    const step1 = await this.createTestWorkflowStep(workflow.id, {
      name: 'First Step',
      order: 1,
    });

    const step2 = await this.createTestWorkflowStep(workflow.id, {
      name: 'Second Step',
      order: 2,
    });

    const execution = await this.createTestExecution(user.id, workflow.id);

    const record1 = await this.createTestExecutionRecord(execution.id, step1.id, {
      status: 'COMPLETED',
    });

    const record2 = await this.createTestExecutionRecord(execution.id, step2.id, {
      status: 'PENDING',
    });

    const review = await this.createTestReview(user.id, execution.id);

    const attachment = await this.createTestAttachment({
      executionRecordId: record1.id,
    });

    return {
      user,
      workflow,
      steps: [step1, step2],
      execution,
      records: [record1, record2],
      review,
      attachment,
    };
  }

  // 清理特定用户的测试数据
  static async cleanupUserData(userId: string): Promise<void> {
    await prisma.systemLog.deleteMany({ where: { userId } });
    await prisma.attachment.deleteMany({
      where: {
        OR: [
          { executionRecord: { execution: { userId } } },
          { review: { userId } },
        ]
      }
    });
    await prisma.review.deleteMany({ where: { userId } });
    await prisma.executionRecord.deleteMany({
      where: { execution: { userId } }
    });
    await prisma.execution.deleteMany({ where: { userId } });
    await prisma.workflowStep.deleteMany({
      where: { workflow: { userId } }
    });
    await prisma.workflow.deleteMany({ where: { userId } });
    await prisma.userSettings.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
}

export default DatabaseTestHelper;