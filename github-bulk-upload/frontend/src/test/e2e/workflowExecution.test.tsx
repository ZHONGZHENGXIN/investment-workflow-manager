import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import App from '../../App';
import authSlice from '../../store/authSlice';
import workflowSlice from '../../store/workflowSlice';
import executionSlice from '../../store/executionSlice';

// Mock API responses
global.fetch = jest.fn();

const mockStore = configureStore({
  reducer: {
    auth: authSlice,
    workflow: workflowSlice,
    execution: executionSlice,
  },
  preloadedState: {
    auth: {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      },
      token: 'mock-token',
      isAuthenticated: true,
      loading: false,
      error: null,
    },
    workflow: {
      workflows: [
        {
          id: '1',
          name: '测试工作流',
          description: '用于测试的工作流',
          steps: [
            {
              id: '1',
              title: '准备阶段',
              description: '准备相关材料',
              type: 'MANUAL',
              required: true,
              order: 1,
            },
            {
              id: '2',
              title: '审核阶段',
              description: '审核提交的材料',
              type: 'MANUAL',
              required: true,
              order: 2,
            },
            {
              id: '3',
              title: '决策阶段',
              description: '做出最终决策',
              type: 'MANUAL',
              required: true,
              order: 3,
            },
          ],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ],
      currentWorkflow: null,
      loading: false,
      error: null,
    },
    execution: {
      executions: [],
      currentExecution: null,
      loading: false,
      error: null,
    },
  },
});

const renderApp = () => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  );
};

describe('Workflow Execution E2E', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/workflows')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStore.getState().workflow.workflows),
        });
      }
      
      if (url.includes('/api/executions') && url.includes('POST')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: '1',
            workflowId: '1',
            status: 'IN_PROGRESS',
            currentStep: 1,
            totalSteps: 3,
            startedAt: new Date(),
            steps: [
              {
                id: '1',
                title: '准备阶段',
                status: 'IN_PROGRESS',
              },
              {
                id: '2',
                title: '审核阶段',
                status: 'PENDING',
              },
              {
                id: '3',
                title: '决策阶段',
                status: 'PENDING',
              },
            ],
          }),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('completes full workflow execution flow', async () => {
    renderApp();
    
    // Navigate to workflow management
    const workflowLink = screen.getByText('工作流管理');
    fireEvent.click(workflowLink);
    
    await waitFor(() => {
      expect(screen.getByText('测试工作流')).toBeInTheDocument();
    });
    
    // Start workflow execution
    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('工作流执行')).toBeInTheDocument();
      expect(screen.getByText('准备阶段')).toBeInTheDocument();
    });
    
    // Complete first step
    const completeStepButton = screen.getByText('完成步骤');
    fireEvent.click(completeStepButton);
    
    // Add notes for the step
    const notesInput = screen.getByPlaceholderText('添加备注');
    fireEvent.change(notesInput, { 
      target: { value: '已完成材料准备' } 
    });
    
    const confirmButton = screen.getByText('确认完成');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('审核阶段')).toBeInTheDocument();
    });
    
    // Upload file for current step
    const fileInput = screen.getByLabelText(/选择文件/);
    const mockFile = new File(['test content'], 'document.pdf', { 
      type: 'application/pdf' 
    });
    
    fireEvent.change(fileInput, {
      target: { files: [mockFile] },
    });
    
    await waitFor(() => {
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });
    
    // Complete second step
    fireEvent.click(screen.getByText('完成步骤'));
    fireEvent.change(screen.getByPlaceholderText('添加备注'), {
      target: { value: '审核通过，文件已上传' }
    });
    fireEvent.click(screen.getByText('确认完成'));
    
    await waitFor(() => {
      expect(screen.getByText('决策阶段')).toBeInTheDocument();
    });
    
    // Complete final step
    fireEvent.click(screen.getByText('完成步骤'));
    fireEvent.change(screen.getByPlaceholderText('添加备注'), {
      target: { value: '决策：批准投资' }
    });
    fireEvent.click(screen.getByText('确认完成'));
    
    // Verify execution completion
    await waitFor(() => {
      expect(screen.getByText('工作流执行完成')).toBeInTheDocument();
    });
    
    // Navigate to review
    const reviewButton = screen.getByText('开始复盘');
    fireEvent.click(reviewButton);
    
    await waitFor(() => {
      expect(screen.getByText('执行复盘')).toBeInTheDocument();
    });
    
    // Fill review form
    const reviewInput = screen.getByPlaceholderText('输入复盘内容');
    fireEvent.change(reviewInput, {
      target: { value: '整体执行顺利，文档齐全，决策合理' }
    });
    
    // Rate the execution
    const ratingStars = screen.getAllByRole('button', { name: /评分/ });
    fireEvent.click(ratingStars[3]); // 4 stars
    
    // Add improvement suggestions
    const improvementInput = screen.getByPlaceholderText('改进建议');
    fireEvent.change(improvementInput, {
      target: { value: '可以考虑增加风险评估步骤' }
    });
    
    // Save review
    const saveReviewButton = screen.getByText('保存复盘');
    fireEvent.click(saveReviewButton);
    
    await waitFor(() => {
      expect(screen.getByText('复盘已保存')).toBeInTheDocument();
    });
    
    // Verify navigation to history
    const historyLink = screen.getByText('历史记录');
    fireEvent.click(historyLink);
    
    await waitFor(() => {
      expect(screen.getByText('执行历史')).toBeInTheDocument();
      expect(screen.getByText('测试工作流')).toBeInTheDocument();
    });
  });

  it('handles workflow execution with errors', async () => {
    // Mock API error
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/executions') && url.includes('POST')) {
        return Promise.reject(new Error('执行失败'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    
    renderApp();
    
    // Navigate to workflow management
    const workflowLink = screen.getByText('工作流管理');
    fireEvent.click(workflowLink);
    
    await waitFor(() => {
      expect(screen.getByText('测试工作流')).toBeInTheDocument();
    });
    
    // Try to start workflow execution
    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/执行失败/)).toBeInTheDocument();
    });
  });

  it('supports workflow execution pause and resume', async () => {
    renderApp();
    
    // Start workflow execution
    const workflowLink = screen.getByText('工作流管理');
    fireEvent.click(workflowLink);
    
    await waitFor(() => {
      expect(screen.getByText('测试工作流')).toBeInTheDocument();
    });
    
    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('工作流执行')).toBeInTheDocument();
    });
    
    // Pause execution
    const pauseButton = screen.getByText('暂停');
    fireEvent.click(pauseButton);
    
    await waitFor(() => {
      expect(screen.getByText('执行已暂停')).toBeInTheDocument();
    });
    
    // Resume execution
    const resumeButton = screen.getByText('继续');
    fireEvent.click(resumeButton);
    
    await waitFor(() => {
      expect(screen.getByText('执行已恢复')).toBeInTheDocument();
    });
  });

  it('validates required steps completion', async () => {
    renderApp();
    
    // Start workflow execution
    const workflowLink = screen.getByText('工作流管理');
    fireEvent.click(workflowLink);
    
    await waitFor(() => {
      expect(screen.getByText('测试工作流')).toBeInTheDocument();
    });
    
    const executeButton = screen.getByText('执行');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('准备阶段')).toBeInTheDocument();
    });
    
    // Try to skip to next step without completing current
    const nextStepButton = screen.getByText('下一步');
    fireEvent.click(nextStepButton);
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('请先完成当前步骤')).toBeInTheDocument();
    });
  });
});