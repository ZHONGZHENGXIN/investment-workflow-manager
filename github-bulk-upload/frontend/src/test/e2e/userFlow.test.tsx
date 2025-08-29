import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, userInteraction, assertions, createMockUser, createMockWorkflow, createMockExecution, mockApiResponse } from '../utils';
import App from '../../App';
import * as authService from '../../services/auth';
import * as workflowService from '../../services/workflow';
import * as executionService from '../../services/execution';

// Mock all services
jest.mock('../../services/auth');
jest.mock('../../services/workflow');
jest.mock('../../services/execution');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockWorkflowService = workflowService as jest.Mocked<typeof workflowService>;
const mockExecutionService = executionService as jest.Mocked<typeof executionService>;

describe('End-to-End User Flow', () => {
  const mockUser = createMockUser();
  const mockWorkflow = createMockWorkflow();
  const mockExecution = createMockExecution();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Setup default mocks
    mockAuthService.getCurrentUser.mockResolvedValue(mockApiResponse(null));
    mockWorkflowService.getWorkflows.mockResolvedValue(mockApiResponse({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }));
    mockExecutionService.getExecutions.mockResolvedValue(mockApiResponse({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }));
  });

  describe('Complete User Journey', () => {
    it('should complete full user registration to workflow execution flow', async () => {
      // Start with unauthenticated state
      renderWithProviders(<App />, { route: '/' })

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByText(/登录/i)).toBeInTheDocument()
      })

      // Navigate to register page
      const registerLink = screen.getByText(/立即注册/i)
      await user.click(registerLink)

      await waitFor(() => {
        expect(screen.getByText(/用户注册/i)).toBeInTheDocument()
      })

      // Fill registration form
      const usernameInput = screen.getByLabelText(/用户名/i)
      const emailInput = screen.getByLabelText(/邮箱/i)
      const passwordInput = screen.getByLabelText(/^密码/i)
      const confirmPasswordInput = screen.getByLabelText(/确认密码/i)

      await user.type(usernameInput, 'testuser')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')

      // Mock successful registration
      mockAuthService.register.mockResolvedValue({
        data: {
          user: mockUser,
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token'
          }
        }
      })

      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.getCurrentUser.mockResolvedValue({ data: { user: mockUser } })

      const registerButton = screen.getByRole('button', { name: /注册/i })
      await user.click(registerButton)

      // Should redirect to dashboard after successful registration
      await waitFor(() => {
        expect(screen.getByText(/仪表板/i)).toBeInTheDocument()
      })

      // Navigate to workflow management
      const workflowLink = screen.getByText(/工作流管理/i)
      await user.click(workflowLink)

      await waitFor(() => {
        expect(screen.getByText(/工作流列表/i)).toBeInTheDocument()
      })

      // Create new workflow
      const createWorkflowButton = screen.getByText(/创建工作流/i)
      await user.click(createWorkflowButton)

      await waitFor(() => {
        expect(screen.getByText(/创建工作流/i)).toBeInTheDocument()
      })

      // Fill workflow form
      const workflowNameInput = screen.getByLabelText(/工作流名称/i)
      const workflowDescInput = screen.getByLabelText(/描述/i)

      await user.type(workflowNameInput, '测试投资流程')
      await user.type(workflowDescInput, '这是一个测试投资决策流程')

      // Add workflow steps
      const addStepButton = screen.getByText(/添加步骤/i)
      await user.click(addStepButton)

      const stepNameInput = screen.getByLabelText(/步骤名称/i)
      const stepDescInput = screen.getByLabelText(/步骤描述/i)

      await user.type(stepNameInput, '初步评估')
      await user.type(stepDescInput, '对投资项目进行初步评估')

      // Mock successful workflow creation
      const createdWorkflow = {
        ...mockWorkflow,
        id: 'new-workflow-1',
        title: '测试投资流程',
        description: '这是一个测试投资决策流程'
      }

      mockWorkflowService.createWorkflow.mockResolvedValue({
        data: { workflow: createdWorkflow }
      })

      const saveWorkflowButton = screen.getByText(/保存工作流/i)
      await user.click(saveWorkflowButton)

      // Should redirect to workflow list
      await waitFor(() => {
        expect(screen.getByText('测试投资流程')).toBeInTheDocument()
      })

      // Start execution of the created workflow
      const executeButton = screen.getByText(/开始执行/i)
      await user.click(executeButton)

      // Fill execution form
      const executionTitleInput = screen.getByLabelText(/执行标题/i)
      const executionDescInput = screen.getByLabelText(/执行描述/i)

      await user.type(executionTitleInput, '测试项目执行')
      await user.type(executionDescInput, '测试投资项目的执行')

      // Mock successful execution creation
      const createdExecution = {
        ...mockExecution,
        id: 'new-execution-1',
        title: '测试项目执行',
        workflowId: 'new-workflow-1'
      }

      mockExecutionService.startExecution.mockResolvedValue({
        data: { execution: createdExecution }
      })

      const startExecutionButton = screen.getByText(/开始执行/i)
      await user.click(startExecutionButton)

      // Should navigate to execution page
      await waitFor(() => {
        expect(screen.getByText('测试项目执行')).toBeInTheDocument()
        expect(screen.getByText(/执行进度/i)).toBeInTheDocument()
      })

      // Complete first step
      const completeStepButton = screen.getByText(/完成步骤/i)
      await user.click(completeStepButton)

      // Fill step completion form
      const stepNotesInput = screen.getByLabelText(/备注/i)
      await user.type(stepNotesInput, '初步评估已完成')

      mockExecutionService.completeStep.mockResolvedValue({
        data: { success: true }
      })

      const confirmCompleteButton = screen.getByText(/确认完成/i)
      await user.click(confirmCompleteButton)

      // Should show step as completed
      await waitFor(() => {
        expect(screen.getByText(/已完成/i)).toBeInTheDocument()
      })

      // Navigate to execution history
      const historyLink = screen.getByText(/执行历史/i)
      await user.click(historyLink)

      // Mock history data
      mockExecutionService.getExecutions.mockResolvedValue({
        data: {
          data: [createdExecution],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
        }
      })

      await waitFor(() => {
        expect(screen.getByText('测试项目执行')).toBeInTheDocument()
        expect(screen.getByText(/执行历史/i)).toBeInTheDocument()
      })

      // View execution details
      const executionDetailLink = screen.getByText('测试项目执行')
      await user.click(executionDetailLink)

      await waitFor(() => {
        expect(screen.getByText(/执行详情/i)).toBeInTheDocument()
        expect(screen.getByText('初步评估已完成')).toBeInTheDocument()
      })

      // Start review process
      const startReviewButton = screen.getByText(/开始复盘/i)
      await user.click(startReviewButton)

      // Fill review form
      const reviewTitleInput = screen.getByLabelText(/复盘标题/i)
      const reviewContentInput = screen.getByLabelText(/复盘内容/i)
      const reviewRatingInput = screen.getByLabelText(/评分/i)

      await user.type(reviewTitleInput, '测试项目复盘')
      await user.type(reviewContentInput, '这次执行很成功，流程清晰')
      await user.selectOptions(reviewRatingInput, '5')

      // Mock successful review creation
      mockExecutionService.createReview.mockResolvedValue({
        data: { success: true }
      })

      const saveReviewButton = screen.getByText(/保存复盘/i)
      await user.click(saveReviewButton)

      await waitFor(() => {
        expect(screen.getByText(/复盘已保存/i)).toBeInTheDocument()
      })

      // Logout
      const userMenuButton = screen.getByLabelText(/用户菜单/i)
      await user.click(userMenuButton)

      const logoutButton = screen.getByText(/退出登录/i)
      await user.click(logoutButton)

      // Mock logout
      mockAuthService.logout.mockResolvedValue({ data: { success: true } })
      mockAuthService.isAuthenticated.mockReturnValue(false)

      await waitFor(() => {
        expect(screen.getByText(/登录/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Flow', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockAuthService.login.mockRejectedValue(new Error('Network Error'))

      renderWithProviders(<App />, { route: '/login' })

      await waitFor(() => {
        expect(screen.getByText(/登录/i)).toBeInTheDocument()
      })

      // Fill login form
      const emailInput = screen.getByLabelText(/邮箱/i)
      const passwordInput = screen.getByLabelText(/密码/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      const loginButton = screen.getByRole('button', { name: /登录/i })
      await user.click(loginButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/网络错误/i)).toBeInTheDocument()
      })

      // Should allow retry
      const retryButton = screen.getByText(/重试/i)
      expect(retryButton).toBeInTheDocument()
    })

    it('should handle validation errors', async () => {
      renderWithProviders(<App />, { route: '/register' })

      await waitFor(() => {
        expect(screen.getByText(/用户注册/i)).toBeInTheDocument()
      })

      // Submit form without filling required fields
      const registerButton = screen.getByRole('button', { name: /注册/i })
      await user.click(registerButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/用户名是必需的/i)).toBeInTheDocument()
        expect(screen.getByText(/邮箱是必需的/i)).toBeInTheDocument()
        expect(screen.getByText(/密码是必需的/i)).toBeInTheDocument()
      })
    })

    it('should handle unauthorized access', async () => {
      // Mock unauthorized error
      mockAuthService.getCurrentUser.mockRejectedValue({
        response: { status: 401 }
      })

      renderWithProviders(<App />, { 
        route: '/dashboard',
        preloadedState: {
          auth: { user: mockUser, isAuthenticated: true }
        }
      })

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText(/登录/i)).toBeInTheDocument()
      })
    })
  })

  describe('Offline Functionality', () => {
    it('should handle offline mode', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false })

      renderWithProviders(<App />, {
        preloadedState: {
          auth: { user: mockUser, isAuthenticated: true }
        }
      })

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByText(/离线模式/i)).toBeInTheDocument()
      })

      // Should allow offline operations
      const offlineWorkflowButton = screen.getByText(/离线工作流/i)
      expect(offlineWorkflowButton).toBeInTheDocument()
    })

    it('should sync data when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false })

      renderWithProviders(<App />, {
        preloadedState: {
          auth: { user: mockUser, isAuthenticated: true },
          offline: { 
            isOffline: true,
            pendingActions: [
              { type: 'CREATE_WORKFLOW', data: mockWorkflow }
            ]
          }
        }
      })

      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true })

      // Trigger online event
      const onlineEvent = new Event('online')
      window.dispatchEvent(onlineEvent)

      // Should show sync indicator
      await waitFor(() => {
        expect(screen.getByText(/同步中/i)).toBeInTheDocument()
      })

      // Mock successful sync
      mockWorkflowService.syncOfflineData.mockResolvedValue({
        data: { success: true }
      })

      await waitFor(() => {
        expect(screen.getByText(/同步完成/i)).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })

      renderWithProviders(<App />, {
        preloadedState: {
          auth: { user: mockUser, isAuthenticated: true }
        }
      })

      // Should show mobile navigation
      await waitFor(() => {
        expect(screen.getByLabelText(/菜单/i)).toBeInTheDocument()
      })

      // Should hide desktop sidebar
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
    })

    it('should handle touch interactions', async () => {
      renderWithProviders(<App />, {
        preloadedState: {
          auth: { user: mockUser, isAuthenticated: true }
        }
      })

      // Mock touch events
      const workflowCard = screen.getByTestId('workflow-card')
      
      // Simulate touch start
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      })
      
      workflowCard.dispatchEvent(touchStartEvent)

      // Should handle touch interaction
      expect(workflowCard).toHaveClass('touch-active')
    })
  })

  describe('Performance', () => {
    it('should load components lazily', async () => {
      renderWithProviders(<App />, {
        preloadedState: {
          auth: { user: mockUser, isAuthenticated: true }
        }
      })

      // Should show loading state for lazy components
      const workflowLink = screen.getByText(/工作流管理/i)
      await user.click(workflowLink)

      // Should show skeleton loader while component loads
      expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument()

      // Should load component after delay
      await waitFor(() => {
        expect(screen.getByText(/工作流列表/i)).toBeInTheDocument()
      })
    })

    it('should implement virtual scrolling for large lists', async () => {
      // Mock large dataset
      const largeWorkflowList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockWorkflow,
        id: `workflow-${i}`,
        title: `工作流 ${i}`
      }))

      mockWorkflowService.getWorkflows.mockResolvedValue({
        data: { 
          data: largeWorkflowList,
          pagination: { page: 1, limit: 50, total: 1000, totalPages: 20 }
        }
      })

      renderWithProviders(<App />, {
        route: '/workflows',
        preloadedState: {
          auth: { user: mockUser, isAuthenticated: true }
        }
      })

      await waitFor(() => {
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument()
      })

      // Should only render visible items
      const renderedItems = screen.getAllByTestId('workflow-item')
      expect(renderedItems.length).toBeLessThan(100) // Should not render all 1000 items
    })
  })
})