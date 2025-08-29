import React, { useState, useEffect } from 'react';
import { Attachment } from '../../types/attachment';
import { attachmentService, AttachmentService } from '../../services/attachment';
import FileUpload from './FileUpload';
import AttachmentViewer from './AttachmentViewer';
import toast from 'react-hot-toast';

interface AttachmentManagerProps {
  executionRecordId: string;
  className?: string;
  showUpload?: boolean;
  showTitle?: boolean;
}

const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  executionRecordId,
  className = '',
  showUpload = true,
  showTitle = true,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载附件列表
  const loadAttachments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await attachmentService.getAttachments(executionRecordId);
      setAttachments(response.data.attachments);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || '加载附件失败';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (executionRecordId) {
      loadAttachments();
    }
  }, [executionRecordId]);

  // 处理上传成功
  const handleUploadSuccess = (newAttachments: Attachment[]) => {
    setAttachments(prev => [...newAttachments, ...prev]);
  };

  // 处理上传错误
  const handleUploadError = (error: string) => {
    setError(error);
  };

  // 处理删除
  const handleDelete = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  // 刷新附件列表
  const handleRefresh = () => {
    loadAttachments();
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        {showTitle && (
          <h3 className="text-lg font-medium text-gray-900 mb-4">附件</h3>
        )}
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-indigo-600"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            附件 {attachments.length > 0 && `(${attachments.length})`}
          </h3>
          {attachments.length > 0 && (
            <button
              onClick={handleRefresh}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              刷新
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            关闭
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* 文件上传区域 */}
        {showUpload && (
          <FileUpload
            executionRecordId={executionRecordId}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        )}

        {/* 附件列表 */}
        <AttachmentViewer
          attachments={attachments}
          onDelete={handleDelete}
          onRefresh={handleRefresh}
        />
      </div>

      {/* 统计信息 */}
      {attachments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>共 {attachments.length} 个文件</span>
            <span>
              总大小: {AttachmentService.formatFileSize(
                attachments.reduce((total, att) => total + att.fileSize, 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentManager;