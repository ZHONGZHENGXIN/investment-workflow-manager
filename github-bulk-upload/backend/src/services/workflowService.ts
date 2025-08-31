import prisma from '../config/database';
import { CreateWorkflowDto, UpdateWorkflowDto, Workflow } from '../types/workflow';

export class WorkflowService {
  // 创建工作流
  async createWorkflow(userId: string, workflowData: CreateWorkflowDto): Promise<Workflow> {
    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: workflowData.name,
        description: workflowData.description,
        steps: {
          create: workflowData.steps.map(step => ({
            name: step.name,
            description: step.description,
            order: step.order,
            isRequired: step.isRequired,
            stepType: step.stepType,
            metadata: step.metadata || {}
          }))
        }
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return workflow;
  }

  // 获取用户的所有工作流
  async getUserWorkflows(userId: string): Promise<Workflow[]> {
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return workflows;
  }

  // 根据ID获取工作流
  async getWorkflowById(workflowId: string, userId: string): Promise<Workflow | null> {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return workflow;
  }

  // 更新工作流
  async updateWorkflow(
    workflowId: string,
    userId: string,
    updateData: UpdateWorkflowDto
  ): Promise<Workflow> {
    // 检查工作流是否属于用户
    const existingWorkflow = await this.getWorkflowById(workflowId, userId);
    if (!existingWorkflow) {
      throw new Error('工作流不存在或无权限访问');
    }

    // 使用事务更新工作流和步骤
    const updatedWorkflow = await prisma.$transaction(async (tx) => {
      // 更新工作流基本信息
      const workflow = await tx.workflow.update({
        where: { id: workflowId },
        data: {
          name: updateData.name,
          description: updateData.description,
          isActive: updateData.isActive
        }
      });

      // 如果有步骤更新
      if (updateData.steps) {
        // 删除现有步骤
        await tx.workflowStep.deleteMany({
          where: { workflowId }
        });

        // 创建新步骤
        await tx.workflowStep.createMany({
          data: updateData.steps.map(step => ({
            workflowId,
            name: step.name!,
            description: step.description,
            order: step.order!,
            isRequired: step.isRequired!,
            stepType: step.stepType!,
            metadata: step.metadata || {}
          }))
        });
      }

      // 返回更新后的工作流
      return await tx.workflow.findUnique({
        where: { id: workflowId },
        include: {
          steps: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    if (!updatedWorkflow) {
      throw new Error('更新工作流失败');
    }

    return updatedWorkflow;
  }

  // 删除工作流
  async deleteWorkflow(workflowId: string, userId: string): Promise<void> {
    // 检查工作流是否属于用户
    const workflow = await this.getWorkflowById(workflowId, userId);
    if (!workflow) {
      throw new Error('工作流不存在或无权限访问');
    }

    // 检查是否有正在进行的执行
    const activeExecutions = await prisma.execution.findMany({
      where: {
        workflowId,
        status: {
          in: ['IN_PROGRESS', 'PAUSED']
        }
      }
    });

    if (activeExecutions.length > 0) {
      throw new Error('无法删除正在执行中的工作流，请先完成或取消相关执行');
    }

    // 删除工作流（级联删除步骤）
    await prisma.workflow.delete({
      where: { id: workflowId }
    });
  }

  // 复制工作流
  async duplicateWorkflow(workflowId: string, userId: string, newName?: string): Promise<Workflow> {
    const originalWorkflow = await this.getWorkflowById(workflowId, userId);
    if (!originalWorkflow) {
      throw new Error('工作流不存在或无权限访问');
    }

    const duplicatedWorkflow = await prisma.workflow.create({
      data: {
        userId,
        name: newName || `${originalWorkflow.name} (副本)`,
        description: originalWorkflow.description,
        steps: {
          create: originalWorkflow.steps?.map(step => ({
            name: step.name,
            description: step.description,
            order: step.order,
            isRequired: step.isRequired,
            stepType: step.stepType,
            metadata: step.metadata || {}
          })) || []
        }
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return duplicatedWorkflow;
  }

  // 获取工作流统计信息
  async getWorkflowStats(workflowId: string, userId: string) {
    const workflow = await this.getWorkflowById(workflowId, userId);
    if (!workflow) {
      throw new Error('工作流不存在或无权限访问');
    }

    const stats = await prisma.execution.groupBy({
      by: ['status'],
      where: { workflowId },
      _count: {
        status: true
      }
    });

    const totalExecutions = await prisma.execution.count({
      where: { workflowId }
    });

    return {
      totalExecutions,
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}