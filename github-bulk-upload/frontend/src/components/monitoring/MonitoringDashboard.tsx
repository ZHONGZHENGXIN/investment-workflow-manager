import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  ExclamationTriangleIcon as AlertTriangle,
  UsersIcon as Users,
  ServerIcon as Server,
  ClockIcon as Clock,
  ArrowPathIcon as RefreshCw
} from '@heroicons/react/24/outline';

interface SystemStats {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  http: {
    requestsPerSecond: number;
    averageResponseTime: number;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<string, number>;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
  errors: Array<{
    id: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

const MonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // 模拟数据加载
    const loadStats = () => {
      setLoading(true);
      setTimeout(() => {
        setStats({
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          disk: Math.random() * 100,
          network: {
            in: Math.random() * 1000,
            out: Math.random() * 1000,
          },
          http: {
            requestsPerSecond: Math.random() * 100,
            averageResponseTime: Math.random() * 500,
            requestsByMethod: {
              GET: Math.floor(Math.random() * 1000),
              POST: Math.floor(Math.random() * 500),
              PUT: Math.floor(Math.random() * 200),
              DELETE: Math.floor(Math.random() * 100),
            },
            requestsByStatus: {
              '200': Math.floor(Math.random() * 800),
              '404': Math.floor(Math.random() * 100),
              '500': Math.floor(Math.random() * 50),
            },
          },
          database: {
            connections: Math.floor(Math.random() * 50),
            queryTime: Math.random() * 100,
            slowQueries: Math.floor(Math.random() * 10),
          },
          errors: [
            {
              id: '1',
              message: '数据库连接超时',
              timestamp: new Date().toISOString(),
              severity: 'high',
            },
            {
              id: '2',
              message: 'API响应时间过长',
              timestamp: new Date().toISOString(),
              severity: 'medium',
            },
          ],
        });
        setLastUpdate(new Date());
        setLoading(false);
      }, 1000);
    };

    loadStats();
    const interval = setInterval(loadStats, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLastUpdate(new Date());
      setLoading(false);
    }, 1000);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载监控数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统监控</h1>
          <p className="text-gray-600">
            最后更新: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 系统概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">CPU使用率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.cpu.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">内存使用率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.memory.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">数据库连接</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.database.connections}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">响应时间</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.http.averageResponseTime.toFixed(0)}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细监控 */}
      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">系统资源</TabsTrigger>
          <TabsTrigger value="http">HTTP请求</TabsTrigger>
          <TabsTrigger value="database">数据库</TabsTrigger>
          <TabsTrigger value="alerts">告警</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>系统资源使用情况</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>CPU</span>
                      <span>{stats?.cpu.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${stats?.cpu}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>内存</span>
                      <span>{stats?.memory.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${stats?.memory}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>磁盘</span>
                      <span>{stats?.disk.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${stats?.disk}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>网络流量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">入站流量</span>
                    <span className="text-sm font-medium">
                      {stats?.network.in.toFixed(1)} MB/s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">出站流量</span>
                    <span className="text-sm font-medium">
                      {stats?.network.out.toFixed(1)} MB/s
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="http">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>HTTP请求统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">每秒请求数</span>
                    <span className="text-sm font-medium">
                      {stats?.http.requestsPerSecond.toFixed(1)} req/s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">平均响应时间</span>
                    <span className="text-sm font-medium">
                      {stats?.http.averageResponseTime.toFixed(0)}ms
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>请求方法分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats?.http.requestsByMethod || {}).map(([method, count]) => (
                    <div key={method} className="flex justify-between">
                      <Badge variant="default">{method}</Badge>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>数据库性能</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.database.connections}
                  </p>
                  <p className="text-sm text-gray-600">活跃连接</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.database.queryTime.toFixed(1)}ms
                  </p>
                  <p className="text-sm text-gray-600">平均查询时间</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.database.slowQueries}
                  </p>
                  <p className="text-sm text-gray-600">慢查询</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-4">
            {stats?.errors.map((error) => (
              <Alert key={error.id} variant={error.severity === 'critical' ? 'error' : 'warning'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{error.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(error.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={error.severity === 'critical' ? 'error' : 'warning'}>
                      {error.severity}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;