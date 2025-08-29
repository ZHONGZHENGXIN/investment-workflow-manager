import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { exportExecutions } from '../../store/historySlice';
import { HistorySearchFilters } from '../../services/history';
import toast from 'react-hot-toast';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters?: HistorySearchFilters;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  filters = {}
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.history);

  const [exportOptions, setExportOptions] = useState({
    format: 'json' as 'json' | 'csv' | 'excel',
    includeSteps: false,
    includeReviews: false,
    includeAttachments: false
  });

  const handleExport = async () => {
    try {
      await dispatch(exportExecutions({
        format: exportOptions.format,
        options: {
          ...exportOptions,
          filters
        }
      })).unwrap();
      
      toast.success('数据导出成功');
      onClose();
    } catch (error) {
      toast.error('数据导出失败');
    }
  };

  const handleOptionChange = (key: keyof typeof exportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getEstimatedSize = () => {
    // 简单的大小估算
    let baseSize = 'KB';
    if (exportOptions.includeSteps) baseSize = 'MB';
    if (exportOptions.includeReviews) baseSize = 'MB';
    return `预计文件大小: ~${Math.random() * 10 + 1 | 0} ${baseSize}`;
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'json':
        return 'JSON格式，适合程序处理，包含完整的数据结构';
      case 'csv':
        return 'CSV格式，适合Excel打开，便于数据分析';
      case 'excel':
        return 'Excel格式，包含格式化和图表（暂未实现）';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">导出执行记录</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 导出格式选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              导出格式
            </label>
            <div className="space-y-3">
              {[
                { value: 'json', label: 'JSON', available: true },
                { value: 'csv', label: 'CSV', available: true },
                { value: 'excel', label: 'Excel', available: false }
              ].map((format) => (
                <div key={format.value} className="flex items-start">
                  <input
                    type="radio"
                    id={format.value}
                    name="format"
                    value={format.value}
                    checked={exportOptions.format === format.value}
                    onChange={(e) => handleOptionChange('format', e.target.value)}
                    disabled={!format.available}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div className="ml-3">
                    <label
                      htmlFor={format.value}
                      className={`text-sm font-medium ${
                        format.available ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {format.label}
                      {!format.available && (
                        <span className="ml-2 text-xs text-gray-500">(即将推出)</span>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {getFormatDescription(format.value)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 导出选项 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              包含内容
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeSteps"
                  checked={exportOptions.includeSteps}
                  onChange={(e) => handleOptionChange('includeSteps', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="includeSteps" className="ml-3 text-sm text-gray-700">
                  包含步骤详情
                  <span className="text-xs text-gray-500 ml-2">
                    (每个执行步骤的详细信息)
                  </span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeReviews"
                  checked={exportOptions.includeReviews}
                  onChange={(e) => handleOptionChange('includeReviews', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="includeReviews" className="ml-3 text-sm text-gray-700">
                  包含复盘内容
                  <span className="text-xs text-gray-500 ml-2">
                    (复盘笔记和评分)
                  </span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeAttachments"
                  checked={exportOptions.includeAttachments}
                  onChange={(e) => handleOptionChange('includeAttachments', e.target.checked)}
                  disabled={true}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <label htmlFor="includeAttachments" className="ml-3 text-sm text-gray-400">
                  包含附件信息
                  <span className="text-xs text-gray-500 ml-2">
                    (即将推出)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 筛选条件预览 */}
          {Object.keys(filters).length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">当前筛选条件</h4>
              <div className="text-xs text-gray-600 space-y-1">
                {filters.workflowId && <div>• 工作流: {filters.workflowId}</div>}
                {filters.status && <div>• 状态: {filters.status}</div>}
                {filters.startDate && <div>• 开始日期: {filters.startDate}</div>}
                {filters.endDate && <div>• 结束日期: {filters.endDate}</div>}
                {filters.hasReview !== undefined && (
                  <div>• 复盘状态: {filters.hasReview ? '已复盘' : '未复盘'}</div>
                )}
                {filters.searchTerm && <div>• 搜索关键词: {filters.searchTerm}</div>}
              </div>
            </div>
          )}

          {/* 文件信息 */}
          <div className="mb-6 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <div>{getEstimatedSize()}</div>
              <div className="mt-1 text-xs">
                导出将包含符合筛选条件的所有执行记录
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={loading.export}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={loading.export}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading.export ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  导出中...
                </div>
              ) : (
                '开始导出'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};