import { PrismaClient, UserRole, WorkflowStatus, StepType, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始数据库种子数据初始化...');

  // 创建管理员用户
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: '管理员',
      lastName: '用户',
      role: UserRole.ADMIN,
    },
  });

  console.log('创建管理员用户:', admin.email);

  // 创建测试用户
  const userPassword = await bcrypt.hash('user123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      firstName: '测试',
      lastName: '用户',
      role: UserRole.USER,
    },
  });

  console.log('创建测试用户:', testUser.email);

  // 为测试用户创建用户设置
  await prisma.userSettings.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      theme: 'light',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      emailNotifications: true,
      pushNotifications: true,
      weeklyReports: true,
      autoSaveInterval: 30,
      defaultWorkflowView: 'list',
    },
  });

  // 创建示例投资流程模板
  const stockAnalysisWorkflow = await prisma.workflow.create({
    data: {
      userId: testUser.id,
      name: '股票投资分析流程',
      description: '系统化的股票投资分析和决策流程',
      category: '股票投资',
      tags: ['股票', '分析', '投资决策'],
      isTemplate: true,
      status: WorkflowStatus.ACTIVE,
      steps: {
        create: [
          {
            name: '基本面分析',
            description: '分析公司的财务状况、业务模式和竞争优势',
            order: 1,
            isRequired: true,
            stepType: StepType.CHECKLIST,
            estimatedTime: 120,
            metadata: {
              checklist: [
                '查看最新财报',
                '分析营收增长趋势',
                '评估盈利能力',
                '检查负债情况',
                '了解行业地位'
              ]
            }
          },
          {
            name: '技术面分析',
            description: '分析股价走势和技术指标',
            order: 2,
            isRequired: true,
            stepType: StepType.CHECKLIST,
            estimatedTime: 60,
            dependencies: ['1'],
            metadata: {
              checklist: [
                '查看K线图',
                '分析成交量',
                '检查技术指标',
                '确定支撑阻力位',
                '判断趋势方向'
              ]
            }
          },
          {
            name: '估值分析',
            description: '计算合理估值范围',
            order: 3,
            isRequired: true,
            stepType: StepType.CALCULATION,
            estimatedTime: 90,
            dependencies: ['1'],
            metadata: {
              calculations: [
                'PE估值',
                'PB估值',
                'DCF估值',
                '相对估值'
              ]
            }
          },
          {
            name: '风险评估',
            description: '识别和评估投资风险',
            order: 4,
            isRequired: true,
            stepType: StepType.CHECKLIST,
            estimatedTime: 45,
            metadata: {
              risks: [
                '行业风险',
                '公司风险',
                '市场风险',
                '流动性风险',
                '政策风险'
              ]
            }
          },
          {
            name: '投资决策',
            description: '基于分析结果做出投资决策',
            order: 5,
            isRequired: true,
            stepType: StepType.DECISION,
            estimatedTime: 30,
            dependencies: ['1', '2', '3', '4'],
            metadata: {
              options: ['买入', '持有', '卖出', '观望'],
              criteria: [
                '目标价位',
                '止损价位',
                '投资期限',
                '仓位大小'
              ]
            }
          }
        ]
      }
    },
    include: {
      steps: true
    }
  });

  console.log('创建股票分析流程模板:', stockAnalysisWorkflow.name);

  // 创建房地产投资流程模板
  const realEstateWorkflow = await prisma.workflow.create({
    data: {
      userId: testUser.id,
      name: '房地产投资分析流程',
      description: '房地产投资的系统化分析和决策流程',
      category: '房地产投资',
      tags: ['房地产', '投资', '分析'],
      isTemplate: true,
      status: WorkflowStatus.ACTIVE,
      steps: {
        create: [
          {
            name: '区域调研',
            description: '调研目标区域的基本情况',
            order: 1,
            isRequired: true,
            stepType: StepType.CHECKLIST,
            estimatedTime: 180,
            metadata: {
              checklist: [
                '交通便利性',
                '周边配套设施',
                '学区情况',
                '商业环境',
                '未来规划'
              ]
            }
          },
          {
            name: '市场分析',
            description: '分析当地房地产市场状况',
            order: 2,
            isRequired: true,
            stepType: StepType.CHECKLIST,
            estimatedTime: 120,
            metadata: {
              checklist: [
                '房价走势',
                '成交量分析',
                '供需关系',
                '政策影响',
                '竞品对比'
              ]
            }
          },
          {
            name: '物业评估',
            description: '评估具体物业的价值',
            order: 3,
            isRequired: true,
            stepType: StepType.CHECKLIST,
            estimatedTime: 90,
            dependencies: ['1'],
            metadata: {
              checklist: [
                '建筑质量',
                '户型设计',
                '楼层朝向',
                '装修状况',
                '物业管理'
              ]
            }
          },
          {
            name: '财务分析',
            description: '计算投资回报和现金流',
            order: 4,
            isRequired: true,
            stepType: StepType.CALCULATION,
            estimatedTime: 60,
            dependencies: ['2', '3'],
            metadata: {
              calculations: [
                '租金收益率',
                '资本增值预期',
                '总投资回报率',
                '现金流分析'
              ]
            }
          },
          {
            name: '投资决策',
            description: '做出最终投资决策',
            order: 5,
            isRequired: true,
            stepType: StepType.DECISION,
            estimatedTime: 30,
            dependencies: ['1', '2', '3', '4'],
            metadata: {
              options: ['购买', '继续观察', '放弃'],
              factors: [
                '预期收益',
                '风险水平',
                '资金安排',
                '持有期限'
              ]
            }
          }
        ]
      }
    },
    include: {
      steps: true
    }
  });

  console.log('创建房地产投资流程模板:', realEstateWorkflow.name);

  // 创建示例执行记录
  const execution = await prisma.execution.create({
    data: {
      userId: testUser.id,
      workflowId: stockAnalysisWorkflow.id,
      title: '分析腾讯控股(00700.HK)',
      status: 'COMPLETED',
      priority: Priority.HIGH,
      startedAt: new Date('2024-12-01T09:00:00Z'),
      completedAt: new Date('2024-12-01T15:30:00Z'),
      actualTime: 390, // 6.5小时
      progress: 100,
      tags: ['腾讯', '港股', '科技股'],
      metadata: {
        symbol: '00700.HK',
        sector: '科技',
        marketCap: '3.2万亿港元'
      }
    }
  });

  // 为执行记录创建步骤记录
  const steps = await prisma.workflowStep.findMany({
    where: { workflowId: stockAnalysisWorkflow.id },
    orderBy: { order: 'asc' }
  });

  for (const step of steps) {
    await prisma.executionRecord.create({
      data: {
        executionId: execution.id,
        stepId: step.id,
        status: 'COMPLETED',
        startedAt: new Date('2024-12-01T09:00:00Z'),
        completedAt: new Date('2024-12-01T15:30:00Z'),
        actualTime: Math.floor(Math.random() * 60) + 30, // 30-90分钟随机
        notes: `完成${step.name}的分析`,
        data: {
          completed: true,
          findings: `${step.name}的分析结果`
        },
        result: {
          score: Math.floor(Math.random() * 5) + 1,
          recommendation: '建议关注'
        }
      }
    });
  }

  // 创建复盘记录
  await prisma.review.create({
    data: {
      userId: testUser.id,
      executionId: execution.id,
      title: '腾讯控股投资分析复盘',
      content: '本次分析较为全面，基本面和技术面都有涉及。估值分析显示当前价格合理，但需要关注监管政策风险。',
      rating: 4,
      lessons: '1. 监管政策对科技股影响巨大\n2. 需要更多关注游戏业务的季节性\n3. 云业务增长潜力值得重点关注',
      improvements: '1. 增加同行业对比分析\n2. 加强宏观经济环境分析\n3. 完善风险管理策略',
      tags: ['腾讯', '科技股', '港股分析'],
      isPublic: false,
      metadata: {
        analysisQuality: 'good',
        timeSpent: 390,
        accuracy: 'high'
      }
    }
  });

  console.log('创建示例执行记录和复盘');

  // 创建系统日志示例
  await prisma.systemLog.createMany({
    data: [
      {
        userId: testUser.id,
        action: 'LOGIN',
        details: { method: 'email' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        userId: testUser.id,
        action: 'CREATE_WORKFLOW',
        resource: 'workflow',
        resourceId: stockAnalysisWorkflow.id,
        details: { name: stockAnalysisWorkflow.name },
        ipAddress: '192.168.1.100'
      },
      {
        userId: testUser.id,
        action: 'START_EXECUTION',
        resource: 'execution',
        resourceId: execution.id,
        details: { workflowId: stockAnalysisWorkflow.id },
        ipAddress: '192.168.1.100'
      }
    ]
  });

  console.log('创建系统日志示例');
  console.log('数据库种子数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });