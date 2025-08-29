import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, userInteraction, assertions, createMockExecution, createMockWorkflow, mockApiResponse, mockApiError } from '../../../test/utils';
import StepExecution from '../StepExecution';
import * as executionService from '../../../services/execution';

// Mock execution service
jest.mock('../../../services/execution');
const mockExecutionService = executionService as jest.Mocked<typeof executionService>;

// Mock file upload
const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

describe('StepExecution', () => {
  const mockStep = {
    id: 'step-1',
    name: '尽职调查',
    description: '进行详细的尽职调查',
    type: 'manual',
    isRequired: true,
    order: 1,
    config: {
      allowAttachments: true,
      requiresApproval: false,
      timeLimit: 3600 // 1 hour
    }
  };

  const mockExecution = createMockExecution({
    id: 'execution-1',
    currentStepId: 'step-1',
    status: 'IN_PROGRESS'
  });

  const defaultProps = {
    step: mockStep,
    execution: mockExecution,
    isActive: true,
    isCompleted: false,
    onStepComplete: jest.fn(),
    onStepUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders step information correctly', () => {
      render(<StepExecution {...defaultProps} />);
      
      expect(screen.getByText('尽职调查')).toBeInTheDocument();
      expect(screen.getByText('进行详细的尽职调查')).toBeInTheDocument();
      expect(screen.getByText(/必需步骤/i)).toBeInTheDocument();
    });

    it('shows step status indicators', () => {
      render(<StepExecution {...defaultProps} />);
      
      expect(screen.getByTestId('step-status-active')).toBeInTheDocument();
      expect(screen.getByText(/进行中/i)).toBeInTheDocument();
    });

    it('renders completed step differently', () => {
      render(<StepExecution {...defaultProps} isCompleted={true} isActive={false} />);
      
      expect(screen.getByTestId('step-status-completed')).toBeInTheDocument();
      expect(screen.getByText(/已完成/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /查看详情/i })).toBeInTheDocument();
    });

    it('shows pending step state', () => {
      render(<StepExecution {...defaultProps} isActive={false} />);
      
      expect(screen.getByTestId('step-status-pending')).toBeInTheDocument();
      expect(screen.getByText(/待执行/i)).toBeInTheDocument();
    });

    it('displays time limit information', () => {
      render(<StepExecution {...defaultProps} />);
      
      expect(screen.getByText(/时间限制: 1 小时/i)).toBeInTheDocument();
    });
  });

  describe('Step Execution', () => {
    it('allows adding notes', async () => {
      render(<StepExecution {...defaultProps} />);
      
      const notesTextarea = screen.getByLabelText(/步骤备注/i);
      await userInteraction.fillInput(notesTextarea, '这是一个测试备注');
      
      expect(notesTextarea).toHaveValue('这是一个测试备注');
    });

    it('handles file attachments', async () => {
      render(<StepExecution {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-upload-input');
      await userInteraction.uploadFile('file-upload-input', mockFile);
      
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText(/PDF 文件/i)).toBeInTheDocument();
    });

    it('validates required fields before completion', async () => {
      const requiredStep = {
        ...mockStep,
        config: {
          ...mockStep.config,
          requiresNotes: true
        }
      };
      
      render(<StepExecution {...defaultProps} step={requiredStep} />);
      
      await userInteraction.clickButton(/完成步骤/i);
      
      await assertions.expectValidationError(/请填写步骤备注/i);
      expect(defaultProps.onStepComplete).not.toHaveBeenCalled();
    });

    it('completes step with valid data', async () => {
      mockExecutionService.updateStepStatus.mockResolvedValue(mockApiResponse({}));
      
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.fillInput(/步骤备注/i, '步骤已完成');
      await userInteraction.clickButton(/完成步骤/i);
      
      await waitFor(() => {
        expect(mockExecutionService.updateStepStatus).toHaveBeenCalledWith(
          'execution-1',
          'step-1',
          {
            status: 'COMPLETED',
            notes: '步骤已完成',
            attachments: []
          }
        );
      });
      
      expect(defaultProps.onStepComplete).toHaveBeenCalledWith('step-1');
    });

    it('handles step completion with attachments', async () => {
      mockExecutionService.updateStepStatus.mockResolvedValue(mockApiResponse({}));
      
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.uploadFile('file-upload-input', mockFile);
      await userInteraction.fillInput(/步骤备注/i, '已上传文件');
      await userInteraction.clickButton(/完成步骤/i);
      
      await waitFor(() => {
        expect(mockExecutionService.updateStepStatus).toHaveBeenCalledWith(
          'execution-1',
          'step-1',
          expect.objectContaining({
            status: 'COMPLETED',
            notes: '已上传文件',
            attachments: expect.arrayContaining([
              expect.objectContaining({
                name: 'test.pdf',
                type: 'application/pdf'
              })
            ])
          })
        );
      });
    });

    it('shows loading state during completion', async () => {
      mockExecutionService.updateStepStatus.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockApiResponse({})), 1000))
      );
      
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.fillInput(/步骤备注/i, '测试');
      await userInteraction.clickButton(/完成步骤/i);
      
      expect(screen.getByRole('button', { name: /处理中/i })).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('handles completion error', async () => {
      mockExecutionService.updateStepStatus.mockRejectedValue(mockApiError('网络错误'));
      
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.fillInput(/步骤备注/i, '测试');
      await userInteraction.clickButton(/完成步骤/i);
      
      await assertions.expectValidationError(/完成步骤失败/i);
      expect(screen.getByRole('button', { name: /完成步骤/i })).toBeEnabled();
    });
  });

  describe('Step Actions', () => {
    it('allows skipping optional steps', async () => {
      const optionalStep = { ...mockStep, isRequired: false };
      mockExecutionService.updateStepStatus.mockResolvedValue(mockApiResponse({}));
      
      render(<StepExecution {...defaultProps} step={optionalStep} />);
      
      await userInteraction.clickButton(/跳过步骤/i);
      
      // 确认跳过对话框
      expect(screen.getByText(/确认跳过步骤/i)).toBeInTheDocument();
      await userInteraction.clickButton(/确认跳过/i);
      
      await waitFor(() => {
        expect(mockExecutionService.updateStepStatus).toHaveBeenCalledWith(
          'execution-1',
          'step-1',
          {
            status: 'SKIPPED',
            notes: '用户选择跳过此步骤',
            attachments: []
          }
        );
      });
    });

    it('does not show skip option for required steps', () => {
      render(<StepExecution {...defaultProps} />);
      
      expect(screen.queryByRole('button', { name: /跳过步骤/i })).not.toBeInTheDocument();
    });

    it('allows pausing step execution', async () => {
      mockExecutionService.updateStepStatus.mockResolvedValue(mockApiResponse({}));
      
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.fillInput(/步骤备注/i, '暂时保存');
      await userInteraction.clickButton(/暂停/i);
      
      await waitFor(() => {
        expect(mockExecutionService.updateStepStatus).toHaveBeenCalledWith(
          'execution-1',
          'step-1',
          {
            status: 'PAUSED',
            notes: '暂时保存',
            attachments: []
          }
        );
      });
    });

    it('shows step history', async () => {
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.clickButton(/查看历史/i);
      
      expect(screen.getByText(/步骤执行历史/i)).toBeInTheDocument();
      expect(screen.getByText(/开始时间/i)).toBeInTheDocument();
      expect(screen.getByText(/执行人/i)).toBeInTheDocument();
    });
  });

  describe('File Management', () => {
    it('validates file types', async () => {
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.uploadFile('file-upload-input', invalidFile);
      
      await assertions.expectValidationError(/不支持的文件类型/i);
    });

    it('validates file size', async () => {
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.uploadFile('file-upload-input', largeFile);
      
      await assertions.expectValidationError(/文件大小超过限制/i);
    });

    it('shows file upload progress', async () => {
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.uploadFile('file-upload-input', mockFile);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/上传中/i)).toBeInTheDocument();
    });

    it('allows removing uploaded files', async () => {
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.uploadFile('file-upload-input', mockFile);
      
      const removeButton = screen.getByLabelText(/删除文件/i);
      await userInteraction.clickButton(removeButton);
      
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });

    it('previews image files', async () => {
      const imageFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      
      render(<StepExecution {...defaultProps} />);
      
      await userInteraction.uploadFile('file-upload-input', imageFile);
      
      expect(screen.getByAltText('test.jpg')).toBeInTheDocument();
      
      await userInteraction.clickButton(/预览/i);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Timer and Deadlines', () => {
    it('shows remaining time for timed steps', () => {
      const timedStep = {
        ...mockStep,
        config: {
          ...mockStep.config,
          timeLimit: 1800, // 30 minutes
          startTime: new Date(Date.now() - 10 * 60 * 1000).toISOString() // started 10 minutes ago
        }
      };
      
      render(<StepExecution {...defaultProps} step={timedStep} />);
      
      expect(screen.getByText(/剩余时间: 20:00/i)).toBeInTheDocument();
      expect(screen.getByTestId('timer-progress')).toBeInTheDocument();
    });

    it('warns when time is running out', () => {
      const timedStep = {
        ...mockStep,
        config: {
          ...mockStep.config,
          timeLimit: 600, // 10 minutes
          startTime: new Date(Date.now() - 8 * 60 * 1000).toISOString() // started 8 minutes ago
        }
      };
      
      render(<StepExecution {...defaultProps} step={timedStep} />);
      
      expect(screen.getByText(/时间即将用完/i)).toBeInTheDocument();
      expect(screen.getByTestId('timer-warning')).toBeInTheDocument();
    });

    it('handles time expiration', async () => {
      const expiredStep = {
        ...mockStep,
        config: {
          ...mockStep.config,
          timeLimit: 600,
          startTime: new Date(Date.now() - 11 * 60 * 1000).toISOString() // started 11 minutes ago
        }
      };
      
      render(<StepExecution {...defaultProps} step={expiredStep} />);
      
      expect(screen.getByText(/时间已到/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /完成步骤/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /申请延时/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<StepExecution {...defaultProps} />);
      
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', '步骤执行: 尽职调查');
      expect(screen.getByLabelText(/步骤备注/i)).toHaveAttribute('aria-required', 'false');
      expect(screen.getByTestId('file-upload-zone')).toHaveAttribute('aria-label', '文件上传区域');
    });

    it('supports keyboard navigation', () => {
      render(<StepExecution {...defaultProps} />);
      
      const notesTextarea = screen.getByLabelText(/步骤备注/i);
      notesTextarea.focus();
      expect(document.activeElement).toBe(notesTextarea);
      
      fireEvent.keyDown(notesTextarea, { key: 'Tab' });
      const completeButton = screen.getByRole('button', { name: /完成步骤/i });
      expect(document.activeElement).toBe(completeButton);
    });

    it('announces status changes to screen readers', async () => {
      render(<StepExecution {...defaultProps} />);
      
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      
      await userInteraction.fillInput(/步骤备注/i, '测试');
      
      expect(statusElement).toHaveTextContent(/步骤信息已更新/i);
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile layout', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      render(<StepExecution {...defaultProps} />);
      
      const container = screen.getByTestId('step-execution-container');
      expect(container).toHaveClass('mobile-layout');
    });

    it('stacks elements vertically on small screens', () => {
      render(<StepExecution {...defaultProps} />, {
        theme: {
          breakpoints: {
            down: () => '@media (max-width: 600px)'
          }
        }
      });
      
      const actionButtons = screen.getByTestId('action-buttons');
      expect(actionButtons).toHaveClass('vertical-stack');
    });
  });

  describe('Performance', () => {
    it('debounces auto-save', async () => {
      const onStepUpdate = jest.fn();
      
      render(<StepExecution {...defaultProps} onStepUpdate={onStepUpdate} />);
      
      const notesTextarea = screen.getByLabelText(/步骤备注/i);
      
      // 快速输入多个字符
      fireEvent.change(notesTextarea, { target: { value: '测' } });
      fireEvent.change(notesTextarea, { target: { value: '测试' } });
      fireEvent.change(notesTextarea, { target: { value: '测试备注' } });
      
      // 应该只调用一次（防抖）
      await waitFor(() => {
        expect(onStepUpdate).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });

    it('memoizes file previews', async () => {
      const { rerender } = render(<StepExecution {...defaultProps} />);
      
      await userInteraction.uploadFile('file-upload-input', mockFile);
      
      const preview = screen.getByTestId('file-preview-test.pdf');
      
      // 重新渲染不应该重新创建预览
      rerender(<StepExecution {...defaultProps} />);
      
      expect(screen.getByTestId('file-preview-test.pdf')).toBe(preview);
    });
  });
});