import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchAnalytics } from '../../store/reviewSlice';

export const ReviewAnalytics: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { analytics, loading, error } = useSelector((state: RootState) => state.review);

  useEffect(() => {
    dispatch(fetchAnalytics());
  }, [dispatch]);

  const renderFrequencyChart = () => {
    if (!analytics?.reviewFrequency) return null;

    const months = Object.keys(analytics.reviewFrequency).sort();
    const maxCount = Math.max(...Object.values(analytics.reviewFrequency));

    return (
      <div className="space-y-2">
        {months.map((month) => {
          const count = analytics.reviewFrequency[month];
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          return (
            <div key={month} className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 w-16">{month}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-500 w-8">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderKeywords = () => {
    if (!analytics?.commonKeywords || analytics.commonKeywords.length === 0) {
      return <p className="text-sm text-gray-500">暂无关键词数据</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {analytics.commonKeywords.map((keyword, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {keyword.word}
            <span className="ml-1 text-blue-600">({keyword.count})</span>
          </span>
        ))}
      </div>
    );
  };

  const renderTrends = () => {
    if (!analytics?.improvementTrends || analytics.improvementTrends.length === 0) {
      return <p className="text-sm text-gray-500">暂无趋势数据</p>;
    }

    const maxImprovements = Math.max(...analytics.improvementTrends.map(t => t.improvements));

    return (
      <div className="space-y-3">
        {analytics.improvementTrends.map((trend, index) => {
          const percentage = maxImprovements > 0 ? (trend.improvements / maxImprovements) * 100 : 0;
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 w-12">{trend.period}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-500 w-8">{trend.improvements}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading.analytics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
          <p>加载分析数据失败</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => dispatch(fetchAnalytics())}
            className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>暂无分析数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">复盘分析</h3>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">总复盘数</div>
          <div className="text-2xl font-bold text-blue-900">{analytics.totalReviews}</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">平均长度</div>
          <div className="text-2xl font-bold text-green-900">{analytics.averageReviewLength}</div>
          <div className="text-xs text-green-600">字符</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">关键词数</div>
          <div className="text-2xl font-bold text-purple-900">{analytics.commonKeywords.length}</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm font-medium text-orange-600">改进趋势</div>
          <div className="text-2xl font-bold text-orange-900">
            {analytics.improvementTrends.reduce((sum, trend) => sum + trend.improvements, 0)}
          </div>
        </div>
      </div>

      {/* 详细分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 复盘频率 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">复盘频率</h4>
          {Object.keys(analytics.reviewFrequency).length > 0 ? (
            renderFrequencyChart()
          ) : (
            <p className="text-sm text-gray-500">暂无频率数据</p>
          )}
        </div>

        {/* 常用关键词 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">常用关键词</h4>
          {renderKeywords()}
        </div>

        {/* 改进趋势 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">改进趋势</h4>
          {renderTrends()}
        </div>
      </div>
    </div>
  );
};