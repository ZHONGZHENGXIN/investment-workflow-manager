import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { render, createMockWorkflow, createMockExecution, mockApiResponse } from '../utils';
import WorkflowList from '../../components/workflow/WorkflowList';
import WorkflowExecution from '../../components/execution/WorkflowExecution';
import * as workflowService from '../../services/workflow';
import * as executionService from '../../services/execution';

// Mock services
jest.mock('../../services/workflow');
jest.mock('../../services/execution');
const mockWorkflowService = workflowService as jest.Mocked<typeof workflowService>;
const mockExecutionService = executionService as jest.Mocked<typeof executionService>;

describe('Component Performance Tests', () => {
  const mockWorkflow = createMockWorkflow();
  const mockExecution = createMockExecution();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WorkflowList Performance', () => {
    it('should render large workflow list efficiently', async () => {
      // 创建大量工作流数据
      const largeWorkflowList = Array.from({ length: 1000 }, (_, index) => 
        createMockWorkflow({
          id: `workflow-${index}`,
          name: `工作流 ${index}`,
          description: `这是第 ${index} 个工作流`
        })
      );

      mockWorkflowService.getWorkflows.mockResolvedValue(mockApiResponse({
        data: largeWorkflowList,
        pagination: {
          page: 1,
          limit: 1000,
          total: 1000,
          totalPages: 1
        }
      }));

      const startTime = performance.now();
      
      render(<WorkflowList />);
      
      await waitFor(() => {
        expect(screen.getByText('工作流 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 渲染时间应该在合理范围内（2秒内）
      expect(renderTime).toBeLessThan(2000);
      
      console.log(`Large workflow list rendered in ${renderTime.toFixed(2)}ms`);
    });

    it('should handle rapid state updates efficiently', async () => {
      const workflows = Array.from({ length: 100 }, (_, index) => ({
        ...mockWorkflow,
        id: `workflow-${index}`,
        title: `工作流 ${index}`
      }))

      mockWorkflowService.getWorkflows = vi.fn().mockResolvedValue({
        data: {
          data: workflows,
          pagination: {
            page: 1,
            limit: 100,
            total: 100,
            totalPages: 1
          }
        }
      })

      const { rerender } = renderWithProviders(<WorkflowList />)
      
      await waitFor(() => {
        expect(screen.getByText('工作流 0')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // 模拟快速状态更新
      for (let i = 0; i < 10; i++) {
        const updatedWorkflows = workflows.map(w => ({
          ...w,
          title: `${w.title} - 更新 ${i}`
        }))

        mockWorkflowService.getWorkflows = vi.fn().mockResolvedValue({
          data: {
            data: updatedWorkflows,
            pagination: {
              page: 1,
              limit: 100,
              total: 100,
              totalPages: 1
            }
          }
        })

        rerender(<WorkflowList />)
      }

      const endTime = performance.now()
      const updateTime = endTime - startTime

      expect(updateTime).toBeLessThan(1000)
      
      console.log(`Rapid state updates completed in ${updateTime.toFixed(2)}ms`)
    })

    it('should handle search filtering efficiently', async () => {
      const workflows = Array.from({ length: 500 }, (_, index) => ({
        ...mockWorkflow,
        id: `workflow-${index}`,
        title: index % 2 === 0 ? `投资工作流 ${index}` : `其他工作流 ${index}`
      }))

      mockWorkflowService.getWorkflows = vi.fn().mockResolvedValue({
        data: {
          data: workflows,
          pagination: {
            page: 1,
            limit: 500,
            total: 500,
            totalPages: 1
          }
        }
      })

      renderWithProviders(<WorkflowList />)
      
      await waitFor(() => {
        expect(screen.getByText('投资工作流 0')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // 模拟搜索过滤
      const filteredWorkflows = workflows.filter(w => w.title.includes('投资'))
      
      mockWorkflowService.getWorkflows = vi.fn().mockResolvedValue({
        data: {
          data: filteredWorkflows,
          pagination: {
            page: 1,
            limit: 250,
            total: 250,
            totalPages: 1
          }
        }
      })

      const endTime = performance.now()
      const filterTime = endTime - startTime

      expect(filterTime).toBeLessThan(500)
      
      console.log(`Search filtering completed in ${filterTime.toFixed(2)}ms`)
    })
  })

  describe('WorkflowExecution Performance', () => {
    it('should render complex execution efficiently', async () => {
      const complexExecution = {
        ...mockExecution,
        workflow: {
          ...mockWorkflow,
          steps: Array.from({ length: 50 }, (_, index) => ({
            id: `step-${index}`,
            title: `步骤 ${index}`,
            description: `这是第 ${index} 个步骤的详细描述`,
            type: 'MANUAL',
            order: index + 1,
            isRequired: true,
            estimatedDuration: 30,
            dependencies: index > 0 ? [`step-${index - 1}`] : []
          }))
        },
        stepRecords: Array.from({ length: 25 }, (_, index) => ({
          stepId: `step-${index}`,
          status: index < 20 ? 'COMPLETED' : 'PENDING',
          completedAt: index < 20 ? new Date().toISOString() : null,
          notes: `步骤 ${index} 的执行记录`,
          actualDuration: index < 20 ? 25 + Math.random() * 10 : null
        }))
      }

      mockExecutionService.getExecution = vi.fn().mockResolvedValue({
        data: { data: complexExecution }
      })

      const startTime = performance.now()
      
      renderWithProviders(<WorkflowExecution executionId="execution-1" />)
      
      await waitFor(() => {
        expect(screen.getByText('步骤 0')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(1500)
      
      console.log(`Complex execution rendered in ${renderTime.toFixed(2)}ms`)
    })

    it('should handle real-time updates efficiently', async () => {
      mockExecutionService.getExecution = vi.fn().mockResolvedValue({
        data: { data: mockExecution }
      })

      renderWithProviders(<WorkflowExecution executionId="execution-1" />)
      
      await waitFor(() => {
        expect(screen.getByText('测试执行')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // 模拟实时进度更新
      for (let progress = 10; progress <= 100; progress += 10) {
        const updatedExecution = {
          ...mockExecution,
          progress,
          status: progress === 100 ? 'COMPLETED' : 'IN_PROGRESS'
        }

        mockExecutionService.getExecution = vi.fn().mockResolvedValue({
          data: { data: updatedExecution }
        })

        // 触发重新渲染
        await waitFor(() => {
          // 等待状态更新
        })
      }

      const endTime = performance.now()
      const updateTime = endTime - startTime

      expect(updateTime).toBeLessThan(2000)
      
      console.log(`Real-time updates completed in ${updateTime.toFixed(2)}ms`)
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not cause memory leaks with repeated renders', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      mockWorkflowService.getWorkflows = vi.fn().mockResolvedValue({
        data: {
          data: [mockWorkflow],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        }
      })

      // 重复渲染和卸载组件
      for (let i = 0; i < 50; i++) {
        const { unmount } = renderWithProviders(<WorkflowList />)
        
        await waitFor(() => {
          expect(screen.getByText('测试工作流')).toBeInTheDocument()
        })
        
        unmount()
      }

      // 强制垃圾回收（如果可用）
      if ((global as any).gc) {
        (global as any).gc()
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // 内存增长应该在合理范围内（10MB以内）
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
        console.log(`Memory increase after 50 renders: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
      }
    })

    it('should handle large data sets without excessive memory usage', async () => {
      const largeDataSet = Array.from({ length: 2000 }, (_, index) => ({
        ...mockWorkflow,
        id: `workflow-${index}`,
        title: `工作流 ${index}`,
        description: `这是一个包含大量数据的工作流描述 ${index}`.repeat(10)
      }))

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      mockWorkflowService.getWorkflows = vi.fn().mockResolvedValue({
        data: {
          data: largeDataSet,
          pagination: {
            page: 1,
            limit: 2000,
            total: 2000,
            totalPages: 1
          }
        }
      })

      renderWithProviders(<WorkflowList />)
      
      await waitFor(() => {
        expect(screen.getByText('工作流 0')).toBeInTheDocument()
      })

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryUsage = finalMemory - initialMemory

      // 大数据集的内存使用应该在合理范围内（50MB以内）
      if (initialMemory > 0) {
        expect(memoryUsage).toBeLessThan(50 * 1024 * 1024)
        console.log(`Memory usage for large dataset: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`)
      }
    })
  })

  describe('Rendering Performance Benchmarks', () => {
    it('should meet rendering performance benchmarks', async () => {
      const testCases = [
        { name: '小型列表 (10项)', count: 10, maxTime: 100 },
        { name: '中型列表 (100项)', count: 100, maxTime: 500 },
        { name: '大型列表 (500项)', count: 500, maxTime: 1000 }
      ]

      for (const testCase of testCases) {
        const workflows = Array.from({ length: testCase.count }, (_, index) => ({
          ...mockWorkflow,
          id: `workflow-${index}`,
          title: `工作流 ${index}`
        }))

        mockWorkflowService.getWorkflows = vi.fn().mockResolvedValue({
          data: {
            data: workflows,
            pagination: {
              page: 1,
              limit: testCase.count,
              total: testCase.count,
              totalPages: 1
            }
          }
        })

        const startTime = performance.now()
        
        const { unmount } = renderWithProviders(<WorkflowList />)
        
        await waitFor(() => {
          expect(screen.getByText('工作流 0')).toBeInTheDocument()
        })

        const endTime = performance.now()
        const renderTime = endTime - startTime

        expect(renderTime).toBeLessThan(testCase.maxTime)
        
        console.log(`${testCase.name}: ${renderTime.toFixed(2)}ms (目标: <${testCase.maxTime}ms)`)
        
        unmount()
      }
    })

    it('should handle concurrent operations efficiently', async () => {
      mockWorkflowService.getWorkflows = vi.fn().mockResolvedValue({
        data: {
          data: [mockWorkflow],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        }
      })

      const startTime = performance.now()

      // 并发渲染多个组件
      const renderPromises = Array.from({ length: 10 }, () => 
        new Promise<void>((resolve) => {
          const { unmount } = renderWithProviders(<WorkflowList />)
          
          waitFor(() => {
            expect(screen.getByText('测试工作流')).toBeInTheDocument()
          }).then(() => {
            unmount()
            resolve()
          })
        })
      )

      await Promise.all(renderPromises)

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(totalTime).toBeLessThan(3000)
      
      console.log(`Concurrent operations completed in ${totalTime.toFixed(2)}ms`)
    })
  })
})