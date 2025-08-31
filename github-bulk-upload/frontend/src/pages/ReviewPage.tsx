import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { generateSummary as fetchReviews } from '../store/reviewSlice';
import { ReviewEditor } from '../components/review/ReviewEditor';
import { ReviewHistory } from '../components/review/ReviewHistory';
import { ReviewAnalytics } from '../components/review/ReviewAnalytics';
import { SmartSummary } from '../components/review/SmartSummary';
import { TrendAnalysis } from '../components/review/TrendAnalysis';
import { ReviewReport } from '../components/review/ReviewReport';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ReviewPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { summary, loading, error } = useSelector((state: RootState) => state.review);
  const reviews = summary ? [summary] : [];
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'analytics' | 'reports'>('editor');

  useEffect(() => {
    dispatch(fetchReviews());
  }, [dispatch]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => dispatch(fetchReviews())}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'editor', name: '审查编辑', icon: '✏️' },
    { id: 'history', name: '审查历史', icon: '📋' },
    { id: 'analytics', name: '数据分析', icon: '📊' },
    { id: 'reports', name: '审查报告', icon: '📄' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">审查管理</h1>
          <p className="mt-2 text-gray-600">管理和分析投资流程审查</p>
        </div>

        {/* 标签导航 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'editor' && (
            <ReviewEditor 
              executionId="default"
              onSave={(notes: string) => console.log('Save:', notes)}
              onCancel={() => console.log('Cancel')}
            />
          )}
          {activeTab === 'history' && <ReviewHistory reviews={reviews} />}
          {activeTab === 'analytics' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReviewAnalytics />
                <SmartSummary />
              </div>
              <div className="mt-6">
                <TrendAnalysis />
              </div>
            </div>
          )}
          {activeTab === 'reports' && <ReviewReport />}
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;