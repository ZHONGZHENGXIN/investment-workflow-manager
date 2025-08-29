import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { deleteWorkflow, duplicateWorkflow } from '../../store/workflowSlice';
import { Workflow, StepType } from '../../types/workflow';

interface WorkflowListProps {
  workflows: Workflow[];
  onEdit: (workflow: Workflow) => void;
  onView: (workflow: Workflow) => void;
  onExecute: (workflow: Workflow) => void;
}

const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  onEdit,
  onView,
  onExecute,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // 过滤工作流
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (workflow.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesFilter = filterActive === null || workflow.isActive === filterActive;
    return matchesSearch && matchesFilter;
  });

  // 删除工作流
  const handleDelete = async (workflow: Workflow) => {
    if (window.confirm(`确定要删除工作流"${workflow.name}"吗？此操作不可撤销。`)) {
      await dispatch(deleteWorkflow(workflow.id));
    }
  };

  // 复制工作流
  const handleDuplicate = async (workflow: Workflow) => {
    const newName = prompt('请输入新工作流的名称:', `${workflow.name} (副本)`);
    if (newName && newName.trim()) {
      await dispatch(duplicateWorkflow({ id: workflow.id, name: newName.trim() }));
    }
  };

  // 获取步骤类型统计
  const getStepTypeStats = (workflow: Workflow) => {
    if (!workflow.steps) return { checklist: 0, input: 0, decision: 0 };
    
    return workflow.steps.reduce((acc, step) => {
      switch (step.stepType) {
        case StepType.CHECKLIST:
          acc.checklist++;
          break;
        case StepType.INPUT:
          acc.input++;
          break;
        case StepType.DECISION:
          acc.decision++;
          break;
      }
      return acc;
    }, { checklist: 0, input: 0, decision: 0 });
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="搜索工作流..."
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterActive(null)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filterActive === null
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterActive(true)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filterActive === true
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              启用
            </button>
            <button
              onClick={() => setFilterActive(false)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                filterActive === false
                  ? 'bg-gray-100 text-gray-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              禁用
            </button>
          </div>
        </div>
      </div>

      {/* 工作流列表 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredWorkflows.map((workflow) => {
          const stepStats = getStepTypeStats(workflow);
          
          return (
            <div
              key={workflow.id}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {workflow.name}
                    </h3>
                    <span
                      className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        workflow.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {workflow.isActive ? '启用' : '禁用'}
                    </span>
                  </div>
                </div>

                {workflow.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {workflow.description}
                  </p>
                )}

                {/* 步骤统计 */}
                <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {stepStats.checklist}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v10a2 2 0 002 2h5m-5-6h2m3 0h2m-3 3h2m-3-6h2" />
                    </svg>
                    {stepStats.input}
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {stepStats.decision}
                  </div>
                  <div className="text-gray-400">
                    共 {workflow.steps?.length || 0} 步
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  创建于 {formatDate(workflow.createdAt)}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onView(workflow)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => onEdit(workflow)}
                      className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                    >
                      编辑
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {/* 执行按钮 */}
                    <button
                      onClick={() => onExecute(workflow)}
                      disabled={!workflow.isActive}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      执行
                    </button>
                    
                    {/* 更多操作菜单 */}
                    <div className="relative inline-block text-left">
                      <button
                        className="inline-flex items-center p-1.5 border border-gray-300 rounded text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={(e) => {
                          e.preventDefault();
                          // 这里可以实现下拉菜单逻辑
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      
                      {/* 简化的操作按钮 */}
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10 hidden group-hover:block">
                        <div className="py-1">
                          <button
                            onClick={() => handleDuplicate(workflow)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            复制
                          </button>
                          <button
                            onClick={() => handleDelete(workflow)}
                            className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 空状态 */}
      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm || filterActive !== null ? '没有找到匹配的工作流' : '还没有工作流'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterActive !== null 
              ? '尝试调整搜索条件或筛选器' 
              : '开始创建您的第一个投资决策流程'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkflowList;