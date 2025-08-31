import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { fetchUserWorkflows, clearError } from '../store/workflowSlice';
import { logoutUser } from '../store/authSlice';
import { Workflow } from '../types/workflow';
import WorkflowList from '../components/workflow/WorkflowList';
import WorkflowBuilder from '../components/workflow/WorkflowBuilder';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

const WorkflowManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { workflows, isLoading, error } = useSelector((state: RootState) => state.workflow);
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    dispatch(fetchUserWorkflows());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      // 可以在这里添加错误处理逻辑
      console.error('Workflow error:', error);
    }
  }, [error]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const handleCreateNew = () => {
    setSelectedWorkflow(null);
    setViewMode('create');
  };

  const handleEdit = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setViewMode('edit');
  };

  const handleView = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setViewMode('view');
  };

  const handleExecute = (workflow: Workflow) => {
    navigate(`/executions?start=${workflow.id}`);
  };

  const handleSave = () => {
    setViewMode('list');
    setSelectedWorkflow(null);
    // 刷新列表
    dispatch(fetchUserWorkflows());
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedWorkflow(null);
    dispatch(clearError());
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <WorkflowBuilder
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      
      case 'edit':
        return (
          <WorkflowBuilder
            workflow={selectedWorkflow!}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      
      case 'view':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedWorkflow?.name}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(selectedWorkflow!)}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    编辑
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-500"
                  >
                    返回
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {selectedWorkflow?.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">描述</h3>
                    <p className="text-gray-600">{selectedWorkflow.description}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">流程步骤</h3>
                  <div className="space-y-4">
                    {selectedWorkflow?.steps?.map((step) => (
                      <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium">
                              {step.order}
                            </span>
                            <h4 className="text-lg font-medium text-gray-900">{step.name}</h4>
                            {step.isRequired && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                必需
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500 capitalize">
                            {step.stepType.toLowerCase()}
                          </span>
                        </div>
                        {step.description && (
                          <p className="text-gray-600 ml-11">{step.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">我的投资流程</h1>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                创建新流程
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-2 text-gray-600">加载中...</span>
              </div>
            ) : (
              <WorkflowList
                workflows={workflows}
                onEdit={handleEdit}
                onView={handleView}
                onExecute={handleExecute}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xl font-semibold text-gray-900 hover:text-indigo-600"
              >
                投资流程管理系统
              </button>
              {viewMode !== 'list' && (
                <div className="ml-4 flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>
                    {viewMode === 'create' && '创建流程'}
                    {viewMode === 'edit' && '编辑流程'}
                    {viewMode === 'view' && '查看流程'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                欢迎，{user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default WorkflowManagement;