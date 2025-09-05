import axios from 'axios';
import { apiService } from './api';
import { Attachment, AttachmentStats } from '../types/attachment';

export class AttachmentService {
  // 上传单个文件
  async uploadFile(
    executionRecordId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; data: { attachment: Attachment } }> {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return apiService.post<{ success: boolean; data: { attachment: Attachment } }>(
      `/attachments/execution-records/${executionRecordId}/upload`,
      formData,
      config
    );
  }

  // 上传多个文件
  async uploadMultipleFiles(
    executionRecordId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; data: { attachments: Attachment[]; errors?: any[] } }> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    return apiService.post<{ success: boolean; data: { attachments: Attachment[]; errors?: any[] } }>(
      `/attachments/execution-records/${executionRecordId}/upload-multiple`,
      formData,
      config
    );
  }

  // 获取附件列表
  async getAttachments(executionRecordId: string): Promise<{ success: boolean; data: { attachments: Attachment[] } }> {
    return apiService.get<{ success: boolean; data: { attachments: Attachment[] } }>(
      `/attachments/execution-records/${executionRecordId}`
    );
  }

  // 下载文件
  async downloadFile(attachmentId: string): Promise<Blob> {
    const baseUrl = import.meta.env.VITE_API_URL || 
      (import.meta.env.PROD ? 'https://investment-workflow-manager-backend.zeabur.app/api' : 'http://localhost:3001/api');
    const response = await axios.get(`${baseUrl}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return (response as any).data;
  }

  // 获取缩略图URL
  getThumbnailUrl(attachmentId: string): string {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 
      (import.meta.env.PROD ? 'https://investment-workflow-manager-backend.zeabur.app/api' : 'http://localhost:3001/api');
    return `${baseUrl}/attachments/${attachmentId}/thumbnail?token=${token}`;
  }

  // 删除附件
  async deleteAttachment(attachmentId: string): Promise<{ success: boolean; message: string }> {
    return apiService.delete<{ success: boolean; message: string }>(`/attachments/${attachmentId}`);
  }

  // 批量删除附件
  async batchDeleteAttachments(attachmentIds: string[]): Promise<{ success: boolean; message: string }> {
    return apiService.post<{ success: boolean; message: string }>('/attachments/batch-delete', {
      attachmentIds
    });
  }

  // 获取用户附件统计
  async getUserStats(): Promise<{ success: boolean; data: { stats: AttachmentStats } }> {
    return apiService.get<{ success: boolean; data: { stats: AttachmentStats } }>('/attachments/stats');
  }

  // 格式化文件大小
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 获取文件类型图标
  static getFileTypeIcon(fileType: string, fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (fileType) {
      case 'IMAGE':
        return '🖼️';
      case 'DOCUMENT':
        switch (extension) {
          case 'pdf':
            return '📄';
          case 'doc':
          case 'docx':
            return '📝';
          default:
            return '📄';
        }
      case 'TEXT':
        return '📝';
      default:
        return '📎';
    }
  }

  // 验证文件类型
  static validateFileType(file: File): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    return allowedTypes.includes(file.type);
  }

  // 验证文件大小
  static validateFileSize(file: File): boolean {
    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 20 * 1024 * 1024; // 10MB for images, 20MB for documents
    return file.size <= maxSize;
  }
}

export const attachmentService = new AttachmentService();