import React from 'react';

export interface ExecutionDetailProps {
  executionId: string | null;
  onClose: () => void;
}

export const ExecutionDetail: React.FC<ExecutionDetailProps> = ({ 
  executionId, 
  onClose 
}) => {
  if (!executionId) return null;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">执行详情</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">执行ID</label>
            <p className="mt-1 text-sm text-gray-900">{executionId}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">状态</label>
            <span className="mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              已完成
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">开始时间</label>
            <p className="mt-1 text-sm text-gray-900">{new Date().toLocaleString()}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">完成时间</label>
            <p className="mt-1 text-sm text-gray-900">{new Date().toLocaleString()}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">执行步骤</label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm text-gray-900">初始化</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm text-gray-900">数据处理</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm text-gray-900">完成</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionDetail;