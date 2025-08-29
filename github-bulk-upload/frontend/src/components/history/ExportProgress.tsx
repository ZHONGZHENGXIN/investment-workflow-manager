import React, { useState, useEffect } from 'react';

interface ExportProgressProps {
  isVisible: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const ExportProgress: React.FC<ExportProgressProps> = ({
  isVisible,
  onComplete,
  onCancel
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('准备中...');

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setStage('准备中...');
      return;
    }

    // 模拟导出进度
    const stages = [
      { progress: 10, stage: '正在查询数据...' },
      { progress: 30, stage: '正在处理执行记录...' },
      { progress: 50, stage: '正在处理步骤详情...' },
      { progress: 70, stage: '正在处理复盘内容...' },
      { progress: 90, stage: '正在生成文件...' },
      { progress: 100, stage: '导出完成！' }
    ];

    let currentStageIndex = 0;
    const interval = setInterval(() => {
      if (currentStageIndex < stages.length) {
        const currentStage = stages[currentStageIndex];
        setProgress(currentStage.progress);
        setStage(currentStage.stage);
        
        if (currentStage.progress === 100) {
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
        
        currentStageIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-1/2 transform -translate-y-1/2 mx-auto p-5 border w-11/12 md:w-1/3 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">导出进度</h3>
            {progress < 100 && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{stage}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* 状态图标 */}
          <div className="flex justify-center mb-6">
            {progress < 100 ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            ) : (
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>

          {/* 提示信息 */}
          <div className="text-center text-sm text-gray-600 mb-6">
            {progress < 100 ? (
              <p>正在导出您的数据，请稍候...</p>
            ) : (
              <p>数据导出完成！文件将自动下载。</p>
            )}
          </div>

          {/* 操作按钮 */}
          {progress === 100 && (
            <div className="flex justify-center">
              <button
                onClick={onComplete}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                完成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};