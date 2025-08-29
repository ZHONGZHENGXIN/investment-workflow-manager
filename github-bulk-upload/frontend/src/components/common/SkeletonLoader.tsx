import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'card' | 'list' | 'table';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animate?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animate = true,
}) => {
  const baseClasses = `bg-gray-200 ${animate ? 'animate-pulse' : ''} ${className}`;

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'rectangular':
        return 'rounded';
      case 'circular':
        return 'rounded-full';
      case 'card':
        return 'rounded-lg';
      case 'list':
        return 'h-12 rounded-lg';
      case 'table':
        return 'h-8 rounded';
      default:
        return 'h-4 rounded';
    }
  };

  const getStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} ${getVariantClasses()} p-4 space-y-3`} style={getStyle()}>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded"></div>
          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
        </div>
        <div className="flex space-x-2">
          <div className="h-6 bg-gray-300 rounded w-16"></div>
          <div className="h-6 bg-gray-300 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className={`${baseClasses} ${getVariantClasses()} flex items-center space-x-3 p-3`}>
            <div className="h-8 w-8 bg-gray-300 rounded-full flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-300 rounded w-1/4"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className={`${baseClasses} ${getVariantClasses()}`} style={getStyle()}></div>
        ))}
      </div>
    );
  }

  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '75%' : getStyle().width || '100%',
            }}
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()}`}
      style={getStyle()}
    ></div>
  );
};

// 预定义的骨架屏组件
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className 
}) => (
  <SkeletonLoader variant="text" lines={lines} className={className} />
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <SkeletonLoader variant="card" className={className} />
);

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className 
}) => (
  <SkeletonLoader variant="list" lines={items} className={className} />
);

export const TableSkeleton: React.FC<{ rows?: number; className?: string }> = ({ 
  rows = 5, 
  className 
}) => (
  <SkeletonLoader variant="table" lines={rows} className={className} />
);

export const AvatarSkeleton: React.FC<{ size?: number; className?: string }> = ({ 
  size = 40, 
  className 
}) => (
  <SkeletonLoader 
    variant="circular" 
    width={size} 
    height={size} 
    className={className} 
  />
);

export const ButtonSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <SkeletonLoader 
    variant="rectangular" 
    width={100} 
    height={36} 
    className={`${className} rounded-md`} 
  />
);

export default SkeletonLoader;