import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchTrends } from '../../store/reviewSlice';

export const TrendAnalysis: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { trends, loading, error } = useSelector((state: RootState) => state.review);

  useEffect(() => {
    dispatch(fetchTrends());
  }, [dispatch]);

  const renderTrendChart = (
    data: Array<{ period: string; [key: string]: any }>,
    valueKey: string,
    title: string,
    color: string,
    unit?: string
  ) => {
    if (!data || data.length === 0) {
      return <p className="text-sm text-gray-500">暂无数据</p>;
    }

    const maxValue = Math.max(...data.map(item => item[valueKey]));
    
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <div className="space-y-2">
          {data.map((item, index) => {
            const percentage = maxValue > 0 ? (item[valueKey] / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 w-16">{item.period}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${color}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500 w-16 text-right">
                  {typeof item[valueKey] === 'number' 
                    ? item[valueKey].toFixed(valueKey.includes('Rate') ? 1 : 0)
                    : item[valueKey]
                  }{unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading.trends) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center space-x-3">
                      <div className="h-2 bg-gray-200 rounded w-12"></div>
                      <div className="flex-1 h-2 bg-gray-200 rounded"></div>
                      <div className="h-2 bg-gray-200 rounded w-8"></div>
                    </div>
                  ))}
                </div>
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
          <p>加载趋势分析失败</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => dispatch(fetchTrends())}
            className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!trends) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📈</div>
          <p>暂无趋势数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">趋势分析</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 执行趋势 */}
        <div className="bg-gray-50 rounded-lg p-4">
          {renderTrendChart(
            trends.executionTrends,
            'count',
            '执行频率',
            'bg-blue-500',
            '次'
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">平均执行时长</h5>
            <div className="space-y-1">
              {trends.executionTrends.map((item, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-gray-600">{item.period}</span>
                  <span className="text-gray-500">{formatDuration(item.avgDuration)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 性能趋势 */}
        <div className="bg-gray-50 rounded-lg p-4">
          {renderTrendChart(
            trends.performanceTrends,
            'completionRate',
            '完成率',
            'bg-green-500',
            '%'
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">效率指标</h5>
            <div className="space-y-1">
              {trends.performanceTrends.map((item, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-gray-600">{item.period}</span>
                  <span className="text-gray-500">{formatDuration(item.efficiency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 复盘质量趋势 */}
        <div className="bg-gray-50 rounded-lg p-4">
          {renderTrendChart(
            trends.reviewQualityTrends,
            'avgLength',
            '复盘长度',
            'bg-purple-500',
            '字'
          )}
          
          <div className="mt-4 pt-4 border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">洞察数量</h5>
            <div className="space-y-1">
              {trends.reviewQualityTrends.map((item, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-gray-600">{item.period}</span>
                  <span className="text-gray-500">{item.insightCount}个</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 趋势总结 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">趋势洞察</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {trends.executionTrends.length > 1 && (
            <p>
              • 执行频率{' '}
              {trends.executionTrends[trends.executionTrends.length - 1].count > 
               trends.executionTrends[0].count ? '呈上升趋势' : '保持稳定'}
            </p>
          )}
          {trends.performanceTrends.length > 1 && (
            <p>
              • 平均完成率为{' '}
              {(trends.performanceTrends.reduce((sum, item) => sum + item.completionRate, 0) / 
                trends.performanceTrends.length).toFixed(1)}%
            </p>
          )}
          {trends.reviewQualityTrends.length > 1 && (
            <p>
              • 复盘质量{' '}
              {trends.reviewQualityTrends[trends.reviewQualityTrends.length - 1].avgLength > 
               trends.reviewQualityTrends[0].avgLength ? '持续提升' : '有待改进'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};