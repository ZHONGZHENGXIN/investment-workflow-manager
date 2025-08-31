import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchHistory } from '../store/historySlice';
import { HistoryList } from '../components/history/HistoryList';
import { HistoryFilters } from '../components/history/HistoryFilters';
import { HistoryStats } from '../components/history/HistoryStats';
import { ExecutionDetail } from '../components/history/ExecutionDetail';
import { ExportDialog } from '../components/history/ExportDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

const HistoryPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { executions, loading, error, stats } = useSelector((state: RootState) => state.history);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
    workflow: '',
    user: '',
  });

  useEffect(() => {
    dispatch(fetchHistory({ filters: filters as any }));
  }, [dispatch, filters]);

  if (loading && executions.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => dispatch(fetchHistory({ filters: filters as any }))}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和操作 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">执行历史</h1>
            <p className="mt-2 text-gray-600">查看和分析工作流执行历史记录</p>
          </div>
          <button
            onClick={() => setShowExportDialog(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <span className="mr-2">📤</span>
            导出数据
          </button>
        </div>

        {/* 统计概览 */}
        <div className="mb-6">
          <HistoryStats stats={stats} />
        </div>

        {/* 筛选器 */}
        <div className="mb-6">
          <HistoryFilters
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
          />
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 历史列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <HistoryList
                executions={executions}
                loading={loading}
                onSelectExecution={setSelectedExecution}
                selectedExecution={selectedExecution}
              />
            </div>
          </div>

          {/* 执行详情 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              {selectedExecution ? (
                <ExecutionDetail
                  executionId={selectedExecution}
                  onClose={() => setSelectedExecution(null)}
                />
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <div className="mb-4">
                    <span className="text-4xl">📋</span>
                  </div>
                  <p>选择一个执行记录查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 导出对话框 */}
        {showExportDialog && (
          <ExportDialog
            isOpen={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            filters={filters}
          />
        )}
      </div>
    </div>
  );
};

export default HistoryPage;