import React, { useState, useRef, useEffect } from 'react';
import SkeletonLoader from './SkeletonLoader';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  placeholder?: string;
  lazy?: boolean;
  quality?: number;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallback?: React.ReactNode;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  lazy = true,
  quality = 75,
  sizes,
  priority = false,
  onLoad,
  onError,
  fallback,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 懒加载逻辑
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, isInView]);

  // 生成优化的图片URL
  const getOptimizedSrc = (originalSrc: string) => {
    // 如果是外部URL，直接返回
    if (originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // 对于本地图片，可以添加查询参数进行优化
    const url = new URL(originalSrc, window.location.origin);
    
    if (quality && quality !== 75) {
      url.searchParams.set('q', quality.toString());
    }
    
    if (width) {
      url.searchParams.set('w', width.toString());
    }
    
    if (height) {
      url.searchParams.set('h', height.toString());
    }

    return url.toString();
  };

  // 生成srcSet用于响应式图片
  const generateSrcSet = (originalSrc: string) => {
    if (!width || originalSrc.startsWith('http')) {
      return undefined;
    }

    const baseWidth = typeof width === 'number' ? width : parseInt(width.toString());
    const srcSet = [1, 1.5, 2, 3].map(scale => {
      const scaledWidth = Math.round(baseWidth * scale);
      const url = new URL(originalSrc, window.location.origin);
      url.searchParams.set('w', scaledWidth.toString());
      if (quality !== 75) {
        url.searchParams.set('q', quality.toString());
      }
      return `${url.toString()} ${scale}x`;
    });

    return srcSet.join(', ');
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const imageStyle: React.CSSProperties = {
    width: width || 'auto',
    height: height || 'auto',
  };

  // 如果还没有进入视口且启用了懒加载，显示占位符
  if (!isInView && lazy && !priority) {
    return (
      <div
        ref={imgRef}
        className={`${className} bg-gray-200`}
        style={imageStyle}
      >
        {placeholder ? (
          <img
            src={placeholder}
            alt=""
            className="w-full h-full object-cover opacity-50"
            style={imageStyle}
          />
        ) : (
          <SkeletonLoader
            variant="rectangular"
            width={width}
            height={height}
            className="w-full h-full"
          />
        )}
      </div>
    );
  }

  // 如果加载出错，显示fallback或默认错误状态
  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div
        className={`${className} bg-gray-100 flex items-center justify-center text-gray-400`}
        style={imageStyle}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={imageStyle}>
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0">
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <SkeletonLoader
              variant="rectangular"
              width="100%"
              height="100%"
              className="w-full h-full"
            />
          )}
        </div>
      )}

      {/* 实际图片 */}
      <img
        ref={imgRef}
        src={getOptimizedSrc(src)}
        srcSet={generateSrcSet(src)}
        sizes={sizes}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        decoding="async"
        style={imageStyle}
      />
    </div>
  );
};

export default OptimizedImage;