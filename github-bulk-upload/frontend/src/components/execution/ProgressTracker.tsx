import React from 'react';
import { ExecutionService, Execution, ExecutionRecordStatus } from '../../services/execution';

interface ProgressTrackerProps {
  execution: Execution;
  className?: string;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  execution,
  className = '',
}) => {
  const executionRecords = execution.records || [];
  const totalSteps = executionRecords.length;
  const completedSteps = executionRecords.filter((record: any) => 
    record.status === ExecutionRecordStatus.COMPLETED || record.status === ExecutionRecordStatus.SKIPPED
  ).length;
  const inProgressSteps = executionRecords.filter((record: any) => 
    record.status === ExecutionRecordStatus.IN_PROGRESS
  ).length;
  const failedSteps = executionRecords.filter((record: any) => 
    record.status === ExecutionRecordStatus.FAILED
  ).length;

  const progress = execution.progress || 0;

  const getStepStatusIcon = (status: ExecutionRecordStatus) => {
    switch (status) {
      case ExecutionRecordStatus.COMPLETED:
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case ExecutionRecordStatus.IN_PROGRESS:
        return (
          <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case ExecutionRecordStatus.SKIPPED:
        return (
          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        );
      case ExecutionRecordStatus.FAILED:
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">执行进度</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ExecutionService.getStatusColor(execution.status)}`}>
          {ExecutionService.getStatusText(execution.status)}
        </span>
      </div>

      {/* 总体进度 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">总体进度</span>
          <span className="text-sm text-gray-600">{completedSteps}/{totalSteps} 步骤</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-right mt-1">
          <span className="text-sm text-gray-600">{progress}%</span>
        </div>
      </div>

      {/* 步骤状态统计 */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{totalSteps}</div>
          <div className="text-xs text-gray-600">总步骤</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{completedSteps}</div>
          <div className="text-xs text-gray-600">已完成</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{inProgressSteps}</div>
          <div className="text-xs text-gray-600">进行中</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">{failedSteps}</div>
          <div className="text-xs text-gray-600">失败</div>
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-3">步骤状态</h4>
        {executionRecords.map((record: any) => (
          <div key={record.id} className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getStepStatusIcon(record.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-900 truncate">
                  步骤 {record.stepId}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${ExecutionService.getStepStatusColor(record.status)}`}>
                  {ExecutionService.getStepStatusText(record.status)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {record.startedAt && (
                  <span>开始: {new Date(record.startedAt).toLocaleString('zh-CN')}</span>
                )}
                {record.completedAt && (
                  <span className="ml-2">
                    • 完成: {new Date(record.completedAt).toLocaleString('zh-CN')}
                  </span>
                )}
                {record.notes && (
                  <div className="mt-1 text-gray-600">{record.notes}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 执行时间信息 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">创建时间:</span>
            <div className="text-gray-600">
              {new Date(execution.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
          {execution.startedAt && (
            <div>
              <span className="font-medium text-gray-700">开始时间:</span>
              <div className="text-gray-600">
                {new Date(execution.startedAt).toLocaleString('zh-CN')}
              </div>
            </div>
          )}
          {execution.completedAt && (
            <div>
              <span className="font-medium text-gray-700">完成时间:</span>
              <div className="text-gray-600">
                {new Date(execution.completedAt).toLocaleString('zh-CN')}
              </div>
            </div>
          )}
          {execution.dueDate && (
            <div>
              <span className="font-medium text-gray-700">截止时间:</span>
              <div className={`${new Date(execution.dueDate) < new Date() ? 'text-red-600' : 'text-gray-600'}`}>
                {new Date(execution.dueDate).toLocaleString('zh-CN')}
              </div>
            </div>
          )}
          {execution.startedAt && (
            <div className="col-span-2">
              <span className="font-medium text-gray-700">持续时间:</span>
              <span className="ml-2 text-gray-600">
                {ExecutionService.formatDuration(String(execution.startedAt), String(execution.completedAt))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;