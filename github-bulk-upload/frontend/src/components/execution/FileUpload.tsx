import React, { useState, useRef } from 'react';
import { attachmentService, AttachmentService } from '../../services/attachment';
import { Attachment } from '../../types/attachment';
import toast from 'react-hot-toast';

interface FileUploadProps {
  executionRecordId: string;
  onUploadSuccess?: (attachments: Attachment[]) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  executionRecordId,
  onUploadSuccess,
  onUploadError,
  multiple = true,
  accept = "image/*,.pdf,.doc,.docx,.txt",
  maxFiles = 10,
  className = "",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // 限制文件数量
    if (fileArray.length > maxFiles) {
      const error = `最多只能上传 ${maxFiles} 个文件`;
      toast.error(error);
      onUploadError?.(error);
      return;
    }

    // 验证文件
    const invalidFiles = fileArray.filter(file => 
      !AttachmentService.validateFileType(file) || !AttachmentService.validateFileSize(file)
    );

    if (invalidFiles.length > 0) {
      const error = `以下文件不符合要求: ${invalidFiles.map(f => f.name).join(', ')}`;
      toast.error(error);
      onUploadError?.(error);
      return;
    }

    uploadFiles(fileArray);
  };

  // 上传文件
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let result;
      
      if (files.length === 1) {
        result = await attachmentService.uploadFile(
          executionRecordId,
          files[0],
          setUploadProgress
        );
        
        if (result.success) {
          toast.success('文件上传成功！');
          onUploadSuccess?.([ result.data.attachment]);
        }
      } else {
        result = await attachmentService.uploadMultipleFiles(
          executionRecordId,
          files,
          setUploadProgress
        );
        
        if (result.success) {
          const { attachments, errors } = result.data;
          toast.success(`成功上传 ${attachments.length} 个文件${errors?.length ? `，${errors.length} 个文件失败` : ''}`);
          onUploadSuccess?.(attachments);
          
          if (errors && errors.length > 0) {
            errors.forEach(error => {
              toast.error(`${error.filename}: ${error.error}`);
            });
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || '文件上传失败';
      toast.error(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 拖拽处理
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      {/* 文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={isUploading}
      />

      {/* 拖拽上传区域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200
          ${dragActive 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <div>
              <p className="text-sm text-gray-600">上传中...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {dragActive ? '释放文件以上传' : '点击或拖拽文件到此处'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                支持图片、PDF、Word文档和文本文件
              </p>
              <p className="text-xs text-gray-500">
                图片最大10MB，文档最大20MB{multiple && `，最多${maxFiles}个文件`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 支持的文件类型提示 */}
      <div className="mt-2 text-xs text-gray-500">
        <p>支持的文件类型：</p>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="px-2 py-1 bg-gray-100 rounded text-xs">JPG</span>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs">PNG</span>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs">GIF</span>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs">WebP</span>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs">PDF</span>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs">DOC</span>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs">DOCX</span>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs">TXT</span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;