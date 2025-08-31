import axios from 'axios';
import { logger } from './logger';
import { metricsCollector } from './metrics';

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // 冷却时间（毫秒）
  enabled: boolean;
  description: string;
}

interface Alert {
  id: string;
  ruleId: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: any;
}

interface NotificationChannel {
  type: 'slack' | 'discord' | 'email' | 'webhook';
  config: any;
  enabled: boolean;
}

class AlertingSystem {
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private notificationChannels: NotificationChannel[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.initializeNotificationChannels();
    this.startMonitoring();
  }

  // 初始化默认告警规则
  private initializeDefaultRules() {
    this.alertRules = [
      {
        id: 'high_error_rate',
        name: '高错误率告警',
        condition: (metrics) => {
          const stats = metricsCollector.getHttpRequestStats();
          return stats.errorRate > 5; // 错误率超过5%
        },
        severity: 'high',
        cooldown: 5 * 60 * 1000, // 5分钟冷却
        enabled: true,
        description: 'HTTP请求错误率超过5%'
      },
      {
        id: 'slow_response_time',
        name: '响应时间过慢告警',
        condition: (metrics) => {
          const stats = metricsCollector.getHttpRequestStats();
          return stats.averageResponseTime > 2000; // 平均响应时间超过2秒
        },
        severity: 'medium',
        cooldown: 10 * 60 * 1000, // 10分钟冷却
        enabled: true,
        description: '平均响应时间超过2秒'
      },
      {
        id: 'high_memory_usage',
        name: '内存使用率过高告警',
        condition: (metrics) => {
          const stats = metricsCollector.getSystemResourceStats();
          return stats.memory.usagePercent > 90; // 内存使用率超过90%
        },
        severity: 'critical',
        cooldown: 5 * 60 * 1000, // 5分钟冷却
        enabled: true,
        description: '内存使用率超过90%'
      },
      {
        id: 'low_active_users',
        name: '活跃用户数异常低告警',
        condition: (metrics) => {
          const stats = metricsCollector.getUserBehaviorStats();
          const now = new Date();
          const hour = now.getHours();
          
          // 工作时间（9-18点）活跃用户少于5个
          if (hour >= 9 && hour <= 18) {
            return stats.activeUsersLastHour < 5;
          }
          return false;
        },
        severity: 'low',
        cooldown: 30 * 60 * 1000, // 30分钟冷却
        enabled: true,
        description: '工作时间活跃用户数异常低'
      },
      {
        id: 'database_connection_error',
        name: '数据库连接错误告警',
        condition: (metrics) => {
          const errors = metricsCollector.getMetrics().errors;
          return (errors['DatabaseError'] || 0) > 0;
        },
        severity: 'critical',
        cooldown: 2 * 60 * 1000, // 2分钟冷却
        enabled: true,
        description: '检测到数据库连接错误'
      },
      {
        id: 'file_upload_failure',
        name: '文件上传失败率过高告警',
        condition: (metrics) => {
          const businessMetrics = metricsCollector.getBusinessMetricsStats();
          const fileUploads = businessMetrics.metricsByName['file_upload'];
          const fileUploadErrors = businessMetrics.metricsByName['file_upload_error'];
          
          if (fileUploads && fileUploadErrors) {
            const failureRate = (fileUploadErrors.count / fileUploads.count) * 100;
            return failureRate > 10; // 失败率超过10%
          }
          return false;
        },
        severity: 'medium',
        cooldown: 15 * 60 * 1000, // 15分钟冷却
        enabled: true,
        description: '文件上传失败率超过10%'
      }
    ];
  }

  // 初始化通知渠道
  private initializeNotificationChannels() {
    // Slack通知
    if (process.env.SLACK_WEBHOOK_URL) {
      this.notificationChannels.push({
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts'
        },
        enabled: true
      });
    }

    // Discord通知
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.notificationChannels.push({
        type: 'discord',
        config: {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL
        },
        enabled: true
      });
    }

    // 邮件通知
    if (process.env.ALERT_EMAIL) {
      this.notificationChannels.push({
        type: 'email',
        config: {
          to: process.env.ALERT_EMAIL,
          from: process.env.SMTP_FROM || 'alerts@yourdomain.com'
        },
        enabled: true
      });
    }

    // 自定义Webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      this.notificationChannels.push({
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        enabled: true
      });
    }
  }

  // 开始监控
  private startMonitoring() {
    // 每分钟检查一次告警规则
    setInterval(() => {
      this.checkAlertRules();
    }, 60 * 1000);

    // 每小时清理已解决的告警
    setInterval(() => {
      this.cleanupResolvedAlerts();
    }, 60 * 60 * 1000);

    logger.info('Alerting system started', {
      rulesCount: this.alertRules.length,
      channelsCount: this.notificationChannels.length
    });
  }

  // 检查告警规则
  private checkAlertRules() {
    const metrics = metricsCollector.getMetrics();

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // 检查冷却时间
      const lastAlertTime = this.lastAlertTime.get(rule.id) || 0;
      const now = Date.now();
      if (now - lastAlertTime < rule.cooldown) {
        continue;
      }

      try {
        if (rule.condition(metrics)) {
          this.triggerAlert(rule, metrics);
          this.lastAlertTime.set(rule.id, now);
        }
      } catch (error) {
        logger.error('Error checking alert rule', {
          ruleId: rule.id,
          ruleName: rule.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  // 触发告警
  private triggerAlert(rule: AlertRule, metrics: any) {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, metrics),
      timestamp: new Date(),
      resolved: false,
      metadata: {
        metrics: this.extractRelevantMetrics(rule, metrics)
      }
    };

    this.alerts.push(alert);

    // 记录告警日志
    logger.warn('Alert triggered', {
      alertId: alert.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: alert.message
    });

    // 发送通知
    this.sendNotifications(alert);
  }

  // 生成告警消息
  private generateAlertMessage(rule: AlertRule, metrics: any): string {
    let message = rule.description;

    switch (rule.id) {
      case 'high_error_rate':
        const errorStats = metricsCollector.getHttpRequestStats();
        message += `\n当前错误率: ${errorStats.errorRate.toFixed(2)}%`;
        message += `\n总请求数: ${errorStats.totalRequests}`;
        break;

      case 'slow_response_time':
        const responseStats = metricsCollector.getHttpRequestStats();
        message += `\n平均响应时间: ${responseStats.averageResponseTime.toFixed(2)}ms`;
        break;

      case 'high_memory_usage':
        const memoryStats = metricsCollector.getSystemResourceStats();
        message += `\n内存使用率: ${memoryStats.memory.usagePercent.toFixed(2)}%`;
        message += `\n已使用内存: ${(memoryStats.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`;
        message += `\n总内存: ${(memoryStats.memory.heapTotal / 1024 / 1024).toFixed(2)}MB`;
        break;

      case 'low_active_users':
        const userStats = metricsCollector.getUserBehaviorStats();
        message += `\n过去1小时活跃用户数: ${userStats.activeUsersLastHour}`;
        break;

      case 'database_connection_error':
        const errors = metricsCollector.getMetrics().errors;
        message += `\n数据库错误次数: ${errors['DatabaseError'] || 0}`;
        break;

      case 'file_upload_failure':
        const businessStats = metricsCollector.getBusinessMetricsStats();
        const uploads = businessStats.metricsByName['file_upload'];
        const uploadErrors = businessStats.metricsByName['file_upload_error'];
        if (uploads && uploadErrors) {
          const failureRate = (uploadErrors.count / uploads.count) * 100;
          message += `\n文件上传失败率: ${failureRate.toFixed(2)}%`;
          message += `\n成功上传: ${uploads.count - uploadErrors.count}`;
          message += `\n失败上传: ${uploadErrors.count}`;
        }
        break;
    }

    return message;
  }

  // 提取相关指标
  private extractRelevantMetrics(rule: AlertRule, metrics: any) {
    switch (rule.id) {
      case 'high_error_rate':
      case 'slow_response_time':
        return metricsCollector.getHttpRequestStats();
      
      case 'high_memory_usage':
        return metricsCollector.getSystemResourceStats();
      
      case 'low_active_users':
        return metricsCollector.getUserBehaviorStats();
      
      default:
        return {};
    }
  }

  // 发送通知
  private async sendNotifications(alert: Alert) {
    const promises = this.notificationChannels
      .filter(channel => channel.enabled)
      .map(channel => this.sendNotification(channel, alert));

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Error sending notifications', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 发送单个通知
  private async sendNotification(channel: NotificationChannel, alert: Alert) {
    try {
      switch (channel.type) {
        case 'slack':
          await this.sendSlackNotification(channel.config, alert);
          break;
        
        case 'discord':
          await this.sendDiscordNotification(channel.config, alert);
          break;
        
        case 'email':
          await this.sendEmailNotification(channel.config, alert);
          break;
        
        case 'webhook':
          await this.sendWebhookNotification(channel.config, alert);
          break;
      }

      logger.info('Notification sent', {
        alertId: alert.id,
        channelType: channel.type
      });
    } catch (error) {
      logger.error('Failed to send notification', {
        alertId: alert.id,
        channelType: channel.type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 发送Slack通知
  private async sendSlackNotification(config: any, alert: Alert) {
    const color = this.getSeverityColor(alert.severity);
    const payload = {
      channel: config.channel,
      attachments: [
        {
          color,
          title: `🚨 ${alert.name}`,
          text: alert.message,
          fields: [
            {
              title: '严重程度',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: '时间',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ],
          footer: '投资流程管理系统',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }
      ]
    };

    await axios.post(config.webhookUrl, payload);
  }

  // 发送Discord通知
  private async sendDiscordNotification(config: any, alert: Alert) {
    const color = this.getSeverityColorCode(alert.severity);
    const payload = {
      embeds: [
        {
          title: `🚨 ${alert.name}`,
          description: alert.message,
          color,
          fields: [
            {
              name: '严重程度',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            {
              name: '时间',
              value: alert.timestamp.toISOString(),
              inline: true
            }
          ],
          footer: {
            text: '投资流程管理系统'
          },
          timestamp: alert.timestamp.toISOString()
        }
      ]
    };

    await axios.post(config.webhookUrl, payload);
  }

  // 发送邮件通知
  private async sendEmailNotification(config: any, alert: Alert) {
    // 这里需要集成邮件发送服务
    // 例如使用nodemailer或其他邮件服务
    logger.info('Email notification would be sent', {
      to: config.to,
      subject: `告警: ${alert.name}`,
      alertId: alert.id
    });
  }

  // 发送Webhook通知
  private async sendWebhookNotification(config: any, alert: Alert) {
    const payload = {
      alert: {
        id: alert.id,
        name: alert.name,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        metadata: alert.metadata
      }
    };

    await axios({
      method: config.method || 'POST',
      url: config.url,
      headers: config.headers || {},
      data: payload
    });
  }

  // 获取严重程度颜色
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'good';
      case 'low': return '#36a64f';
      default: return 'good';
    }
  }

  // 获取严重程度颜色代码
  private getSeverityColorCode(severity: string): number {
    switch (severity) {
      case 'critical': return 0xff0000; // 红色
      case 'high': return 0xff8c00;     // 橙色
      case 'medium': return 0xffff00;   // 黄色
      case 'low': return 0x00ff00;      // 绿色
      default: return 0x808080;         // 灰色
    }
  }

  // 清理已解决的告警
  private cleanupResolvedAlerts() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => {
      return !alert.resolved || (alert.resolvedAt && alert.resolvedAt > oneWeekAgo);
    });

    const cleanedCount = initialCount - this.alerts.length;
    if (cleanedCount > 0) {
      logger.info('Cleaned up resolved alerts', { cleanedCount });
    }
  }

  // 公共方法：获取活跃告警
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // 公共方法：获取所有告警
  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  // 公共方法：解决告警
  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info('Alert resolved', {
        alertId,
        alertName: alert.name
      });
    }
  }

  // 公共方法：添加自定义告警规则
  addAlertRule(rule: AlertRule) {
    this.alertRules.push(rule);
    logger.info('Alert rule added', { ruleId: rule.id, ruleName: rule.name });
  }

  // 公共方法：移除告警规则
  removeAlertRule(ruleId: string) {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      const rule = this.alertRules.splice(index, 1)[0];
      logger.info('Alert rule removed', { ruleId, ruleName: rule.name });
    }
  }

  // 公共方法：获取告警统计
  getAlertStats() {
    const activeAlerts = this.getActiveAlerts();
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    activeAlerts.forEach(alert => {
      severityCounts[alert.severity]++;
    });

    return {
      totalAlerts: this.alerts.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: this.alerts.filter(a => a.resolved).length,
      severityCounts,
      rulesCount: this.alertRules.length,
      enabledRulesCount: this.alertRules.filter(r => r.enabled).length
    };
  }
}

// 单例实例
export const alertingSystem = new AlertingSystem();