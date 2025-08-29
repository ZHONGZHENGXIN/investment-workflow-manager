export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  steps: CreateWorkflowStepDto[];
}

export interface CreateWorkflowStepDto {
  name: string;
  description?: string;
  order: number;
  isRequired: boolean;
  stepType: StepType;
  metadata?: Record<string, any>;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  steps?: UpdateWorkflowStepDto[];
}

export interface UpdateWorkflowStepDto {
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