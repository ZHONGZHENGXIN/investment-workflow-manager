import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { startStep, completeStep, skipStep, failStep } from '../../store/executionSlice';
import { ExecutionRecord, ExecutionRecordStatus, ExecutionService } from '../../services/execution';
import AttachmentManager from './AttachmentManager';

interface StepExecutionProps {
  executionId: string;
  executionRecord: ExecutionRecord;
  onStepUpdate?: (record: ExecutionRecord) => void;
  className?: string;
}

const StepExecution: React.FC<StepExecutionProps> = ({
  executionId,
  executionRecord,
  onStepUpdate,
  className = '',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState(executionRecord.notes || '');
  const [result, setResult] = useState(executionRecord.result || {});
  const [isUpdating, setIsUpdating] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [failureReason, setFailureReason] = useState('');

  const handleStartStep = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const result = await dispatch(startStep({
        executionId,
        recordId: executionRecord.id
      }));

      if (startStep.fulfilled.match(result)) {
        onStepUpdate?.(result.payload);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteStep = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const stepResult = await dispatch(completeStep({
        executionId,
        recordId: executionRecord.id,
        data: { notes, result: notes }
      }));

      if (completeStep.fulfilled.match(stepResult)) {
        onStepUpdate?.(stepResult.payload);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkipStep = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const result = await dispatch(skipStep({
        executionId,
        recordId: executionRecord.id,
        reason: skipReason
      }));

      if (skipStep.fulfilled.match(result)) {
        onStepUpdate?.(result.payload);
        setSkipReason('');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFailStep = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const result = await dispatch(failStep({
        executionId,
        recordId: executionRecord.id,
        reason: failureReason
      }));

      if (failStep.fulfilled.match(result)) {
        onStepUpdate?.(result.payload);
        setFailureReason('');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getStepIcon = () => {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getStatusIcon = () => {
    switch (executionRecord.status) {
      case ExecutionRecordStatus.COMPLETED:
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case ExecutionRecordStatus.IN_PROGRESS:
        return (
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case ExecutionRecordStatus.SKIPPED:
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case ExecutionRecordStatus.FAILED:
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4">
        {/* 步骤头部 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${ExecutionService.getStepStatusColor(executionRecord.status)}`}>
              {getStepIcon()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium text-gray-900">步骤 {executionRecord.stepId}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ExecutionService.getStepStatusColor(executionRecord.status)}`}>
                  {ExecutionService.getStepStatusText(executionRecord.status)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">执行记录 ID: {executionRecord.id}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 快速操作按钮 */}
        <div className="flex space-x-2 mb-3">
          {executionRecord.status === ExecutionRecordStatus.PENDING && (
            <>
              <button
                onClick={handleStartStep}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isUpdating ? '处理中...' : '开始执行'}
              </button>
            </>
          )}
          
          {executionRecord.status === ExecutionRecordStatus.IN_PROGRESS && (
            <>
              <button
                onClick={handleCompleteStep}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isUpdating ? '处理中...' : '标记完成'}
              </button>
              <button
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                跳过/失败
              </button>
            </>
          )}
        </div>

        {/* 展开内容 */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* 步骤笔记 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                步骤笔记
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="记录执行过程中的想法、发现或决策..."
                rows={3}
              />
            </div>

            {/* 执行结果 */}
            {executionRecord.status === ExecutionRecordStatus.IN_PROGRESS && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  执行结果 (JSON格式)
                </label>
                <textarea
                  value={JSON.stringify(result, null, 2)}
                  onChange={(e) => {
                    try {
                      setResult(JSON.parse(e.target.value));
                    } catch {
                      // 忽略JSON解析错误
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder='{"key": "value"}'
                  rows={4}
                />
              </div>
            )}

            {/* 跳过/失败操作 */}
            {executionRecord.status === ExecutionRecordStatus.IN_PROGRESS && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    跳过原因
                  </label>
                  <textarea
                    value={skipReason}
                    onChange={(e) => setSkipReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="说明跳过此步骤的原因..."
                    rows={2}
                  />
                  <button
                    onClick={handleSkipStep}
                    disabled={isUpdating || !skipReason.trim()}
                    className="mt-2 w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                  >
                    {isUpdating ? '处理中...' : '跳过步骤'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    失败原因
                  </label>
                  <textarea
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="说明步骤失败的原因..."
                    rows={2}
                  />
                  <button
                    onClick={handleFailStep}
                    disabled={isUpdating || !failureReason.trim()}
                    className="mt-2 w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {isUpdating ? '处理中...' : '标记失败'}
                  </button>
                </div>
              </div>
            )}

            {/* 附件管理 */}
            <div>
              <AttachmentManager
                executionRecordId={executionRecord.id}
                showTitle={true}
              />
            </div>

            {/* 步骤信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">步骤ID:</span>
                <span className="ml-2 text-gray-600">{executionRecord.stepId}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">创建时间:</span>
                <span className="ml-2 text-gray-600">
                  {new Date(executionRecord.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              {executionRecord.startedAt && (
                <div>
                  <span className="font-medium text-gray-700">开始时间:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(executionRecord.startedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {executionRecord.completedAt && (
                <div>
                  <span className="font-medium text-gray-700">完成时间:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(executionRecord.completedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {executionRecord.skippedAt && (
                <div>
                  <span className="font-medium text-gray-700">跳过时间:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(executionRecord.skippedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {executionRecord.failedAt && (
                <div>
                  <span className="font-medium text-gray-700">失败时间:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(executionRecord.failedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {executionRecord.actualDuration && (
                <div>
                  <span className="font-medium text-gray-700">实际耗时:</span>
                  <span className="ml-2 text-gray-600">{executionRecord.actualDuration} 分钟</span>
                </div>
              )}
            </div>

            {/* 显示跳过/失败原因 */}
            {executionRecord.skipReason && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <div className="text-sm font-medium text-orange-800">跳过原因:</div>
                <div className="text-sm text-orange-700 mt-1">{executionRecord.skipReason}</div>
              </div>
            )}
            
            {executionRecord.failureReason && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-sm font-medium text-red-800">失败原因:</div>
                <div className="text-sm text-red-700 mt-1">{executionRecord.failureReason}</div>
              </div>
            )}

            {/* 显示执行结果 */}
            {executionRecord.result && Object.keys(executionRecord.result).length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="text-sm font-medium text-green-800">执行结果:</div>
                <pre className="text-sm text-green-700 mt-1 whitespace-pre-wrap">
                  {JSON.stringify(executionRecord.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepExecution;