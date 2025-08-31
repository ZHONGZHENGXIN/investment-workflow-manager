import prisma from '../config/database';
import { Execution, ExecutionRecord } from '../types/execution';

export interface ReviewAnalytics {
  totalReviews: number;
  averageReviewLength: number;
  reviewFrequency: Record<string, number>;
  commonKeywords: Array<{ word: string; count: number }>;
  improvementTrends: Array<{ period: string; improvements: number }>;
}

export interface ReviewInsight {
  executionId: string;
  workflowName: string;
  completedAt: string;
  reviewNotes: string;
  keyInsights: string[];
  improvementSuggestions: string[];
  rating?: number;
}

export interface ReviewReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalExecutions: number;
    totalReviews: number;
    averageExecutionTime: number;
    completionRate: number;
  };
  analytics: ReviewAnalytics;
  executions: Array<{
    id: string;
    workflowName: string;
    completedAt: string;
    duration: number;
    reviewNotes: string;
    stepsCompleted: number;
    totalSteps: number;
  }>;
}

export class ReviewService {
  // 生成自动复盘摘要
  async generateReviewSummary(userId: string, executionId?: string): Promise<string> {
    const whereClause: any = {
      userId,
      reviewNotes: {
        not: null
      }
    };

    if (executionId) {
      whereClause.id = executionId;
    }

    const executions = await prisma.execution.findMany({
      where: whereClause,
      include: {
        workflow: true,
        executionRecords: {
          include: {
            step: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: executionId ? 1 : 10
    });

    if (executions.length === 0) {
      return '暂无复盘数据可供分析。';
    }

    const totalExecutions = executions.length;
    const avgExecutionTime = this.calculateAverageExecutionTime(executions);
    const commonPatterns = this.identifyCommonPatterns(executions);
    const improvementAreas = this.identifyImprovementAreas(executions);
    
    let summary = `## 复盘摘要\n\n`;
    
    if (executionId) {
      const execution = executions[0];
      summary += `### 执行概况\n`;
      summary += `- **流程名称**: ${execution.workflow?.name}\n`;
      summary += `- **执行时长**: ${this.formatDuration(execution.startedAt, execution.completedAt || '')}\n`;
      summary += `- **完成步骤**: ${execution.executionRecords?.filter(r => r.status === 'COMPLETED').length}/${execution.executionRecords?.length}\n\n`;
    } else {
      summary += `### 整体概况\n`;
      summary += `- **分析期间**: 最近${totalExecutions}次执行\n`;
      summary += `- **平均执行时长**: ${this.formatDurationMs(avgExecutionTime)}\n`;
      summary += `- **总复盘字数**: ${executions.reduce((sum, e) => sum + (e.reviewNotes?.length || 0), 0)}\n\n`;
    }

    if (commonPatterns.length > 0) {
      summary += `### 常见模式\n`;
      commonPatterns.forEach((pattern, index) => {
        summary += `${index + 1}. ${pattern}\n`;
      });
      summary += `\n`;
    }

    if (improvementAreas.length > 0) {
      summary += `### 改进建议\n`;
      improvementAreas.forEach((area, index) => {
        summary += `${index + 1}. ${area}\n`;
      });
      summary += `\n`;
    }

    return summary;
  }

  // 识别趋势和模式
  async identifyTrends(userId: string): Promise<{
    executionTrends: Array<{ period: string; count: number; avgDuration: number }>;
    performanceTrends: Array<{ period: string; completionRate: number; efficiency: number }>;
    reviewQualityTrends: Array<{ period: string; avgLength: number; insightCount: number }>;
  }> {
    const executions = await prisma.execution.findMany({
      where: {
        userId,
        completedAt: {
          not: null
        }
      },
      include: {
        workflow: true,
        executionRecords: true
      },
      orderBy: {
        completedAt: 'asc'
      }
    });

    // 按月分组数据
    const monthlyData: Record<string, any[]> = {};
    executions.forEach(execution => {
      if (execution.completedAt) {
        const month = new Date(execution.completedAt).toISOString().slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = [];
        }
        monthlyData[month].push(execution);
      }
    });

    const executionTrends = Object.entries(monthlyData).map(([month, execs]) => ({
      period: month,
      count: execs.length,
      avgDuration: this.calculateAverageExecutionTime(execs)
    }));

    const performanceTrends = Object.entries(monthlyData).map(([month, execs]) => {
      const totalSteps = execs.reduce((sum, e) => sum + (e.executionRecords?.length || 0), 0);
      const completedSteps = execs.reduce((sum, e) => 
        sum + (e.executionRecords?.filter(r => r.status === 'COMPLETED').length || 0), 0);
      
      return {
        period: month,
        completionRate: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
        efficiency: execs.length > 0 ? this.calculateAverageExecutionTime(execs) : 0
      };
    });

    const reviewQualityTrends = Object.entries(monthlyData).map(([month, execs]) => {
      const reviewedExecs = execs.filter(e => e.reviewNotes);
      const avgLength = reviewedExecs.length > 0 
        ? reviewedExecs.reduce((sum, e) => sum + (e.reviewNotes?.length || 0), 0) / reviewedExecs.length
        : 0;
      
      const insightCount = reviewedExecs.reduce((sum, e) => {
        const insights = this.extractKeyInsights(e.reviewNotes || '');
        return sum + insights.length;
      }, 0);

      return {
        period: month,
        avgLength: Math.round(avgLength),
        insightCount
      };
    });

    return {
      executionTrends,
      performanceTrends,
      reviewQualityTrends
    };
  }

  // 获取用户的复盘分析
  async getUserReviewAnalytics(userId: string): Promise<ReviewAnalytics> {
    // 获取所有有复盘内容的执行记录
    const executionsWithReviews = await prisma.execution.findMany({
      where: {
        userId,
        reviewNotes: {
          not: null
        }
      },
      include: {
        workflow: true,
        executionRecords: {
          where: {
            reviewNotes: {
              not: null
            }
          }
        }
      }
    });

    const totalReviews = executionsWithReviews.length;
    const totalReviewLength = executionsWithReviews.reduce(
      (sum, exec) => sum + (exec.reviewNotes?.length || 0), 0
    );
    const averageReviewLength = totalReviews > 0 ? Math.round(totalReviewLength / totalReviews) : 0;

    // 按月统计复盘频率
    const reviewFrequency: Record<string, number> = {};
    executionsWithReviews.forEach(exec => {
      if (exec.reviewedAt) {
        const month = new Date(exec.reviewedAt).toISOString().slice(0, 7); // YYYY-MM
        reviewFrequency[month] = (reviewFrequency[month] || 0) + 1;
      }
    });

    // 提取常见关键词（简化版本）
    const allReviewText = executionsWithReviews
      .map(exec => exec.reviewNotes || '')
      .join(' ');
    const words = allReviewText
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '') // 保留中文和英文
      .split(/\s+/)
      .filter(word => word.length > 1);
    
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    const commonKeywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // 改进趋势分析（按季度）
    const improvementTrends: Array<{ period: string; improvements: number }> = [];
    const quarterlyData: Record<string, number> = {};
    
    executionsWithReviews.forEach(exec => {
      if (exec.reviewedAt) {
        const date = new Date(exec.reviewedAt);
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const period = `${year}Q${quarter}`;
        
        // 简单的改进计数（包含"改进"、"提升"、"优化"等词的复盘）
        const improvementWords = ['改进', '提升', '优化', '改善', '完善'];
        const hasImprovement = improvementWords.some(word => 
          exec.reviewNotes?.includes(word)
        );
        
        if (hasImprovement) {
          quarterlyData[period] = (quarterlyData[period] || 0) + 1;
        }
      }
    });
    
    Object.entries(quarterlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([period, improvements]) => {
        improvementTrends.push({ period, improvements });
      });

    return {
      totalReviews,
      averageReviewLength,
      reviewFrequency,
      commonKeywords,
      improvementTrends
    };
  }

  // 获取复盘洞察
  async getReviewInsights(userId: string, limit: number = 10): Promise<ReviewInsight[]> {
    const executions = await prisma.execution.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        reviewNotes: {
          not: null
        }
      },
      include: {
        workflow: true
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: limit
    });

    return executions.map(exec => {
      const reviewNotes = exec.reviewNotes || '';
      
      // 提取关键洞察（简化版本）
      const keyInsights = this.extractKeyInsights(reviewNotes);
      const improvementSuggestions = this.extractImprovementSuggestions(reviewNotes);
      
      return {
        executionId: exec.id,
        workflowName: exec.workflow?.name || '',
        completedAt: exec.completedAt?.toISOString() || '',
        reviewNotes,
        keyInsights,
        improvementSuggestions
      };
    });
  }

  // 获取复盘模板建议
  async getReviewTemplate(workflowType?: string): Promise<string[]> {
    // 基础复盘模板
    const baseTemplate = [
      '本次投资决策的主要目标是什么？',
      '执行过程中遇到了哪些挑战？',
      '哪些步骤执行得比较顺利？原因是什么？',
      '哪些步骤遇到了困难？如何改进？',
      '本次决策的关键信息来源有哪些？',
      '如果重新执行，会有什么不同的做法？',
      '从这次执行中学到了什么？',
      '对未来类似决策有什么建议？'
    ];

    // 根据工作流类型定制模板
    if (workflowType) {
      // 这里可以根据不同的投资类型添加特定问题
      const specificQuestions = this.getWorkflowSpecificQuestions(workflowType);
      return [...baseTemplate, ...specificQuestions];
    }

    return baseTemplate;
  }

  // 生成复盘报告
  async generateReviewReport(userId: string, period: { start: Date; end: Date }) {
    const executions = await prisma.execution.findMany({
      where: {
        userId,
        completedAt: {
          gte: period.start,
          lte: period.end
        },
        reviewNotes: {
          not: null
        }
      },
      include: {
        workflow: true,
        executionRecords: {
          include: {
            step: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    const analytics = await this.getUserReviewAnalytics(userId);
    
    return {
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString()
      },
      summary: {
        totalExecutions: executions.length,
        totalReviews: executions.filter(e => e.reviewNotes).length,
        averageExecutionTime: this.calculateAverageExecutionTime(executions),
        completionRate: executions.length > 0 ? 100 : 0 // 这里只统计已完成的
      },
      analytics,
      executions: executions.map(exec => ({
        id: exec.id,
        workflowName: exec.workflow?.name,
        completedAt: exec.completedAt,
        duration: exec.completedAt && exec.startedAt 
          ? new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()
          : 0,
        reviewNotes: exec.reviewNotes,
        stepsCompleted: exec.executionRecords?.filter(r => r.status === 'COMPLETED').length || 0,
        totalSteps: exec.executionRecords?.length || 0
      }))
    };
  }

  // 私有方法：识别常见模式
  private identifyCommonPatterns(executions: any[]): string[] {
    const patterns: string[] = [];
    
    // 分析执行时间模式
    const durations = executions.map(e => 
      e.completedAt && e.startedAt 
        ? new Date(e.completedAt).getTime() - new Date(e.startedAt).getTime()
        : 0
    ).filter(d => d > 0);
    
    if (durations.length > 0) {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const shortExecutions = durations.filter(d => d < avgDuration * 0.7).length;
      const longExecutions = durations.filter(d => d > avgDuration * 1.3).length;
      
      if (shortExecutions > executions.length * 0.3) {
        patterns.push('大部分执行时间较短，可能存在流程简化的机会');
      }
      if (longExecutions > executions.length * 0.3) {
        patterns.push('部分执行时间较长，建议分析耗时步骤并优化');
      }
    }

    // 分析复盘内容模式
    const reviewTexts = executions.map(e => e.reviewNotes || '').filter(text => text.length > 0);
    if (reviewTexts.length > 0) {
      const avgLength = reviewTexts.reduce((sum, text) => sum + text.length, 0) / reviewTexts.length;
      const shortReviews = reviewTexts.filter(text => text.length < avgLength * 0.5).length;
      
      if (shortReviews > reviewTexts.length * 0.5) {
        patterns.push('复盘内容普遍较简短，建议增加更详细的思考和总结');
      }
    }

    return patterns;
  }

  // 私有方法：识别改进领域
  private identifyImprovementAreas(executions: any[]): string[] {
    const areas: string[] = [];
    
    // 分析步骤完成率
    const stepStats = executions.map(e => {
      const total = e.executionRecords?.length || 0;
      const completed = e.executionRecords?.filter(r => r.status === 'COMPLETED').length || 0;
      return total > 0 ? completed / total : 1;
    });
    
    if (stepStats.length > 0) {
      const avgCompletionRate = stepStats.reduce((sum, rate) => sum + rate, 0) / stepStats.length;
      if (avgCompletionRate < 0.8) {
        areas.push('步骤完成率偏低，建议优化流程设计或提高执行效率');
      }
    }

    // 分析复盘质量
    const reviewTexts = executions.map(e => e.reviewNotes || '').filter(text => text.length > 0);
    if (reviewTexts.length > 0) {
      const hasInsights = reviewTexts.filter(text => 
        ['学到', '发现', '意识到', '理解'].some(keyword => text.includes(keyword))
      ).length;
      
      if (hasInsights < reviewTexts.length * 0.5) {
        areas.push('复盘深度不足，建议增加更多反思和洞察');
      }
    }

    return areas;
  }

  // 私有方法：提取关键洞察
  private extractKeyInsights(reviewText: string): string[] {
    const insights: string[] = [];
    
    // 查找包含洞察关键词的句子
    const insightKeywords = ['发现', '意识到', '学到', '理解', '认识到'];
    const sentences = reviewText.split(/[。！？\n]/).filter(s => s.trim());
    
    sentences.forEach(sentence => {
      if (insightKeywords.some(keyword => sentence.includes(keyword))) {
        insights.push(sentence.trim());
      }
    });
    
    return insights.slice(0, 3); // 最多返回3个洞察
  }

  // 私有方法：提取改进建议
  private extractImprovementSuggestions(reviewText: string): string[] {
    const suggestions: string[] = [];
    
    // 查找包含改进关键词的句子
    const improvementKeywords = ['应该', '需要', '建议', '改进', '优化', '提升'];
    const sentences = reviewText.split(/[。！？\n]/).filter(s => s.trim());
    
    sentences.forEach(sentence => {
      if (improvementKeywords.some(keyword => sentence.includes(keyword))) {
        suggestions.push(sentence.trim());
      }
    });
    
    return suggestions.slice(0, 3); // 最多返回3个建议
  }

  // 私有方法：获取工作流特定问题
  private getWorkflowSpecificQuestions(workflowType: string): string[] {
    const specificQuestions: Record<string, string[]> = {
      'stock': [
        '股票选择的逻辑是否合理？',
        '买入时机的判断是否准确？',
        '风险控制措施是否有效？'
      ],
      'fund': [
        '基金配置是否符合预期？',
        '定投策略执行情况如何？',
        '资产配置比例是否合适？'
      ]
    };
    
    return specificQuestions[workflowType] || [];
  }

  // 私有方法：计算平均执行时间
  private calculateAverageExecutionTime(executions: any[]): number {
    if (executions.length === 0) return 0;
    
    const totalTime = executions.reduce((sum, exec) => {
      if (exec.completedAt && exec.startedAt) {
        return sum + (new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime());
      }
      return sum;
    }, 0);
    
    return Math.round(totalTime / executions.length);
  }

  // 私有方法：格式化持续时间（毫秒）
  private formatDurationMs(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  }

  // 私有方法：格式化持续时间（字符串）
  private formatDuration(startTime: string, endTime: string): string {
    if (!endTime) return '进行中';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = end.getTime() - start.getTime();
    
    return this.formatDurationMs(duration);
  }
}