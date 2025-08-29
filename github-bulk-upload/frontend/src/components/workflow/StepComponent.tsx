import React from 'react';
import { WorkflowStep, StepType } from '../../types/workflow';

interface StepComponentProps {
  step: WorkflowStep;
  index: number;
  onUpdate: (index: number, updatedStep: Partial<WorkflowStep>) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const StepComponent: React.FC<StepComponentProps> = ({
  step,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  const getStepTypeIcon = (stepType: StepType) => {
    switch (stepType) {
      case StepType.CHECKLIST:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case StepType.INPUT:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v10a2 2 0 002 2h5m-5-6h2m3 0h2m-3 3h2m-3-6h2" />
          </svg>
        );
      case StepType.DECISION:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStepTypeColor = (stepType: StepType) => {
    switch (stepType) {
      case StepType.CHECKLIST:
        return 'text-green-600 bg-green-100';
      case StepType.INPUT:
        return 'text-blue-600 bg-blue-100';
      case StepType.DECISION:
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${getStepTypeColor(step.stepType)}`}>
            {getStepTypeIcon(step.stepType)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">步骤 {step.order}</span>
              {step.isRequired && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  必需
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* 移动按钮 */}
          <button
            onClick={() => onMoveUp(index)}
            disabled={!canMoveUp}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="上移"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          <button
            onClick={() => onMoveDown(index)}
            disabled={!canMoveDown}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="下移"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* 删除按钮 */}
          <button
            onClick={() => onDelete(index)}
            className="p-1 text-red-400 hover:text-red-600"
            title="删除步骤"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 步骤名称 */}
      <div className="mb-3">
        <input
          type="text"
          value={step.name}
          onChange={(e) => onUpdate(index, { name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="步骤名称"
        />
      </div>

      {/* 步骤描述 */}
      <div className="mb-3">
        <textarea
          value={step.description || ''}
          onChange={(e) => onUpdate(index, { description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="步骤描述（可选）"
          rows={2}
        />
      </div>

      {/* 步骤配置 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            步骤类型
          </label>
          <select
            value={step.stepType}
            onChange={(e) => onUpdate(index, { stepType: e.target.value as StepType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value={StepType.CHECKLIST}>检查清单</option>
            <option value={StepType.INPUT}>输入信息</option>
            <option value={StepType.DECISION}>决策判断</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={step.isRequired}
              onChange={(e) => onUpdate(index, { isRequired: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">必需步骤</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default StepComponent;