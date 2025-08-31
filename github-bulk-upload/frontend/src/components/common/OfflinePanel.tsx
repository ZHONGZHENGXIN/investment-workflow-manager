import React, { useState } from 'react';
import { 
  WifiIcon, 
  NoSymbolIcon as WifiSlashIcon, 
  CloudArrowUpIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useOfflineContext } from '../../contexts/OfflineContext';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface OfflinePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const OfflinePanel: React.FC<OfflinePanelProps> = ({ isOpen, onClose }) => {
  const {
    isOnline,
    pendingCount,
    cacheCount,
    syncInProgress,
    lastSyncTime,
    syncErrors,
    manualSync,
    clearCache,
    getOfflineCapabilities,
  } = useOfflineContext();

  const [isClearing, setIsClearing] = useState(false);
  const capabilities = getOfflineCapabilities();

  const handleManualSync = async () => {
    try {
      await manualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearCache();
    } catch (error) {
      console.error('Clear cache failed:', error);
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
              {isOnline ? (
                <WifiIcon className="h-6 w-6 text-green-600" />
              ) : (
                <WifiSlashIcon className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">离线状态管理</h2>
              <p className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? '在线' : '离线'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 状态概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">待同步数据</p>
                  <p className="text-2xl font-bold text-blue-900">{pendingCount}</p>
                </div>
                <CloudArrowUpIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">缓存数据</p>
                  <p className="text-2xl font-bold text-purple-900">{cacheCount}</p>
                </div>
                <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">同步错误</p>
                  <p className="text-2xl font-bold text-orange-900">{syncErrors.length}</p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleManualSync}
              disabled={!isOnline || syncInProgress}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 ${syncInProgress ? 'animate-spin' : ''}`} />
              <span>{syncInProgress ? '同步中...' : '立即同步'}</span>
            </button>

            <button
              onClick={handleClearCache}
              disabled={isClearing || cacheCount === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              <span>{isClearing ? '清理中...' : '清理缓存'}</span>
            </button>
          </div>

          {/* 最后同步时间 */}
          {lastSyncTime && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">
                  最后同步: {formatDistanceToNow(new Date(lastSyncTime), { 
                    addSuffix: true, 
                    locale: zhCN 
                  })}
                </span>
              </div>
            </div>
          )}

          {/* 功能支持状态 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">离线功能支持</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries({
                'Service Worker': capabilities.serviceWorkerSupported,
                'IndexedDB': capabilities.indexedDBSupported,
                '后台同步': capabilities.backgroundSyncSupported,
                '缓存API': capabilities.cacheAPISupported,
              }).map(([feature, supported]) => (
                <div key={feature} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{feature}</span>
                  <div className={`flex items-center space-x-1 ${supported ? 'text-green-600' : 'text-red-600'}`}>
                    {supported ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : (
                      <XMarkIcon className="h-4 w-4" />
                    )}
                    <span className="text-xs font-medium">
                      {supported ? '支持' : '不支持'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 同步错误列表 */}
          {syncErrors.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">同步错误</h3>
              <div className="space-y-2">
                {syncErrors.map((error) => (
                  <div key={error.id} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800 font-medium">{error.message}</p>
                        <p className="text-xs text-red-600 mt-1">
                          {formatDistanceToNow(new Date(error.timestamp), { 
                            addSuffix: true, 
                            locale: zhCN 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 离线使用提示 */}
          {!isOnline && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">离线模式提示</h4>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>您可以继续查看已缓存的数据</li>
                      <li>新创建或修改的数据将在网络恢复后自动同步</li>
                      <li>某些功能可能受限，如文件上传和实时数据更新</li>
                      <li>建议在网络恢复后手动同步以确保数据一致性</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflinePanel;