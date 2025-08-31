import React from 'react';

export interface HistoryFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  loading: any;
}

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  loading 
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">筛选条件</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            状态
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading.list}
          >
            <option value="">全部</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="running">运行中</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            日期范围
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => onFiltersChange({ ...filters, dateRange: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading.list}
          >
            <option value="">全部</option>
            <option value="today">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            工作流
          </label>
          <select
            value={filters.workflow}
            onChange={(e) => onFiltersChange({ ...filters, workflow: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading.list}
          >
            <option value="">全部工作流</option>
            <option value="investment">投资审查</option>
            <option value="compliance">合规检查</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            用户
          </label>
          <input
            type="text"
            value={filters.user}
            onChange={(e) => onFiltersChange({ ...filters, user: e.target.value })}
            placeholder="输入用户名"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading.list}
          />
        </div>
      </div>
    </div>
  );
};

export default HistoryFilters;