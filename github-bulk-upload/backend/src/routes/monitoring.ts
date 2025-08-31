import { Router } from 'express';
import { metricsCollector } from '../utils/metrics';
import { alertingSystem } from '../utils/alerting.simple';
import { analyticsSystem } from '../utils/analytics';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/permissions.simple';

const router = Router();

// 健康检查端点
router.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(healthData);
});

// Prometheus指标端点
router.get('/metrics', (req, res) => {
  const metrics = metricsCollector.getMetrics();
  
  // 返回Prometheus格式的指标
  let prometheusMetrics = '';
  
  // HTTP请求指标
  prometheusMetrics += '# HELP http_requests_total Total number of HTTP requests\n';
  prometheusMetrics += '# TYPE http_requests_total counter\n';
  Object.entries(metrics.httpRequests).forEach(([key, value]) => {
    const [method, route, status] = key.split(':');
    prometheusMetrics += `http_requests_total{method="${method}",route="${route}",status="${status}"} ${value}\n`;
  });

  // HTTP请求持续时间
  prometheusMetrics += '# HELP http_request_duration_seconds HTTP request duration in seconds\n';
  prometheusMetrics += '# TYPE http_request_duration_seconds histogram\n';
  Object.entries(metrics.httpDurations).forEach(([key, durations]) => {
    const [method, route] = key.split(':');
    const sorted = (durations as number[]).sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    
    prometheusMetrics += `http_request_duration_seconds{method="${method}",route="${route}",quantile="0.5"} ${(p50 / 1000).toFixed(3)}\n`;
    prometheusMetrics += `http_request_duration_seconds{method="${method}",route="${route}",quantile="0.95"} ${(p95 / 1000).toFixed(3)}\n`;
    prometheusMetrics += `http_request_duration_seconds{method="${method}",route="${route}",quantile="0.99"} ${(p99 / 1000).toFixed(3)}\n`;
  });

  // 错误指标
  prometheusMetrics += '# HELP application_errors_total Total number of application errors\n';
  prometheusMetrics += '# TYPE application_errors_total counter\n';
  Object.entries(metrics.errors).forEach(([type, count]) => {
    prometheusMetrics += `application_errors_total{type="${type}"} ${count}\n`;
  });

  // 系统指标
  const memUsage = process.memoryUsage();
  prometheusMetrics += '# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes\n';
  prometheusMetrics += '# TYPE nodejs_memory_usage_bytes gauge\n';
  prometheusMetrics += `nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}\n`;
  prometheusMetrics += `nodejs_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}\n`;
  prometheusMetrics += `nodejs_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}\n`;
  prometheusMetrics += `nodejs_memory_usage_bytes{type="external"} ${memUsage.external}\n`;

  prometheusMetrics += '# HELP nodejs_uptime_seconds Node.js uptime in seconds\n';
  prometheusMetrics += '# TYPE nodejs_uptime_seconds gauge\n';
  prometheusMetrics += `nodejs_uptime_seconds ${process.uptime()}\n`;

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// 业务指标端点（需要认证）
router.get('/metrics/business', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const businessMetrics = metricsCollector.getBusinessMetricsStats();
    res.json(businessMetrics);
  } catch (error) {
    logger.error('Error getting business metrics', { error });
    res.status(500).json({ error: 'Failed to get business metrics' });
  }
});

// 系统统计端点（需要认证）
router.get('/stats', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const httpStats = metricsCollector.getHttpRequestStats();
    const userStats = metricsCollector.getUserBehaviorStats();
    const systemStats = metricsCollector.getSystemResourceStats();
    const alertStats = alertingSystem.getAlertStats();
    const analyticsStats = analyticsSystem.getUserStats();

    res.json({
      http: httpStats,
      users: userStats,
      system: systemStats,
      alerts: alertStats,
      analytics: analyticsStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting system stats', { error });
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

// 告警管理端点
router.get('/alerts', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const { active } = req.query;
    const alerts = active === 'true' 
      ? alertingSystem.getActiveAlerts()
      : alertingSystem.getAllAlerts();
    
    res.json(alerts);
  } catch (error) {
    logger.error('Error getting alerts', { error });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// 解决告警
router.post('/alerts/:alertId/resolve', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const { alertId } = req.params;
    alertingSystem.resolveAlert(alertId);
    
    logger.info('Alert resolved by user', {
      alertId,
      userId: (req.user as any)?.id,
      userEmail: (req.user as any)?.email
    });
    
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    logger.error('Error resolving alert', { error, alertId: req.params.alertId });
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// 分析报告端点
router.get('/analytics/report', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    if (!['daily', 'weekly', 'monthly'].includes(period as string)) {
      res.status(400).json({ error: 'Invalid period. Must be daily, weekly, or monthly' });
      return;
    }
    
    const report = analyticsSystem.generateAnalyticsReport(period as 'daily' | 'weekly' | 'monthly');
    res.json(report);
  } catch (error) {
    logger.error('Error generating analytics report', { error, period: req.query.period });
    res.status(500).json({ error: 'Failed to generate analytics report' });
  }
});

// 用户行为模式端点
router.get('/analytics/patterns/:userId', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const { userId } = req.params;
    const patterns = analyticsSystem.getUserBehaviorPatterns(userId);
    res.json(patterns);
  } catch (error) {
    logger.error('Error getting user behavior patterns', { error, userId: req.params.userId });
    res.status(500).json({ error: 'Failed to get user behavior patterns' });
  }
});

// 活跃会话端点
router.get('/analytics/sessions', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const sessions = analyticsSystem.getActiveSessions();
    
    // 移除敏感信息
    const sanitizedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      userId: session.userId,
      startTime: session.startTime,
      duration: session.duration,
      actionsCount: session.actions.length,
      ip: session.ip.replace(/\.\d+$/, '.xxx'), // 部分隐藏IP
      userAgent: session.userAgent.substring(0, 50) + '...'
    }));
    
    res.json(sanitizedSessions);
  } catch (error) {
    logger.error('Error getting active sessions', { error });
    res.status(500).json({ error: 'Failed to get active sessions' });
  }
});

// 历史分析报告端点
router.get('/analytics/history', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  try {
    const historicalReports = analyticsSystem.getHistoricalReports();
    const reports = Array.from(historicalReports.entries()).map(([date, report]) => ({
      date,
      ...report
    }));
    
    res.json(reports);
  } catch (error) {
    logger.error('Error getting historical reports', { error });
    res.status(500).json({ error: 'Failed to get historical reports' });
  }
});

// 导出指标数据
router.get('/export', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const exportData = metricsCollector.exportMetrics();
    
    if (format === 'csv') {
      // 简单的CSV导出
      let csv = 'timestamp,metric_type,metric_name,value\n';
      const timestamp = new Date().toISOString();
      
      // HTTP请求指标
      Object.entries(exportData.rawMetrics.httpRequests).forEach(([key, value]) => {
        csv += `${timestamp},http_request,${key},${value}\n`;
      });
      
      // 错误指标
      Object.entries(exportData.rawMetrics.errors).forEach(([key, value]) => {
        csv += `${timestamp},error,${key},${value}\n`;
      });
      
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', `attachment; filename="metrics-${timestamp.split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      res.json(exportData);
    }
  } catch (error) {
    logger.error('Error exporting metrics', { error });
    res.status(500).json({ error: 'Failed to export metrics' });
  }
});

// 重置指标（仅限管理员，谨慎使用）
router.post('/reset', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'RESET_ALL_METRICS') {
      res.status(400).json({ 
        error: 'Confirmation required. Send { "confirm": "RESET_ALL_METRICS" }' 
      });
      return;
    }
    
    metricsCollector.resetMetrics();
    
    logger.warn('Metrics reset by admin user', {
      userId: (req.user as any)?.id,
      userEmail: (req.user as any)?.email,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'All metrics have been reset' });
  } catch (error) {
    logger.error('Error resetting metrics', { error });
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

// 系统信息端点
router.get('/system', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        pid: process.pid
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        logLevel: process.env.LOG_LEVEL
      },
      features: {
        clustering: process.env.CLUSTER_WORKERS !== '0',
        monitoring: true,
        alerting: true,
        analytics: true
      }
    };
    
    res.json(systemInfo);
  } catch (error) {
    logger.error('Error getting system info', { error });
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

export default router;