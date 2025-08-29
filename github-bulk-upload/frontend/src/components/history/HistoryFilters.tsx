import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { setFilters, clearFilters } from '../../store/historySlice';
import { fetchUserWorkflows } from '../../store/workflowSlice';
import { HistorySearchFilters } from '../../services/history';

export const HistoryFilters: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { filters } = useSelector((state: RootState) => state.history);
  const { workflows } = useSelector((state: RootState) => state.workflow);

  const [localFilters, setLocalFilters] = useState<HistorySearchFilters>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    dispatch(fetchUserWorkflows());
  }, [dispatch]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof HistorySearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    dispatch(setFilters(localFilters));
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    dispatch(clearFilters());
  };

  const hasActiveFilters = Object.keys(filters).some(key => 
    filters[key as keyof HistorySearchFilters] !== undefined && 
    filters[key as keyof HistorySearchFilters] !== ''
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">筛选条件</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            {showAdvanced ? '简单筛选' : '高级筛选'}
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* 基础筛选 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 搜索关键词 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              搜索关键词
            </label>
            <input
              type="text"
              value={localFilters.searchTerm || ''}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="搜索工作流名称、描述或复盘内容"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 工作流筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              工作流
            </label>
            <select
              value={localFilters.workflowId || ''}
              onChange={(e) => handleFilterChange('workflowId', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部工作流</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>

          {/* 状态筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              执行状态
            </label>
            <select
              value={localFilters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部状态</option>
              <option value="COMPLETED">已完成</option>
              <option value="IN_PROGRESS">进行中</option>
              <option value="PAUSED">已暂停</option>
              <option value="CANCELLED">已取消</option>
            </select>
          </div>

          {/* 复盘状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              复盘状态
            </label>
            <select
              value={localFilters.hasReview === undefined ? '' : localFilters.hasReview.toString()}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange('hasReview', value === '' ? undefined : value === 'true');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="true">已复盘</option>
              <option value="false">未复盘</option>
            </select>
          </div>
        </div>

        {/* 高级筛选 */}
        {showAdvanced && (
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 日期范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={localFilters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  value={localFilters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            应用筛选
          </button>
        </div>
      </div>

      {/* 活跃筛选条件显示 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">当前筛选：</span>
            {filters.searchTerm && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                关键词: {filters.searchTerm}
                <button
                  onClick={() => handleFilterChange('searchTerm', undefined)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.workflowId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                工作流: {workflows.find(w => w.id === filters.workflowId)?.name}
                <button
                  onClick={() => handleFilterChange('workflowId', undefined)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                状态: {filters.status === 'COMPLETED' ? '已完成' : 
                      filters.status === 'IN_PROGRESS' ? '进行中' : 
                      filters.status === 'PAUSED' ? '已暂停' : '已取消'}
                <button
                  onClick={() => handleFilterChange('status', undefined)}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
            {filters.hasReview !== undefined && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                复盘: {filters.hasReview ? '已复盘' : '未复盘'}
                <button
                  onClick={() => handleFilterChange('hasReview', undefined)}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};