import React from 'react';

export interface HistoryStatsProps {
  stats: any;
}

export const HistoryStats: React.FC<HistoryStatsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">统计信息</h3>
        <p className="text-gray-500">暂无统计数据</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">统计信息</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
          <div className="text-sm text-gray-500">总执行数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.success || 0}</div>
          <div className="text-sm text-gray-500">成功</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
          <div className="text-sm text-gray-500">失败</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
          <div className="text-sm text-gray-500">进行中</div>
        </div>
      </div>
    </div>
  );
};

export default HistoryStats;