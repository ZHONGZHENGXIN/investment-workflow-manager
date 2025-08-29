import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../../store/store';
import { 
  fetchExecutionById, 
  fetchExecutionRecords,
  pauseExecution, 
  resumeExecution, 
  completeExecution,
  cancelExecution,
  updateProgress,
  clearCurrentExecution 
} from '../../store/executionSlice';
import { ExecutionStatus, ExecutionRecord, ExecutionRecordStatus, executionService } from '../../services/execution';
import StepExecution from './StepExecution';
import ProgressTracker from './ProgressTracker';
import toast from 'react-hot-toast';

const WorkflowExecution: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const { currentExecution, executionRecords, isLoading, error } = useSelector((state: RootState) => state.execution);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (id) {
      dispatch(fetchExecutionById(id));
      dispatch(fetchExecutionRecords(id));
    }
    
    return () => {
      dispatch(clearCurrentExecution());
    };
  }, [dispatch, id]);



  const handlePause = async () => {
    if (!currentExecution) return;
    
    if (window.confirm('确定要暂停当前执行吗？')) {
      await dispatch(pauseExecution(currentExecution.id));
    }
  };

  const handleResume = async () => {
    if (!currentExecution) return;
    
    await dispatch(resumeExecution(currentExecution.id));
  };

  const handleComplete = async () => {
    if (!currentExecution) return;
    
    const pendingSteps = executionRecords.filter(record => 
      record.status === ExecutionRecordStatus.PENDING
    );
    
    if (pendingSteps.length > 0) {
      toast.error(`还有 ${pendingSteps.length} 个步骤未完成`);
      return;
    }
    
    if (window.confirm('确定要完成当前执行吗？完成后将无法继续修改步骤状态。')) {
      await dispatch(completeExecution(currentExecution.id));
    }
  };

  const handleCancel = async () => {
    if (!currentExecution) return;
    
    if (window.confirm('确定要取消当前执行吗？取消后将无法恢复。')) {
      await dispatch(cancelExecution(currentExecution.id));
    }
  };

  const handleUpdateProgress = async () => {
    if (!currentExecution) return;
    
    await dispatch(updateProgress(currentExecution.id));
  };

  const handleStepUpdate = (updatedRecord: ExecutionRecord) => {
    // 步骤更新后自动更新进度
    handleUpdateProgress();
    console.log('Step updated:', updatedRecord);
  };

  const getActionButtons = () => {
    if (!currentExecution) return null;

    const buttons = [];

    // 刷新进度按钮
    buttons.push(
      <button
        key="refresh"
        onClick={handleUpdateProgress}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        刷新进度
      </button>
    );

    switch (currentExecution.status) {
      case ExecutionStatus.PENDING:
      case ExecutionStatus.IN_PROGRESS:
        buttons.push(
          <button
            key="pause"
            onClick={handlePause}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            暂停执行
          </button>
        );
        
        buttons.push(
          <button
            key="complete"
            onClick={handleComplete}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            完成执行
          </button>
        );

        buttons.push(
          <button
            key="cancel"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            取消执行
          </button>
        );
        break;

      case ExecutionStatus.PAUSED:
        buttons.push(
          <button
            key="resume"
            onClick={handleResume}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            恢复执行
          </button>
        );

        buttons.push(
          <button
            key="cancel"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            取消执行
          </button>
        );
        break;
    }

    return buttons;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error || !currentExecution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">执行记录不存在</h3>
          <p className="mt-1 text-sm text-gray-500">{error || '找不到指定的执行记录'}</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/executions')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              返回执行列表
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <div className="ml-4 flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>执行流程</span>
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>{currentExecution.workflow?.name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                欢迎，{user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 头部信息 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentExecution.title}
              </h1>
              <p className="text-gray-600 mt-1">
                {currentExecution.description}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${executionService.getStatusColor(currentExecution.status)}`}>
                  {executionService.getStatusText(currentExecution.status)}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${executionService.getPriorityColor(currentExecution.priority)}`}>
                  {executionService.getPriorityText(currentExecution.priority)}
                </span>
                <span className="text-sm text-gray-500">进度: {currentExecution.progress}%</span>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>创建时间: {new Date(currentExecution.createdAt).toLocaleString('zh-CN')}</span>
                {currentExecution.startedAt && (
                  <span>开始时间: {new Date(currentExecution.startedAt).toLocaleString('zh-CN')}</span>
                )}
                {currentExecution.completedAt && (
                  <span>完成时间: {new Date(currentExecution.completedAt).toLocaleString('zh-CN')}</span>
                )}
                {currentExecution.dueDate && (
                  <span className={new Date(currentExecution.dueDate) < new Date() ? 'text-red-600' : ''}>
                    截止时间: {new Date(currentExecution.dueDate).toLocaleString('zh-CN')}
                  </span>
                )}
                {currentExecution.startedAt && (
                  <span>
                    持续时间: {executionService.formatDuration(currentExecution.startedAt, currentExecution.completedAt)}
                  </span>
                )}
              </div>
              {currentExecution.tags && currentExecution.tags.length > 0 && (
                <div className="flex items-center space-x-2 mt-2">
                  {currentExecution.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {getActionButtons()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 步骤执行区域 */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">执行步骤</h2>
            {executionRecords.length > 0 ? (
              executionRecords.map((record) => (
                <StepExecution
                  key={record.id}
                  executionId={currentExecution.id}
                  executionRecord={record}
                  onStepUpdate={handleStepUpdate}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2">暂无执行步骤</p>
              </div>
            )}
          </div>

          {/* 进度跟踪侧边栏 */}
          <div className="lg:col-span-1">
            <ProgressTracker execution={{...currentExecution, records: executionRecords}} />
          </div>
        </div>
      </main>


    </div>
  );
};

export default WorkflowExecution;