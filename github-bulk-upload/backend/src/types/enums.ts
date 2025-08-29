// 枚举类型定义 - SQLite版本
// 由于SQLite不支持枚举，我们使用字符串常量

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
} as const;

export const WorkflowStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
} as const;

export const StepType = {
  CHECKLIST: 'CHECKLIST',
  INPUT: 'INPUT',
  DECISION: 'DECISION',
  APPROVAL: 'APPROVAL',
  CALCULATION: 'CALCULATION',
  NOTIFICATION: 'NOTIFICATION'
} as const;

export const ExecutionStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED'
} as const;

export const StepStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED'
} as const;

export const Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
} as const;

export const FileType = {
  IMAGE: 'IMAGE',
  DOCUMENT: 'DOCUMENT',
  TEXT: 'TEXT',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  SPREADSHEET: 'SPREADSHEET',
  PRESENTATION: 'PRESENTATION',
  OTHER: 'OTHER'
} as const;

// 类型定义
export type UserRoleType = typeof UserRole[keyof typeof UserRole];
export type WorkflowStatusType = typeof WorkflowStatus[keyof typeof WorkflowStatus];
export type StepTypeType = typeof StepType[keyof typeof StepType];
export type ExecutionStatusType = typeof ExecutionStatus[keyof typeof ExecutionStatus];
export type StepStatusType = typeof StepStatus[keyof typeof StepStatus];
export type PriorityType = typeof Priority[keyof typeof Priority];
export type FileTypeType = typeof FileType[keyof typeof FileType];