import React from 'react';

export interface ReviewHistoryProps {
  reviews: any[];
}

export const ReviewHistory: React.FC<ReviewHistoryProps> = ({ reviews }) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">审查历史</h3>
      </div>
      <div className="p-6">
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center">暂无审查记录</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    审查报告 #{index + 1}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {typeof review === 'string' ? review : '审查已完成'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewHistory;