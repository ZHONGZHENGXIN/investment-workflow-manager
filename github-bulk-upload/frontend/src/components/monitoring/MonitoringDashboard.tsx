import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Server, 
  Database, 
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface SystemStats {
  http: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<string, number>;
  };
  users: {
    totalUsers: number;
    activeUsersLastHour: number;
    activeUsersLastDay: number;
    totalActions: number;
    actionsLastHour: number;
  };
  system: {
    memory: {
      usagePercent: number;
      heapUsed: number;
      heapTotal: number;
    };
    uptime: number;
  };
  alerts: {
    totalAlerts: number;
    activeAlerts: number;
    severityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

interface Alert {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface AnalyticsReport {
  period: string;
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    averageSessionDuration: number;
  };
  usageMetrics: {
    totalSessions: number;
    totalActions: number;
    mostPopularActions: Array<{ action: string; count: number }>;
    mostPopularPages: Array<{ path: string; count: number }>;
  };
  businessMetrics: {
    workflowsCreated: number;
    workflowsExecuted: number;
    filesUploaded: number;
    reviewsCompleted: number;
  };
}

const MonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // 获取系统统计
      const statsResponse = await fetch('/monitoring/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // 获取活跃告警
      const alertsResponse = await fetch('/monitoring/alerts?active=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData);
      }

      // 获取分析报告
      const analyticsResponse = await fetch('/monitoring/analytics/report?period=daily', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalyticsReport(analyticsData);
      }

      setError(null);
    } catch (err) {
      setError('Failed to fetch monitoring data');
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // 每30秒自动刷新
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">系统监控</h1>
        <Button 
          onClick={fetchData} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.activeUsersLastHour || 0}</div>
            <p className="text-xs text-muted-foreground">
              过去1小时，总用户 {stats?.users.totalUsers || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">响应时间</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.http.averageResponseTime.toFixed(0) || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              错误率 {stats?.http.errorRate.toFixed(2) || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">内存使用</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.system.memory.usagePercent.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(stats?.system.memory.heapUsed || 0)} / {formatBytes(stats?.system.memory.heapTotal || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃告警</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.alerts.activeAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">
              运行时间 {formatUptime(stats?.system.uptime || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="alerts">告警</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="performance">性能</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* HTTP请求方法分布 */}
            <Card>
              <CardHeader>
                <CardTitle>HTTP请求方法分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(stats?.http.requestsByMethod || {}).map(([method, count]) => ({ method, count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 状态码分布 */}
            <Card>
              <CardHeader>
                <CardTitle>HTTP状态码分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats?.http.requestsByStatus || {}).map(([status, count]) => ({ 
                        name: status, 
                        value: count,
                        fill: status.startsWith('2') ? '#10b981' : status.startsWith('4') ? '#f59e0b' : '#ef4444'
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(stats?.http.requestsByStatus || {}).map((entry, index) => (
                        <Cell key={`cell-${index}`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>活跃告警</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-muted-foreground">暂无活跃告警</p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <div>
                          <h4 className="font-medium">{alert.name}</h4>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        解决
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsReport && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 业务指标 */}
              <Card>
                <CardHeader>
                  <CardTitle>业务指标 (今日)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>工作流创建</span>
                      <span className="font-medium">{analyticsReport.businessMetrics.workflowsCreated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>工作流执行</span>
                      <span className="font-medium">{analyticsReport.businessMetrics.workflowsExecuted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>文件上传</span>
                      <span className="font-medium">{analyticsReport.businessMetrics.filesUploaded}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>复盘完成</span>
                      <span className="font-medium">{analyticsReport.businessMetrics.reviewsCompleted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 热门操作 */}
              <Card>
                <CardHeader>
                  <CardTitle>热门操作</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analyticsReport.usageMetrics.mostPopularActions.slice(0, 5).map((action, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-sm">{action.action}</span>
                        <span className="text-sm font-medium">{action.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 热门页面 */}
              <Card>
                <CardHeader>
                  <CardTitle>热门页面</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analyticsReport.usageMetrics.mostPopularPages.slice(0, 5).map((page, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-sm">{page.path}</span>
                        <span className="text-sm font-medium">{page.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 用户指标 */}
              <Card>
                <CardHeader>
                  <CardTitle>用户指标</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>总用户数</span>
                      <span className="font-medium">{analyticsReport.userMetrics.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>活跃用户</span>
                      <span className="font-medium">{analyticsReport.userMetrics.activeUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>平均会话时长</span>
                      <span className="font-medium">
                        {Math.round(analyticsReport.userMetrics.averageSessionDuration / 1000 / 60)}分钟
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>总会话数</span>
                      <span className="font-medium">{analyticsReport.usageMetrics.totalSessions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 系统资源使用 */}
            <Card>
              <CardHeader>
                <CardTitle>系统资源</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">内存使用率</span>
                      <span className="text-sm">{stats?.system.memory.usagePercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${stats?.system.memory.usagePercent || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>已使用内存</span>
                      <span>{formatBytes(stats?.system.memory.heapUsed || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>总内存</span>
                      <span>{formatBytes(stats?.system.memory.heapTotal || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>运行时间</span>
                      <span>{formatUptime(stats?.system.uptime || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HTTP性能指标 */}
            <Card>
              <CardHeader>
                <CardTitle>HTTP性能</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>总请求数</span>
                    <span className="font-medium">{stats?.http.totalRequests || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>平均响应时间</span>
                    <span className="font-medium">{stats?.http.averageResponseTime.toFixed(0) || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>错误率</span>
                    <span className={`font-medium ${(stats?.http.errorRate || 0) > 5 ? 'text-red-500' : 'text-green-500'}`}>
                      {stats?.http.errorRate.toFixed(2) || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;