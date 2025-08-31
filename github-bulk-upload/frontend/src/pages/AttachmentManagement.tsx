import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { logoutUser } from '../store/authSlice';
import { Attachment, AttachmentStats } from '../types/attachment';
import { attachmentService, AttachmentService } from '../services/attachment';
import AttachmentGallery from '../components/records/AttachmentGallery';
import toast from 'react-hot-toast';

const AttachmentManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const [attachments] = useState<Attachment[]>([]);
  const [stats, setStats] = useState<AttachmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // 加载统计数据
      const statsResponse = await attachmentService.getUserStats();
      setStats(statsResponse.data.stats);
      
      // 这里可以加载所有用户的附件，但需要后端支持
      // 目前AttachmentGallery组件会处理数据加载
      
    } catch (error: any) {
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const handleBatchDelete = async () => {
    if (selectedAttachments.size === 0) return;

    if (!window.confirm(`确定要删除选中的 ${selectedAttachments.size} 个文件吗？`)) {
      return;
    }

    try {
      await attachmentService.batchDeleteAttachments(Array.from(selectedAttachments));
      toast.success(`成功删除 ${selectedAttachments.size} 个文件`);
      setSelectedAttachments(new Set());
      setShowBatchActions(false);
      loadData(); // 重新加载数据
    } catch (error) {
      toast.error('批量删除失败');
    }
  };

  // const toggleAttachmentSelection = (attachmentId: string) => {
  //   const newSelection = new Set(selectedAttachments);
  //   if (newSelection.has(attachmentId)) {
  //     newSelection.delete(attachmentId);
  //   } else {
  //     newSelection.add(attachmentId);
  //   }
  //   setSelectedAttachments(newSelection);
  //   setShowBatchActions(newSelection.size > 0);
  // };

  const selectAllAttachments = () => {
    if (selectedAttachments.size === attachments.length) {
      setSelectedAttachments(new Set());
      setShowBatchActions(false);
    } else {
      setSelectedAttachments(new Set(attachments.map(att => att.id)));
      setShowBatchActions(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xl font-semibold text-gray-900 hover:text-indigo-600"
              >
                投资流程管理系统
              </button>
              <div className="ml-4 flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>附件管理</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                欢迎，{user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 批量操作栏 */}
      {showBatchActions && (
        <div className="bg-indigo-50 border-b border-indigo-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-indigo-700">
                  已选择 {selectedAttachments.size} 个文件
                </span>
                <button
                  onClick={selectAllAttachments}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  {selectedAttachments.size === attachments.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  批量删除
                </button>
                <button
                  onClick={() => {
                    setSelectedAttachments(new Set());
                    setShowBatchActions(false);
                  }}
                  className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">附件管理</h1>
          <p className="text-gray-600 mt-1">管理您上传的所有文件和附件</p>
        </div>

        {/* 统计信息和附件展示 */}
        <AttachmentGallery
          showStats={true}
          showSearch={true}
          showFilters={true}
          className="space-y-6"
        />

        {/* 存储使用情况 */}
        {stats && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">存储使用情况</h3>
            <div className="space-y-4">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {type.toLowerCase()} 文件
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {data.count} 个文件，{AttachmentService.formatFileSize(data.size)}
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-gray-900">总计</span>
                  <span className="text-gray-900">
                    {stats.totalCount} 个文件，{AttachmentService.formatFileSize(stats.totalSize)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AttachmentManagement;