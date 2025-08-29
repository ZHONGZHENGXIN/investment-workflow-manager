import { 
  User, 
  Workflow, 
  WorkflowStep, 
  Execution, 
  ExecutionRecord, 
  Attachment, 
  Review, 
  UserSettings,
  SystemLog
} from '@prisma/client';

// 导入枚举类型
import {
  UserRoleType as UserRole,
  WorkflowStatusType as WorkflowStatus,
  StepTypeType as StepType,
  ExecutionStatusType as ExecutionStatus,
  StepStatusType as StepStatus,
  PriorityType as Priority,
  FileTypeType as FileType
} from './enums';

// 扩展的用户类型（包含关联数据）
export interface UserWithRelations extends User {
  workflows?: Workflow[];
  executions?: Execution[];
  reviews?: Review[];
  userSettings?: UserSettings;
  _count?: {
    workflows: number;
    executions: number;
    reviews: number;
  };
}

// 扩展的工作流类型（包含关联数据）
export interface WorkflowWithRelations extends Workflow {
  user?: User;
  steps?: WorkflowStep[];
  executions?: Execution[];
  _count?: {
    steps: number;
    executions: number;
  };
}

// 扩展的工作流步骤类型
export interface WorkflowStepWithRelations extends WorkflowStep {
  workflow?: Workflow;
  executionRecords?: ExecutionRecord[];
  _count?: {
    executionRecords: number;
  };
}

// 扩展的执行记录类型
export interface ExecutionWithRelations extends Execution {
  user?: User;
  workflow?: WorkflowWithRelations;
  executionRecords?: ExecutionRecordWithRelations[];
  reviews?: Review[];
  _count?: {
    executionRecords: number;
    reviews: number;
  };
}

// 扩展的执行步骤记录类型
export interface ExecutionRecordWithRelations extends ExecutionRecord {
  execution?: Execution;
  step?: WorkflowStep;
  attachments?: Attachment[];
  _count?: {
    attachments: number;
  };
}

// 扩展的附件类型
export interface AttachmentWithRelations extends Attachment {
  executionRecord?: ExecutionRecord;
  review?: Review;
}

// 扩展的复盘类型
export interface ReviewWithRelations extends Review {
  user?: User;
  execution?: ExecutionWithRelations;
  attachments?: Attachment[];
  _count?: {
    attachments: number;
  };
}

// 创建用户的输入类型
export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: UserRole;
}

// 更新用户的输入类型
export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: UserRole;
  isActive?: boolean;
}

// 创建工作流的输入类型
export interface CreateWorkflowInput {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  isTemplate?: boolean;
  status?: WorkflowStatus;
  metadata?: any;
  steps?: CreateWorkflowStepInput[];
}

// 更新工作流的输入类型
export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isActive?: boolean;
  isTemplate?: boolean;
  status?: WorkflowStatus;
  metadata?: any;
}

// 创建工作流步骤的输入类型
export interface CreateWorkflowStepInput {
  name: string;
  description?: string;
  order: number;
  isRequired?: boolean;
  stepType?: StepType;
  estimatedTime?: number;
  dependencies?: string[];
  conditions?: any;
  metadata?: any;
}

// 更新工作流步骤的输入类型
export interface UpdateWorkflowStepInput {
  name?: string;
  description?: string;
  order?: number;
  isRequired?: boolean;
  stepType?: StepType;
  estimatedTime?: number;
  dependencies?: string[];
  conditions?: any;
  metadata?: any;
}

// 创建执行记录的输入类型
export interface CreateExecutionInput {
  workflowId: string;
  title?: string;
  priority?: Priority;
  dueDate?: Date;
  tags?: string[];
  metadata?: any;
}

// 更新执行记录的输入类型
export interface UpdateExecutionInput {
  title?: string;
  status?: ExecutionStatus;
  priority?: Priority;
  dueDate?: Date;
  tags?: string[];
  metadata?: any;
}

// 创建执行步骤记录的输入类型
export interface CreateExecutionRecordInput {
  executionId: string;
  stepId: string;
  notes?: string;
  data?: any;
}

// 更新执行步骤记录的输入类型
export interface UpdateExecutionRecordInput {
  status?: StepStatus;
  notes?: string;
  startedAt?: Date;
  completedAt?: Date;
  actualTime?: number;
  data?: any;
  result?: any;
  reviewNotes?: string;
}

// 创建复盘的输入类型
export interface CreateReviewInput {
  executionId: string;
  title: string;
  content?: string;
  rating?: number;
  lessons?: string;
  improvements?: string;
  tags?: string[];
  isPublic?: boolean;
  metadata?: any;
}

// 更新复盘的输入类型
export interface UpdateReviewInput {
  title?: string;
  content?: string;
  rating?: number;
  lessons?: string;
  improvements?: string;
  tags?: string[];
  isPublic?: boolean;
  metadata?: any;
}

// 创建附件的输入类型
export interface CreateAttachmentInput {
  executionRecordId?: string;
  reviewId?: string;
  fileName: string;
  originalName: string;
  fileType: FileType;
  fileSize: number;
  filePath: string;
  mimeType?: string;
  description?: string;
  tags?: string[];
  metadata?: any;
}

// 查询过滤器类型
export interface UserFilter {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface WorkflowFilter {
  userId?: string;
  category?: string;
  status?: WorkflowStatus;
  isActive?: boolean;
  isTemplate?: boolean;
  tags?: string[];
  search?: string;
}

export interface ExecutionFilter {
  userId?: string;
  workflowId?: string;
  status?: ExecutionStatus;
  priority?: Priority;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  search?: string;
}

export interface ReviewFilter {
  userId?: string;
  executionId?: string;
  rating?: number;
  isPublic?: boolean;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  search?: string;
}

// 分页参数类型
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页结果类型
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 统计数据类型
export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  completedExecutions: number;
  inProgressExecutions: number;
  totalReviews: number;
  averageRating: number;
  recentActivity: Array<{
    id: string;
    type: 'workflow' | 'execution' | 'review';
    title: string;
    createdAt: Date;
  }>;
}

// 执行统计类型
export interface ExecutionStats {
  totalTime: number;
  averageTime: number;
  completionRate: number;
  stepStats: Array<{
    stepId: string;
    stepName: string;
    completionRate: number;
    averageTime: number;
  }>;
}

// 复盘统计类型
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  commonTags: Array<{
    tag: string;
    count: number;
  }>;
  improvementTrends: Array<{
    month: string;
    averageRating: number;
    reviewCount: number;
  }>;
}

// 搜索结果类型
export interface SearchResult {
  workflows: WorkflowWithRelations[];
  executions: ExecutionWithRelations[];
  reviews: ReviewWithRelations[];
  total: number;
}

// 导出数据类型
export interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeAttachments?: boolean;
  filters?: any;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 批量操作类型
export interface BatchOperation<T> {
  action: 'create' | 'update' | 'delete';
  items: T[];
}

export interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

// 审计日志类型
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// 通知类型
export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

// 系统配置类型
export interface SystemConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  emailSettings: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    fromAddress: string;
  };
}