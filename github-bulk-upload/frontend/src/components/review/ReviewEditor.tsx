import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchTemplate } from '../../store/reviewSlice';

interface ReviewEditorProps {
  executionId: string;
  workflowType?: string;
  initialNotes?: string;
  onSave: (notes: string, rating?: number) => void;
  onCancel: () => void;
}

export const ReviewEditor: React.FC<ReviewEditorProps> = ({
  // executionId,
  workflowType,
  initialNotes = '',
  onSave,
  onCancel
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { template, loading } = useSelector((state: RootState) => state.review);
  
  const [notes, setNotes] = useState(initialNotes);
  const [rating, setRating] = useState<number | undefined>();
  const [showTemplate, setShowTemplate] = useState(false);

  useEffect(() => {
    if (workflowType) {
      dispatch(fetchTemplate(workflowType));
    } else {
      dispatch(fetchTemplate());
    }
  }, [dispatch, workflowType]);

  const handleTemplateInsert = (question: string) => {
    const newNotes = notes + (notes ? '\n\n' : '') + `**${question}**\n\n`;
    setNotes(newNotes);
  };

  const handleSave = () => {
    if (notes.trim()) {
      onSave(notes, rating);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">复盘记录</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowTemplate(!showTemplate)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            {showTemplate ? '隐藏模板' : '显示模板'}
          </button>
        </div>
      </div>

      {/* 评分系统 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          整体评分（可选）
        </label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                rating && rating >= star
                  ? 'bg-yellow-400 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              ★
            </button>
          ))}
          {rating && (
            <button
              onClick={() => setRating(undefined)}
              className="ml-2 text-sm text-gray-500 hover:text-gray-700"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* 模板问题 */}
      {showTemplate && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">复盘模板问题</h4>
          {loading.template ? (
            <div className="text-sm text-gray-500">加载模板中...</div>
          ) : (
            <div className="space-y-2">
              {template.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleTemplateInsert(question)}
                  className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 富文本编辑器 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          复盘内容
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="请记录您对本次投资决策执行过程的思考和总结..."
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <div className="mt-2 text-sm text-gray-500">
          支持Markdown格式。字数：{notes.length}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={!notes.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          保存复盘
        </button>
      </div>
    </div>
  );
};