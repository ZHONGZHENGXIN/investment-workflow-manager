import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { fetchUserExecutions, startExecution, deleteExecution } from '../store/executionSlice';
import { fetchUserWorkflows } from '../store/workflowSlice';
import { logoutUser } from '../store/authSlice';
import { Execution, ExecutionStatus } from '../types/execution';
// import { Workflow } from '../types/workflow';
import { ExecutionService } from '../services/execution';
import toast from 'react-hot-toast';

const ExecutionPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { executions, isLoading } = useSelector((state: RootState) => state.execution);
  const { workflows } = useSelector((state: RootState) => state.workflow);
  
  const [selectedStatus, setSelectedStatus] = useState<ExecutionStatus | 'ALL'>('ALL');
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');

  useEffect(() => {
    dispatch(fetchUserExecutions());
    dispatch(fetchUserWorkflows());
    
    // 检查URL参数是否有要开始的工作流ID
    const startWorkflowId = searchParams.get('start');
    if (startWorkflowId) {
      setSelectedWorkflow(startWorkflowId);
      setShowStartModal(true);
    }
  }, [dispatch, searchParams]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const handleStartExecution = async () => {
    if (!selectedWorkflow) {
      toast.error('请选择要执行的工作流');
      return;
    }

    const result = await dispatch(startExecution({ 
      workflowId: selectedWorkflow,
      title: `执行工作流 ${selectedWorkflow}`
    }));
    if (startExecution.fulfilled.match(result)) {
      setShowStartModal(false);
      setSelectedWorkflow('');
      navigate(`/executions/${result.payload.id}`);
    }
  };

  const handleDeleteExecution = async (execution: Execution) => {
    if (window.confirm(`确定要删除执行记录"${execution.workflow?.name}"吗？`)) {
      await dispatch(deleteExecution(execution.id));
    }
  };

  const handleViewExecution = (execution: Execution) => {
    navigate(`/executions/${execution.id}`);
  };

  const filteredExecutions = executions.filter(execution => 
    selectedStatus === 'ALL' || execution.status === selectedStatus
  );

  const activeWorkflows = workflows.filter(workflow => workflow.isActive);

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('zh-CN', {
  //     year: 'numeric',
  //     month: 'short',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit',
  //   });
  // };

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
                <span>流程执行</span>
              </div>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">流程执行</h1>
          <button
            onClick={() => setShowStartModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            开始新执行
          </button>
        </div>

        {/* 筛选器 */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                selectedStatus === 'ALL'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedStatus(ExecutionStatus.IN_PROGRESS)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                selectedStatus === ExecutionStatus.IN_PROGRESS
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              进行中
            </button>
            <button
              onClick={() => setSelectedStatus(ExecutionStatus.COMPLETED)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                selectedStatus === ExecutionStatus.COMPLETED
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              已完成
            </button>
            <button
              onClick={() => setSelectedStatus(ExecutionStatus.PAUSED)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                selectedStatus === ExecutionStatus.PAUSED
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              已暂停
            </button>
          </div>
        </div>

        {/* 执行列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">加载中...</span>
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {selectedStatus === 'ALL' ? '还没有执行记录' : `没有${ExecutionService.getStatusText(selectedStatus)}的执行记录`}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              开始执行您的第一个投资流程
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExecutions.map((execution) => (
              <div
                key={execution.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {execution.workflow?.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ExecutionService.getStatusColor(execution.status)}`}
                    >
                      {ExecutionService.getStatusText(execution.status)}
                    </span>
                  </div>

                  {execution.workflow?.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {execution.workflow.description}
                    </p>
                  )}

                  {/* 进度信息 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">进度</span>
                      <span className="text-sm text-gray-600">
                        {ExecutionService.calculateProgress(execution.records || [])}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${ExecutionService.calculateProgress(execution.records || [])}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 时间信息 */}
                  <div className="text-xs text-gray-500 mb-4">
                    <div>开始: {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : '未知'}</div>
                    {execution.completedAt && (
                      <div>完成: {new Date(execution.completedAt).toLocaleString()}</div>
                    )}
                    <div>
                      持续: {execution.startedAt ? ExecutionService.formatDuration(execution.startedAt.toString(), execution.completedAt?.toString()) : '未知'}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleViewExecution(execution as any)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      {execution.status === ExecutionStatus.COMPLETED ? '查看详情' : '继续执行'}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteExecution(execution as any)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 开始执行模态框 */}
      {showStartModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">开始新的流程执行</h3>
                <button
                  onClick={() => setShowStartModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择工作流
                </label>
                <select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">请选择工作流</option>
                  {activeWorkflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedWorkflow && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    {workflows.find(w => w.id === selectedWorkflow)?.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    共 {workflows.find(w => w.id === selectedWorkflow)?.steps?.length || 0} 个步骤
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleStartExecution}
                  disabled={!selectedWorkflow}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  开始执行
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionPage;