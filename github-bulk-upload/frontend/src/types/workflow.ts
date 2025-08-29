export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  order: number;
  isRequired: boolean;
  stepType: StepType;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  steps: CreateWorkflowStepData[];
}

export interface CreateWorkflowStepData {
  name: string;
  description?: string;
  order: number;
  isRequired: boolean;
  stepType: StepType;
  metadata?: Record<string, any>;
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  isActive?: boolean;
  steps?: UpdateWorkflowStepData[];
}

export interface UpdateWorkflowStepData {
  id?: string;
  name?: string;
  description?: string;
  order?: number;
  isRequired?: boolean;
  stepType?: StepType;
  metadata?: Record<string, any>;
}

export enum StepType {
  CHECKLIST = 'CHECKLIST',
  INPUT = 'INPUT',
  DECISION = 'DECISION'
}

export interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  isLoading: boolean;
  error: string | null;
}

export interface WorkflowStats {
  totalExecutions: number;
  statusBreakdown: Record<string, number>;
}