import prisma from '../utils/database';

describe('Database Connection', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to database successfully', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  it('should create and retrieve a user', async () => {
    // 创建测试用户
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User'
      }
    });

    expect(testUser.id).toBeDefined();
    expect(testUser.email).toBe('test@example.com');

    // 清理测试数据
    await prisma.user.delete({
      where: { id: testUser.id }
    });
  });

  it('should create workflow with steps', async () => {
    // 创建测试用户
    const testUser = await prisma.user.create({
      data: {
        email: 'workflow-test@example.com',
        password: 'hashedpassword',
        firstName: 'Workflow',
        lastName: 'Test'
      }
    });

    // 创建工作流
    const workflow = await prisma.workflow.create({
      data: {
        userId: testUser.id,
        name: '测试投资流程',
        description: '这是一个测试流程',
        steps: {
          create: [
            {
              name: '市场分析',
              description: '分析市场趋势',
              order: 1,
              isRequired: true,
              stepType: 'CHECKLIST'
            },
            {
              name: '风险评估',
              description: '评估投资风险',
              order: 2,
              isRequired: true,
              stepType: 'INPUT'
            }
          ]
        }
      },
      include: {
        steps: true
      }
    });

    expect(workflow.steps).toHaveLength(2);
    expect(workflow.steps[0].name).toBe('市场分析');

    // 清理测试数据
    await prisma.workflow.delete({
      where: { id: workflow.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
  });
});