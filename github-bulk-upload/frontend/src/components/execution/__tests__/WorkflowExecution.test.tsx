import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, mockExecution, mockWorkflow } from '../../../test/utils'
import WorkflowExecution from '../WorkflowExecution'
import * as executionService from '../../../services/execution'

// Mock the execution service
vi.mock('../../../services/execution')
const mockExecutionService = executionService as any

describe('WorkflowExecution', () => {
  const user = userEvent.setup()
  
  const mockExecutionWithSteps = {
    ...mockExecution,
    status: 'IN_PROGRESS',
    progress: 50,
    currentStep: 'step-1',
    stepRecords: [
      {
        stepId: 'step-1',
        status: 'COMPLETED',
        completedAt: '2023-01-01T01:00:00Z',
        notes: '第一步已完成',
        actualDuration: 25
      },
      {
        stepId: 'step-2',
        status: 'IN_PROGRESS',
        startedAt: '2023-01-01T01:30:00Z'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockExecutionService.getExecution = vi.fn().mockResolvedValue({
      data: { data: mockExecutionWithSteps }
    })
  })

  it('should render execution details correctly', async () => {
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('测试执行')).toBeInTheDocument()
      expect(screen.getByText('这是一个测试执行')).toBeInTheDocument()
      expect(screen.getByText('进行中')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    mockExecutionService.getExecution = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    )
    
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    expect(screen.getByText(/加载中/i)).toBeInTheDocument()
  })

  it('should show error state on fetch failure', async () => {
    mockExecutionService.getExecution = vi.fn().mockRejectedValue(
      new Error('网络错误')
    )
    
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument()
    })
  })

  it('should display workflow steps with correct status', async () => {
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('步骤1')).toBeInTheDocument()
      expect(screen.getByText('步骤2')).toBeInTheDocument()
    })
    
    // Check step status indicators
    const completedStep = screen.getByText('步骤1').closest('[data-testid="step-item"]')
    const inProgressStep = screen.getByText('步骤2').closest('[data-testid="step-item"]')
    
    expect(completedStep).toHaveClass('completed')
    expect(inProgressStep).toHaveClass('in-progress')
  })

  it('should show step details when expanded', async () => {
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('步骤1')).toBeInTheDocument()
    })
    
    const step1 = screen.getByText('步骤1')
    await user.click(step1)
    
    await waitFor(() => {
      expect(screen.getByText('第一步已完成')).toBeInTheDocument()
      expect(screen.getByText('实际耗时: 25分钟')).toBeInTheDocument()
    })
  })

  it('should allow completing a step', async () => {
    mockExecutionService.updateStepStatus = vi.fn().mockResolvedValue({
      data: { success: true }
    })
    
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('步骤2')).toBeInTheDocument()
    })
    
    const step2 = screen.getByText('步骤2')
    await user.click(step2)
    
    const completeButton = screen.getByText(/完成步骤/i)
    await user.click(completeButton)
    
    // Fill in completion form
    const notesInput = screen.getByLabelText(/备注/i)
    const durationInput = screen.getByLabelText(/实际耗时/i)
    
    await user.type(notesInput, '第二步已完成')
    await user.type(durationInput, '40')
    
    const submitButton = screen.getByText(/确认完成/i)
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockExecutionService.updateStepStatus).toHaveBeenCalledWith(
        'execution-1',
        'step-2',
        {
          status: 'COMPLETED',
          notes: '第二步已完成',
          actualDuration: 40
        }
      )
    })
  })

  it('should allow pausing execution', async () => {
    mockExecutionService.pauseExecution = vi.fn().mockResolvedValue({
      data: { success: true }
    })
    
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText(/暂停执行/i)).toBeInTheDocument()
    })
    
    const pauseButton = screen.getByText(/暂停执行/i)
    await user.click(pauseButton)
    
    await waitFor(() => {
      expect(mockExecutionService.pauseExecution).toHaveBeenCalledWith('execution-1')
    })
  })

  it('should allow resuming execution', async () => {
    const pausedExecution = {
      ...mockExecutionWithSteps,
      status: 'PAUSED'
    }
    
    mockExecutionService.getExecution = vi.fn().mockResolvedValue({
      data: { data: pausedExecution }
    })
    mockExecutionService.resumeExecution = vi.fn().mockResolvedValue({
      data: { success: true }
    })
    
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText(/恢复执行/i)).toBeInTheDocument()
    })
    
    const resumeButton = screen.getByText(/恢复执行/i)
    await user.click(resumeButton)
    
    await waitFor(() => {
      expect(mockExecutionService.resumeExecution).toHaveBeenCalledWith('execution-1')
    })
  })

  it('should allow canceling execution', async () => {
    mockExecutionService.cancelExecution = vi.fn().mockResolvedValue({
      data: { success: true }
    })
    
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText(/取消执行/i)).toBeInTheDocument()
    })
    
    const cancelButton = screen.getByText(/取消执行/i)
    await user.click(cancelButton)
    
    // Confirm cancellation
    const confirmButton = screen.getByText(/确认取消/i)
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(mockExecutionService.cancelExecution).toHaveBeenCalledWith('execution-1')
    })
  })

  it('should show progress bar correctly', async () => {
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  it('should show execution timeline', async () => {
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText(/执行时间线/i)).toBeInTheDocument()
    })
    
    // Check timeline events
    expect(screen.getByText(/步骤1已完成/i)).toBeInTheDocument()
    expect(screen.getByText(/步骤2开始执行/i)).toBeInTheDocument()
  })

  it('should allow adding attachments to steps', async () => {
    mockExecutionService.uploadStepAttachment = vi.fn().mockResolvedValue({
      data: { success: true, data: { id: 'attachment-1', filename: 'test.pdf' } }
    })
    
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('步骤2')).toBeInTheDocument()
    })
    
    const step2 = screen.getByText('步骤2')
    await user.click(step2)
    
    const fileInput = screen.getByLabelText(/上传附件/i)
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    await user.upload(fileInput, file)
    
    await waitFor(() => {
      expect(mockExecutionService.uploadStepAttachment).toHaveBeenCalledWith(
        'execution-1',
        'step-2',
        expect.any(FormData)
      )
    })
  })

  it('should show estimated vs actual duration', async () => {
    renderWithProviders(<WorkflowExecution executionId="execution-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('步骤1')).toBeInTheDocument()
    })
    
    const step1 = screen.getByText('步骤1')
    await user.click(step1)
    
    await waitFor(() => {
      expect(screen.getByText(/预估: 30分钟/i)).toBeInTheDocument()
      expect(screen.getByText(/实际: 25分钟/i)).toBeInTheDocument()
    })
  })
})