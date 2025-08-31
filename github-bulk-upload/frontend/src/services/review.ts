import { api } from './api';

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

export const reviewService = {
  // 生成复盘摘要
  async generateSummary(executionId?: string): Promise<string> {
    const params = executionId ? { executionId } : {};
    const response = await api.get('/reviews/summary', { params });
    return (response as any).data.summary;
  },

  // 获取趋势分析
  async getTrends(): Promise<{
    executionTrends: Array<{ period: string; count: number; avgDuration: number }>;
    performanceTrends: Array<{ period: string; completionRate: number; efficiency: number }>;
    reviewQualityTrends: Array<{ period: string; avgLength: number; insightCount: number }>;
  }> {
    const response = await api.get('/reviews/trends');
    return (response as any).data.trends;
  },

  // 获取用户复盘分析
  async getUserAnalytics(): Promise<ReviewAnalytics> {
    const response = await api.get('/reviews/analytics');
    return (response as any).data.analytics;
  },

  // 获取复盘洞察
  async getReviewInsights(limit?: number): Promise<ReviewInsight[]> {
    const params = limit ? { limit } : {};
    const response = await api.get('/reviews/insights', { params });
    return (response as any).data.insights;
  },

  // 获取复盘模板
  async getReviewTemplate(workflowType?: string): Promise<string[]> {
    const params = workflowType ? { workflowType } : {};
    const response = await api.get('/reviews/template', { params });
    return (response as any).data.template;
  },

  // 生成复盘报告
  async generateReport(startDate: string, endDate: string): Promise<ReviewReport> {
    const response = await api.post('/reviews/report', {
      startDate,
      endDate
    });
    return (response as any).data.report;
  }
};