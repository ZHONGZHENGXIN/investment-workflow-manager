import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchExecutionDetail, clearCurrentExecution } from '../../store/historySlice';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ExecutionDetailProps {
  executionId: string;
  onClose: () => void;
}

export const ExecutionDetail: React.FC<ExecutionDetailProps> = ({ 
  executionId, 
  onClose 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentExecution, loading, error } = useSelector((state: RootState) => state.history);

  useEffect(() => {
    dispatch(fetchExecutionDetail(executionId));
    
    return () => {
      dispatch(clearCurrentExecution());
    };
  }, [dispatch, executionId]);

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

  if (loading.detail) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentExecution) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-600 mb-4">{error || '执行记录不存在'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {currentExecution.workflow.name}
            </h2>
            <p className="text-gray-600 mt-1">
              {currentExecution.workflow.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">执行状态</div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(currentExecution.status)}`}>
              {getStatusText(currentExecution.status)}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">开始时间</div>
            <div className="font-medium text-gray-900 mt-1">
              {format(new Date(currentExecution.startedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">执行时长</div>
            <div className="font-medium text-gray-900 mt-1">
              {formatDuration(currentExecution.duration)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">完成率</div>
            <div className="font-medium text-gray-900 mt-1">
              {Math.round(currentExecution.completionRate)}%
            </div>
          </div>
        </div>

        {/* 执行步骤 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">执行步骤</h3>
          <div className="space-y-3">
            {currentExecution.executionRecords.map((record, index) => (
              <div
                key={record.id}
                className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    record.status === 'COMPLETED' 
                      ? 'bg-green-100 text-green-800' 
                      : record.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      {record.step.name}
                      {record.step.isRequired && (
                        <span className="ml-2 text-xs text-red-600">*必需</span>
                      )}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'COMPLETED' 
                        ? 'bg-green-100 text-green-800' 
                        : record.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status === 'COMPLETED' ? '已完成' : 
                       record.status === 'IN_PROGRESS' ? '进行中' : '待执行'}
                    </span>
                  </div>

                  {record.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>执行备注：</strong> {record.notes}
                    </div>
                  )}

                  {record.reviewNotes && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>步骤复盘：</strong> {record.reviewNotes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 整体复盘 */}
        {currentExecution.reviewNotes && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">整体复盘</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {currentExecution.reviewNotes}
                </p>
              </div>
              {currentExecution.reviewedAt && (
                <div className="mt-3 text-xs text-gray-500">
                  复盘时间: {format(new Date(currentExecution.reviewedAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};