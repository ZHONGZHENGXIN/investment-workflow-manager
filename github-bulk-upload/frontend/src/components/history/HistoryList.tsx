import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { 
  fetchExecutionHistory, 
  setFilters, 
  toggleExecutionSelection,
  selectAllExecutions,
  clearSelection,
  deleteExecution,
  batchDeleteExecutions
} from '../../store/historySlice';
import { ExecutionHistory } from '../../services/history';
import { ExportDialog } from './ExportDialog';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface HistoryListProps {
  onExecutionClick?: (execution: ExecutionHistory) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ onExecutionClick }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    executions, 
    pagination, 
    filters, 
    selectedExecutions, 
    loading, 
    error 
  } = useSelector((state: RootState) => state.history);

  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    dispatch(fetchExecutionHistory({ filters, pagination: { page: 1, limit: 20 } }));
  }, [dispatch, filters]);

  useEffect(() => {
    setShowBatchActions(selectedExecutions.length > 0);
  }, [selectedExecutions]);

  const handlePageChange = (page: number) => {
    dispatch(fetchExecutionHistory({ 
      filters, 
      pagination: { page, limit: pagination?.limit || 20 } 
    }));
  };

  const handleFilterChange = (newFilters: any) => {
    dispatch(setFilters({ ...filters, ...newFilters }));
  };

  const handleSelectAll = () => {
    if (selectedExecutions.length === executions.length) {
      dispatch(clearSelection());
    } else {
      dispatch(selectAllExecutions());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedExecutions.length === 0) return;

    const confirmed = window.confirm(
      `确定要删除选中的 ${selectedExecutions.length} 条执行记录吗？此操作不可撤销。`
    );

    if (confirmed) {
      try {
        await dispatch(batchDeleteExecutions(selectedExecutions)).unwrap();
        toast.success(`成功删除 ${selectedExecutions.length} 条记录`);
      } catch (error) {
        toast.error('批量删除失败');
      }
    }
  };

  const handleDeleteSingle = async (id: string, name: string) => {
    const confirmed = window.confirm(`确定要删除执行记录"${name}"吗？此操作不可撤销。`);

    if (confirmed) {
      try {
        await dispatch(deleteExecution(id)).unwrap();
        toast.success('删除成功');
      } catch (error) {
        toast.error('删除失败');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '已完成';
      case 'IN_PROGRESS':
        return '进行中';
      case 'PAUSED':
        return '已暂停';
      case 'CANCELLED':
        return '已取消';
      default:
        return status;
    }
  };

  const formatDuration = (milliseconds?: number) => {
    if (!milliseconds) return '-';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  if (loading.list) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
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
          <p>加载执行历史失败</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => dispatch(fetchExecutionHistory({ filters }))}
            className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* 操作栏 */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBatchActions && (
              <span className="text-sm text-blue-700">
                已选择 {selectedExecutions.length} 项
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowExportDialog(true)}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>导出数据</span>
            </button>
            {showBatchActions && (
              <>
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  批量删除
                </button>
                <button
                  onClick={() => dispatch(clearSelection())}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  取消选择
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 表头 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={selectedExecutions.length === executions.length && executions.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className="flex-1 grid grid-cols-6 gap-4 text-sm font-medium text-gray-500">
            <div>工作流</div>
            <div>状态</div>
            <div>开始时间</div>
            <div>执行时长</div>
            <div>完成率</div>
            <div>操作</div>
          </div>
        </div>
      </div>

      {/* 执行记录列表 */}
      <div className="divide-y divide-gray-200">
        {executions.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p>暂无执行记录</p>
            <p className="text-sm mt-1">开始执行您的第一个投资流程</p>
          </div>
        ) : (
          executions.map((execution) => (
            <div
              key={execution.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedExecutions.includes(execution.id)}
                  onChange={() => dispatch(toggleExecutionSelection(execution.id))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                
                <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                  {/* 工作流信息 */}
                  <div>
                    <button
                      onClick={() => onExecutionClick?.(execution)}
                      className="text-left"
                    >
                      <div className="font-medium text-gray-900 hover:text-blue-600">
                        {execution.workflow.name}
                      </div>
                      {execution.workflow.description && (
                        <div className="text-sm text-gray-500 truncate">
                          {execution.workflow.description}
                        </div>
                      )}
                    </button>
                  </div>

                  {/* 状态 */}
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                      {getStatusText(execution.status)}
                    </span>
                    {execution.reviewNotes && (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                          已复盘
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 开始时间 */}
                  <div className="text-sm text-gray-600">
                    {format(new Date(execution.startedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                  </div>

                  {/* 执行时长 */}
                  <div className="text-sm text-gray-600">
                    {formatDuration(execution.duration)}
                  </div>

                  {/* 完成率 */}
                  <div>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${execution.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round(execution.completionRate)}%
                      </span>
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onExecutionClick?.(execution)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(execution.id, execution.workflow.name)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {pagination && pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              显示第 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
              共 {pagination.total} 条记录
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm border rounded ${
                        page === pagination.page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出对话框 */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        filters={filters}
      />
    </div>
  );
};