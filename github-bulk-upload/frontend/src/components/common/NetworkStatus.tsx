import React, { useState } from 'react';
import { WifiIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { NoSymbolIcon as WifiSlashIcon } from '@heroicons/react/24/outline';
import { useOfflineContext } from '../../contexts/OfflineContext';
import OfflinePanel from './OfflinePanel';

interface NetworkStatusProps {
  className?: string;
  showDetails?: boolean;
}

// interface OfflineStats {
//   pendingCount: number;
//   cacheCount: number;
// }

const NetworkStatus: React.FC<NetworkStatusProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const {
    isOnline,
    pendingCount,
    cacheCount,
    syncInProgress,
    manualSync,
  } = useOfflineContext();
  
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const handleManualSync = async () => {
    if (isOnline && !syncInProgress) {
      try {
        await manualSync();
      } catch (error) {
        console.error('Manual sync failed:', error);
      }
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (syncInProgress) return 'text-yellow-500';
    if (pendingCount > 0) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return '离线';
    if (syncInProgress) return '同步中...';
    if (pendingCount > 0) return `${pendingCount} 项待同步`;
    return '在线';
  };

  const StatusIcon = () => {
    if (!isOnline) {
      return <WifiSlashIcon className="h-5 w-5" />;
    }
    if (syncInProgress) {
      return <CloudArrowUpIcon className="h-5 w-5 animate-pulse" />;
    }
    if (pendingCount > 0) {
      return <ExclamationTriangleIcon className="h-5 w-5" />;
    }
    return <WifiIcon className="h-5 w-5" />;
  };

  if (!showDetails) {
    // 简单状态指示器
    return (
      <>
        <button
          className={`relative inline-flex items-center hover:bg-gray-100 p-1 rounded ${className}`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowPanel(true)}
        >
          <div className={`${getStatusColor()}`}>
            <StatusIcon />
          </div>
          
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap z-50">
              {getStatusText()}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </button>
        
        <OfflinePanel isOpen={showPanel} onClose={() => setShowPanel(false)} />
      </>
    );
  }

  // 详细状态面板
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={getStatusColor()}>
            <StatusIcon />
          </div>
          <span className="font-medium text-gray-900">网络状态</span>
        </div>
        
        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleManualSync}
            disabled={syncInProgress}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncInProgress ? '同步中...' : '立即同步'}
          </button>
        )}
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>连接状态:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        
        {pendingCount > 0 && (
          <div className="flex justify-between">
            <span>待同步数据:</span>
            <span className="font-medium text-orange-600">
              {pendingCount} 项
            </span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>缓存数据:</span>
          <span className="font-medium text-gray-700">
            {cacheCount} 项
          </span>
        </div>
      </div>

      {!isOnline && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">当前处于离线状态</p>
              <p className="mt-1">您的操作将被保存，网络恢复后自动同步。</p>
            </div>
          </div>
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <CloudArrowUpIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">有数据等待同步</p>
              <p className="mt-1">系统将自动同步离线期间的操作。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;