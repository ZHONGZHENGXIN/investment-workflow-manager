import React, { useState, useEffect } from 'react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
  thumbnailClassName?: string;
  showPreview?: boolean;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  alt = '',
  className = '',
  thumbnailClassName = '',
  showPreview = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleThumbnailClick = () => {
    if (showPreview && !hasError) {
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleModalClose();
    }
  };

  return (
    <>
      {/* 缩略图 */}
      <div className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-indigo-600"></div>
          </div>
        )}
        
        {hasError ? (
          <div className="flex items-center justify-center bg-gray-100 rounded h-full min-h-[60px]">
            <div className="text-center text-gray-500">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">图片加载失败</p>
            </div>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            className={`${thumbnailClassName} ${showPreview && !hasError ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity duration-200`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            onClick={handleThumbnailClick}
          />
        )}
      </div>

      {/* 预览模态框 */}
      {isModalOpen && showPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={handleModalClose}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] p-4">
            {/* 关闭按钮 */}
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors duration-200 bg-black bg-opacity-50 rounded-full p-2"
              aria-label="关闭预览"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 全尺寸图片 */}
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* 图片信息 */}
            {alt && (
              <div className="absolute bottom-4 left-4 right-4 text-white text-center bg-black bg-opacity-50 rounded p-2">
                <p className="text-sm">{alt}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImageViewer;