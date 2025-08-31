import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalExecutions: number;
  successRate: number;
  activeWorkflows: number;
  avgDuration: number;
}

interface Activity {
  title: string;
  time: string;
  type: 'success' | 'error' | 'info';
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalExecutions: 0,
    successRate: 0,
    activeWorkflows: 0,
    avgDuration: 0
  });

  const [recentActivities] = useState<Activity[]>([
    { title: '工作流执行完成', time: '2分钟前', type: 'success' },
    { title: '新建投资审查流程', time: '15分钟前', type: 'info' },
    { title: '生成月度报告', time: '1小时前', type: 'success' },
    { title: '系统维护通知', time: '2小时前', type: 'info' }
  ]);

  useEffect(() => {
    // 模拟加载统计数据
    setStats({
      totalExecutions: 156,
      successRate: 94,
      activeWorkflows: 8,
      avgDuration: 12
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 页面标题 */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">投资流程管理系统</h1>
            <p className="mt-2 text-gray-600">欢迎使用投资流程管理系统，这里是您的工作台</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">总执行数</h3>
              <div className="text-3xl font-bold text-blue-600">{stats.totalExecutions}</div>
              <p className="text-sm text-gray-500 mt-1">累计执行次数</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">成功率</h3>
              <div className="text-3xl font-bold text-green-600">{stats.successRate}%</div>
              <p className="text-sm text-gray-500 mt-1">执行成功率</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">活跃工作流</h3>
              <div className="text-3xl font-bold text-purple-600">{stats.activeWorkflows}</div>
              <p className="text-sm text-gray-500 mt-1">正在使用的工作流</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">平均耗时</h3>
              <div className="text-3xl font-bold text-orange-600">{stats.avgDuration}分钟</div>
              <p className="text-sm text-gray-500 mt-1">平均执行时间</p>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-6">快速操作</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/execution')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="font-medium text-blue-900">开始执行</div>
                  <div className="text-sm text-blue-600">启动新的工作流执行</div>
                </button>

                <button
                  onClick={() => navigate('/workflow')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <div className="font-medium text-green-900">管理工作流</div>
                  <div className="text-sm text-green-600">创建和编辑工作流</div>
                </button>

                <button
                  onClick={() => navigate('/history')}
                  className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium text-purple-900">查看历史</div>
                  <div className="text-sm text-purple-600">浏览执行历史记录</div>
                </button>

                <button
                  onClick={() => navigate('/review')}
                  className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition-colors"
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-medium text-orange-900">审查报告</div>
                  <div className="text-sm text-orange-600">生成和查看报告</div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-8">
              <h3 className="text-lg font-medium text-gray-900 mb-6">最近活动</h3>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${
                        activity.type === 'success' ? 'bg-green-500' :
                        activity.type === 'error' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;