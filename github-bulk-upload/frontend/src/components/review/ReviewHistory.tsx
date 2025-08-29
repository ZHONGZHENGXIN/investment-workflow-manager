import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchInsights } from '../../store/reviewSlice';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ReviewHistoryProps {
  limit?: number;
  onReviewClick?: (executionId: string) => void;
}

export const ReviewHistory: React.FC<ReviewHistoryProps> = ({
  limit = 10,
  onReviewClick
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { insights, loading, error } = useSelector((state: RootState) => state.review);

  useEffect(() => {
    dispatch(fetchInsights(limit));
  }, [dispatch, limit]);

  const renderRating = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-sm ${
              rating >= star ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const renderInsights = (insightList: string[]) => {
    if (insightList.length === 0) return null;
    
    return (
      <div className="mt-2">
        <h5 className="text-xs font-medium text-gray-600 mb-1">关键洞察：</h5>
        <ul className="text-xs text-gray-500 space-y-1">
          {insightList.slice(0, 2).map((insight, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-500 mr-1">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderSuggestions = (suggestions: string[]) => {
    if (suggestions.length === 0) return null;
    
    return (
      <div className="mt-2">
        <h5 className="text-xs font-medium text-gray-600 mb-1">改进建议：</h5>
        <ul className="text-xs text-gray-500 space-y-1">
          {suggestions.slice(0, 2).map((suggestion, index) => (
            <li key={index} className="flex items-start">
              <span className="text-green-500 mr-1">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (loading.insights) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
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
          <p>加载复盘历史失败</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => dispatch(fetchInsights(limit))}
            className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">复盘历史</h3>
        <span className="text-sm text-gray-500">
          共 {insights.length} 条记录
        </span>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📝</div>
          <p>暂无复盘记录</p>
          <p className="text-sm mt-1">完成投资流程后可以进行复盘</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.executionId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onReviewClick?.(insight.executionId)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {insight.workflowName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(insight.completedAt), {
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </p>
                </div>
                {renderRating(insight.rating)}
              </div>

              <div className="text-sm text-gray-700 mb-2 line-clamp-3">
                {insight.reviewNotes.length > 150
                  ? `${insight.reviewNotes.substring(0, 150)}...`
                  : insight.reviewNotes}
              </div>

              {renderInsights(insight.keyInsights)}
              {renderSuggestions(insight.improvementSuggestions)}

              <div className="mt-3 flex justify-between items-center text-xs text-gray-400">
                <span>执行ID: {insight.executionId.substring(0, 8)}...</span>
                <span>点击查看详情</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};