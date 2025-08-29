import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../index';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { authService } from '../../services/authService';
import { ExecutionStatus, ExecutionPriority } from '../../services/execution';

describe('End-to-End Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    await setupTestDatabase();
    
    // 创建测试用户
    const userData = {
      username: 'e2euser',
      email: 'e2e@example.com',
      password: 'password123'
    };
    
    const authResult = await authService.register(userData);
    authToken = authResult.tokens.accessToken;
    userId = authResult.user.id;
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Complete Investment Workflow Process', () => {
    it('should complete a full investment decision workflow', async () => {
      // 1. 创建投资决策工作流
      const workflowData = {
        title: '完整投资决策流程',
        description: '从市场分析到最终决策的完整流程',
        category: 'investment',
        tags: ['投资', '决策', 'E2E测试'],
        steps: [
          {
            id: 'market-analysis',
            title: '市场分析',
            description: '分析目标市场的趋势和机会',
            type: 'MANUAL',
            order: 1,
            isRequired: true,
            estimatedDuration: 120,
            dependencies: [],
            checklist: [
              '收集市场数据',
              '分析竞争对手',
              '评估市场规模'
            ]
          },
          {
            id: 'financial-analysis',
            title: '财务分析',
            description: '分析项目的财务可行性',
            type: 'MANUAL',
            order: 2,
            isRequired: true,
            estimatedDuration: 90,
            dependencies: ['market-analysis'],
            checklist: [
              '计算投资回报率',
              '现金流分析',
              '风险评估'
            ]
          },
          {
            id: 'risk-assessment',
            title: '风险评估',
            description: '全面评估投资风险',
            type: 'MANUAL',
            order: 3,
            isRequired: true,
            estimatedDuration: 60,
            dependencies: ['financial-analysis'],
            checklist: [
              '识别主要风险',
              '制定风险缓解策略',
              '设定风险阈值'
            ]
          },
          {
            id: 'final-decision',
            title: '最终决策',
            description: '基于分析结果做出投资决策',
            type: 'APPROVAL',
            order: 4,
            isRequired: true,
            estimatedDuration: 30,
            dependencies: ['risk-assessment'],
            checklist: [
              '综合评估所有因素',
              '制定投资策略',
              '获得管理层批准'
            ]
          }
        ]
      };

      const workflowResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      expect(workflowResponse.body.success).toBe(true);
      const workflowId = workflowResponse.body.data.id;

      // 2. 创建执行实例
      const executionData = {
        workflowId,
        title: '科技公司A投资决策',
        description: '评估对科技公司A的投资机会',
        priority: ExecutionPriority.HIGH,
        tags: ['科技', '投资', 'A轮'],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14天后
        metadata: {
          targetCompany: '科技公司A',
          investmentAmount: 5000000,
          expectedReturn: 0.25
        }
      };

      const executionResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionData)
        .expect(201);

      expect(executionResponse.body.success).toBe(true);
      const executionId = executionResponse.body.data.id;

      // 3. 开始执行
      const startResponse = await request(app)
        .post(`/api/executions/${executionId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(startResponse.body.data.status).toBe(ExecutionStatus.IN_PROGRESS);

      // 4. 执行第一步：市场分析
      const step1Data = {
        stepId: 'market-analysis',
        status: 'COMPLETED',
        notes: '市场分析已完成。目标市场规模约100亿，年增长率15%，竞争激烈但有差异化机会。',
        actualDuration: 110,
        attachments: [],
        checklistItems: [
          { item: '收集市场数据', completed: true, notes: '已收集过去3年数据' },
          { item: '分析竞争对手', completed: true, notes: '识别5个主要竞争对手' },
          { item: '评估市场规模', completed: true, notes: '市场规模100亿，增长率15%' }
        ]
      };

      const step1Response = await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(step1Data)
        .expect(200);

      expect(step1Response.body.success).toBe(true);

      // 5. 执行第二步：财务分析
      const step2Data = {
        stepId: 'financial-analysis',
        status: 'COMPLETED',
        notes: '财务分析显示项目具有良好的投资回报潜力。预期IRR为25%，回收期4年。',
        actualDuration: 95,
        checklistItems: [
          { item: '计算投资回报率', completed: true, notes: 'IRR 25%' },
          { item: '现金流分析', completed: true, notes: '正现金流预计第3年实现' },
          { item: '风险评估', completed: true, notes: '中等风险水平' }
        ]
      };

      await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(step2Data)
        .expect(200);

      // 6. 执行第三步：风险评估
      const step3Data = {
        stepId: 'risk-assessment',
        status: 'COMPLETED',
        notes: '主要风险包括市场竞争加剧和技术变革。已制定相应缓解策略。',
        actualDuration: 65,
        checklistItems: [
          { item: '识别主要风险', completed: true, notes: '识别5个主要风险点' },
          { item: '制定风险缓解策略', completed: true, notes: '每个风险都有对应策略' },
          { item: '设定风险阈值', completed: true, notes: '设定可接受风险水平' }
        ]
      };

      await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(step3Data)
        .expect(200);

      // 7. 执行第四步：最终决策
      const step4Data = {
        stepId: 'final-decision',
        status: 'COMPLETED',
        notes: '基于综合分析，建议进行投资。投资金额500万，预期回报25%。',
        actualDuration: 35,
        decision: {
          approved: true,
          amount: 5000000,
          conditions: [
            '签署对赌协议',
            '设立董事会席位',
            '分阶段投资'
          ]
        },
        checklistItems: [
          { item: '综合评估所有因素', completed: true, notes: '所有分析结果均支持投资' },
          { item: '制定投资策略', completed: true, notes: '分阶段投资策略' },
          { item: '获得管理层批准', completed: true, notes: '投委会一致通过' }
        ]
      };

      await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(step4Data)
        .expect(200);

      // 8. 检查执行状态
      const finalStatusResponse = await request(app)
        .get(`/api/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalStatusResponse.body.data.status).toBe(ExecutionStatus.COMPLETED);
      expect(finalStatusResponse.body.data.progress).toBe(100);
      expect(finalStatusResponse.body.data.completedAt).toBeDefined();

      // 9. 创建执行复盘
      const reviewData = {
        executionId,
        title: '科技公司A投资决策复盘',
        content: '整个决策流程执行顺利，各个环节都按计划完成。市场分析和财务分析为决策提供了有力支撑。',
        rating: 5,
        tags: ['成功案例', '投资决策', '流程优化'],
        improvements: [
          '可以增加更多的市场调研维度',
          '财务模型可以更加细化',
          '风险评估可以引入量化模型'
        ],
        lessons: [
          '充分的前期分析是成功决策的关键',
          '多维度的风险评估有助于降低投资风险',
          '标准化流程提高了决策效率'
        ],
        metrics: {
          totalDuration: 305, // 实际总耗时
          estimatedDuration: 300, // 预估总耗时
          efficiency: 0.98, // 效率指标
          qualityScore: 4.8 // 质量评分
        }
      };

      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(reviewResponse.body.success).toBe(true);
      expect(reviewResponse.body.data.title).toBe(reviewData.title);

      // 10. 生成历史记录
      const historyResponse = await request(app)
        .get(`/api/history/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.execution.id).toBe(executionId);
      expect(historyResponse.body.data.steps).toHaveLength(4);
      expect(historyResponse.body.data.review).toBeDefined();

      // 11. 验证统计数据
      const statsResponse = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.totalExecutions).toBeGreaterThan(0);
      expect(statsResponse.body.data.completedExecutions).toBeGreaterThan(0);
      expect(statsResponse.body.data.totalWorkflows).toBeGreaterThan(0);

      console.log('✅ 完整的投资决策流程测试通过');
      console.log(`   - 工作流ID: ${workflowId}`);
      console.log(`   - 执行ID: ${executionId}`);
      console.log(`   - 总耗时: ${reviewData.metrics.totalDuration}分钟`);
      console.log(`   - 效率: ${(reviewData.metrics.efficiency * 100).toFixed(1)}%`);
    });

    it('should handle workflow execution with failures and recovery', async () => {
      // 创建一个简单的工作流用于测试失败和恢复
      const workflowData = {
        title: '失败恢复测试流程',
        description: '测试执行失败和恢复机制',
        category: 'test',
        steps: [
          {
            id: 'step1',
            title: '正常步骤',
            type: 'MANUAL',
            order: 1,
            isRequired: true,
            estimatedDuration: 30,
            dependencies: []
          },
          {
            id: 'step2',
            title: '可能失败的步骤',
            type: 'MANUAL',
            order: 2,
            isRequired: true,
            estimatedDuration: 45,
            dependencies: ['step1']
          },
          {
            id: 'step3',
            title: '最终步骤',
            type: 'MANUAL',
            order: 3,
            isRequired: true,
            estimatedDuration: 20,
            dependencies: ['step2']
          }
        ]
      };

      const workflowResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      const workflowId = workflowResponse.body.data.id;

      // 创建执行
      const executionData = {
        workflowId,
        title: '失败恢复测试执行',
        description: '测试执行过程中的失败处理'
      };

      const executionResponse = await request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(executionData)
        .expect(201);

      const executionId = executionResponse.body.data.id;

      // 开始执行
      await request(app)
        .post(`/api/executions/${executionId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 完成第一步
      await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: 'step1',
          status: 'COMPLETED',
          notes: '第一步正常完成',
          actualDuration: 28
        })
        .expect(200);

      // 第二步失败
      await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: 'step2',
          status: 'FAILED',
          notes: '步骤执行失败，需要重新处理',
          actualDuration: 20,
          errorDetails: {
            errorType: 'PROCESS_ERROR',
            errorMessage: '数据验证失败',
            stackTrace: 'Error at step2...'
          }
        })
        .expect(200);

      // 检查执行状态
      let statusResponse = await request(app)
        .get(`/api/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.data.status).toBe(ExecutionStatus.FAILED);

      // 重新启动执行（从失败的步骤开始）
      await request(app)
        .post(`/api/executions/${executionId}/restart`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fromStep: 'step2',
          reason: '修复数据验证问题后重新执行'
        })
        .expect(200);

      // 重新执行第二步（成功）
      await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: 'step2',
          status: 'COMPLETED',
          notes: '修复问题后重新执行成功',
          actualDuration: 50
        })
        .expect(200);

      // 完成第三步
      await request(app)
        .post(`/api/executions/${executionId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: 'step3',
          status: 'COMPLETED',
          notes: '最终步骤完成',
          actualDuration: 22
        })
        .expect(200);

      // 检查最终状态
      statusResponse = await request(app)
        .get(`/api/executions/${executionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.data.status).toBe(ExecutionStatus.COMPLETED);
      expect(statusResponse.body.data.progress).toBe(100);

      console.log('✅ 失败恢复流程测试通过');
    });
  });
});