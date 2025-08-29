export interface Execution {
  id: string;
  userId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  reviewNotes?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  executionRecords?: ExecutionRecord[];
}

export interface ExecutionRecord {
  id: string;
  executionId: string;
  stepId: string;
  status: StepStatus;
  notes?: string;
  completedAt?: Date;
  data?: Record<string, any>;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  executionRecordId: string;
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  filePath: string;
  uploadedAt: Date;
}

export interface CreateExecutionDto {
  workflowId: string;
}

export interface UpdateExecutionRecordDto {
  status?: StepStatus;
  notes?: string;
  data?: Record<string, any>;
  reviewNotes?: string;
}

export interface UpdateExecutionDto {
  status?: ExecutionStatus;
  reviewNotes?: string;
}

export enum ExecutionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED'
}

export enum StepStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}

export enum FileType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  TEXT = 'TEXT'
}