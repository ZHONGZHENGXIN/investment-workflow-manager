import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchHistoryStats } from '../../store/historySlice';

export const HistoryStats: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { stats, loading, error } = useSelector((state: RootState) => state.history);

  useEffect(() => {
    dispatch(fetchHistoryStats());
  }, [dispatch]);

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const renderActivityChart = () => {
    if (!stats?.recentActivity || stats.recentActivity.length === 0) {
      return <p className="text-sm text-gray-500">暂无活动数据</p>;
    }

    const maxCount = Math.max(...stats.recentActivity.map(item => item.count));
    
    return (
      <div className="space-y-2">
        {stats.recentActivity.slice(-7).map((item, index) => {
          const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const date = new Date(item.date);
          const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short' });
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 w-12">{dayName}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-500 w-8">{item.count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatusDistribution = () => {
    if (!stats?.statusDistribution) {
      return <p className="text-sm text-gray-500">暂无状态数据</p>;
    }

    const statusLabels: Record<string, string> = {
      'COMPLETED': '已完成',
      'IN_PROGRESS': '进行中',
      'PAUSED': '已暂停',
      'CANCELLED': '已取消'
    };

    const statusColors: Record<string, string> = {
      'COMPLETED': 'bg-green-500',
      'IN_PROGRESS': 'bg-blue-500',
      'PAUSED': 'bg-yellow-500',
      'CANCELLED': 'bg-red-500'
    };

    const total = Object.values(stats.statusDistribution).reduce((sum, count) => sum + count, 0);

    return (
      <div className="space-y-3">
        {Object.entries(stats.statusDistribution).map(([status, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-500'}`}></div>
                <span className="text-sm text-gray-700">{statusLabels[status] || status}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${statusColors[status] || 'bg-gray-500'}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-8">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading.stats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-3 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <p>加载统计数据失败</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => dispatch(fetchHistoryStats())}
            className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>暂无统计数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">执行统计</h3>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">总执行数</div>
          <div className="text-2xl font-bold text-blue-900">{stats.totalExecutions}</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">已完成</div>
          <div className="text-2xl font-bold text-green-900">{stats.completedExecutions}</div>
          <div className="text-xs text-green-600">
            完成率 {stats.totalExecutions > 0 ? Math.round((stats.completedExecutions / stats.totalExecutions) * 100) : 0}%
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">平均时长</div>
          <div className="text-2xl font-bold text-purple-900">
            {formatDuration(stats.averageExecutionTime)}
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm font-medium text-orange-600">工作流数</div>
          <div className="text-2xl font-bold text-orange-900">{stats.totalWorkflows}</div>
        </div>
      </div>

      {/* 最常用工作流 */}
      {stats.mostUsedWorkflow && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">最常用工作流</h4>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">{stats.mostUsedWorkflow.name}</span>
            <span className="text-sm text-gray-500">使用 {stats.mostUsedWorkflow.count} 次</span>
          </div>
        </div>
      )}

      {/* 详细统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 最近活动 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">最近7天活动</h4>
          {renderActivityChart()}
        </div>

        {/* 状态分布 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">状态分布</h4>
          {renderStatusDistribution()}
        </div>
      </div>
    </div>
  );
};