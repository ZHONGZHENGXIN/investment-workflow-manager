import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { createWorkflow, updateWorkflow } from '../../store/workflowSlice';
import { CreateWorkflowData, Workflow, WorkflowStep, StepType } from '../../types/workflow';
import StepComponent from './StepComponent';

interface WorkflowBuilderProps {
  workflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
  onCancel?: () => void;
}

interface WorkflowFormData {
  name: string;
  description: string;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflow,
  onSave,
  onCancel,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isEditing = !!workflow;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkflowFormData>({
    defaultValues: {
      name: workflow?.name || '',
      description: workflow?.description || '',
    },
  });

  // 初始化步骤列表
  const [steps, setSteps] = useState<WorkflowStep[]>(
    workflow?.steps || [
      {
        id: '',
        workflowId: '',
        name: '',
        description: '',
        order: 1,
        isRequired: false,
        stepType: StepType.CHECKLIST,
        createdAt: '',
        updatedAt: '',
      },
    ]
  );

  // 添加新步骤
  const addStep = () => {
    const newStep: WorkflowStep = {
      id: '',
      workflowId: '',
      name: '',
      description: '',
      order: steps.length + 1,
      isRequired: false,
      stepType: StepType.CHECKLIST,
      createdAt: '',
      updatedAt: '',
    };
    setSteps([...steps, newStep]);
  };

  // 更新步骤
  const updateStep = (index: number, updatedStep: Partial<WorkflowStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updatedStep };
    setSteps(newSteps);
  };

  // 删除步骤
  const deleteStep = (index: number) => {
    if (steps.length <= 1) {
      return; // 至少保留一个步骤
    }
    const newSteps = steps.filter((_, i) => i !== index);
    // 重新排序
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setSteps(newSteps);
  };

  // 上移步骤
  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    // 更新顺序
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setSteps(newSteps);
  };

  // 下移步骤
  const moveStepDown = (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    // 更新顺序
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setSteps(newSteps);
  };

  // 提交表单
  const onSubmit = async (formData: WorkflowFormData) => {
    // 验证步骤
    const validSteps = steps.filter(step => step.name.trim() !== '');
    if (validSteps.length === 0) {
      alert('请至少添加一个有效的步骤');
      return;
    }

    const workflowData: CreateWorkflowData = {
      name: formData.name,
      description: formData.description,
      steps: validSteps.map((step, index) => ({
        name: step.name,
        description: step.description,
        order: index + 1,
        isRequired: step.isRequired,
        stepType: step.stepType,
        metadata: step.metadata,
      })),
    };

    try {
      if (isEditing && workflow) {
        const result = await dispatch(updateWorkflow({
          id: workflow.id,
          updateData: workflowData,
        }));
        if (updateWorkflow.fulfilled.match(result)) {
          onSave?.(result.payload);
        }
      } else {
        const result = await dispatch(createWorkflow(workflowData));
        if (createWorkflow.fulfilled.match(result)) {
          onSave?.(result.payload);
        }
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? '编辑工作流' : '创建新工作流'}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* 基本信息 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  工作流名称 *
                </label>
                <input
                  {...register('name', {
                    required: '工作流名称是必填项',
                    minLength: {
                      value: 1,
                      message: '工作流名称不能为空',
                    },
                  })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="例如：股票投资决策流程"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="描述这个工作流的用途和目标"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* 步骤配置 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">流程步骤</h3>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                添加步骤
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <StepComponent
                  key={index}
                  step={step}
                  index={index}
                  onUpdate={updateStep}
                  onDelete={deleteStep}
                  onMoveUp={moveStepUp}
                  onMoveDown={moveStepDown}
                  canMoveUp={index > 0}
                  canMoveDown={index < steps.length - 1}
                />
              ))}
            </div>

            {steps.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>还没有添加任何步骤</p>
                <button
                  type="button"
                  onClick={addStep}
                  className="mt-2 text-indigo-600 hover:text-indigo-500"
                >
                  点击添加第一个步骤
                </button>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                取消
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isEditing ? '保存更改' : '创建工作流'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowBuilder;