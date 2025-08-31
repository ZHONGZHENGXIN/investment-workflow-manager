import React from 'react';

export interface HistoryListProps {
  executions: any[];
  loading: any;
  onSelectExecution: (id: string | null) => void;
  selectedExecution: string | null;
}

export const HistoryList: React.FC<HistoryListProps> = ({ 
  executions, 
  loading, 
  onSelectExecution, 
  selectedExecution 
}) => {
  if (loading.list) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">执行历史</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {executions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            暂无执行记录
          </div>
        ) : (
          executions.map((execution) => (
            <div
              key={execution.id}
              className={`p-6 cursor-pointer hover:bg-gray-50 ${
                selectedExecution === execution.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => onSelectExecution(execution.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {execution.title || execution.workflowName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {new Date(execution.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                    execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {execution.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryList;