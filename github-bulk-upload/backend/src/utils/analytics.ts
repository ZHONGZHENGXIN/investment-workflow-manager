import { logger, businessLogger } from './logger';
import { metricsCollector } from './metrics';

interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  ip: string;
  userAgent: string;
  actions: UserAction[];
  duration?: number;
}

interface UserAction {
  id: string;
  sessionId: string;
  userId: string;
  action: string;
  path: string;
  method: string;
  timestamp: Date;
  duration?: number;
  metadata?: any;
}

interface UserBehaviorPattern {
  userId: string;
  pattern: string;
  frequency: number;
  lastSeen: Date;
  confidence: number;
}

interface AnalyticsReport {
  period: string;
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
  usageMetrics: {
    totalSessions: number;
    totalActions: number;
    averageActionsPerSession: number;
    mostPopularActions: Array<{ action: string; count: number }>;
    mostPopularPages: Array<{ path: string; count: number }>;
  };
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
    slowestEndpoints: Array<{ path: string; averageTime: number }>;
  };
  businessMetrics: {
    workflowsCreated: number;
    workflowsExecuted: number;
    filesUploaded: number;
    reviewsCompleted: number;
  };
}

class AnalyticsSystem {
  private sessions: Map<string, UserSession> = new Map();
  private userActions: UserAction[] = [];
  private behaviorPatterns: Map<string, UserBehaviorPattern[]> = new Map();
  private dailyStats: Map<string, any> = new Map();

  constructor() {
    this.startPeriodicTasks();
  }

  // 开始周期性任务
  private startPeriodicTasks() {
    // 每小时分析用户行为模式
    setInterval(() => {
      this.analyzeBehaviorPatterns();
    }, 60 * 60 * 1000);

    // 每天生成分析报告
    setInterval(() => {
      this.generateDailyReport();
    }, 24 * 60 * 60 * 1000);

    // 每10分钟清理过期会话
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 10 * 60 * 1000);

    logger.info('Analytics system started');
  }

  // 记录用户会话开始
  startSession(sessionId: string, userId: string, ip: string, userAgent: string) {
    const session: UserSession = {
      sessionId,
      userId,
      startTime: new Date(),
      ip,
      userAgent,
      actions: []
    };

    this.sessions.set(sessionId, session);

    businessLogger.userAction(userId, 'session_start', {
      sessionId,
      ip,
      userAgent
    });

    logger.debug('User session started', {
      sessionId,
      userId,
      ip
    });
  }

  // 记录用户会话结束
  endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();

      businessLogger.userAction(session.userId, 'session_end', {
        sessionId,
        duration: session.duration,
        actionsCount: session.actions.length
      });

      // 记录会话指标
      metricsCollector.recordBusinessMetric('user_session', 1, {
        userId: session.userId,
        duration: session.duration,
        actionsCount: session.actions.length
      });

      logger.debug('User session ended', {
        sessionId,
        userId: session.userId,
        duration: session.duration,
        actionsCount: session.actions.length
      });
    }
  }

  // 记录用户操作
  recordAction(sessionId: string, userId: string, action: string, path: string, method: string, metadata?: any) {
    const actionRecord: UserAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      userId,
      action,
      path,
      method,
      timestamp: new Date(),
      metadata
    };

    this.userActions.push(actionRecord);

    // 添加到会话中
    const session = this.sessions.get(sessionId);
    if (session) {
      session.actions.push(actionRecord);
    }

    // 记录用户行为指标
    metricsCollector.recordUserBehavior({
      userId,
      action: `${method} ${path}`,
      timestamp: new Date(),
      ip: session?.ip || 'unknown',
      userAgent: session?.userAgent,
      sessionId
    });

    businessLogger.userAction(userId, action, {
      path,
      method,
      sessionId,
      metadata
    });

    // 保持最近50000条操作记录
    if (this.userActions.length > 50000) {
      this.userActions.splice(0, this.userActions.length - 50000);
    }
  }

  // 分析用户行为模式
  private analyzeBehaviorPatterns() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 获取最近一周的用户操作
    const recentActions = this.userActions.filter(action => action.timestamp >= oneWeekAgo);
    
    // 按用户分组
    const userActions = new Map<string, UserAction[]>();
    recentActions.forEach(action => {
      if (!userActions.has(action.userId)) {
        userActions.set(action.userId, []);
      }
      userActions.get(action.userId)!.push(action);
    });

    // 分析每个用户的行为模式
    for (const [userId, actions] of userActions) {
      const patterns = this.identifyUserPatterns(userId, actions);
      this.behaviorPatterns.set(userId, patterns);
    }

    logger.info('Behavior patterns analyzed', {
      usersAnalyzed: userActions.size,
      totalPatterns: Array.from(this.behaviorPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
    });
  }

  // 识别用户行为模式
  private identifyUserPatterns(userId: string, actions: UserAction[]): UserBehaviorPattern[] {
    const patterns: UserBehaviorPattern[] = [];

    // 按时间排序
    actions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // 识别常见操作序列
    const sequences = this.findActionSequences(actions);
    sequences.forEach(sequence => {
      patterns.push({
        userId,
        pattern: `sequence:${sequence.actions.join('->')}`,
        frequency: sequence.frequency,
        lastSeen: sequence.lastSeen,
        confidence: sequence.confidence
      });
    });

    // 识别时间模式
    const timePatterns = this.findTimePatterns(actions);
    timePatterns.forEach(timePattern => {
      patterns.push({
        userId,
        pattern: `time:${timePattern.pattern}`,
        frequency: timePattern.frequency,
        lastSeen: timePattern.lastSeen,
        confidence: timePattern.confidence
      });
    });

    // 识别页面访问模式
    const pagePatterns = this.findPagePatterns(actions);
    pagePatterns.forEach(pagePattern => {
      patterns.push({
        userId,
        pattern: `page:${pagePattern.pattern}`,
        frequency: pagePattern.frequency,
        lastSeen: pagePattern.lastSeen,
        confidence: pagePattern.confidence
      });
    });

    return patterns;
  }

  // 查找操作序列模式
  private findActionSequences(actions: UserAction[]) {
    const sequences = new Map<string, { frequency: number; lastSeen: Date }>();
    const windowSize = 3; // 查找3步操作序列

    for (let i = 0; i <= actions.length - windowSize; i++) {
      const sequence = actions.slice(i, i + windowSize)
        .map(action => action.action)
        .join('->');
      
      const existing = sequences.get(sequence) || { frequency: 0, lastSeen: new Date(0) };
      sequences.set(sequence, {
        frequency: existing.frequency + 1,
        lastSeen: new Date(Math.max(existing.lastSeen.getTime(), actions[i + windowSize - 1].timestamp.getTime()))
      });
    }

    return Array.from(sequences.entries())
      .filter(([_, data]) => data.frequency >= 3) // 至少出现3次
      .map(([sequence, data]) => ({
        actions: sequence.split('->'),
        frequency: data.frequency,
        lastSeen: data.lastSeen,
        confidence: Math.min(data.frequency / 10, 1) // 简单的置信度计算
      }));
  }

  // 查找时间模式
  private findTimePatterns(actions: UserAction[]) {
    const hourCounts = new Map<number, number>();
    const dayOfWeekCounts = new Map<number, number>();

    actions.forEach(action => {
      const hour = action.timestamp.getHours();
      const dayOfWeek = action.timestamp.getDay();

      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + 1);
    });

    const patterns = [];

    // 找出最活跃的时间段
    const mostActiveHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostActiveHour && mostActiveHour[1] >= 5) {
      patterns.push({
        pattern: `most_active_hour:${mostActiveHour[0]}`,
        frequency: mostActiveHour[1],
        lastSeen: new Date(),
        confidence: mostActiveHour[1] / actions.length
      });
    }

    // 找出最活跃的星期几
    const mostActiveDay = Array.from(dayOfWeekCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostActiveDay && mostActiveDay[1] >= 5) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      patterns.push({
        pattern: `most_active_day:${dayNames[mostActiveDay[0]]}`,
        frequency: mostActiveDay[1],
        lastSeen: new Date(),
        confidence: mostActiveDay[1] / actions.length
      });
    }

    return patterns;
  }

  // 查找页面访问模式
  private findPagePatterns(actions: UserAction[]) {
    const pageCounts = new Map<string, number>();
    const pageTransitions = new Map<string, number>();

    actions.forEach((action, index) => {
      pageCounts.set(action.path, (pageCounts.get(action.path) || 0) + 1);

      if (index > 0) {
        const transition = `${actions[index - 1].path}->${action.path}`;
        pageTransitions.set(transition, (pageTransitions.get(transition) || 0) + 1);
      }
    });

    const patterns = [];

    // 最常访问的页面
    const mostVisitedPage = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostVisitedPage && mostVisitedPage[1] >= 5) {
      patterns.push({
        pattern: `most_visited:${mostVisitedPage[0]}`,
        frequency: mostVisitedPage[1],
        lastSeen: new Date(),
        confidence: mostVisitedPage[1] / actions.length
      });
    }

    // 最常见的页面转换
    const mostCommonTransition = Array.from(pageTransitions.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (mostCommonTransition && mostCommonTransition[1] >= 3) {
      patterns.push({
        pattern: `common_transition:${mostCommonTransition[0]}`,
        frequency: mostCommonTransition[1],
        lastSeen: new Date(),
        confidence: mostCommonTransition[1] / (actions.length - 1)
      });
    }

    return patterns;
  }

  // 生成每日报告
  private generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const report = this.generateAnalyticsReport('daily');
    
    this.dailyStats.set(today, report);

    // 保持最近30天的报告
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    for (const [date] of this.dailyStats) {
      if (date < thirtyDaysAgo) {
        this.dailyStats.delete(date);
      }
    }

    businessLogger.systemEvent('daily_analytics_report_generated', {
      date: today,
      totalUsers: report.userMetrics.totalUsers,
      activeUsers: report.userMetrics.activeUsers,
      totalSessions: report.usageMetrics.totalSessions
    });

    logger.info('Daily analytics report generated', {
      date: today,
      activeUsers: report.userMetrics.activeUsers,
      totalSessions: report.usageMetrics.totalSessions
    });
  }

  // 生成分析报告
  generateAnalyticsReport(period: 'daily' | 'weekly' | 'monthly'): AnalyticsReport {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // 过滤时间范围内的数据
    const periodActions = this.userActions.filter(action => action.timestamp >= startDate);
    const periodSessions = Array.from(this.sessions.values())
      .filter(session => session.startTime >= startDate);

    // 计算用户指标
    const uniqueUsers = new Set(periodActions.map(action => action.userId));
    const activeSessions = periodSessions.filter(session => session.actions.length > 0);
    const totalSessionDuration = activeSessions.reduce((sum, session) => {
      return sum + (session.duration || 0);
    }, 0);

    // 计算使用指标
    const actionCounts = new Map<string, number>();
    const pageCounts = new Map<string, number>();
    
    periodActions.forEach(action => {
      actionCounts.set(action.action, (actionCounts.get(action.action) || 0) + 1);
      pageCounts.set(action.path, (pageCounts.get(action.path) || 0) + 1);
    });

    // 获取业务指标
    const businessMetrics = metricsCollector.getBusinessMetricsStats();
    const httpStats = metricsCollector.getHttpRequestStats();

    const report: AnalyticsReport = {
      period,
      userMetrics: {
        totalUsers: uniqueUsers.size,
        activeUsers: activeSessions.length,
        newUsers: 0, // 需要额外的逻辑来计算新用户
        returningUsers: 0, // 需要额外的逻辑来计算回访用户
        averageSessionDuration: activeSessions.length > 0 ? totalSessionDuration / activeSessions.length : 0,
        bounceRate: 0 // 需要额外的逻辑来计算跳出率
      },
      usageMetrics: {
        totalSessions: periodSessions.length,
        totalActions: periodActions.length,
        averageActionsPerSession: periodSessions.length > 0 ? periodActions.length / periodSessions.length : 0,
        mostPopularActions: Array.from(actionCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([action, count]) => ({ action, count })),
        mostPopularPages: Array.from(pageCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([path, count]) => ({ path, count }))
      },
      performanceMetrics: {
        averageResponseTime: httpStats.averageResponseTime,
        errorRate: httpStats.errorRate,
        slowestEndpoints: [] // 需要从HTTP指标中计算
      },
      businessMetrics: {
        workflowsCreated: businessMetrics.metricsByName['workflow_creation']?.count || 0,
        workflowsExecuted: businessMetrics.metricsByName['workflow_execution']?.count || 0,
        filesUploaded: businessMetrics.metricsByName['file_upload']?.count || 0,
        reviewsCompleted: businessMetrics.metricsByName['review_creation']?.count || 0
      }
    };

    return report;
  }

  // 清理过期会话
  private cleanupExpiredSessions() {
    const now = new Date();
    const sessionTimeout = 30 * 60 * 1000; // 30分钟超时
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions) {
      const lastActivity = session.actions.length > 0 
        ? session.actions[session.actions.length - 1].timestamp
        : session.startTime;
      
      if (now.getTime() - lastActivity.getTime() > sessionTimeout) {
        this.endSession(sessionId);
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired sessions', { cleanedCount });
    }
  }

  // 公共方法：获取用户行为模式
  getUserBehaviorPatterns(userId: string): UserBehaviorPattern[] {
    return this.behaviorPatterns.get(userId) || [];
  }

  // 公共方法：获取活跃会话
  getActiveSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  // 公共方法：获取用户统计
  getUserStats() {
    const activeSessions = this.getActiveSessions();
    const totalUsers = new Set(this.userActions.map(action => action.userId)).size;
    
    return {
      totalUsers,
      activeSessions: activeSessions.length,
      totalActions: this.userActions.length,
      totalPatterns: Array.from(this.behaviorPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
    };
  }

  // 公共方法：获取历史报告
  getHistoricalReports(): Map<string, AnalyticsReport> {
    return new Map(this.dailyStats);
  }
}

// 单例实例
export const analyticsSystem = new AnalyticsSystem();