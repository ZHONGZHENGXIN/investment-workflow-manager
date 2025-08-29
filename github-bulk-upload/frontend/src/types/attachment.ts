export interface Attachment {
  id: string;
  executionRecordId: string;
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
}

export enum FileType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  TEXT = 'TEXT'
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AttachmentUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

export interface AttachmentStats {
  totalCount: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
}