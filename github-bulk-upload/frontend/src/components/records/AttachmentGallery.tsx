import React, { useState, useEffect } from 'react';
import { Attachment, FileType, AttachmentStats } from '../../types/attachment';
import { attachmentService, AttachmentService } from '../../services/attachment';
import ImageViewer from '../common/ImageViewer';
import toast from 'react-hot-toast';

interface AttachmentGalleryProps {
  executionRecordId?: string;
  attachments?: Attachment[];
  showStats?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  className?: string;
}

const AttachmentGallery: React.FC<AttachmentGalleryProps> = ({
  executionRecordId,
  attachments: propAttachments,
  showStats = true,
  showSearch = true,
  showFilters = true,
  className = '',
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>(propAttachments || []);
  const [filteredAttachments, setFilteredAttachments] = useState<Attachment[]>([]);
  const [stats, setStats] = useState<AttachmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<FileType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 加载附件数据
  useEffect(() => {
    if (executionRecordId && !propAttachments) {
      loadAttachments();
    }
  }, [executionRecordId, propAttachments]);

  // 加载统计数据
  useEffect(() => {
    if (showStats) {
      loadStats();
    }
  }, [showStats]);

  // 过滤和排序附件
  useEffect(() => {
    let filtered = [...attachments];

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(att =>
        att.originalName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 文件类型过滤
    if (selectedFileType !== 'ALL') {
      filtered = filtered.filter(att => att.fileType === selectedFileType);
    }

    // 排序
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.originalName.localeCompare(b.originalName);
          break;
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        case 'type':
          comparison = a.fileType.localeCompare(b.fileType);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredAttachments(filtered);
  }, [attachments, searchTerm, selectedFileType, sortBy, sortOrder]);

  const loadAttachments = async () => {
    if (!executionRecordId) return;

    try {
      setIsLoading(true);
      const response = await attachmentService.getAttachments(executionRecordId);
      setAttachments(response.data.attachments);
    } catch (error: any) {
      toast.error('加载附件失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await attachmentService.getUserStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await attachmentService.deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
      toast.success('文件删除成功');
      
      // 重新加载统计数据
      if (showStats) {
        loadStats();
      }
    } catch (error) {
      toast.error('文件删除失败');
    }
  };

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

  const handleBatchDownload = async () => {
    if (filteredAttachments.length === 0) return;

    toast.promise(
      Promise.all(filteredAttachments.map(att => handleDownload(att))),
      {
        loading: '正在下载文件...',
        success: '批量下载完成',
        error: '批量下载失败',
      }
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 统计信息 */}
      {showStats && stats && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{stats.totalCount}</div>
            <div className="text-sm text-gray-500">总文件数</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">
              {AttachmentService.formatFileSize(stats.totalSize)}
            </div>
            <div className="text-sm text-gray-500">总大小</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">
              {stats.byType.IMAGE?.count || 0}
            </div>
            <div className="text-sm text-gray-500">图片文件</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">
              {(stats.byType.DOCUMENT?.count || 0) + (stats.byType.TEXT?.count || 0)}
            </div>
            <div className="text-sm text-gray-500">文档文件</div>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      {(showSearch || showFilters) && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索 */}
            {showSearch && (
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="搜索文件名..."
                  />
                </div>
              </div>
            )}

            {/* 筛选和排序 */}
            {showFilters && (
              <div className="flex gap-2">
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value as FileType | 'ALL')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="ALL">所有类型</option>
                  <option value={FileType.IMAGE}>图片</option>
                  <option value={FileType.DOCUMENT}>文档</option>
                  <option value={FileType.TEXT}>文本</option>
                </select>

                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                    setSortBy(newSortBy as any);
                    setSortOrder(newSortOrder as any);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="date-desc">最新上传</option>
                  <option value="date-asc">最早上传</option>
                  <option value="name-asc">名称 A-Z</option>
                  <option value="name-desc">名称 Z-A</option>
                  <option value="size-desc">大小 大-小</option>
                  <option value="size-asc">大小 小-大</option>
                  <option value="type-asc">类型</option>
                </select>

                <div className="flex border border-gray-300 rounded-md">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm border-l border-gray-300 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 批量操作 */}
          {filteredAttachments.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                显示 {filteredAttachments.length} 个文件，共 {attachments.length} 个
              </span>
              <button
                onClick={handleBatchDownload}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                批量下载
              </button>
            </div>
          )}
        </div>
      )}

      {/* 附件展示 */}
      {filteredAttachments.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到文件</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedFileType !== 'ALL' ? '尝试调整搜索条件' : '还没有上传任何文件'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredAttachments.map((attachment) => (
            <div key={attachment.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
              <div className="p-3">
                {/* 文件预览 */}
                <div className="aspect-square mb-3">
                  {attachment.fileType === FileType.IMAGE ? (
                    <ImageViewer
                      src={attachmentService.getThumbnailUrl(attachment.id)}
                      alt={attachment.originalName}
                      className="w-full h-full"
                      thumbnailClassName="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded">
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {AttachmentService.getFileTypeIcon(attachment.fileType, attachment.originalName)}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">
                          {attachment.originalName.split('.').pop()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 文件信息 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={attachment.originalName}>
                    {attachment.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {AttachmentService.formatFileSize(attachment.fileSize)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(attachment.uploadedAt)}
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="text-xs text-indigo-600 hover:text-indigo-500"
                  >
                    下载
                  </button>
                  <button
                    onClick={() => handleDelete(attachment.id)}
                    className="text-xs text-red-600 hover:text-red-500"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredAttachments.map((attachment) => (
              <div key={attachment.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {attachment.fileType === FileType.IMAGE ? (
                        <img
                          src={attachmentService.getThumbnailUrl(attachment.id)}
                          alt={attachment.originalName}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded text-lg">
                          {AttachmentService.getFileTypeIcon(attachment.fileType, attachment.originalName)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.originalName}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{AttachmentService.formatFileSize(attachment.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(attachment.uploadedAt)}</span>
                        <span>•</span>
                        <span className="capitalize">{attachment.fileType.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      下载
                    </button>
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      className="text-sm text-red-600 hover:text-red-500"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentGallery;