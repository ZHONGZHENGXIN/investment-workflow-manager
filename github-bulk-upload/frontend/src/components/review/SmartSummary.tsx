import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { generateSummary, clearSummary } from '../../store/reviewSlice';

interface SmartSummaryProps {
  executionId?: string;
  title?: string;
}

export const SmartSummary: React.FC<SmartSummaryProps> = ({ 
  executionId, 
  title = '智能摘要' 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { summary, loading, error } = useSelector((state: RootState) => state.review);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerateSummary = () => {
    dispatch(generateSummary(executionId));
  };

  const handleClearSummary = () => {
    dispatch(clearSummary());
  };

  const renderMarkdown = (text: string) => {
    // 简单的Markdown渲染
    return text
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-lg font-semibold text-gray-900 mt-4 mb-2">
              {line.substring(3)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-base font-medium text-gray-800 mt-3 mb-2">
              {line.substring(4)}
            </h3>
          );
        }
        if (line.startsWith('- **')) {
          const match = line.match(/- \*\*(.*?)\*\*: (.*)/);
          if (match) {
            return (
              <div key={index} className="flex mb-1">
                <span className="font-medium text-gray-700 mr-2">• {match[1]}:</span>
                <span className="text-gray-600">{match[2]}</span>
              </div>
            );
          }
        }
        if (line.match(/^\d+\. /)) {
          return (
            <div key={index} className="mb-1 text-gray-700">
              {line}
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={index} className="h-2"></div>;
        }
        return (
          <p key={index} className="text-gray-700 mb-2">
            {line}
          </p>
        );
      });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex space-x-2">
          {summary && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {isExpanded ? '收起' : '展开'}
            </button>
          )}
          {!loading.summary && (
            <button
              onClick={summary ? handleClearSummary : handleGenerateSummary}
              className={`px-3 py-1 text-sm rounded ${
                summary
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {summary ? '清除' : '生成摘要'}
            </button>
          )}
        </div>
      </div>

      {loading.summary && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">正在生成智能摘要...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button
            onClick={handleGenerateSummary}
            className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            重试
          </button>
        </div>
      )}

      {!loading.summary && !error && !summary && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-gray-600 mb-4">
            {executionId 
              ? '为这次执行生成智能复盘摘要' 
              : '基于您的复盘历史生成智能分析摘要'
            }
          </p>
          <button
            onClick={handleGenerateSummary}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            生成智能摘要
          </button>
        </div>
      )}

      {summary && (
        <div className={`prose prose-sm max-w-none ${!isExpanded ? 'max-h-64 overflow-hidden' : ''}`}>
          <div className="text-gray-700">
            {renderMarkdown(summary)}
          </div>
          
          {!isExpanded && summary.length > 500 && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
          )}
        </div>
      )}

      {summary && !isExpanded && summary.length > 500 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            查看完整摘要 ↓
          </button>
        </div>
      )}

      {summary && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>AI生成的智能摘要</span>
            <div className="flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(summary)}
                className="hover:text-gray-700"
              >
                复制
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([summary], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `复盘摘要_${new Date().toISOString().slice(0, 10)}.md`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="hover:text-gray-700"
              >
                下载
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};