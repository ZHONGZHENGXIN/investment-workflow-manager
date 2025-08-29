import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { Toaster } from 'react-hot-toast'

// Import your store slices
import authSlice from '../store/authSlice'
import workflowSlice from '../store/workflowSlice'
import executionSlice from '../store/executionSlice'
import reviewSlice from '../store/reviewSlice'
import historySlice from '../store/historySlice'
import offlineSlice from '../store/offlineSlice'

// Create a test store
export function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      auth: authSlice,
      workflow: workflowSlice,
      execution: executionSlice,
      review: reviewSlice,
      history: historySlice,
      offline: offlineSlice,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST'],
        },
      }),
  })
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any
  store?: ReturnType<typeof createTestStore>
  route?: string
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Set initial route
  window.history.pushState({}, 'Test page', route)

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
          <Toaster />
        </BrowserRouter>
      </Provider>
    )
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  }
}

// Mock user data
export const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
}

// Mock workflow data
export const mockWorkflow = {
  id: 'workflow-1',
  title: '测试工作流',
  description: '这是一个测试工作流',
  category: 'investment',
  tags: ['测试', '投资'],
  userId: 'user-1',
  steps: [
    {
      id: 'step-1',
      title: '步骤1',
      description: '第一个步骤',
      type: 'MANUAL',
      order: 1,
      isRequired: true,
      estimatedDuration: 30,
      dependencies: []
    },
    {
      id: 'step-2',
      title: '步骤2',
      description: '第二个步骤',
      type: 'MANUAL',
      order: 2,
      isRequired: true,
      estimatedDuration: 45,
      dependencies: ['step-1']
    }
  ],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
}

// Mock execution data
export const mockExecution = {
  id: 'execution-1',
  workflowId: 'workflow-1',
  title: '测试执行',
  description: '这是一个测试执行',
  status: 'IN_PROGRESS',
  priority: 'MEDIUM',
  progress: 50,
  userId: 'user-1',
  tags: ['测试'],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  workflow: mockWorkflow
}

// Mock review data
export const mockReview = {
  id: 'review-1',
  executionId: 'execution-1',
  title: '测试复盘',
  content: '这是一个测试复盘内容',
  rating: 4,
  tags: ['测试', '复盘'],
  improvements: ['改进点1', '改进点2'],
  lessons: ['经验1', '经验2'],
  userId: 'user-1',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
}

// Mock API responses
export const mockApiResponse = {
  success: true,
  data: null,
  message: '操作成功'
}

export const mockApiError = {
  success: false,
  error: {
    code: 'TEST_ERROR',
    message: '测试错误'
  }
}

// Helper function to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to create mock file
export function createMockFile(name: string, size: number, type: string) {
  const file = new File(['mock content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Helper function to mock API calls
export function mockApiCall(response: any, delay = 0) {
  return vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve(response), delay))
  )
}

// Helper function to mock failed API calls
export function mockApiError(error: any, delay = 0) {
  return vi.fn().mockImplementation(() => 
    new Promise((_, reject) => setTimeout(() => reject(error), delay))
  )
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'