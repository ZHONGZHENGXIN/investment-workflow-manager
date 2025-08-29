import React, { useState } from 'react';
import { Attachment, FileType } from '../../types/attachment';
import { attachmentService, AttachmentService } from '../../services/attachment';
import toast from 'react-hot-toast';

interface AttachmentViewerProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void;
  onRefresh?: () => void;
  showActions?: boolean;
  className?: string;
}

const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
  attachments,
  onDelete,
  onRefresh,
  showActions = true,
  className = "",
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // 下载文件
  const handleDownload = async (attachment: Attachment) => {
    try {
      const blob = await attachmentService.downloadFile(attachment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('文件下载成功');
    } catch (error) {
      toast.error('文件下载失败');
    }
  };

  // 删除附件
  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm(`确定要删除文件"${attachment.originalName}"吗？`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(attachment.id));

    try {
      await attachmentService.deleteAttachment(attachment.id);
      toast.success('文件删除成功');
      onDelete?.(attachment.id);
      onRefresh?.();
    } catch (error) {
      toast.error('文件删除失败');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(attachment.id);
        return newSet;
      });
    }
  };

  // 预览图片
  const handleImagePreview = (attachment: Attachment) => {
    if (attachment.fileType === FileType.IMAGE) {
      setSelectedImage(attachmentService.getThumbnailUrl(attachment.id));
    }
  };

  // 格式化上传时间
  const formatUploadTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  if (attachments.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        <p>还没有上传任何文件</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow duration-200"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* 文件图标/缩略图 */}
              <div className="flex-shrink-0">
                {attachment.fileType === FileType.IMAGE ? (
                  <img
                    src={attachmentService.getThumbnailUrl(attachment.id)}
                    alt={attachment.originalName}
                    className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => handleImagePreview(attachment)}
                    onError={(e) => {
                      // 如果缩略图加载失败，显示默认图标
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-10 h-10 flex items-center justify-center bg-gray-100 rounded text-lg ${attachment.fileType === FileType.IMAGE ? 'hidden' : ''}`}>
                  {AttachmentService.getFileTypeIcon(attachment.fileType, attachment.originalName)}
                </div>
              </div>

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.originalName}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{AttachmentService.formatFileSize(attachment.fileSize)}</span>
                  <span>•</span>
                  <span>{formatUploadTime(attachment.uploadedAt)}</span>
                  <span>•</span>
                  <span className="capitalize">{attachment.fileType.toLowerCase()}</span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            {showActions && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-1 text-gray-400 hover:text-indigo-600 transition-colors duration-200"
                  title="下载"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleDelete(attachment)}
                  disabled={deletingIds.has(attachment.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200 disabled:opacity-50"
                  title="删除"
                >
                  {deletingIds.has(attachment.id) ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <img
              src={selectedImage}
              alt="预览"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-200"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentViewer;