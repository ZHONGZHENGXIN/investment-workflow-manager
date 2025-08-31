import React from 'react';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ 
  isOpen, 
  onClose, 
  filters 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-medium text-gray-900 mb-4">导出数据</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              导出格式
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              包含字段
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                执行ID
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                工作流名称
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                状态
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                创建时间
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            取消
          </button>
          <button
            onClick={() => {
              console.log('Exporting with filters:', filters);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            导出
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;