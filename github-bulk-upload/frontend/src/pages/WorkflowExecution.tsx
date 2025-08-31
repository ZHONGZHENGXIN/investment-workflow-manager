import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchExecution } from '../store/executionSlice';
import { ExecutionStatus } from '../services/execution';
import ProgressTracker from '../components/execution/ProgressTracker';
import LoadingSpinner from '../components/common/LoadingSpinner';

const WorkflowExecutionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const { currentExecution, isLoading: loading, error } = useSelector(
    (state: RootState) => state.execution
  );

  const [activeTab, setActiveTab] = useState<'execution' | 'attachments'>('execution');

  useEffect(() => {
    if (id) {
      dispatch(fetchExecution(id));
    }
  }, [dispatch, id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => id && dispatch(fetchExecution(id))}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              重试
            </button>
            <button
              onClick={() => navigate('/executions')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentExecution) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">执行记录不存在</h2>
          <p className="text-gray-600 mb-4">请检查执行ID是否正确</p>
          <button
            onClick={() => navigate('/executions')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'execution', name: '执行流程', icon: '⚡' },
    { id: 'attachments', name: '附件管理', icon: '📎' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题和导航 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/executions')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                ← 返回
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  工作流执行 #{currentExecution.id}
                </h1>
                <p className="mt-2 text-gray-600">
                  {currentExecution.workflow?.name} - {currentExecution.status}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentExecution.status === ExecutionStatus.COMPLETED
                  ? 'bg-green-100 text-green-800'
                  : currentExecution.status === ExecutionStatus.FAILED
                  ? 'bg-red-100 text-red-800'
                  : currentExecution.status === ExecutionStatus.IN_PROGRESS
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {currentExecution.status}
              </span>
            </div>
          </div>
        </div>

        {/* 进度跟踪器 */}
        <div className="mb-6">
          <ProgressTracker execution={currentExecution} />
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
          {activeTab === 'execution' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">工作流执行</h3>
              <ProgressTracker 
                execution={currentExecution}
              />
            </div>
          )}
          {activeTab === 'attachments' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">附件管理</h3>
              <p className="text-gray-500">附件管理功能</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowExecutionPage;