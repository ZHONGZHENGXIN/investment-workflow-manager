import prisma from '../config/database';
import { Execution, ExecutionRecord, ExecutionStatus, StepStatus } from '../types/execution';

export class ExecutionService {
  // 开始新的流程执行
  async startExecution(userId: string, workflowId: string): Promise<Execution> {
    // 验证工作流是否属于用户且处于活跃状态
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
        isActive: true
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!workflow) {
      throw new Error('工作流不存在或已禁用');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('工作流没有定义步骤');
    }

    // 创建执行记录
    const execution = await prisma.execution.create({
      data: {
        userId,
        workflowId,
        status: ExecutionStatus.IN_PROGRESS
      }
    });

    // 为每个步骤创建执行记录
    const executionRecords = await Promise.all(
      workflow.steps.map(step =>
        prisma.executionRecord.create({
          data: {
            executionId: execution.id,
            stepId: step.id,
            status: StepStatus.PENDING
          }
        })
      )
    );

    return {
      ...execution,
      executionRecords
    };
  }

  // 获取执行详情
  async getExecutionById(executionId: string, userId: string): Promise<Execution | null> {
    const execution = await prisma.execution.findFirst({
      where: {
        id: executionId,
        userId
      },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          }
        },
        executionRecords: {
          include: {
            step: true,
            attachments: true
          },
          orderBy: {
            step: {
              order: 'asc'
            }
          }
        }
      }
    });

    return execution;
  }

  // 获取用户的所有执行记录
  async getUserExecutions(userId: string, status?: ExecutionStatus): Promise<Execution[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const executions = await prisma.execution.findMany({
      where,
      include: {
        workflow: true,
        executionRecords: {
          include: {
            step: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    return executions;
  }

  // 更新步骤状态
  async updateStepStatus(
    executionId: string,
    stepId: string,
    userId: string,
    updateData: {
      status?: StepStatus;
      notes?: string;
      data?: Record<string, any>;
    }
  ): Promise<ExecutionRecord> {
    // 验证执行记录是否属于用户
    const execution = await prisma.execution.findFirst({
      where: {
        id: executionId,
        userId
      }
    });

    if (!execution) {
      throw new Error('执行记录不存在或无权限访问');
    }

    // 查找对应的执行步骤记录
    const executionRecord = await prisma.executionRecord.findFirst({
      where: {
        executionId,
        stepId
      },
      include: {
        step: true
      }
    });

    if (!executionRecord) {
      throw new Error('步骤记录不存在');
    }

    // 更新步骤记录
    const updatedRecord = await prisma.executionRecord.update({
      where: { id: executionRecord.id },
      data: {
        ...updateData,
        completedAt: updateData.status === StepStatus.COMPLETED ? new Date() : executionRecord.completedAt
      },
      include: {
        step: true,
        attachments: true
      }
    });

    // 检查是否需要更新执行状态
    await this.checkAndUpdateExecutionStatus(executionId);

    return updatedRecord;
  }

  // 暂停执行
  async pauseExecution(executionId: string, userId: string): Promise<Execution> {
    const execution = await this.getExecutionById(executionId, userId);
    
    if (!execution) {
      throw new Error('执行记录不存在或无权限访问');
    }

    if (execution.status !== ExecutionStatus.IN_PROGRESS) {
      throw new Error('只能暂停进行中的执行');
    }

    const updatedExecution = await prisma.execution.update({
      where: { id: executionId },
      data: { status: ExecutionStatus.PAUSED }
    });

    return updatedExecution;
  }

  // 恢复执行
  async resumeExecution(executionId: string, userId: string): Promise<Execution> {
    const execution = await this.getExecutionById(executionId, userId);
    
    if (!execution) {
      throw new Error('执行记录不存在或无权限访问');
    }

    if (execution.status !== ExecutionStatus.PAUSED) {
      throw new Error('只能恢复已暂停的执行');
    }

    const updatedExecution = await prisma.execution.update({
      where: { id: executionId },
      data: { status: ExecutionStatus.IN_PROGRESS }
    });

    return updatedExecution;
  }

  // 完成执行
  async completeExecution(executionId: string, userId: string): Promise<Execution> {
    const execution = await this.getExecutionById(executionId, userId);
    
    if (!execution) {
      throw new Error('执行记录不存在或无权限访问');
    }

    if (execution.status === ExecutionStatus.COMPLETED) {
      throw new Error('执行已经完成');
    }

    // 检查是否所有必需步骤都已完成
    const incompleteRequiredSteps = execution.executionRecords?.filter(record => 
      record.step.isRequired && record.status !== StepStatus.COMPLETED
    ) || [];

    if (incompleteRequiredSteps.length > 0) {
      throw new Error(`还有 ${incompleteRequiredSteps.length} 个必需步骤未完成`);
    }

    const updatedExecution = await prisma.execution.update({
      where: { id: executionId },
      data: { 
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    return updatedExecution;
  }

  // 添加复盘内容
  async addReview(
    executionId: string,
    userId: string,
    reviewNotes: string
  ): Promise<Execution> {
    const execution = await this.getExecutionById(executionId, userId);
    
    if (!execution) {
      throw new Error('执行记录不存在或无权限访问');
    }

    const updatedExecution = await prisma.execution.update({
      where: { id: executionId },
      data: { 
        reviewNotes,
        reviewedAt: new Date()
      }
    });

    return updatedExecution;
  }

  // 添加步骤复盘
  async addStepReview(
    executionId: string,
    stepId: string,
    userId: string,
    reviewNotes: string
  ): Promise<ExecutionRecord> {
    // 验证权限
    const execution = await prisma.execution.findFirst({
      where: {
        id: executionId,
        userId
      }
    });

    if (!execution) {
      throw new Error('执行记录不存在或无权限访问');
    }

    // 更新步骤复盘
    const executionRecord = await prisma.executionRecord.findFirst({
      where: {
        executionId,
        stepId
      }
    });

    if (!executionRecord) {
      throw new Error('步骤记录不存在');
    }

    const updatedRecord = await prisma.executionRecord.update({
      where: { id: executionRecord.id },
      data: { reviewNotes },
      include: {
        step: true,
        attachments: true
      }
    });

    return updatedRecord;
  }

  // 获取执行统计
  async getExecutionStats(userId: string) {
    const totalExecutions = await prisma.execution.count({
      where: { userId }
    });

    const statusStats = await prisma.execution.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        status: true
      }
    });

    const completedExecutions = await prisma.execution.count({
      where: {
        userId,
        status: ExecutionStatus.COMPLETED
      }
    });

    const avgCompletionTime = await prisma.execution.aggregate({
      where: {
        userId,
        status: ExecutionStatus.COMPLETED,
        completedAt: { not: null }
      },
      _avg: {
        // 这里需要计算平均完成时间，但Prisma不直接支持时间差计算
        // 可以在应用层处理或使用原生SQL
      }
    });

    return {
      totalExecutions,
      completedExecutions,
      statusBreakdown: statusStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>),
      completionRate: totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0
    };
  }

  // 检查并更新执行状态
  private async checkAndUpdateExecutionStatus(executionId: string): Promise<void> {
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        executionRecords: {
          include: {
            step: true
          }
        }
      }
    });

    if (!execution || execution.status === ExecutionStatus.COMPLETED) {
      return;
    }

    const records = execution.executionRecords;
    const requiredSteps = records.filter(r => r.step.isRequired);
    const completedRequiredSteps = requiredSteps.filter(r => r.status === StepStatus.COMPLETED);

    // 如果所有必需步骤都完成了，自动完成执行
    if (requiredSteps.length > 0 && completedRequiredSteps.length === requiredSteps.length) {
      await prisma.execution.update({
        where: { id: executionId },
        data: { 
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date()
        }
      });
    }
  }

  // 删除执行记录
  async deleteExecution(executionId: string, userId: string): Promise<void> {
    const execution = await this.getExecutionById(executionId, userId);
    
    if (!execution) {
      throw new Error('执行记录不存在或无权限访问');
    }

    // 删除相关的附件文件
    const attachmentService = new (await import('./attachmentService')).AttachmentService();
    
    for (const record of execution.executionRecords || []) {
      if (record.attachments && record.attachments.length > 0) {
        await attachmentService.deleteAttachmentsByExecutionRecord(record.id, userId);
      }
    }

    // 删除执行记录（级联删除执行步骤记录）
    await prisma.execution.delete({
      where: { id: executionId }
    });
  }
}