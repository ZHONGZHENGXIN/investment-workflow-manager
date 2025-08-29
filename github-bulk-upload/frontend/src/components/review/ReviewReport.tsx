import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { generateReport, clearReport } from '../../store/reviewSlice';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const ReviewReport: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { report, loading, error } = useSelector((state: RootState) => state.review);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleGenerateReport = () => {
    if (startDate && endDate) {
      dispatch(generateReport({ startDate, endDate }));
    }
  };

  const handleClearReport = () => {
    dispatch(clearReport());
    setStartDate('');
    setEndDate('');
  };

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const exportReport = () => {
    if (!report) return;

    const reportContent = `
# 复盘报告

**报告期间：** ${format(new Date(report.period.start), 'yyyy年MM月dd日', { locale: zhCN })} - ${format(new Date(report.period.end), 'yyyy年MM月dd日', { locale: zhCN })}

## 执行概览

- 总执行次数：${report.summary.totalExecutions}
- 复盘记录数：${report.summary.totalReviews}
- 平均执行时间：${formatDuration(report.summary.averageExecutionTime)}
- 完成率：${report.summary.completionRate}%

## 分析数据

- 总复盘数：${report.analytics.totalReviews}
- 平均复盘长度：${report.analytics.averageReviewLength}字符
- 常用关键词：${report.analytics.commonKeywords.map(k => `${k.word}(${k.count})`).join(', ')}

## 执行详情

${report.executions.map(exec => `
### ${exec.workflowName}
- 完成时间：${format(new Date(exec.completedAt), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
- 执行时长：${formatDuration(exec.duration)}
- 步骤完成：${exec.stepsCompleted}/${exec.totalSteps}
- 复盘内容：${exec.reviewNotes || '无'}
`).join('\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `复盘报告_${format(new Date(report.period.start), 'yyyyMMdd')}_${format(new Date(report.period.end), 'yyyyMMdd')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">复盘报告</h3>

      {/* 报告生成表单 */}
      {!report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerateReport}
              disabled={!startDate || !endDate || loading.report}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading.report ? '生成中...' : '生成报告'}
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 报告内容 */}
      {report && (
        <div className="space-y-6">
          {/* 报告头部 */}
          <div className="flex justify-between items-center pb-4 border-b">
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                {format(new Date(report.period.start), 'yyyy年MM月dd日', { locale: zhCN })} - 
                {format(new Date(report.period.end), 'yyyy年MM月dd日', { locale: zhCN })}
              </h4>
              <p className="text-sm text-gray-500">复盘报告</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={exportReport}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                导出报告
              </button>
              <button
                onClick={handleClearReport}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                重新生成
              </button>
            </div>
          </div>

          {/* 执行概览 */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">执行概览</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-600">总执行次数</div>
                <div className="text-xl font-bold text-blue-900">{report.summary.totalExecutions}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm text-green-600">复盘记录数</div>
                <div className="text-xl font-bold text-green-900">{report.summary.totalReviews}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-sm text-purple-600">平均执行时间</div>
                <div className="text-xl font-bold text-purple-900">
                  {formatDuration(report.summary.averageExecutionTime)}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-sm text-orange-600">完成率</div>
                <div className="text-xl font-bold text-orange-900">{report.summary.completionRate}%</div>
              </div>
            </div>
          </div>

          {/* 分析数据 */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">分析数据</h5>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">总复盘数</div>
                  <div className="text-lg font-semibold">{report.analytics.totalReviews}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">平均复盘长度</div>
                  <div className="text-lg font-semibold">{report.analytics.averageReviewLength}字符</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">常用关键词</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {report.analytics.commonKeywords.slice(0, 5).map((keyword, index) => (
                      <span
                        key={index}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {keyword.word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 执行详情 */}
          <div>
            <h5 className="font-medium text-gray-900 mb-3">执行详情</h5>
            <div className="space-y-3">
              {report.executions.map((execution) => (
                <div key={execution.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h6 className="font-medium text-gray-900">{execution.workflowName}</h6>
                    <span className="text-sm text-gray-500">
                      {format(new Date(execution.completedAt), 'MM月dd日 HH:mm', { locale: zhCN })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">执行时长：</span>
                      <span className="font-medium">{formatDuration(execution.duration)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">步骤完成：</span>
                      <span className="font-medium">{execution.stepsCompleted}/{execution.totalSteps}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">完成率：</span>
                      <span className="font-medium">
                        {execution.totalSteps > 0 
                          ? Math.round((execution.stepsCompleted / execution.totalSteps) * 100)
                          : 0}%
                      </span>
                    </div>
                  </div>
                  {execution.reviewNotes && (
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="text-gray-600">复盘内容：</span>
                      <p className="mt-1 line-clamp-2">{execution.reviewNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};