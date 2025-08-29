interface HttpRequestMetric {
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  memoryDelta: number;
  requestId: string;
}

interface ErrorMetric {
  type: string;
  message: string;
  route: string;
  method: string;
  requestId: string;
}

interface UserBehaviorMetric {
  userId: string;
  action: string;
  timestamp: Date;
  ip: string;
  userAgent?: string;
  referer?: string;
  sessionId?: string;
}

interface BusinessMetric {
  name: string;
  value: number;
  tags: Record<string, any>;
  timestamp: Date;
}

interface SystemMetric {
  name: string;
  value: number;
  timestamp: Date;
}

class MetricsCollector {
  private httpRequests: Map<string, number> = new Map();
  private httpDurations: Map<string, number[]> = new Map();
  private errors: Map<string, number> = new Map();
  private userBehaviors: UserBehaviorMetric[] = [];
  private businessMetrics: BusinessMetric[] = [];
  private systemMetrics: Map<string, number> = new Map();

  // 记录HTTP请求指标
  recordHttpRequest(metric: HttpRequestMetric) {
    const key = `${metric.method}:${metric.route}:${metric.statusCode}`;
    this.httpRequests.set(key, (this.httpRequests.get(key) || 0) + 1);

    const durationKey = `${metric.method}:${metric.route}`;
    if (!this.httpDurations.has(durationKey)) {
      this.httpDurations.set(durationKey, []);
    }
    this.httpDurations.get(durationKey)!.push(metric.duration);

    // 保持最近1000个请求的持续时间数据
    const durations = this.httpDurations.get(durationKey)!;
    if (durations.length > 1000) {
      durations.splice(0, durations.length - 1000);
    }
  }

  // 记录错误指标
  recordError(metric: ErrorMetric) {
    this.errors.set(metric.type, (this.errors.get(metric.type) || 0) + 1);
  }

  // 记录用户行为
  recordUserBehavior(metric: UserBehaviorMetric) {
    this.userBehaviors.push(metric);

    // 保持最近10000条用户行为记录
    if (this.userBehaviors.length > 10000) {
      this.userBehaviors.splice(0, this.userBehaviors.length - 10000);
    }
  }

  // 记录业务指标
  recordBusinessMetric(name: string, value: number, tags: Record<string, any> = {}) {
    this.businessMetrics.push({
      name,
      value,
      tags,
      timestamp: new Date()
    });

    // 保持最近5000条业务指标记录
    if (this.businessMetrics.length > 5000) {
      this.businessMetrics.splice(0, this.businessMetrics.length - 5000);
    }
  }

  // 记录系统指标
  recordSystemMetric(name: string, value: number) {
    this.systemMetrics.set(name, value);
  }

  // 获取所有指标
  getMetrics() {
    return {
      httpRequests: Object.fromEntries(this.httpRequests),
      httpDurations: Object.fromEntries(this.httpDurations),
      errors: Object.fromEntries(this.errors),
      userBehaviors: this.userBehaviors,
      businessMetrics: this.businessMetrics,
      systemMetrics: Object.fromEntries(this.systemMetrics)
    };
  }

  // 获取HTTP请求统计
  getHttpRequestStats() {
    const stats = {
      totalRequests: 0,
      requestsByMethod: {} as Record<string, number>,
      requestsByStatus: {} as Record<string, number>,
      averageResponseTime: 0,
      errorRate: 0
    };

    let totalDuration = 0;
    let totalDurationCount = 0;
    let errorCount = 0;

    // 统计请求数量
    for (const [key, count] of this.httpRequests) {
      const [method, route, status] = key.split(':');
      stats.totalRequests += count;
      
      stats.requestsByMethod[method] = (stats.requestsByMethod[method] || 0) + count;
      stats.requestsByStatus[status] = (stats.requestsByStatus[status] || 0) + count;

      if (parseInt(status) >= 400) {
        errorCount += count;
      }
    }

    // 计算平均响应时间
    for (const durations of this.httpDurations.values()) {
      totalDuration += durations.reduce((sum, duration) => sum + duration, 0);
      totalDurationCount += durations.length;
    }

    if (totalDurationCount > 0) {
      stats.averageResponseTime = totalDuration / totalDurationCount;
    }

    // 计算错误率
    if (stats.totalRequests > 0) {
      stats.errorRate = (errorCount / stats.totalRequests) * 100;
    }

    return stats;
  }

  // 获取用户行为统计
  getUserBehaviorStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentBehaviors = this.userBehaviors.filter(b => b.timestamp >= oneHourAgo);
    const dailyBehaviors = this.userBehaviors.filter(b => b.timestamp >= oneDayAgo);

    const stats = {
      totalUsers: new Set(this.userBehaviors.map(b => b.userId)).size,
      activeUsersLastHour: new Set(recentBehaviors.map(b => b.userId)).size,
      activeUsersLastDay: new Set(dailyBehaviors.map(b => b.userId)).size,
      totalActions: this.userBehaviors.length,
      actionsLastHour: recentBehaviors.length,
      actionsLastDay: dailyBehaviors.length,
      topActions: this.getTopActions(dailyBehaviors),
      topUsers: this.getTopUsers(dailyBehaviors)
    };

    return stats;
  }

  // 获取业务指标统计
  getBusinessMetricsStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailyMetrics = this.businessMetrics.filter(m => m.timestamp >= oneDayAgo);
    const weeklyMetrics = this.businessMetrics.filter(m => m.timestamp >= oneWeekAgo);

    const stats = {
      totalMetrics: this.businessMetrics.length,
      dailyMetrics: dailyMetrics.length,
      weeklyMetrics: weeklyMetrics.length,
      metricsByName: this.groupMetricsByName(dailyMetrics),
      weeklyTrends: this.calculateWeeklyTrends(weeklyMetrics)
    };

    return stats;
  }

  // 获取系统资源统计
  getSystemResourceStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  // 重置指标
  resetMetrics() {
    this.httpRequests.clear();
    this.httpDurations.clear();
    this.errors.clear();
    this.userBehaviors.length = 0;
    this.businessMetrics.length = 0;
    this.systemMetrics.clear();
  }

  // 导出指标到文件
  exportMetrics() {
    const metrics = this.getMetrics();
    const stats = {
      httpRequestStats: this.getHttpRequestStats(),
      userBehaviorStats: this.getUserBehaviorStats(),
      businessMetricsStats: this.getBusinessMetricsStats(),
      systemResourceStats: this.getSystemResourceStats(),
      timestamp: new Date().toISOString()
    };

    return {
      rawMetrics: metrics,
      statistics: stats
    };
  }

  // 辅助方法：获取热门操作
  private getTopActions(behaviors: UserBehaviorMetric[], limit = 10) {
    const actionCounts = new Map<string, number>();
    
    behaviors.forEach(b => {
      actionCounts.set(b.action, (actionCounts.get(b.action) || 0) + 1);
    });

    return Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([action, count]) => ({ action, count }));
  }

  // 辅助方法：获取活跃用户
  private getTopUsers(behaviors: UserBehaviorMetric[], limit = 10) {
    const userCounts = new Map<string, number>();
    
    behaviors.forEach(b => {
      userCounts.set(b.userId, (userCounts.get(b.userId) || 0) + 1);
    });

    return Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, count]) => ({ userId, count }));
  }

  // 辅助方法：按名称分组业务指标
  private groupMetricsByName(metrics: BusinessMetric[]) {
    const grouped = new Map<string, { count: number; totalValue: number }>();
    
    metrics.forEach(m => {
      const existing = grouped.get(m.name) || { count: 0, totalValue: 0 };
      grouped.set(m.name, {
        count: existing.count + 1,
        totalValue: existing.totalValue + m.value
      });
    });

    return Object.fromEntries(grouped);
  }

  // 辅助方法：计算周趋势
  private calculateWeeklyTrends(metrics: BusinessMetric[]) {
    const dailyData = new Map<string, Map<string, number>>();
    
    metrics.forEach(m => {
      const day = m.timestamp.toISOString().split('T')[0];
      if (!dailyData.has(day)) {
        dailyData.set(day, new Map());
      }
      const dayMetrics = dailyData.get(day)!;
      dayMetrics.set(m.name, (dayMetrics.get(m.name) || 0) + m.value);
    });

    const trends: Record<string, Array<{ date: string; value: number }>> = {};
    
    for (const [day, dayMetrics] of dailyData) {
      for (const [metricName, value] of dayMetrics) {
        if (!trends[metricName]) {
          trends[metricName] = [];
        }
        trends[metricName].push({ date: day, value });
      }
    }

    // 排序每个指标的数据
    Object.values(trends).forEach(trend => {
      trend.sort((a, b) => a.date.localeCompare(b.date));
    });

    return trends;
  }
}

// 单例实例
export const metricsCollector = new MetricsCollector();