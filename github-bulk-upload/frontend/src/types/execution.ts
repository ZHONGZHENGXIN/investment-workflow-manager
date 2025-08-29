import { Workflow, WorkflowStep } from './workflow';
import { Attachment } from './attachment';

export interface Execution {
  id: string;
  userId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  workflow?: Workflow;
  executionRecords?: ExecutionRecord[];
}

export interface ExecutionRecord {
  id: string;
  executionId: string;
  stepId: string;
  status: StepStatus;
  notes?: string;
  completedAt?: string;
  data?: Record<string, any>;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  step?: WorkflowStep;
  attachments?: Attachment[];
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

export interface CreateExecutionData {
  workflowId: string;
}

export interface UpdateStepData {
  status?: StepStatus;
  notes?: string;
  data?: Record<string, any>;
}

export interface ExecutionStats {
  totalExecutions: number;
  completedExecutions: number;
  statusBreakdown: Record<string, number>;
  completionRate: number;
}

export interface ExecutionState {
  executions: Execution[];
  currentExecution: Execution | null;
  isLoading: boolean;
  error: string | null;
}